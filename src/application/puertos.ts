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
  club: { id?: string; nombre: string; codigo: string | null; ciudad: string; campo: string; union?: string | null; pais: string; soy_director?: boolean }
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
export interface ClubLista { id: string; nombre: string; ciudad: string; con_director: boolean; miembros: number }
export interface RegistroAdulto {
  club: string | null
  campo: number | null
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
  clubesDeCampo(campo: number): Promise<ClubLista[]>
  registrarAdulto(d: RegistroAdulto): Promise<Perfil>
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
}

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
export interface PuertoAdmin {
  resumen(): Promise<ResumenAdmin>
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
}

export interface RepositorioJuego {
  readonly enLinea: boolean
  sesionActual(): Promise<Perfil | null>
  /** Hay sesión de adulto (correo verificado) pero aún no pertenece a un club. */
  adultoSinClub(): Promise<string | null>
  unirseNino(codigo: string, apodo: string, pin: string): Promise<Perfil>
  /** Entrar a una sala solo con nombre y club (cuenta temporal de esa sala). Devuelve el perfil y el código. */
  entrarInvitado?(codigo: string, nombre: string, club: string): Promise<{ perfil: Perfil; codigo: string }>
  entrarNino(codigo: string, apodo: string, pin: string): Promise<Perfil>
  guardarAvatar(a: AvatarConfig): Promise<void>
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
  borrarMiembro(apodo: string): Promise<void>
  borrarMisDatos(): Promise<void>
  salir(): Promise<void>
  /** Salas en vivo (null si el adaptador no las soporta, como el modo práctica). */
  readonly salas: PuertoSalas | null
  readonly cuentas: PuertoCuentas | null
  readonly lider: PuertoLider | null
  readonly admin: PuertoAdmin | null
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
}

// ---------- Presencia y duelos ----------
export interface JugadorEnLinea { id: string; apodo: string; rango: Rango; avatar?: AvatarConfig; club: string; clubId: string; ocupado?: boolean; /** Posición en la isla (0 a 1). */ x?: number }
/** Frases fijas para saludarse (no hay chat libre: así se protege a los niños). */
/** Frases y caritas fijas (no hay chat libre: nadie puede escribir cosas feas ni datos personales). Solo se agregan al final. */
export const FRASES = ['¡Hola!', '¡Maranata!', '¡Te reto!', '¡Bien jugado!', '¡Vamos club!', '¡Gracias!', '¡Casi!', '¡A practicar!', '👏', '🔥', '😄', '🏆', '¿Jugamos?', '¡Siempre listos!'] as const
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
