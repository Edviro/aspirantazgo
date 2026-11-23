import type { Dificultad, GrupoEdad, Rango } from '../domain/tipos'

/** Puertos (interfaces) de la arquitectura hexagonal. La UI solo conoce estos contratos. */

export interface Perfil {
  id: string
  apodo: string
  rango: Rango
  grupo_edad: GrupoEdad
  avatar: AvatarConfig
  cargo?: string | null
  /** Solo el dueño del juego (lo decide el servidor). */
  superadmin?: boolean
  /** Invitado de una sala (sin cuenta): solo puede jugar en esa sala y se borra solo. */
  invitado?: boolean
  club: { id?: string; nombre: string; codigo: string | null; ciudad: string; campo: string; union?: string | null; pais: string; soy_director?: boolean; /** Bandera del club en pixel art (texto validado por el servidor). */ bandera?: string | null }
}

export interface AvatarConfig {
  genero?: 'm' | 'f'
  piel?: number
  pelo?: number
  colorPelo?: number
  /** El aspirante la gana en la Ceremonia de la pañoleta. */
  panoleta?: boolean
  /** Lo que aparece en la tira del nombre (por defecto, el apodo). */
  nombreTira?: string
  /** Nombre de su unidad (va en el banderín). */
  unidad?: string
  /** Uniforme configurado por el propio jugador (sobre todo líderes). */
  uniforme?: {
    regulares?: string[]
    avanzadas?: string[]
    anios?: number
    cargo?: string
    galon?: 'ninguno' | 'director' | 'distrital' | 'regional' | 'departamental'
    bautismo?: boolean
    excelencia?: boolean
  }
}

export type Alcance = 'jugador' | 'mi_club' | 'club' | 'campo' | 'union' | 'pais'

export interface FilaRanking {
  posicion: number
  nombre: string
  detalle: string | null
  pais: string | null
  puntos: number
  jugadores: number
  avatar?: AvatarConfig | null
  rango?: Rango | null
  /** La fila es mía o de mi club (lo marca el servidor). */
  es_mio?: boolean
}

export interface Estadisticas { duelos_jugados: number; duelos_ganados: number; partidas: number; salas: number }

export interface ResultadoDuelo { terminado: boolean; ganador: string | null; abandono?: boolean; jugadores: { id: string; puntaje: number | null; segundos: number | null; posicion?: number | null }[] }

export interface FilaSala { id: string; apodo: string; club: string; avatar: AvatarConfig | null; rango: Rango; puntaje: number; segundos: number; posicion: number }
export interface FilaTotalSala extends FilaSala { rondas: number }

export interface ResultadoServidor {
  /** ConquisCoins ganadas con esta partida (0 si no aprobó o ya llegó al tope del día). */
  monedas?: number
  puntaje: number
  mejor: number
  puesto: number
  /** Vidas después de esta partida (null en salas y duelos). */
  vidas?: Vidas | null
  vida_recuperada?: boolean
  vidas_recargadas?: boolean
  uso_vida?: boolean
}

/**
 * Vidas (guardadas en el servidor). Cada desafío usa 1 al empezar y se recupera si lo apruebas.
 * +1 cada 20 min; el reto del día es gratis una vez al día y, si lo cumples, recarga todas.
 */
export interface Vidas {
  vidas: number
  max: number
  /** Segundos para la próxima vida (null si están llenas). */
  proxima_s: number | null
  racha: number
  /** ¿Todavía tienes el intento gratis del reto del día? */
  diario_gratis: boolean
  reto_hoy: string
  diario_hecho: boolean
}

