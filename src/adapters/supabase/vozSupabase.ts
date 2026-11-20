import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmisionVoz, EstadoVoz, PuertoVoz, RecepcionVoz } from '../../application/puertos'

/**
 * Voz del culto con WebRTC (de quien habla a cada oyente). Supabase Realtime solo lleva la "señalización".
 *
 * Seguridad: quien tiene el turno crea UN certificado para todas sus conexiones y registra su huella en el servidor
 * (que verifica que de verdad le toca hablar). Cada oyente revisa que la oferta traiga esa huella exacta; el cifrado
 * DTLS de WebRTC garantiza que solo el dueño de ese certificado puede completar la conexión. Así, aunque alguien
 * mande mensajes falsos por el canal, no puede hacerse pasar por quien habla.
 */
const ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }]
const MAX_OYENTES = 40
const esId = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/.test(x)
const sdpOk = (x: unknown): x is string => typeof x === 'string' && x.length > 20 && x.length < 20000
/** Todas las huellas sha-256 de un SDP (en el formato que guarda el servidor). */
const huellas = (sdp: string) => [...sdp.matchAll(/a=fingerprint:sha-256 ([0-9A-Fa-f:]{95})/g)].map(m => `sha-256 ${m[1].toUpperCase()}`)

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => Promise<T>

export class VozSupabase implements PuertoVoz {
  private sb: SupabaseClient
  private rpc: Rpc
  private token: () => string | null
  constructor(sb: SupabaseClient, rpc: Rpc, token: () => string | null) { this.sb = sb; this.rpc = rpc; this.token = token }

  static disponible() {
    return typeof window !== 'undefined' && 'RTCPeerConnection' in window && !!navigator.mediaDevices?.getUserMedia
  }

