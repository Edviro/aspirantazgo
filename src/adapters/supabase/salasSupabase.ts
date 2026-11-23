import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type {
  ConexionPlaza, ConexionPresencia, ConexionSala, EventosPlaza, EventosPresencia, EventosSala, InicioRonda, InvitacionDuelo, JugadorEnLinea, JugadorSala,
  Campamento, ClubCampamento, FilaSala, FilaTotalSala, LugarMapa, MapaCampamentos, PerfilPublico, ProgresoSala, PresenteEnPlaza, PuertoSalas, PuntoPlaza, RespuestaDuelo, ResultadoDuelo,
} from '../../application/puertos'
import { FRASES } from '../../application/puertos'
import { TODOS_LOS_NIVELES } from '../../domain/niveles'
import { ALTO as ALTO_PLAZA, ANCHO as ANCHO_PLAZA } from '../../domain/plaza'

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

const AMBITOS = new Set(['mundo', 'pais', 'union', 'campo', 'club'])
const BANDERA = /^p:([0-9a-f]{6},){0,15}[0-9a-f]{6};d:[0-9a-f]{384}$/
function limpiarPublico(v: unknown): PerfilPublico | null {
  const j = limpiarEnLinea(v)
  if (!j) return null
  const o = v as Record<string, unknown>
  const lista = (x: unknown, ok: (s: string) => boolean, max: number) => (Array.isArray(x) ? x.filter((e): e is string => typeof e === 'string' && ok(e)).slice(0, max) : [])
  return {
    ...j, pais: texto(o.pais, 3).toUpperCase(), campo: texto(o.campo, 80), union: texto(o.union, 80),
    bandera: typeof o.bandera === 'string' && BANDERA.test(o.bandera) ? o.bandera : null,
    aprobados: num(o.aprobados, 0, 999), pines: lista(o.pines, e => /^[a-z0-9-]{3,30}$/.test(e), 20), campeon: lista(o.campeon, e => AMBITOS.has(e), 5),
  }
}