// ---------- Organización (país > unión > asociación/misión > club) ----------
export interface CatalogoOrg {
  paises: { codigo: string; nombre: string }[]
  uniones: { id: number; pais: string; nombre: string }[]
  campos: { id: number; union: number; nombre: string; tipo: 'asociacion' | 'mision' }[]
}
/** Club del directorio oficial de la DSA (y, si ya juega, su club en el juego). */
export interface ClubOficial { oficial: number | null; juego: string | null; nombre: string; region: string; ciudad: string | null; con_director: boolean; miembros: number }
export interface RegistroAdulto {
  club: string | null
  campo: number | null
  /** Id del club en el directorio oficial (cuando aún no existe en el juego). */
  oficial?: number | null
  nombreClub?: string
  ciudad?: string
  soyDirector: boolean
  apodo: string
  rango: Rango
  cargo?: string
  acepta: boolean
  autoriza: boolean
}

/** Cuentas de adultos con Supabase Auth: correo y contraseña, o Google. */
export interface PuertoCuentas {
  entrarConGoogle(): Promise<void>
  entrarConCorreo(email: string, clave: string): Promise<void>
  /** Devuelve 'confirmar' si hay que abrir el enlace del correo antes de entrar. */
  crearCuenta(email: string, clave: string): Promise<'confirmar' | 'listo'>
  recuperarClave(email: string): Promise<void>
  cambiarClave(nueva: string): Promise<void>
  /** Avisa cuando el usuario vuelve desde el enlace de "olvidé mi contraseña". */
  alRecuperar(cb: () => void): () => void
  catalogo(): Promise<CatalogoOrg>
  /** ¿La cuenta entró con Google? (ser director lo exige por ahora) */
  esGoogle(): Promise<boolean>
  clubesOficiales(campo: number): Promise<ClubOficial[]>
  /** `pendiente`: el club ya tiene director y él debe aprobar tu ingreso. */
  registrarAdulto(d: RegistroAdulto): Promise<Perfil & { pendiente?: boolean }>
}

// ---------- Sesiones programadas (el líder solicita, el administrador aprueba) ----------
export interface SesionProgramada {
  id: string; titulo: string; inicia: string; minutos: number; cupo_ninos: number; cupo_lideres: number
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'; respuesta: string | null; nota: string | null
}
export interface PuertoLider {
  solicitarSesion(d: { titulo: string; inicia: string; minutos: number; ninos: number; lideres: number; nota: string }): Promise<void>
  misSesiones(): Promise<SesionProgramada[]>
  cancelarSesion(id: string): Promise<void>
  /** Director: quiénes pidieron entrar al club y esperan su aprobación. */
  pendientes?(): Promise<PendienteClub[]>
  aprobarIngreso?(id: string, aprobar: boolean): Promise<void>
}
export interface PendienteClub { id: string; apodo: string; grupo_edad: 'menor' | 'adulto'; rango: string; cargo: string | null; creado: string }

