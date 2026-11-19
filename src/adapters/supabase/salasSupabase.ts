import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type {
  ConexionPresencia, ConexionSala, EventosPresencia, EventosSala, InicioRonda, InvitacionDuelo, JugadorEnLinea, JugadorSala,
  FilaSala, FilaTotalSala, ProgresoSala, PuertoSalas, RespuestaDuelo, ResultadoDuelo,
} from '../../application/puertos'
import { FRASES } from '../../application/puertos'
import { TODOS_LOS_NIVELES } from '../../domain/niveles'

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => Promise<T>

// ---- Saneamiento de todo lo que llega por tiempo real (cualquiera puede enviar mensajes al canal) ----
const texto = (v: unknown, max = 40) => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min)
const esId = (v: unknown) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)
const esCodigo = (v: unknown) => typeof v === 'string' && /^[A-Z]{5}$/.test(v)
const NIVELES = new Set(TODOS_LOS_NIVELES.map(n => n.id))
const DIFS = new Set(['facil', 'medio', 'leyenda'])
const RANGOS = new Set(['conquistador', 'lider', 'guia_mayor', 'gm_master', 'gm_master_avanzado'])

function limpiarAvatar(a: unknown) {
  if (!a || typeof a !== 'object') return undefined
  const o = a as Record<string, unknown>
  const u = (o.uniforme && typeof o.uniforme === 'object' ? o.uniforme : {}) as Record<string, unknown>
  const lista = (v: unknown) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 6).map(x => (x as string).slice(0, 14)) : undefined)
  return {
    genero: o.genero === 'f' ? 'f' as const : 'm' as const,
    piel: num(o.piel, 0, 9), pelo: num(o.pelo, 0, 9), colorPelo: num(o.colorPelo, 0, 9),
    panoleta: o.panoleta !== false, nombreTira: texto(o.nombreTira, 16), unidad: texto(o.unidad, 16),
    uniforme: { regulares: lista(u.regulares), avanzadas: lista(u.avanzadas), cargo: texto(u.cargo, 20) || undefined, anios: num(u.anios, 2, 60) },
  }
}

function limpiarEnLinea(v: unknown): JugadorEnLinea | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!esId(o.id) || !esId(o.clubId)) return null
  return {
    id: o.id as string, clubId: o.clubId as string, apodo: texto(o.apodo, 16), club: texto(o.club, 60),
    rango: (RANGOS.has(o.rango as string) ? o.rango : 'conquistador') as JugadorEnLinea['rango'],
    avatar: limpiarAvatar(o.avatar), ocupado: o.ocupado === true,
    x: typeof o.x === 'number' && Number.isFinite(o.x) ? Math.min(0.92, Math.max(0.08, o.x)) : undefined,
  }
}

/**
 * Salas en vivo con Supabase Realtime. El servidor crea y valida cada sala (permisos, horario y cupos);
 * el canal en tiempo real solo transmite el inicio de ronda y el avance de cada jugador.
 */
export class SalasSupabase implements PuertoSalas {
  private sb: SupabaseClient
  private rpc: Rpc
  private token: () => string | null
  constructor(sb: SupabaseClient, rpc: Rpc, token: () => string | null) { this.sb = sb; this.rpc = rpc; this.token = token }

  abrir(sesionId?: string | null) { return this.rpc<{ codigo: string; cupo: number }>('abrir_sala', { p_token: this.token(), p_sesion: sesionId ?? null }) }
  entrar(codigo: string) { return this.rpc<{ codigo: string; tipo: 'sala' | 'duelo'; anfitrion: boolean }>('entrar_sala', { p_token: this.token(), p_codigo: codigo }) }
  async cerrar(codigo: string) { await this.rpc('cerrar_sala', { p_token: this.token(), p_codigo: codigo }) }
  crearReto(rivalIds: string[]) {
    const ids = [...new Set(rivalIds)].filter(esId).slice(0, 3)
    if (!ids.length) return Promise.reject(new Error('RIVAL_INVALIDO'))
    return this.rpc<string>('crear_reto_grupo', { p_token: this.token(), p_rivales: ids })
  }
  resultadoSala(codigo: string, reto: string, desde: string) { return this.rpc<FilaSala[]>('resultado_sala', { p_token: this.token(), p_codigo: codigo, p_reto: reto, p_desde: desde }) }
  reclamarAbandono(codigo: string) { return this.rpc<ResultadoDuelo>('reclamar_abandono', { p_token: this.token(), p_codigo: codigo }) }
  totalSala(codigo: string) { return this.rpc<FilaTotalSala[]>('total_sala', { p_token: this.token(), p_codigo: codigo }) }
  resultadoDuelo(codigo: string) { return this.rpc<ResultadoDuelo>('resultado_duelo', { p_token: this.token(), p_codigo: codigo }) }