/** Punto válido de la plaza (o null si viene cualquier cosa por el canal). */
function punto(x: unknown, y: unknown): PuntoPlaza | null {
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x: Math.min(ANCHO_PLAZA, Math.max(0, x)), y: Math.min(ALTO_PLAZA, Math.max(0, y)) }
}
const r2 = (v: number) => Math.round(v * 100) / 100
const LUGAR = /^(rn?[0-9]{1,10}|c[0-9]{1,9}|x)-[0-9]{1,3}$/, BASE = /^(rn?[0-9]{1,10}|c[0-9]{1,9}|x)$/
const txtONull = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : null)
function limpiarClubCamp(v: unknown): ClubCampamento | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!esId(o.id) || !Number.isInteger(o.parcela) || (o.parcela as number) < 0 || (o.parcela as number) > 10) return null
  const ids = (x: unknown) => (Array.isArray(x) ? x.filter(esId).slice(0, 20) as string[] : [])
  const bandera = typeof o.bandera === 'string' && BANDERA.test(o.bandera) ? o.bandera : null
  return { id: o.id as string, nombre: texto(o.nombre, 60) || 'Club', pais: typeof o.pais === 'string' && /^[A-Z]{2}$/.test(o.pais) ? o.pais : null,
    bandera, ciudad: txtONull(o.ciudad, 60), parcela: o.parcela as number, m: ids(o.m), f: ids(o.f), z: Array.isArray(o.z) ? o.z.filter(esId).slice(0, 200) as string[] : [] }
}
function limpiarCampamento(v: unknown): Campamento | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.lugar !== 'string' || !LUGAR.test(o.lugar) || typeof o.base !== 'string' || !BASE.test(o.base)) return null
  const clubes = (Array.isArray(o.clubes) ? o.clubes : []).slice(0, 11).map(limpiarClubCamp).filter((c): c is ClubCampamento => !!c)
  const sector = Number.isInteger(o.sector) ? Math.max(0, o.sector as number) : 0
  return { lugar: o.lugar, base: o.base, sector, sectores: Number.isInteger(o.sectores) ? Math.max(1, Math.min(999, o.sectores as number)) : 1,
    titulo: texto(o.titulo, 80) || 'Campamento', asociacion: txtONull(o.asociacion, 90), union: txtONull(o.union, 80),
    pais: typeof o.pais === 'string' && /^[A-Z]{2}$/.test(o.pais) ? o.pais : null, mio: o.mio === true, clubes }
}
function limpiarLugar(v: unknown): LugarMapa | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.base !== 'string' || !BASE.test(o.base)) return null
  const n = (x: unknown) => (Number.isInteger(x) ? Math.max(0, x as number) : 0)
  return { base: o.base, titulo: texto(o.titulo, 80) || 'Campamento', asociacion: txtONull(o.asociacion, 90), union: txtONull(o.union, 80),
    pais: typeof o.pais === 'string' && /^[A-Z]{2}$/.test(o.pais) ? o.pais : null, clubes: n(o.clubes), sectores: Math.max(1, n(o.sectores)) }
}
/** Cuántos caben en un canal de la plaza y cuántos canales hay como máximo. */
export const CUPO_PLAZA = 40, CANALES_PLAZA = 30
/** Supabase permite 5 track()/untrack() por cliente cada 30 s; dejamos margen (el untrack al salir también cuenta). */
const VENTANA_PRESENCIA = 30000, TRACKS_POR_VENTANA = 4

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

    /** `luego` recibe los cambios de estado posteriores (reconexión, cierre por el servidor). */
    const suscribir = (c: RealtimeChannel, luego?: (estado: string) => void) => new Promise<void>((ok, mal) => {
      let listo = false
      const t = setTimeout(() => { if (!listo) { listo = true; mal(new Error('SALA_SIN_CONEXION')) } }, 10000)
      c.subscribe(estado => {
        if (listo) { luego?.(estado); return }
        if (estado === 'SUBSCRIBED') { listo = true; clearTimeout(t); ok() }
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') { listo = true; clearTimeout(t); mal(new Error('SALA_SIN_CONEXION')) }
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
      if (!p || !esId(p.de) || !Number.isInteger(p.frase) || p.frase < 0 || p.frase >= FRASES.length) return
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
    /** `luego` recibe los cambios de estado posteriores (reconexión, cierre por el servidor). */
    const suscribir = (c: RealtimeChannel, luego?: (estado: string) => void) => new Promise<void>((ok, mal) => {
      let listo = false
      const t = setTimeout(() => { if (!listo) { listo = true; mal(new Error('SALA_SIN_CONEXION')) } }, 10000)
      c.subscribe(estado => {
        if (listo) { luego?.(estado); return }
        if (estado === 'SUBSCRIBED') { listo = true; clearTimeout(t); ok() }
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') { listo = true; clearTimeout(t); mal(new Error('SALA_SIN_CONEXION')) }
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

  perfilesPublicos(ids: string[]): Promise<PerfilPublico[]> {
    const lista = [...new Set(ids)].filter(esId).slice(0, 60)
    if (!lista.length) return Promise.resolve([])
    return this.rpc<unknown[]>('perfiles_publicos', { p_token: this.token(), p_ids: lista })
      .then(r => (Array.isArray(r) ? r : []).map(limpiarPublico).filter((j): j is PerfilPublico => !!j))
  }

  async campamento(lugar?: string): Promise<Campamento> {
    if (lugar !== undefined && !LUGAR.test(lugar)) throw new Error('LUGAR_INVALIDO')
    const r = await this.rpc<unknown>('campamento', { p_token: this.token(), p_lugar: lugar ?? null })
    const c = limpiarCampamento(r)
    if (!c) throw new Error('LUGAR_INVALIDO')
    return c
  }

  async dormir(si: boolean) { await this.rpc('dormir', { p_token: this.token(), p_si: si }) }

  async mapaCampamentos(): Promise<MapaCampamentos> {
    const r = await this.rpc<unknown>('mapa_campamentos', { p_token: this.token() })
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>
    const lugares = (Array.isArray(o.lugares) ? o.lugares : []).slice(0, 5000).map(limpiarLugar).filter((l): l is LugarMapa => !!l)
    return { mio: typeof o.mio === 'string' && BASE.test(o.mio) ? o.mio : '', lugares }
  }

  /**
   * Plaza Central: canales `plaza-N` de hasta CUPO_PLAZA jugadores. Se entra al primero con espacio.
   * Por el canal solo viajan ids y posiciones (el destino de cada caminata, no cada paso): muy pocos mensajes.
   */
  async plaza(yo: { id: string; clubId: string; llegada?: number }, pos: PuntoPlaza, ev: EventosPlaza, lugar?: string): Promise<ConexionPlaza> {
    if (!esId(yo.id)) throw new Error('SALA_SIN_CONEXION')
    if (lugar !== undefined && !LUGAR.test(lugar)) throw new Error('LUGAR_INVALIDO')
    // Cada campamento (región y sector) tiene sus propios canales; sin lugar, la plaza general de siempre
    const prefijo = lugar ? `camp-${lugar}-` : 'plaza-'
    /** `luego` recibe los cambios de estado posteriores (reconexión, cierre por el servidor). */
    const suscribir = (c: RealtimeChannel, luego?: (estado: string) => void) => new Promise<void>((ok, mal) => {
      let listo = false
      const t = setTimeout(() => { if (!listo) { listo = true; mal(new Error('SALA_SIN_CONEXION')) } }, 10000)
      c.subscribe(estado => {
        if (listo) { luego?.(estado); return }
        if (estado === 'SUBSCRIBED') { listo = true; clearTimeout(t); ok() }
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') { listo = true; clearTimeout(t); mal(new Error('SALA_SIN_CONEXION')) }
      })
    })
    for (let n = 1; n <= CANALES_PLAZA; n++) {
      const canal = this.sb.channel(prefijo + n, { config: { presence: { key: yo.id }, broadcast: { self: false } } })
      let elegido = false, primerSync: () => void = () => undefined
      const sincronizado = new Promise<void>(r => { primerSync = r })
      const presentes = new Set<string>()
      const leerPresentes = () => {
        const lista: PresenteEnPlaza[] = []
        presentes.clear()
        for (const [clave, v] of Object.entries(canal.presenceState())) {
          const m = v[0] as unknown as Record<string, unknown>
          if (!esId(clave) || clave === yo.id || !m) continue
          const pt = punto(m.x, m.y)
          if (!pt) continue
          presentes.add(clave); lista.push({ id: clave, ...pt, t: num(m.t, 0, 9e15), cer: m.cer === true, cul: m.cul === true, dur: m.dur === true })
          if (lista.length >= 80) break
        }
        return lista
      }
      canal.on('presence', { event: 'sync' }, () => { primerSync(); const l = leerPresentes(); if (elegido) ev.onPresentes?.(l) })
      // Cuando alguien nuevo entra, le contamos dónde estamos (por broadcast: no gasta el cupo de Presence)
      let saludar: () => void = () => undefined
      // (solo a quien no estaba: un track() de alguien que ya estaba también llega como 'join')
      canal.on('presence', { event: 'join' }, ({ key }) => { if (elegido && key !== yo.id && esId(key) && !presentes.has(key)) saludar() })
      canal.on('broadcast', { event: 'ir' }, ({ payload: p }) => {
        if (!elegido || !p || !esId(p.id) || !presentes.has(p.id)) return
        const desde = punto(p.x, p.y), hasta = punto(p.dx, p.dy)
        if (desde && hasta) ev.onIr?.({ id: p.id, desde, hasta })
      })
      canal.on('broadcast', { event: 'salto' }, ({ payload: p }) => {
        if (elegido && p && esId(p.id) && presentes.has(p.id)) ev.onSalto?.(p.id)
      })
      canal.on('broadcast', { event: 'gesto' }, ({ payload: p }) => {
        if (!elegido || !p || !esId(p.de) || !presentes.has(p.de) || !Number.isInteger(p.frase) || p.frase < 0 || p.frase >= FRASES.length) return
        ev.onGesto?.({ de: p.de, frase: Math.floor(p.frase) })
      })
      let cerrado = false, reconectando = false
      let alCambiar: (estado: string) => void = () => undefined
      try {
        await suscribir(canal, e => alCambiar(e))
      } catch (e) { await this.sb.removeChannel(canal).catch(() => undefined); throw e }
      await Promise.race([sincronizado, new Promise(r => setTimeout(r, 1500))])
      if (Object.keys(canal.presenceState()).length >= CUPO_PLAZA && n < CANALES_PLAZA) { cerrado = true; await this.sb.removeChannel(canal).catch(() => undefined); continue }

      elegido = true
      // Al reconectar se conserva la hora de llegada (decide el orden de las parcelas)
      const llegue = yo.llegada && yo.llegada > 0 && yo.llegada <= Date.now() ? yo.llegada : Date.now()
      const meta = { x: r2(pos.x), y: r2(pos.y), t: llegue, cer: false, cul: false, dur: false }
      let actual: PuntoPlaza = { x: meta.x, y: meta.y }

      /*
       * Supabase cierra el canal si un cliente hace más de 5 track() en 30 s (ClientPresenceRateLimitReached).
       * Por eso Presence guarda solo lo que cambia poco (dónde te detuviste, si estás formado, en el culto o durmiendo)
       * y todo pasa por este cupo: como mucho 4 envíos por ventana de 30 s, juntando los cambios que lleguen mientras.
       */
      const hechos: number[] = []
      let tPend = 0, pendHasta = 0
      const libreEn = () => {
        const ahora = Date.now()
        while (hechos.length && ahora - hechos[0] >= VENTANA_PRESENCIA) hechos.shift()
        return hechos.length < TRACKS_POR_VENTANA ? 0 : hechos[0] + VENTANA_PRESENCIA - ahora + 100
      }
      const enviarTrack = () => {
        tPend = 0
        if (cerrado) return
        const espera = libreEn()
        if (espera > 0) { programar(espera); return }
        hechos.push(Date.now())
        canal.track({ ...meta }).catch(() => undefined)
      }
      const programar = (espera: number) => {
        const cuando = Date.now() + espera
        if (tPend && pendHasta <= cuando) return
        clearTimeout(tPend); pendHasta = cuando
        tPend = window.setTimeout(enviarTrack, Math.max(0, espera))
      }
      /** Cambio de estado (formado, culto, durmiendo): sale apenas haya cupo. */
      const pedirEstado = () => programar(libreEn())
      /** Posición donde te detuviste: como mucho una vez cada 9 s (el movimiento en vivo va por broadcast). */
      const pedirPosicion = () => programar(Math.max(libreEn(), 9000 - (Date.now() - (hechos[hechos.length - 1] ?? 0))))

      let ultimo = 0, pendiente: { desde: PuntoPlaza; hasta: PuntoPlaza } | null = null, tIr = 0
      const enviarIr = () => {
        if (!pendiente || cerrado) return
        const { desde, hasta } = pendiente; pendiente = null; ultimo = Date.now()
        canal.send({ type: 'broadcast', event: 'ir', payload: { id: yo.id, x: r2(desde.x), y: r2(desde.y), dx: r2(hasta.x), dy: r2(hasta.y) } }).catch(() => undefined)
      }
      let tHola = 0, ultimoSalto = 0
      saludar = () => {
        if (tHola) return
        tHola = window.setTimeout(() => {
          tHola = 0
          if (cerrado) return
          canal.send({ type: 'broadcast', event: 'ir', payload: { id: yo.id, x: r2(actual.x), y: r2(actual.y), dx: r2(actual.x), dy: r2(actual.y) } }).catch(() => undefined)
        }, 500 + Math.random() * 900)
      }

      // Si el servidor cierra el canal (o se cae del todo), avisamos para volver a entrar
      alCambiar = estado => {
        if (cerrado) return
        if (estado === 'SUBSCRIBED') {
          // Tras una reconexión automática hay que volver a anunciarse
          if (reconectando) { reconectando = false; pedirEstado() }
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
          reconectando = true
        } else if (estado === 'CLOSED') {
          cerrado = true; clearTimeout(tIr); clearTimeout(tPend); clearTimeout(tHola)
          ev.onCaida?.()
        }
      }

      hechos.push(Date.now())
      await canal.track({ ...meta })
      ev.onPresentes?.(leerPresentes())
      return {
        canal: n,
        llegada: llegue,
        ir: (desde, hasta) => {
          pendiente = { desde, hasta }; actual = { x: hasta.x, y: hasta.y }
          const espera = 250 - (Date.now() - ultimo)
          if (espera <= 0) enviarIr()
          else if (!tIr) tIr = window.setTimeout(() => { tIr = 0; enviarIr() }, espera)
        },
        quieto: p => {
          actual = { x: p.x, y: p.y }
          // Solo si de verdad te moviste desde lo último que anunciaste
          if (Math.hypot(p.x - meta.x, p.y - meta.y) < 0.75) return
          meta.x = r2(p.x); meta.y = r2(p.y)
          pedirPosicion()
        },
        saltar: () => {
          if (cerrado || Date.now() - ultimoSalto < 500) return
          ultimoSalto = Date.now()
          canal.send({ type: 'broadcast', event: 'salto', payload: { id: yo.id } }).catch(() => undefined)
        },
        gesto: async frase => { if (!cerrado) await canal.send({ type: 'broadcast', event: 'gesto', payload: { de: yo.id, frase } }) },
        formar: si => { if (meta.cer === si) return; meta.cer = si; pedirEstado() },
        marcar: e => {
          const cul = (e.cul ?? meta.cul) === true, dur = (e.dur ?? meta.dur) === true
          if (cul === meta.cul && dur === meta.dur) return
          meta.cul = cul; meta.dur = dur; pedirEstado()
        },
        salir: async () => {
          cerrado = true
          clearTimeout(tIr); clearTimeout(tPend); clearTimeout(tHola)
          // Al dejar el canal, Presence te quita solo (un untrack() gastaría cupo sin necesidad)
          await this.sb.removeChannel(canal).catch(() => undefined)
        },
      }
    }
    throw new Error('SALA_SIN_CONEXION')
  }
}