// ---------- Administración (solo superadmin; el servidor lo verifica en cada llamada) ----------
export interface ResumenAdmin {
  ninos: number; adultos: number; clubes: number; activos_24h: number; activos_7d: number; nuevos_7d: number
  salas_abiertas: number; duelos_hoy: number; solicitudes: number; partidas_7d: number
  salas_requieren_aprobacion: boolean; max_jugadores_sala: number
}
export interface JugadorAdmin {
  id: string; apodo: string; rango: string; grupo_edad: string; cargo: string | null; email: string | null; club: string; campo: string; pais: string
  puntos: number; creado: string; ultima_actividad: string; bloqueado: boolean; director: boolean
}
export interface ClubAdmin { id: string; nombre: string; codigo: string; ciudad: string; campo: string; union_nombre: string | null; pais: string; director: string | null; miembros: number; ninos: number; creado: string }
export interface SalaAdmin { codigo: string; tipo: 'sala' | 'duelo'; anfitrion: string | null; rival: string | null; club: string | null; entradas: number; cupo: number; creada: string; abierta: boolean; sesion: string | null }
export interface SesionAdmin extends SesionProgramada { club: string; campo: string; solicitante: string; email: string | null; creado: string }
/** Pedido de cargo que requiere aprobación (director del club o uniforme de Departamental). */
export interface SolicitudCargo {
  id: string; tipo: 'director' | 'departamental'; estado: string; nota: string | null; creada: string
  apodo: string; rango: string; club: string; campo: string | null; correo: string | null; google: boolean; club_con_director: boolean
}
export interface PuertoAdmin {
  resumen(): Promise<ResumenAdmin>
  solicitudesCargo?(): Promise<SolicitudCargo[]>
  museoPendientes?(): Promise<(PiezaMuseo & { club: string; campo: string | null; creada: string })[]>
  resolverMuseo?(id: string, aprobar: boolean): Promise<void>
  resolverSolicitudCargo?(id: string, aprobar: boolean): Promise<void>
  jugadores(buscar: string): Promise<JugadorAdmin[]>
  bloquear(id: string, bloqueado: boolean): Promise<void>
  borrarJugador(id: string): Promise<void>
  clubes(buscar: string): Promise<ClubAdmin[]>
  borrarClub(id: string): Promise<void>
  salas(): Promise<SalaAdmin[]>
  cerrarSala(codigo: string): Promise<void>
  sesiones(estado: string | null): Promise<SesionAdmin[]>
  resolverSesion(id: string, estado: 'aprobada' | 'rechazada', respuesta: string): Promise<void>
  config(clave: 'salas_requieren_aprobacion' | 'max_jugadores_sala', valor: boolean | number): Promise<void>
  importar(datos: unknown): Promise<{ uniones: number; campos: number; clubes_nuevos: number }>
  /** Regala vidas (1 a 10; el total no pasa de 10). Devuelve cuántas tiene ahora. */
  darVidas(id: string, cantidad: number): Promise<number>
  /** Regala vidas a todos los miembros de un club. Devuelve a cuántos jugadores. */
  darVidasClub(club: string, cantidad: number): Promise<number>
  /** Torneos abiertos por ámbito (clubes, asociaciones, uniones o países), opcionalmente solo de un país. */
  torneos?(): Promise<TorneoAdmin[]>
  crearTorneo?(d: { titulo: string; ambito: AmbitoTorneo; reto: string; inicia: string; termina: string; pais: string | null }): Promise<string>
  cancelarTorneo?(id: string): Promise<void>
  /** Programas (cultos) del escenario: partes, equipo y lo que se proyecta. */
  programas?(): Promise<ProgramaAdmin[]>
  guardarPrograma?(p: ProgramaAdmin): Promise<string>
  estadoPrograma?(id: string, estado: 'en_vivo' | 'terminado' | 'cancelado' | 'programado'): Promise<void>
}