  conectar(codigo: string, yo: JugadorSala, ev: EventosSala, avanceEnVivo: boolean): Promise<ConexionSala> {
    if (!esCodigo(codigo)) return Promise.reject(new Error('SALA_NO_EXISTE'))
    // Canal de control (quién está, inicio de ronda, cierre y el resumen del anfitrión)
    const canal: RealtimeChannel = this.sb.channel('sala-' + codigo, { config: { presence: { key: yo.id }, broadcast: { self: true } } })
    // Canal de avance: solo lo escuchan quienes necesitan cada paso (anfitrión y duelos). Los demás solo envían.
    const avance: RealtimeChannel = this.sb.channel('avance-' + codigo, { config: { broadcast: { self: false } } })
    const progresos = new Map<string, ProgresoSala>()
    let rondaActual = 0, cambio = false, resumen = 0

    const recibirProgreso = (p: Record<string, unknown> | undefined) => {
      if (!p || !esId(p.id)) return
      const pr: ProgresoSala = { id: p.id as string, apodo: texto(p.apodo, 16), avance: num(p.avance, 0, 1), ronda: num(p.ronda, 1, 999),
        puntaje: p.puntaje === undefined || p.puntaje === null ? undefined : num(p.puntaje, 0, 2000), segundos: p.segundos === undefined || p.segundos === null ? undefined : num(p.segundos, 0, 3600) }
      if (yo.anfitrion) { progresos.set(pr.id, pr); cambio = true }
      ev.onProgreso?.(pr)
    }

    canal.on('presence', { event: 'sync' }, () => {
      const estado = canal.presenceState<JugadorSala>()
      const lista: JugadorSala[] = []
      for (const v of Object.values(estado)) {
        const j = v[0] as unknown as Record<string, unknown>
        if (!j || !esId(j.id)) continue
        lista.push({ id: j.id as string, apodo: texto(j.apodo, 16), club: texto(j.club, 60), avatar: limpiarAvatar(j.avatar), anfitrion: j.anfitrion === true,
          rango: (RANGOS.has(j.rango as string) ? j.rango : 'conquistador') as JugadorSala['rango'] })
        if (lista.length >= 300) break
      }
      ev.onJugadores?.(lista)
    })
    canal.on('broadcast', { event: 'inicio' }, ({ payload: p }) => {
      if (!p || !NIVELES.has(p.nivelId) || !DIFS.has(p.dificultad)) return
      rondaActual = num(p.ronda, 1, 999); progresos.clear()
      ev.onInicio?.({ ronda: rondaActual, nivelId: p.nivelId, dificultad: p.dificultad, semilla: num(p.semilla, 1, 2e9), cuentaAtras: num(p.cuentaAtras, 0, 5) })
    })
    // Resumen del anfitrión: [id, avance 0-100, puntaje o -1, segundos o -1] por jugador
    canal.on('broadcast', { event: 'tabla' }, ({ payload: p }) => {
      if (avanceEnVivo || !p || !Array.isArray(p.f)) return
      const ronda = num(p.r, 1, 999)
      for (const f of (p.f as unknown[]).slice(0, 300)) {
        if (!Array.isArray(f) || !esId(f[0])) continue
        recibirProgreso({ id: f[0], apodo: '', avance: num(f[1], 0, 100) / 100, ronda, puntaje: typeof f[2] === 'number' && f[2] >= 0 ? f[2] : undefined, segundos: typeof f[3] === 'number' && f[3] >= 0 ? f[3] : undefined })
      }
    })
    canal.on('broadcast', { event: 'cerrada' }, () => ev.onCerrada?.())
    if (avanceEnVivo) avance.on('broadcast', { event: 'progreso' }, ({ payload }) => recibirProgreso(payload))

    const suscribir = (c: RealtimeChannel) => new Promise<void>((ok, mal) => {
      const t = setTimeout(() => mal(new Error('SALA_SIN_CONEXION')), 10000)
      c.subscribe(estado => {
        if (estado === 'SUBSCRIBED') { clearTimeout(t); ok() }
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') { clearTimeout(t); mal(new Error('SALA_SIN_CONEXION')) }
      })
    })

    return (async () => {
      await suscribir(canal)
      if (avanceEnVivo) await suscribir(avance)
      await canal.track(yo)
      // El anfitrión manda el resumen cada 3 s (solo si algo cambió)
      if (yo.anfitrion) resumen = window.setInterval(() => {
        if (!cambio || !rondaActual) return
        cambio = false
        const f = [...progresos.values()].filter(p => p.ronda === rondaActual).slice(0, 300)
          .map(p => [p.id, Math.round(p.avance * 100), p.puntaje ?? -1, p.segundos ?? -1])
        canal.send({ type: 'broadcast', event: 'tabla', payload: { r: rondaActual, f } }).catch(() => undefined)
      }, 3000)
      const quitar = async () => { clearInterval(resumen); await this.sb.removeChannel(avance).catch(() => undefined) }
      return {
        codigo,
        iniciarRonda: async (r: InicioRonda) => { await canal.send({ type: 'broadcast', event: 'inicio', payload: r }) },
        // Con el canal de avance abierto se envía por ahí; si no, por HTTP sin escucharlo (no recibes el avance de todos)
        enviarProgreso: async (p: ProgresoSala) => {
          if (avanceEnVivo) await avance.send({ type: 'broadcast', event: 'progreso', payload: p })
          else await avance.httpSend('progreso', p)
        },
        cerrar: async () => {
          await canal.send({ type: 'broadcast', event: 'cerrada', payload: {} })
          await this.cerrar(codigo).catch(() => undefined)
          await quitar(); await this.sb.removeChannel(canal)
        },
        salir: async () => { await canal.untrack(); await quitar(); await this.sb.removeChannel(canal) },
      } satisfies ConexionSala
    })().catch(async e => { clearInterval(resumen); await this.sb.removeChannel(avance).catch(() => undefined); await this.sb.removeChannel(canal).catch(() => undefined); throw e })
  }

