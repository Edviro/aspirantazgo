import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type {
  ConexionPresencia, ConexionSala, EventosPresencia, EventosSala, InicioRonda, InvitacionDuelo, JugadorEnLinea, JugadorSala,
  ProgresoSala, PuertoSalas, RespuestaDuelo, ResultadoDuelo,
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
    uniforme: { regulares: lista(u.regulares), avanzadas: lista(u.avanzadas), cargo: texto(u.cargo, 20) || undefined, anios: num(u.anios, 1, 60) },
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
  crearDuelo(rivalId: string) { return this.rpc<string>('crear_duelo', { p_token: this.token(), p_rival: rivalId }) }
  reclamarAbandono(codigo: string) { return this.rpc<ResultadoDuelo>('reclamar_abandono', { p_token: this.token(), p_codigo: codigo }) }
  resultadoDuelo(codigo: string) { return this.rpc<ResultadoDuelo>('resultado_duelo', { p_token: this.token(), p_codigo: codigo }) }

  conectar(codigo: string, yo: JugadorSala, ev: EventosSala): Promise<ConexionSala> {
    if (!esCodigo(codigo)) return Promise.reject(new Error('SALA_NO_EXISTE'))
    const canal: RealtimeChannel = this.sb.channel('sala-' + codigo, { config: { presence: { key: yo.id }, broadcast: { self: true } } })

    canal.on('presence', { event: 'sync' }, () => {
      const estado = canal.presenceState<JugadorSala>()
      const lista: JugadorSala[] = []
      for (const v of Object.values(estado)) {
        const j = v[0] as unknown as Record<string, unknown>
        if (!j || !esId(j.id)) continue
        lista.push({ id: j.id as string, apodo: texto(j.apodo, 16), club: texto(j.club, 60), avatar: limpiarAvatar(j.avatar), anfitrion: j.anfitrion === true })
      }
      ev.onJugadores?.(lista)
    })
    canal.on('broadcast', { event: 'inicio' }, ({ payload: p }) => {
      if (!p || !NIVELES.has(p.nivelId) || !DIFS.has(p.dificultad)) return
      ev.onInicio?.({ ronda: num(p.ronda, 1, 999), nivelId: p.nivelId, dificultad: p.dificultad, semilla: num(p.semilla, 1, 2e9), cuentaAtras: num(p.cuentaAtras, 0, 5) })
    })
    canal.on('broadcast', { event: 'progreso' }, ({ payload: p }) => {
      if (!p || !esId(p.id)) return
      ev.onProgreso?.({ id: p.id, apodo: texto(p.apodo, 16), avance: num(p.avance, 0, 1), ronda: num(p.ronda, 1, 999),
        puntaje: p.puntaje === undefined ? undefined : num(p.puntaje, 0, 2000), segundos: p.segundos === undefined ? undefined : num(p.segundos, 0, 3600) })
    })
    canal.on('broadcast', { event: 'cerrada' }, () => ev.onCerrada?.())

    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('SALA_SIN_CONEXION')), 10000)
      canal.subscribe(async estado => {
        if (estado === 'SUBSCRIBED') {
          clearTimeout(t)
          await canal.track(yo)
          resolve({
            codigo,
            iniciarRonda: async (r: InicioRonda) => { await canal.send({ type: 'broadcast', event: 'inicio', payload: r }) },
            enviarProgreso: async (p: ProgresoSala) => { await canal.send({ type: 'broadcast', event: 'progreso', payload: p }) },
            cerrar: async () => {
              await canal.send({ type: 'broadcast', event: 'cerrada', payload: {} })
              await this.cerrar(codigo).catch(() => undefined)
              await this.sb.removeChannel(canal)
            },
            salir: async () => { await canal.untrack(); await this.sb.removeChannel(canal) },
          })
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
          clearTimeout(t)
          reject(new Error('SALA_SIN_CONEXION'))
        }
      })
    })
  }

  presencia(yo: JugadorEnLinea, ev: EventosPresencia): Promise<ConexionPresencia> {
    const canal = this.sb.channel('en-linea', { config: { presence: { key: yo.id }, broadcast: { self: false } } })
    canal.on('presence', { event: 'sync' }, () => {
      const lista: JugadorEnLinea[] = []
      for (const v of Object.values(canal.presenceState())) {
        const j = limpiarEnLinea(v[0])
        if (j) lista.push(j)
      }
      ev.onLista?.(lista)
    })
    canal.on('broadcast', { event: 'invitacion' }, ({ payload: p }) => {
      if (!p || p.para !== yo.id || !esCodigo(p.codigo) || !NIVELES.has(p.nivelId) || !DIFS.has(p.dificultad)) return
      const de = limpiarEnLinea(p.de)
      if (de) ev.onInvitacion?.({ para: yo.id, de, codigo: p.codigo, nivelId: p.nivelId, dificultad: p.dificultad } as InvitacionDuelo)
    })
    canal.on('broadcast', { event: 'gesto' }, ({ payload: p }) => {
      if (!p || !esId(p.de) || typeof p.frase !== 'number' || p.frase < 0 || p.frase >= FRASES.length) return
      ev.onGesto?.({ de: p.de, frase: Math.floor(p.frase) })
    })
    canal.on('broadcast', { event: 'respuesta' }, ({ payload: p }) => {
      if (!p || p.para !== yo.id || !esId(p.de) || !esCodigo(p.codigo)) return
      ev.onRespuesta?.({ para: yo.id, de: p.de, codigo: p.codigo, acepta: p.acepta === true } as RespuestaDuelo)
    })
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('SALA_SIN_CONEXION')), 10000)
      canal.subscribe(async estado => {
        if (estado === 'SUBSCRIBED') {
          clearTimeout(t)
          await canal.track(yo)
          resolve({
            invitar: async i => { await canal.send({ type: 'broadcast', event: 'invitacion', payload: i }) },
            responder: async r => { await canal.send({ type: 'broadcast', event: 'respuesta', payload: r }) },
            actualizar: async j => { await canal.track(j) },
            gesto: async (de, frase) => { await canal.send({ type: 'broadcast', event: 'gesto', payload: { de, frase } }) },
            salir: async () => { await canal.untrack(); await this.sb.removeChannel(canal) },
          })
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
          clearTimeout(t)
          reject(new Error('SALA_SIN_CONEXION'))
        }
      })
    })
  }
}