export interface RepositorioJuego {
  readonly enLinea: boolean
  sesionActual(): Promise<Perfil | null>
  /** Hay sesión de adulto (correo verificado) pero aún no pertenece a un club. */
  adultoSinClub(): Promise<string | null>
  unirseNino(codigo: string, apodo: string, pin: string): Promise<Perfil>
  /** Entrar a una sala solo con nombre y club (cuenta temporal de esa sala). Devuelve el perfil y el código. */
  /** clubId: el club elegido de la lista (o null si lo escribió a mano; entonces vale `club`). */
  entrarInvitado?(codigo: string, nombre: string, club: string, clubId?: string | null): Promise<{ perfil: Perfil; codigo: string }>
  entrarNino(codigo: string, apodo: string, pin: string): Promise<Perfil>
  guardarAvatar(a: AvatarConfig): Promise<void>
  /** Pide un cargo que requiere aprobación del superadmin (devuelve el estado). */
  solicitarCargo?(tipo: 'director' | 'departamental'): Promise<string>
  /** Solo adultos: actualizar el rango cuando reciben una investidura. */
  cambiarRango(r: Rango): Promise<void>
  /** Si se juega dentro de una sala o duelo, el intento queda ligado a ella (el servidor valida el resultado). */
  iniciarReto(reto: string, dificultad: Dificultad, sala?: string | null, diario?: boolean): Promise<string>
  /** Vidas del jugador (null = sin límite, p. ej. en modo práctica). */
  vidas(): Promise<Vidas | null>
  estadisticas(): Promise<Estadisticas>
  terminarReto(intento: string, puntaje: number): Promise<ResultadoServidor>
  misPuntajes(): Promise<Record<string, number>>
  ranking(alcance: Alcance, pais?: string): Promise<FilaRanking[]>
  miembrosClub(): Promise<{ apodo: string; rango: string; grupo_edad: string; puntos: number }[]>
  /** ConquisCoins y lo que compraste (solo en línea). */
  bolsa?(): Promise<Bolsa>
  catalogoTienda?(): Promise<ItemTienda[]>
  comprar?(item: string): Promise<Bolsa>
  /** Director: personajes de su club (para cambiarlos: los niños no pueden cambiar el suyo una vez armado). */
  directorMiembros?(): Promise<MiembroConAvatar[]>
  directorGuardarAvatar?(id: string, a: AvatarConfig): Promise<void>
  /** Director: bandera del club en pixel art (o null para quitarla). */
  guardarBanderaClub?(bandera: string | null): Promise<void>
  /** Torneos y retos entre clubes que puede jugar (con su tabla). */
  torneos?(): Promise<Torneo[]>
  /** Director: retar a otros clubes y responder a los retos. */
  clubesParaRetar?(buscar: string): Promise<ClubRetable[]>
  directorRetar?(d: { rivales: string[]; reto: string; inicia: string; dias: number; titulo: string }): Promise<string>
  directorRetos?(): Promise<RetoClub[]>
  directorResponderReto?(id: string, acepta: boolean): Promise<void>
  directorCancelarReto?(id: string): Promise<void>
  /** Cultos en vivo en el escenario (null en modo práctica). */
  readonly culto?: PuertoCulto | null
  borrarMiembro(apodo: string): Promise<void>
  borrarMisDatos(): Promise<void>
  salir(): Promise<void>
  /** Salas en vivo (null si el adaptador no las soporta, como el modo práctica). */
  readonly salas: PuertoSalas | null
  readonly cuentas: PuertoCuentas | null
  readonly lider: PuertoLider | null
  readonly admin: PuertoAdmin | null
  /** Unidades del club (solo en línea). */
  readonly unidades?: PuertoUnidades
  /** Perfil y museo del club (solo en línea). */
  readonly clubPerfil?: PuertoClubPerfil
}

// ---------- Perfil y museo del club ----------
export type TipoPieza = 'polo' | 'trofeo' | 'parche' | 'pin' | 'foto' | 'otro'
export interface PiezaMuseo { id: string; tipo: TipoPieza; titulo: string; anio: number | null; campamento: string | null; descripcion: string | null; ruta: string | null; estado: 'pendiente' | 'aprobada' | 'rechazada' }
export type RedesClub = Partial<Record<'facebook' | 'instagram' | 'tiktok' | 'youtube', string>>
export interface PerfilClub {
  id: string; nombre: string; ciudad: string | null; campo: string | null; union: string | null; pais: string | null; bandera: string | null
  fundacion: number | null; historia: string | null; redes: RedesClub; soy_director: boolean; miembros: number; unidades: number; piezas: PiezaMuseo[]
}
export interface PuertoClubPerfil {
  perfil(club?: string): Promise<PerfilClub>
  editar(fundacion: number | null, historia: string, redes: RedesClub): Promise<void>
  /** Achica la foto en el equipo (sin datos de ubicación) y la sube al almacén privado del club. Devuelve su ruta. */
  subirFoto(clubId: string, archivo: File): Promise<string>
  agregar(p: { tipo: TipoPieza; titulo: string; anio: number | null; campamento: string; descripcion: string; ruta: string | null }): Promise<void>
  borrar(id: string): Promise<void>
  /** URL temporal para ver una foto (solo si está aprobada, o si eres su director o el superadmin). */
  urlFoto(ruta: string): Promise<string | null>
}

// ---------- Salas en tiempo real ----------
export interface JugadorSala { id: string; apodo: string; club: string; avatar?: AvatarConfig; anfitrion?: boolean; rango?: Rango }
export interface InicioRonda { ronda: number; nivelId: string; dificultad: Dificultad; semilla: number; cuentaAtras: number }
export interface ProgresoSala { id: string; apodo: string; avance: number; puntaje?: number; segundos?: number; ronda: number }

