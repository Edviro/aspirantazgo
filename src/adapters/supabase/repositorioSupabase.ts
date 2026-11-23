import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Bolsa, ItemTienda, MiembroConAvatar, ClubRetable, ProgramaAdmin, ProgramaVivo, PuertoCulto, RetoClub, Torneo, TorneoAdmin,
  Alcance, AvatarConfig, CatalogoOrg, Estadisticas, ClubAdmin, ClubOficial, FilaRanking, SolicitudCargo, PuertoUnidades, Unidad, RolUnidad, JugadorAdmin, Perfil, PuertoAdmin, PuertoCuentas, PuertoLider,
  RegistroAdulto, RepositorioJuego, ResultadoServidor, Vidas, ResumenAdmin, SalaAdmin, SesionAdmin, SesionProgramada,
} from '../../application/puertos'
import type { Dificultad, Rango } from '../../domain/tipos'
import { SalasSupabase } from './salasSupabase'
import { VozSupabase } from './vozSupabase'

const CLAVE_TOKEN = 'asp_token'

const leerToken = () => { try { return localStorage.getItem(CLAVE_TOKEN) } catch { return null } }
const guardarToken = (t: string | null) => {
  try { if (t) localStorage.setItem(CLAVE_TOKEN, t); else localStorage.removeItem(CLAVE_TOKEN) } catch { /* sin almacenamiento */ }
}

/** Adaptador de salida: toda la comunicación con Supabase pasa por funciones RPC validadas en el servidor. */
const esUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const ROLES: RolUnidad[] = ['consejero', 'capitan', 'secretario', 'tesorero', 'capellan', 'miembro']
const RANGOS_OK = ['conquistador', 'lider', 'guia_mayor', 'gm_master', 'gm_master_avanzado']
/** Valida una unidad que llega del servidor. */
function limpiarUnidad(v: unknown): Unidad | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!esUuid(o.id)) return null
  const miembros = (Array.isArray(o.miembros) ? o.miembros : []).slice(0, 20).map(x => x as Record<string, unknown>)
    .filter(x => esUuid(x.id) && ROLES.includes(x.rol as RolUnidad))
    .map(x => ({ id: x.id as string, apodo: txt(x.apodo, 20), rango: (RANGOS_OK.includes(x.rango as string) ? x.rango : 'conquistador') as Unidad['miembros'][number]['rango'],
      avatar: x.avatar && typeof x.avatar === 'object' ? x.avatar as Unidad['miembros'][number]['avatar'] : null, rol: x.rol as RolUnidad }))
  return { id: o.id, nombre: txt(o.nombre, 30), sexo: o.sexo === 'f' ? 'f' : 'm', grito: txt(o.grito, 240) || null, historia: txt(o.historia, 4000) || null,
    creada: txt(o.creada, 40), miembros }
}

/** Valida cada club que llega del directorio (nunca se confía en la forma de la respuesta). */
function limpiarClubOficial(v: unknown): ClubOficial | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const txt = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '')
  const oficial = Number.isInteger(o.oficial) ? (o.oficial as number) : null
  const juego = typeof o.juego === 'string' && /^[0-9a-f-]{36}$/i.test(o.juego) ? o.juego : null
  const nombre = txt(o.nombre, 80)
  if ((oficial === null && juego === null) || !nombre) return null
  return {
    oficial, juego, nombre, region: txt(o.region, 80) || 'Sin región', ciudad: txt(o.ciudad, 60) || null,
    con_director: o.con_director === true, miembros: Number.isFinite(o.miembros) ? Math.max(0, Math.floor(o.miembros as number)) : 0,
  }
}

export class RepositorioSupabase implements RepositorioJuego {
  readonly enLinea = true
  readonly salas: SalasSupabase
  readonly cuentas: PuertoCuentas
  readonly lider: PuertoLider
  readonly admin: PuertoAdmin
  readonly culto: PuertoCulto
  readonly unidades: PuertoUnidades
  private sb: SupabaseClient

