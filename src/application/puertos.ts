import type { Dificultad, GrupoEdad, Rango } from '../domain/tipos'

/** Puertos (interfaces) de la arquitectura hexagonal. La UI solo conoce estos contratos. */

export interface Perfil {
  id: string
  apodo: string
  rango: Rango
  grupo_edad: GrupoEdad
  avatar: AvatarConfig
  club: { nombre: string; codigo: string; ciudad: string; campo: string; pais: string; soy_director?: boolean }
}

export interface AvatarConfig {
  genero?: 'm' | 'f'
  piel?: number
  pelo?: number
  colorPelo?: number
}

export type Alcance = 'jugador' | 'club' | 'ciudad' | 'campo' | 'pais'

export interface FilaRanking {
  posicion: number
  nombre: string
  detalle: string | null
  pais: string | null
  puntos: number
  jugadores: number
  avatar?: AvatarConfig | null
  rango?: Rango | null
}

export interface ResultadoServidor {
  puntaje: number
  mejor: number
  puesto: number
}

export interface DatosClub {
  nombre: string
  ciudad: string
  campo: string
  union: string
  pais: string
  apodo: string
  rango: Rango
  acepta: boolean
  autorizaPadres: boolean
}

export interface RepositorioJuego {
  readonly enLinea: boolean
  sesionActual(): Promise<Perfil | null>
  /** Hay sesión de adulto (correo verificado) pero aún no pertenece a un club. */
  adultoSinClub(): Promise<string | null>
  unirseNino(codigo: string, apodo: string, pin: string): Promise<Perfil>
  entrarNino(codigo: string, apodo: string, pin: string): Promise<Perfil>
  enviarEnlaceAdulto(email: string): Promise<void>
  crearClub(d: DatosClub): Promise<Perfil>
  unirseAdulto(codigo: string, apodo: string, rango: Rango, acepta: boolean): Promise<Perfil>
  guardarAvatar(a: AvatarConfig): Promise<void>
  iniciarReto(reto: string, dificultad: Dificultad): Promise<string>
  terminarReto(intento: string, puntaje: number): Promise<ResultadoServidor>
  misPuntajes(): Promise<Record<string, number>>
  ranking(alcance: Alcance, pais?: string): Promise<FilaRanking[]>
  miembrosClub(): Promise<{ apodo: string; rango: string; grupo_edad: string; puntos: number }[]>
  borrarMiembro(apodo: string): Promise<void>
  borrarMisDatos(): Promise<void>
  salir(): Promise<void>
  /** Salas en vivo (null si el adaptador no las soporta, como el modo práctica). */
  readonly salas: PuertoSalas | null
}

// ---------- Salas en tiempo real ----------
export interface JugadorSala { id: string; apodo: string; club: string; avatar?: AvatarConfig; anfitrion?: boolean }
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
  nuevoCodigo(): string
  conectar(codigo: string, yo: JugadorSala, eventos: EventosSala): Promise<ConexionSala>
}