export interface EventosSala {
  onJugadores?: (j: JugadorSala[]) => void
  onInicio?: (r: InicioRonda) => void
  onProgreso?: (p: ProgresoSala) => void
  onCerrada?: () => void
}

export interface ConexionSala {
  codigo: string
  iniciarRonda(r: InicioRonda): Promise<void>
  enviarProgreso(p: ProgresoSala): Promise<void>
  cerrar(): Promise<void>
  salir(): Promise<void>
}

export interface PuertoSalas {
  /** El servidor crea la sala (valida permisos, horario y cupos) y devuelve su código. */
  abrir(sesionId?: string | null): Promise<{ codigo: string; cupo: number }>
  /** El servidor valida que la sala exista, tenga cupo y que puedas entrar. */
  entrar(codigo: string): Promise<{ codigo: string; tipo: 'sala' | 'duelo'; anfitrion: boolean }>
  cerrar(codigo: string): Promise<void>
  /** Reto de 2 a 4 jugadores: tú más 1 a 3 rivales. Devuelve el código de la sala del reto. */
  crearReto(rivalIds: string[]): Promise<string>
  resultadoDuelo(codigo: string): Promise<ResultadoDuelo>
  /** Si el rival se desconectó, el servidor puede darte la victoria (lo valida con los tiempos guardados). */
  reclamarAbandono(codigo: string): Promise<ResultadoDuelo>
  /** Resultado OFICIAL de una ronda de sala, calculado por el servidor con los intentos guardados. */
  /** Puntaje acumulado de todas las dinámicas de la sala. */
  totalSala(codigo: string): Promise<FilaTotalSala[]>
  resultadoSala(codigo: string, reto: string, desde: string): Promise<FilaSala[]>
  /**
   * `avanceEnVivo`: recibir el avance de cada jugador al instante (el anfitrión y los duelos).
   * En salas grandes los jugadores reciben un resumen del anfitrión cada pocos segundos (así escala a cientos).
   */
  conectar(codigo: string, yo: JugadorSala, eventos: EventosSala, avanceEnVivo: boolean): Promise<ConexionSala>
  /** Tu isla (club) en vivo, las islas vecinas (cada 30 s) y tu buzón de invitaciones. */
  presencia(yo: JugadorEnLinea, eventos: EventosPresencia): Promise<ConexionPresencia>
  /**
   * Plaza Central (mundo abierto): te pone en un canal con espacio (Plaza 1, 2, 3…). El canal solo lleva ids y
   * posiciones; los nombres y avatares se piden con `perfilesPublicos` (vienen de la base de datos).
   */
  plaza(yo: { id: string; clubId: string; llegada?: number }, pos: PuntoPlaza, eventos: EventosPlaza, lugar?: string): Promise<ConexionPlaza>
  perfilesPublicos(ids: string[]): Promise<PerfilPublico[]>
  /** Campamento de una región (el tuyo si no se indica `lugar`): cada club con su parcela fija y sus carpas. */
  campamento?(lugar?: string): Promise<Campamento>
  /** Campamentos con clubes jugando, para viajar por el mapa (país → unión → asociación → región). */
  mapaCampamentos?(): Promise<MapaCampamentos>
  /** Acostarse (o levantarse) en tu carpa: los demás lo ven aunque salgas del juego. */
  dormir?(si: boolean): Promise<void>
}

// ---------- Campamentos por región ----------
export interface ClubCampamento {
  id: string; nombre: string; pais: string | null; bandera: string | null; ciudad: string | null
  /** Parcela fija dentro del campamento (0-10). */
  parcela: number
  /** Ids de los miembros en orden de registro (varones / damas): definen su carpa fija. */
  m: string[]; f: string[]
  /** Quiénes están durmiendo en su carpa (aunque no estén conectados). */
  z: string[]
  /** Carpas en orden (por unidad: 4 conquistadores y su consejero); si falta, se usan m/f de a 4. */
  carpas?: { s: 'm' | 'f'; u?: string; n?: string; ids: string[] }[]
}