  constructor(url: string, clave: string) {
    this.sb = createClient(url, clave, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } })
    const rpc = <T,>(fn: string, args: Record<string, unknown> = {}) => this.rpc<T>(fn, args)
    const token = () => this.token
    this.salas = new SalasSupabase(this.sb, rpc, token)
    const sb = this.sb
    const volver = () => window.location.origin + window.location.pathname

    this.cuentas = {
      async entrarConGoogle() {
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volver() } })
        if (error) throw new Error(error.message)
      },
      async entrarConCorreo(email, clave) {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: clave })
        if (error) throw new Error(error.message)
      },
      async crearCuenta(email, clave) {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password: clave, options: { emailRedirectTo: volver() } })
        if (error) throw new Error(error.message)
        return data.session ? 'listo' : 'confirmar'
      },
      async recuperarClave(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: volver() })
        if (error) throw new Error(error.message)
      },
      async cambiarClave(nueva) {
        const { error } = await sb.auth.updateUser({ password: nueva })
        if (error) throw new Error(error.message)
      },
      alRecuperar(cb) {
        const { data } = sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') cb() })
        return () => data.subscription.unsubscribe()
      },
      catalogo: () => rpc<CatalogoOrg>('catalogo_org'),
      async esGoogle() {
        const { data } = await sb.auth.getUser()
        return !!data.user?.identities?.some(i => i.provider === 'google')
      },
      clubesOficiales: async campo => {
        const l = await rpc<unknown>('clubes_oficiales', { p_campo: campo })
        return (Array.isArray(l) ? l : []).map(limpiarClubOficial).filter((c): c is ClubOficial => !!c)
      },
      registrarAdulto: (d: RegistroAdulto) => rpc<Perfil>('registrar_adulto', {
        p_club: d.club, p_campo: d.campo, p_oficial: d.oficial ?? null, p_nombre_club: d.nombreClub ?? null, p_ciudad: d.ciudad ?? null, p_soy_director: d.soyDirector,
        p_apodo: d.apodo, p_rango: d.rango, p_cargo: d.cargo ?? null, p_acepta: d.acepta, p_autoriza: d.autoriza,
      }),
    }

    this.lider = {
      async solicitarSesion(d) {
        await rpc('solicitar_sesion', { p_token: token(), p_titulo: d.titulo, p_inicia: d.inicia, p_minutos: d.minutos, p_ninos: d.ninos, p_lideres: d.lideres, p_nota: d.nota })
      },
      misSesiones: () => rpc<SesionProgramada[]>('mis_sesiones', { p_token: token() }),
      async cancelarSesion(id) { await rpc('cancelar_sesion', { p_token: token(), p_id: id }) },
    }

    this.admin = {
      resumen: () => rpc<ResumenAdmin>('admin_resumen'),
      solicitudesCargo: async () => {
        const l = await rpc<unknown>('admin_solicitudes')
        return (Array.isArray(l) ? l : []).filter(x => x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string') as SolicitudCargo[]
      },
      async resolverSolicitudCargo(id, aprobar) { await rpc('admin_resolver_solicitud', { p_id: id, p_aprobar: aprobar }) },
      jugadores: buscar => rpc<JugadorAdmin[]>('admin_jugadores', { p_buscar: buscar || null, p_limite: 300 }),
      async bloquear(id, bloqueado) { await rpc('admin_bloquear', { p_id: id, p_bloqueado: bloqueado }) },
      async darVidas(id, cantidad) { return (await rpc<{ vidas: number }>('admin_dar_vidas', { p_id: id, p_cantidad: cantidad })).vidas },
      darVidasClub: (club, cantidad) => rpc<number>('admin_dar_vidas_club', { p_club: club, p_cantidad: cantidad }),
      async borrarJugador(id) { await rpc('admin_borrar_jugador', { p_id: id }) },
      clubes: buscar => rpc<ClubAdmin[]>('admin_clubes', { p_buscar: buscar || null }),
      async borrarClub(id) { await rpc('admin_borrar_club', { p_id: id }) },
      salas: () => rpc<SalaAdmin[]>('admin_salas'),
      async cerrarSala(codigo) { await rpc('admin_cerrar_sala', { p_codigo: codigo }) },
      sesiones: estado => rpc<SesionAdmin[]>('admin_sesiones', { p_estado: estado }),
      async resolverSesion(id, estado, respuesta) { await rpc('admin_resolver_sesion', { p_id: id, p_estado: estado, p_respuesta: respuesta }) },
      async config(clave, valor) { await rpc('admin_config', { p_clave: clave, p_valor: valor }) },
      importar: datos => rpc('admin_importar', { p_datos: datos }),
      torneos: () => rpc<TorneoAdmin[]>('admin_torneos'),
      crearTorneo: d => rpc<string>('admin_crear_torneo', { p_titulo: d.titulo, p_ambito: d.ambito, p_reto: d.reto, p_inicia: d.inicia, p_termina: d.termina, p_pais: d.pais }),
      async cancelarTorneo(id) { await rpc('admin_cancelar_torneo', { p_id: id }) },
      programas: () => rpc<ProgramaAdmin[]>('admin_programas'),
      guardarPrograma: p => rpc<string>('admin_programa_guardar', { p }),
      async estadoPrograma(id, estado) { await rpc('admin_programa_estado', { p_id: id, p_estado: estado }) },
    }

    const unidad = (v: unknown) => { const u = limpiarUnidad(v); if (!u) throw new Error('DATOS_INVALIDOS'); return u }
    this.unidades = {
      async estado() {
        const r = await rpc<unknown>('mi_unidad', { p_token: token() })
        const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>
        const sexo = (x: unknown): 'm' | 'f' => (x === 'f' ? 'f' : 'm')
        return {
          mia: o.mia ? limpiarUnidad(o.mia) : null, puedo_admin: o.puedo_admin === true, adulto: o.adulto === true, director: o.director === true, sexo: sexo(o.sexo),
          unidades: (Array.isArray(o.unidades) ? o.unidades : []).slice(0, 100).map(x => x as Record<string, unknown>).filter(x => esUuid(x.id))
            .map(x => ({ id: x.id as string, nombre: txt(x.nombre, 30), sexo: sexo(x.sexo), conquis: Number(x.conquis) || 0, consejeros: Number(x.consejeros) || 0 })),
          libres: (Array.isArray(o.libres) ? o.libres : []).slice(0, 500).map(x => x as Record<string, unknown>).filter(x => esUuid(x.id))
            .map(x => ({ id: x.id as string, apodo: txt(x.apodo, 20), sexo: sexo(x.sexo) })),
        }
      },
      crear: async (n, g, h) => unidad(await rpc('unidad_crear', { p_token: token(), p_nombre: n, p_grito: g, p_historia: h })),
      editar: async (id, n, g, h) => unidad(await rpc('unidad_editar', { p_token: token(), p_unidad: id, p_nombre: n, p_grito: g, p_historia: h })),
      serConsejero: async id => unidad(await rpc('unidad_ser_consejero', { p_token: token(), p_unidad: id })),
      asignar: async (u, j, r) => unidad(await rpc('unidad_asignar', { p_token: token(), p_unidad: u, p_player: j, p_rol: r })),
      async salir() { await rpc('unidad_salir', { p_token: token() }) },
    }

    const AVISO = 'v'
    this.culto = {
      actual: () => rpc<ProgramaVivo | null>('programa_actual', { p_token: token() }),
      decir: (programa, texto) => rpc<number>('programa_decir', { p_token: token(), p_programa: programa, p_texto: texto }),
      control: (programa, parte, diapositiva) => rpc<number>('programa_control', { p_token: token(), p_programa: programa, p_parte: parte, p_diapositiva: diapositiva }),
      diapositivas: (programa, orden, d) => rpc<number>('programa_diapositivas', { p_token: token(), p_programa: programa, p_orden: orden, p_diapositivas: d }),
      async estado(programa, estado) { await rpc('programa_estado', { p_token: token(), p_programa: programa, p_estado: estado }) },
      async borrarDicho(programa, id) { await rpc('programa_borrar_dicho', { p_token: token(), p_programa: programa, p_id: id }) },
      voz: VozSupabase.disponible() ? new VozSupabase(sb, rpc, token) : null,
      // Canal solo de avisos: lleva un número de versión, nunca contenido. Si alguien manda avisos falsos, lo único que
      // logra es que los demás vuelvan a preguntar al servidor (y eso está limitado en la pantalla).
      async escuchar(programa, onCambio) {
        if (!/^[0-9a-f-]{36}$/.test(programa)) throw new Error('DATOS_INVALIDOS')
        const ch = sb.channel(`culto-${programa}`, { config: { broadcast: { self: false, ack: false } } })
        ch.on('broadcast', { event: AVISO }, m => { const v = (m.payload as { v?: unknown })?.v; if (typeof v === 'number' && Number.isFinite(v)) onCambio(v) })
        await new Promise<void>(res => { ch.subscribe(st => { if (st === 'SUBSCRIBED' || st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') res() }) })
        return {
          avisar(v) { void ch.send({ type: 'broadcast', event: AVISO, payload: { v } }) },
          async salir() { await sb.removeChannel(ch) },
        }
      },
    }
  }

  private async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await this.sb.rpc(fn, args)
    if (error) throw new Error(error.message)
    return data as T
  }

  private get token() { return leerToken() }

  async sesionActual(): Promise<Perfil | null> {
    if (this.token) {
      try { return await this.rpc<Perfil>('mi_perfil', { p_token: this.token }) } catch { guardarToken(null) }
    }
    const { data } = await this.sb.auth.getSession()
    if (!data.session) return null
    try { return await this.rpc<Perfil>('mi_perfil', { p_token: null }) } catch { return null }
  }

  async adultoSinClub(): Promise<string | null> {
    const { data } = await this.sb.auth.getSession()
    if (!data.session) return null
    try { await this.rpc('mi_perfil', { p_token: null }); return null } catch { return data.session.user.email ?? 'adulto' }
  }

  async unirseNino(codigo: string, apodo: string, pin: string) {
    const r = await this.rpc<{ token: string; perfil: Perfil }>('unirse_nino', { p_codigo: codigo, p_apodo: apodo, p_pin: pin })
    guardarToken(r.token)
    return r.perfil
  }

  async entrarInvitado(codigo: string, nombre: string, club: string, clubId: string | null = null) {
    const r = await this.rpc<{ token: string; perfil: Perfil; codigo: string }>('entrar_invitado', { p_codigo: codigo, p_nombre: nombre, p_club: club, p_club_id: clubId })
    guardarToken(r.token)
    return { perfil: r.perfil, codigo: r.codigo }
  }

  async entrarNino(codigo: string, apodo: string, pin: string) {
    const r = await this.rpc<{ token: string; perfil: Perfil }>('entrar_nino', { p_codigo: codigo, p_apodo: apodo, p_pin: pin })
    guardarToken(r.token)
    return r.perfil
  }

  async guardarAvatar(a: AvatarConfig) { await this.rpc('guardar_avatar', { p_token: this.token, p_avatar: a }) }
  async solicitarCargo(tipo: 'director' | 'departamental') { return this.rpc<string>('solicitar_cargo', { p_token: this.token, p_tipo: tipo }) }
  async cambiarRango(r: Rango) { await this.rpc('cambiar_rango', { p_token: this.token, p_rango: r }) }

  iniciarReto(reto: string, dificultad: Dificultad, sala?: string | null, diario = false) {
    return sala
      ? this.rpc<string>('iniciar_reto_sala', { p_token: this.token, p_reto: reto, p_dificultad: dificultad, p_sala: sala })
      : this.rpc<string>('iniciar_reto', { p_token: this.token, p_reto: reto, p_dificultad: dificultad, p_diario: diario })
  }
  vidas() { return this.rpc<Vidas>('mis_vidas', { p_token: this.token }) }
  estadisticas() { return this.rpc<Estadisticas>('mis_estadisticas', { p_token: this.token }) }

  terminarReto(intento: string, puntaje: number) {
    return this.rpc<ResultadoServidor>('terminar_reto', { p_token: this.token, p_intento: intento, p_puntaje: puntaje })
  }

  misPuntajes() { return this.rpc<Record<string, number>>('mis_puntajes', { p_token: this.token }) }

  ranking(alcance: Alcance, pais?: string) {
    return this.rpc<FilaRanking[]>('ranking_v2', { p_alcance: alcance, p_pais: pais ?? null, p_limite: 50, p_token: this.token })
  }

  miembrosClub() { return this.rpc<{ apodo: string; rango: string; grupo_edad: string; puntos: number }[]>('miembros_de_mi_club') }
  bolsa() { return this.rpc<Bolsa>('mi_bolsa', { p_token: this.token }) }
  catalogoTienda() { return this.rpc<ItemTienda[]>('tienda_catalogo') }
  comprar(item: string) {
    if (!/^[a-z0-9-]{3,30}$/.test(item)) return Promise.reject(new Error('ITEM_INVALIDO'))
    return this.rpc<Bolsa>('comprar', { p_token: this.token, p_item: item })
  }
  directorMiembros() { return this.rpc<MiembroConAvatar[]>('director_miembros') }
  async directorGuardarAvatar(id: string, a: AvatarConfig) { await this.rpc('director_guardar_avatar', { p_id: id, p_avatar: a }) }
  async guardarBanderaClub(bandera: string | null) {
    if (bandera !== null && !/^p:([0-9a-f]{6},){0,15}[0-9a-f]{6};d:[0-9a-f]{384}$/.test(bandera)) throw new Error('BANDERA_INVALIDA')
    await this.rpc('guardar_bandera_club', { p_bandera: bandera })
  }

  torneos() { return this.rpc<Torneo[]>('torneos_vigentes', { p_token: this.token }) }
  clubesParaRetar(buscar: string) { return this.rpc<ClubRetable[]>('clubes_para_retar', { p_buscar: buscar }) }
  directorRetar(d: { rivales: string[]; reto: string; inicia: string; dias: number; titulo: string }) {
    return this.rpc<string>('director_retar', { p_rivales: d.rivales, p_reto: d.reto, p_inicia: d.inicia, p_dias: d.dias, p_titulo: d.titulo })
  }
  directorRetos() { return this.rpc<RetoClub[]>('director_retos') }
  async directorResponderReto(id: string, acepta: boolean) { await this.rpc('director_responder_reto', { p_id: id, p_acepta: acepta }) }
  async directorCancelarReto(id: string) { await this.rpc('director_cancelar_reto', { p_id: id }) }

  async borrarMiembro(apodo: string) { await this.rpc('borrar_jugador_de_mi_club', { p_apodo: apodo }) }

  async borrarMisDatos() {
    await this.rpc('borrar_mis_datos', { p_token: this.token })
    await this.salir()
  }

  async salir() {
    guardarToken(null)
    await this.sb.auth.signOut().catch(() => undefined)
  }
}