  /**
   * Islas en vivo, pensado para muchos jugadores a la vez:
   *  - Tu isla = un canal por club (presencia, caminar y frases): los mensajes solo llegan a tu club.
   *  - Otras islas = el servidor dice quién estuvo activo hace poco (latido cada 60 s); se pide cada 30 s.
   *  - Invitaciones = un buzón por jugador: solo lo recibe quien tiene que recibirlo.
   */
  presencia(yo: JugadorEnLinea, ev: EventosPresencia): Promise<ConexionPresencia> {
    if (!esId(yo.clubId) || !esId(yo.id)) return Promise.reject(new Error('SALA_SIN_CONEXION'))
    const isla = this.sb.channel('isla-' + yo.clubId, { config: { presence: { key: yo.id }, broadcast: { self: false } } })
    const buzon = this.sb.channel('buzon-' + yo.id, { config: { broadcast: { self: false } } })
    const posiciones = new Map<string, number>()
    const ocupados = new Map<string, boolean>()
    let delClub: JugadorEnLinea[] = [], otros: JugadorEnLinea[] = []
    let ocupadoYo = false, latidoT = 0
    const emitir = () => ev.onLista?.([
      ...delClub.map(j => ({ ...j, x: posiciones.get(j.id) ?? j.x, ocupado: ocupados.get(j.id) ?? j.ocupado })),
      ...otros.filter(o => !delClub.some(j => j.id === o.id)),
    ])

    isla.on('presence', { event: 'sync' }, () => {
      const lista: JugadorEnLinea[] = []
      for (const v of Object.values(isla.presenceState())) {
        const j = limpiarEnLinea(v[0])
        if (j && j.clubId === yo.clubId) lista.push(j)
        if (lista.length >= 80) break
      }
      delClub = lista
      emitir()
    })
    isla.on('broadcast', { event: 'mover' }, ({ payload: p }) => {
      if (!p || !esId(p.id) || typeof p.x !== 'number' || !Number.isFinite(p.x)) return
      posiciones.set(p.id, Math.min(0.92, Math.max(0.08, p.x))); emitir()
    })
    isla.on('broadcast', { event: 'estado' }, ({ payload: p }) => {
      if (!p || !esId(p.id)) return
      ocupados.set(p.id, p.ocupado === true); emitir()
    })
    isla.on('broadcast', { event: 'gesto' }, ({ payload: p }) => {
      if (!p || !esId(p.de) || typeof p.frase !== 'number' || p.frase < 0 || p.frase >= FRASES.length) return
      ev.onGesto?.({ de: p.de, frase: Math.floor(p.frase) })
    })
    buzon.on('broadcast', { event: 'invitacion' }, ({ payload: p }) => {
      if (!p || p.para !== yo.id || !esCodigo(p.codigo) || !NIVELES.has(p.nivelId) || !DIFS.has(p.dificultad)) return
      const de = limpiarEnLinea(p.de)
      const otrosAp = Array.isArray(p.otros) ? p.otros.slice(0, 3).map((x: unknown) => texto(x, 16)).filter(Boolean) : undefined
      if (de) ev.onInvitacion?.({ para: yo.id, de, codigo: p.codigo, nivelId: p.nivelId, dificultad: p.dificultad, otros: otrosAp } as InvitacionDuelo)
    })
    buzon.on('broadcast', { event: 'respuesta' }, ({ payload: p }) => {
      if (!p || p.para !== yo.id || !esId(p.de) || !esCodigo(p.codigo)) return
      ev.onRespuesta?.({ para: yo.id, de: p.de, codigo: p.codigo, acepta: p.acepta === true } as RespuestaDuelo)
    })

    const latido = () => this.rpc('latido', { p_token: this.token(), p_ocupado: ocupadoYo }).catch(() => undefined)
    const refrescarOtros = async () => {
      try {
        const r = await this.rpc<unknown[]>('isla_otros', { p_token: this.token() })
        otros = (Array.isArray(r) ? r : []).map(limpiarEnLinea).filter((j): j is JugadorEnLinea => !!j && j.clubId !== yo.clubId).slice(0, 40)
        emitir()
      } catch { /* sin conexión: se mantiene la última lista */ }
    }
    // Enviar a un buzón ajeno por HTTP (sin suscribirse a él)
    const alBuzon = async (para: string, evento: string, payload: object) => {
      if (!esId(para)) return
      const c = this.sb.channel('buzon-' + para)
      try { await c.httpSend(evento, payload) } finally { await this.sb.removeChannel(c).catch(() => undefined) }
    }
    const suscribir = (c: RealtimeChannel) => new Promise<void>((ok, mal) => {
      const t = setTimeout(() => mal(new Error('SALA_SIN_CONEXION')), 10000)
      c.subscribe(estado => {
        if (estado === 'SUBSCRIBED') { clearTimeout(t); ok() }
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') { clearTimeout(t); mal(new Error('SALA_SIN_CONEXION')) }
      })
    })

    return (async () => {
      await Promise.all([suscribir(isla), suscribir(buzon)])
      await isla.track({ id: yo.id, clubId: yo.clubId, apodo: yo.apodo, club: yo.club, rango: yo.rango, avatar: yo.avatar, ocupado: false })
      void latido(); void refrescarOtros()
      latidoT = window.setInterval(() => { if (!document.hidden) void latido() }, 60000)
      return {
        invitar: async (i: InvitacionDuelo) => alBuzon(i.para, 'invitacion', i),
        responder: async (r: RespuestaDuelo) => alBuzon(r.para, 'respuesta', r),
        ocupado: async (si: boolean) => {
          if (si === ocupadoYo) return
          ocupadoYo = si
          void latido()
          await isla.send({ type: 'broadcast', event: 'estado', payload: { id: yo.id, ocupado: si } })
        },
        mover: async (x: number) => { await isla.send({ type: 'broadcast', event: 'mover', payload: { id: yo.id, x } }) },
        gesto: async (de: string, frase: number) => { await isla.send({ type: 'broadcast', event: 'gesto', payload: { de, frase } }) },
        refrescarOtros,
        salir: async () => {
          clearInterval(latidoT)
          await isla.untrack().catch(() => undefined)
          await this.sb.removeChannel(isla).catch(() => undefined)
          await this.sb.removeChannel(buzon).catch(() => undefined)
        },
      } satisfies ConexionPresencia
    })().catch(async e => { clearInterval(latidoT); await this.sb.removeChannel(isla).catch(() => undefined); await this.sb.removeChannel(buzon).catch(() => undefined); throw e })
  }
}