// ---------- Unidades (4 a 8 conquistadores del mismo sexo, con su consejero) ----------
export type RolUnidad = 'consejero' | 'capitan' | 'secretario' | 'tesorero' | 'capellan' | 'miembro'
export interface MiembroUnidad { id: string; apodo: string; rango: Rango; avatar: AvatarConfig | null; rol: RolUnidad }
export interface Unidad { id: string; nombre: string; sexo: 'm' | 'f'; grito: string | null; historia: string | null; creada: string; miembros: MiembroUnidad[] }
export interface EstadoUnidad {
  mia: Unidad | null; puedo_admin: boolean; adulto: boolean; director: boolean; sexo: 'm' | 'f'
  unidades: { id: string; nombre: string; sexo: 'm' | 'f'; conquis: number; consejeros: number }[]
  libres: { id: string; apodo: string; sexo: 'm' | 'f' }[]
}
export interface PuertoUnidades {
  estado(): Promise<EstadoUnidad>
  crear(nombre: string, grito: string, historia: string): Promise<Unidad>
  editar(id: string, nombre: string, grito: string, historia: string): Promise<Unidad>
  serConsejero(id: string): Promise<Unidad>
  /** Agregar, cambiar de cargo (rotar) o quitar (rol null) a un conquistador. */
  asignar(unidad: string, jugador: string, rol: Exclude<RolUnidad, 'consejero'> | null): Promise<Unidad>
  salir(): Promise<void>
}
export interface Campamento {
  /** Clave del campamento (canal en vivo), p. ej. 'r1632-0'. */
  lugar: string; base: string; sector: number; sectores: number
  titulo: string; asociacion: string | null; union: string | null; pais: string | null
  /** ¿Es el campamento de tu club? */
  mio: boolean
  clubes: ClubCampamento[]
}
export interface LugarMapa { base: string; titulo: string; asociacion: string | null; union: string | null; pais: string | null; clubes: number; sectores: number }
export interface MapaCampamentos { mio: string; lugares: LugarMapa[] }

// ---------- Tienda (ConquisCoins) ----------
export interface Bolsa { saldo: number; ganadas_hoy: number; tope: number; items: string[] }
export interface ItemTienda { id: string; tipo: 'pin' | 'parche' | 'objeto'; nombre: string; precio: number }
export interface MiembroConAvatar { id: string; apodo: string; rango: Rango; grupo_edad: GrupoEdad; avatar: AvatarConfig }

/** Lo que se muestra de otro jugador en el mundo abierto (todo viene de la base de datos). */
export interface PerfilPublico extends JugadorEnLinea {
  pais?: string; campo?: string; union?: string; bandera?: string | null
  /** Niveles aprobados (400 puntos o más). */
  aprobados?: number
  pines?: string[]
  /** Dónde es el mejor: 'mundo' | 'pais' | 'union' | 'campo' | 'club'. */
  campeon?: string[]
}