  async hablar(programa: string, yo: string, onOyentes?: (n: number) => void): Promise<EmisionVoz> {
    if (!esId(programa) || !esId(yo)) throw new Error('DATOS_INVALIDOS')
    const flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
    const cert = await RTCPeerConnection.generateCertificate({ name: 'ECDSA', namedCurve: 'P-256' } as EcKeyGenParams)
    // Huella del certificado (se saca de una oferta de prueba)
    const prueba = new RTCPeerConnection({ certificates: [cert] })
    prueba.addTransceiver('audio')
    const of = await prueba.createOffer()
    prueba.close()
    const huella = huellas(of.sdp ?? '')[0]
    if (!huella) { flujo.getTracks().forEach(t => t.stop()); throw new Error('VOZ_NO_DISPONIBLE') }
    try { await this.rpc('programa_microfono', { p_token: this.token(), p_programa: programa, p_huella: huella }) } catch (e) { flujo.getTracks().forEach(t => t.stop()); throw e }

    const pcs = new Map<string, RTCPeerConnection>(), pedidos = new Map<string, number>()
    const ch = this.sb.channel(`voz-${programa}`, { config: { broadcast: { self: false, ack: false } } })
    const enviar = (event: string, payload: Record<string, unknown>) => void ch.send({ type: 'broadcast', event, payload })
    const contar = () => onOyentes?.([...pcs.values()].filter(p => p.connectionState === 'connected').length)
    const quitar = (id: string) => { pcs.get(id)?.close(); pcs.delete(id); contar() }
    const conectar = async (id: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE, certificates: [cert] })
      pcs.set(id, pc)
      for (const t of flujo.getAudioTracks()) {
        const tx = pc.addTrack(t, flujo)
        try { const pr = tx.getParameters(); pr.encodings = [{ ...(pr.encodings?.[0] ?? {}), maxBitrate: 32000 }]; void tx.setParameters(pr) } catch { /* opcional */ }
      }
      pc.onicecandidate = e => { if (e.candidate) enviar('ice', { de: yo, para: id, c: e.candidate.toJSON() }) }
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') quitar(id); else contar() }
      const oferta = await pc.createOffer()
      await pc.setLocalDescription(oferta)
      enviar('oferta', { de: yo, para: id, sdp: oferta.sdp })
    }
    ch.on('broadcast', { event: 'oir' }, ({ payload }) => {
      const id = (payload as { de?: unknown })?.de
      if (!esId(id) || id === yo) return
      const ahora = Date.now()
      if ((pedidos.get(id) ?? 0) > ahora - 3000) return
      pedidos.set(id, ahora)
      const ya = pcs.get(id)
      if (ya && (ya.connectionState === 'connected' || ya.connectionState === 'connecting' || ya.connectionState === 'new')) {
        if (ya.connectionState === 'connected') return
        quitar(id)
      }
      if (pcs.size >= MAX_OYENTES) return
      void conectar(id).catch(() => quitar(id))
    })
    ch.on('broadcast', { event: 'respuesta' }, ({ payload }) => {
      const m = payload as { de?: unknown; para?: unknown; sdp?: unknown }
      if (m?.para !== yo || !esId(m.de) || !sdpOk(m.sdp)) return
      const pc = pcs.get(m.de)
      if (pc && pc.signalingState === 'have-local-offer') void pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }).catch(() => quitar(m.de as string))
    })
    ch.on('broadcast', { event: 'ice' }, ({ payload }) => {
      const m = payload as { de?: unknown; para?: unknown; c?: RTCIceCandidateInit }
      if (m?.para !== yo || !esId(m.de) || !m.c || typeof m.c.candidate !== 'string' || m.c.candidate.length > 500) return
      void pcs.get(m.de)?.addIceCandidate(m.c).catch(() => undefined)
    })
    await new Promise<void>(res => ch.subscribe(st => { if (st === 'SUBSCRIBED' || st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') res() }))
    enviar('hablo', { de: yo })
    let cerrado = false
    return {
      oyentes: () => [...pcs.values()].filter(p => p.connectionState === 'connected').length,
      silenciar: si => flujo.getAudioTracks().forEach(t => { t.enabled = !si }),
      cerrar: async () => {
        if (cerrado) return
        cerrado = true
        flujo.getTracks().forEach(t => t.stop())
        for (const id of [...pcs.keys()]) quitar(id)
        await this.sb.removeChannel(ch)
        await this.rpc('programa_microfono', { p_token: this.token(), p_programa: programa, p_huella: null }).catch(() => undefined)
      },
    }
  }

  async escuchar(programa: string, yo: string, de: string, huella: string, onEstado?: (e: EstadoVoz) => void): Promise<RecepcionVoz> {
    if (!esId(programa) || !esId(yo) || !esId(de) || !/^sha-256 ([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(huella)) throw new Error('DATOS_INVALIDOS')
    const ch = this.sb.channel(`voz-${programa}`, { config: { broadcast: { self: false, ack: false } } })
    const enviar = (event: string, payload: Record<string, unknown>) => void ch.send({ type: 'broadcast', event, payload })
    const audio = new Audio()
    audio.autoplay = true
    ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    let pc: RTCPeerConnection | null = null, oyendo = false, cerrado = false
    const estado = (e: EstadoVoz) => { oyendo = e === 'oyendo'; onEstado?.(e) }
    ch.on('broadcast', { event: 'oferta' }, async ({ payload }) => {
      const m = payload as { de?: unknown; para?: unknown; sdp?: unknown }
      if (m?.para !== yo || m.de !== de || !sdpOk(m.sdp)) return
      const hs = huellas(m.sdp)
      if (!hs.length || hs.some(h => h !== huella)) return // no es quien tiene el micrófono: se ignora
      pc?.close()
      const nuevo = new RTCPeerConnection({ iceServers: ICE })
      pc = nuevo
      nuevo.ontrack = e => { audio.srcObject = e.streams[0] ?? new MediaStream([e.track]); void audio.play().catch(() => undefined) }
      nuevo.onicecandidate = e => { if (e.candidate) enviar('ice', { de: yo, para: de, c: e.candidate.toJSON() }) }
      nuevo.onconnectionstatechange = () => {
        if (nuevo !== pc) return
        if (nuevo.connectionState === 'connected') estado('oyendo')
        else if (nuevo.connectionState === 'failed' || nuevo.connectionState === 'disconnected') estado('sin_conexion')
      }
      try {
        await nuevo.setRemoteDescription({ type: 'offer', sdp: m.sdp })
        const r = await nuevo.createAnswer()
        await nuevo.setLocalDescription(r)
        enviar('respuesta', { de: yo, para: de, sdp: r.sdp })
      } catch { estado('sin_conexion') }
    })
    ch.on('broadcast', { event: 'ice' }, ({ payload }) => {
      const m = payload as { de?: unknown; para?: unknown; c?: RTCIceCandidateInit }
      if (m?.para !== yo || m.de !== de || !m.c || typeof m.c.candidate !== 'string' || m.c.candidate.length > 500) return
      void pc?.addIceCandidate(m.c).catch(() => undefined)
    })
    ch.on('broadcast', { event: 'hablo' }, ({ payload }) => { if ((payload as { de?: unknown })?.de === de && !oyendo) enviar('oir', { de: yo }) })
    await new Promise<void>(res => ch.subscribe(st => { if (st === 'SUBSCRIBED' || st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') res() }))
    estado('conectando')
    enviar('oir', { de: yo })
    const t = window.setInterval(() => { if (!oyendo && !cerrado) enviar('oir', { de: yo }) }, 4000)
    return {
      volumen: v => { audio.volume = Math.max(0, Math.min(1, v)) },
      cerrar: async () => {
        cerrado = true
        clearInterval(t)
        pc?.close(); pc = null
        audio.srcObject = null
        await this.sb.removeChannel(ch)
      },
    }
  }
}