// ---------- Plaza Central (mundo abierto) ----------
/** Posición en baldosas del mapa de la plaza. */
export interface PuntoPlaza { x: number; y: number }
/** `t`: cuándo llegó (ordena las parcelas de los clubes); `cer`: está formado para la ceremonia de banderas. */
/** cer: formado para la ceremonia; cul: mirando el culto (en su asiento); dur: durmiendo en su carpa. */
export interface PresenteEnPlaza { id: string; x: number; y: number; t: number; cer: boolean; cul?: boolean; dur?: boolean }
export interface EventosPlaza {
  /** Quiénes están en tu canal y dónde estaban al entrar o al detenerse. */
  onPresentes?: (lista: PresenteEnPlaza[]) => void
  /** Alguien empezó a caminar de `desde` hacia `hasta`. */
  onIr?: (m: { id: string; desde: PuntoPlaza; hasta: PuntoPlaza }) => void
  onGesto?: (g: { de: string; frase: number }) => void
  /** Alguien saltó. */
  onSalto?: (id: string) => void
  /** El canal se cerró solo (corte de red o límite del servidor): hay que volver a entrar. */
  onCaida?: () => void
}
export interface ConexionPlaza {
  /** Número de canal (Plaza 1, Plaza 2…). */
  canal: number
  /** Cuándo llegaste al canal (ordena las parcelas de los clubes). */
  llegada: number
  /** Avisa que caminas (se agrupan los envíos: máximo ~4 por segundo). */
  ir(desde: PuntoPlaza, hasta: PuntoPlaza): void
  /** Guarda dónde te detuviste, para quien entre después (como mucho cada 3 s). */
  quieto(pos: PuntoPlaza): void
  gesto(frase: number): Promise<void>
  /** Avisa que te formas (o ya no) para el izamiento o el arriamiento. */
  formar(si: boolean): void
  /** Avisa que miras el culto desde tu asiento o que duermes en tu carpa. */
  marcar(e: { cul?: boolean; dur?: boolean }): void
  salir(): Promise<void>
  /** Saltar (se avisa a los demás por broadcast; como mucho 2 por segundo). */
  saltar(): void
}

// ---------- Presencia y duelos ----------
export interface JugadorEnLinea { id: string; apodo: string; rango: Rango; avatar?: AvatarConfig; club: string; clubId: string; ocupado?: boolean; /** Posición en la isla (0 a 1). */ x?: number }
/** Frases fijas para saludarse (no hay chat libre: así se protege a los niños). */
/** Frases y caritas fijas (no hay chat libre: nadie puede escribir cosas feas ni datos personales). Solo se agregan al final. */
export const FRASES = ['¡Hola!', '¡Maranata!', '¡Te reto!', '¡Bien jugado!', '¡Vamos club!', '¡Gracias!', '¡Casi!', '¡A practicar!', '👏', '🔥', '😄', '🏆', '¿Jugamos?', '¡Siempre listos!', '¡Amén!', '🙏', '🙌'] as const
/** `otros`: apodos de los demás invitados (si es un reto en grupo). */
export interface InvitacionDuelo { para: string; de: JugadorEnLinea; codigo: string; nivelId: string; dificultad: Dificultad; otros?: string[] }
export interface RespuestaDuelo { para: string; de: string; codigo: string; acepta: boolean }
export interface EventosPresencia {
  onLista?: (j: JugadorEnLinea[]) => void
  onInvitacion?: (i: InvitacionDuelo) => void
  onRespuesta?: (r: RespuestaDuelo) => void
  onGesto?: (g: { de: string; frase: number }) => void
}
export interface ConexionPresencia {
  invitar(i: InvitacionDuelo): Promise<void>
  responder(r: RespuestaDuelo): Promise<void>
  /** Avisa si estás jugando un nivel (para que no te reten en ese momento). */
  ocupado(si: boolean): Promise<void>
  /** Tu posición en la isla (0 a 1). */
  mover(x: number): Promise<void>
  gesto(de: string, frase: number): Promise<void>
  /** Vuelve a pedir quiénes están conectados en otras islas. */
  refrescarOtros(): Promise<void>
  salir(): Promise<void>
}

// ---------- Torneos: retos entre clubes, asociaciones, uniones y países ----------
export type AmbitoTorneo = 'clubes' | 'campos' | 'uniones' | 'paises'
export interface FilaTorneo { nombre: string; pais?: string | null; puntos: number; jugadores: number; mio?: boolean; puesto?: number }
export interface Torneo {
  id: string; titulo: string; tipo: 'abierto' | 'clubes'; ambito: AmbitoTorneo; reto: string; inicia: string; termina: string; pais: string | null
  top: FilaTorneo[]; mio: FilaTorneo | null; grupos: number
}
export interface TorneoAdmin {
  id: string; titulo: string; tipo: 'abierto' | 'clubes'; ambito: AmbitoTorneo; reto: string; inicia: string; termina: string; pais: string | null
  estado: 'pendiente' | 'activo' | 'cancelado'; clubes: number; top: FilaTorneo[] | null
}
export interface RetoClub {
  id: string; titulo: string; reto: string; inicia: string; termina: string; estado: 'pendiente' | 'activo' | 'cancelado'
  mio: boolean; mi_respuesta: boolean | null; retador: string; clubes: { nombre: string; acepto: boolean | null }[]
}
export interface ClubRetable { id: string; nombre: string; ciudad: string | null; campo: string | null; pais: string | null }

// ---------- Cultos y programas en vivo ----------
export type TipoParte = 'bienvenida' | 'himno' | 'oracion' | 'lectura' | 'mensaje' | 'especial' | 'anuncios' | 'despedida'
export type RolPrograma = 'conductor' | 'participante'
export interface ParteVivo { orden: number; titulo: string; tipo: TipoParte; responsable: string | null; apodo: string | null }
export interface MiembroPrograma { id: string; apodo: string; rango: Rango; avatar: AvatarConfig; club: string; rol: RolPrograma }
export interface Dicho { id: number; de: string; apodo: string; texto: string }
export interface ProgramaVivo {
  id: string; titulo: string; inicia: string; minutos: number; estado: 'programado' | 'en_vivo'
  youtube: string | null; parte: number; diapositiva: number; version: number; texto: string | null; total_diapositivas: number | null
  partes: ParteVivo[]; equipo: MiembroPrograma[]; dichos: Dicho[]
  mi_rol: RolPrograma | null; mis_partes: { orden: number; diapositivas: string[] }[]
  /** Quién tiene el micrófono abierto y la huella de su conexión (solo se acepta audio con esa huella). */
  microfono?: { de: string; apodo: string; huella: string } | null
  /** Si tú puedes abrir el micrófono ahora (conductor o responsable de la parte actual). */
  puedo_hablar?: boolean
}
export interface ProgramaAdmin {
  id?: string; titulo: string; inicia: string; minutos: number; estado?: string; youtube: string | null
  partes: { titulo: string; tipo: TipoParte; responsable: string | null; diapositivas: string[] }[]
  equipo: { id: string; rol: RolPrograma; apodo?: string; club?: string }[]
}
export interface AvisosCulto { avisar(version: number): void; salir(): Promise<void> }
export interface PuertoCulto {
  actual(): Promise<ProgramaVivo | null>
  decir(programa: string, texto: string): Promise<number>
  control(programa: string, parte: number, diapositiva: number): Promise<number>
  diapositivas(programa: string, orden: number, d: string[]): Promise<number>
  estado(programa: string, estado: 'en_vivo' | 'terminado'): Promise<void>
  borrarDicho(programa: string, id: number): Promise<void>
  /** Voz en vivo del que tiene el turno (null si el navegador no puede). */
  readonly voz?: PuertoVoz | null
  /** Aviso instantáneo de "algo cambió" (solo un número): el contenido siempre se pide al servidor. */
  escuchar(programa: string, onCambio: (version: number) => void): Promise<AvisosCulto>
}

// ---------- Voz en vivo (culto) ----------
export interface EmisionVoz { oyentes(): number; silenciar(si: boolean): void; cerrar(): Promise<void> }
export interface RecepcionVoz { volumen(v: number): void; cerrar(): Promise<void> }
export type EstadoVoz = 'conectando' | 'oyendo' | 'sin_conexion'
export interface PuertoVoz {
  /** Abre tu micrófono y lo registra en el servidor (huella de la conexión). Solo si te toca hablar. */
  hablar(programa: string, yo: string, onOyentes?: (n: number) => void): Promise<EmisionVoz>
  /** Oye a quien tiene el micrófono: solo acepta audio cuya huella coincide con la que dio el servidor. */
  escuchar(programa: string, yo: string, de: string, huella: string, onEstado?: (e: EstadoVoz) => void): Promise<RecepcionVoz>
}
