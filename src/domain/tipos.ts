// Dominio puro: sin React, sin Supabase. Todo lo que el juego "sabe" del uniforme vive aquí.

export type Rango = 'conquistador' | 'lider' | 'guia_mayor' | 'gm_master' | 'gm_master_avanzado'
export type GrupoEdad = 'menor' | 'adulto'
export type ClaseId = 'amigo' | 'companero' | 'explorador' | 'pionero' | 'excursionista' | 'guia'
export type LiderazgoId = 'gm' | 'master' | 'master_avanzado'
export type PanelId = 'manga_der' | 'manga_izq' | 'pecho' | 'banda' | 'bandera' | 'banderin'
export type Dificultad = 'facil' | 'medio' | 'leyenda'

/** Tipos de pieza del uniforme (insignias, tiras, distintivos, accesorios). */
export type TipoPieza =
  | 'tira_club' | 'tira_cargo' | 'c1' | 'estrella' // manga derecha
  | 'campo' | 'c2' | 'divisa' // manga izquierda
  | 'boton_clase' | 'barra_avanzada' | 'boton_liderazgo' | 'excelencia' // bolsillo izquierdo
  | 'tira_nombre' | 'funcion' | 'bautismo' // bolsillo derecho
  | 'panoleta' | 'correa' // accesorios
  | 'bandera_pais' | 'especialidad' | 'c2_banda' // banda
  | 'lc_manga' // emblema LC2 / LC3 de Máster en la manga izquierda
  | 'cuadrante' | 'texto_club' | 'franja_azul' | 'diseno_unidad' | 'texto_unidad' // bandera y banderín

export type VarianteDivisa = 'conquistador' | 'lider' | 'guia_mayor'

/** Una pieza concreta (p. ej. "botón de clase Explorador"). */
export interface Pieza {
  key: string
  tipo: TipoPieza
  clase?: ClaseId
  liderazgo?: LiderazgoId
  divisa?: VarianteDivisa
  /** Para la divisa: cuántas clases lleva (1–6). */
  nivel?: number
  texto?: string
  fondo?: 'caqui' | 'blanco' | 'azul'
  /** Piezas intercambiables (dos cuadrantes azules, varias especialidades) comparten grupo. */
  grupo?: string
  vertical?: boolean
  /** Ancho y alto en centímetros reales (según el manual). */
  w: number
  h: number
}

/** Pieza colocada en un panel. x/y = centro de la pieza en cm. */
export interface Colocacion {
  pieza: Pieza
  panel: PanelId
  x: number
  y: number
  /** Precisión: se mide la distancia vertical en cm; zona: basta con caer dentro. */
  modo: 'precision' | 'zona'
  /** Texto pedagógico: dónde va y por qué (del manual). */
  regla: string
}

export interface PerfilUniforme {
  rango: Rango
  clasesRegulares: ClaseId[] // en orden de investidura
  clasesAvanzadas: ClaseId[]
  excelencia: boolean
  bautismo: boolean
  cargo?: string // tira de cargo (líderes)
  funcion?: string // función en la unidad (conquistadores)
  estrellaAnios?: number // estrella de tiempo de servicio
  nombre: string
  club: string
  /** Galón según el nivel en que actúa el líder. */
  galon?: Galon
}

export type Galon = 'ninguno' | 'director' | 'distrital' | 'regional' | 'departamental'

export const ORDEN_CLASES: ClaseId[] = ['amigo', 'companero', 'explorador', 'pionero', 'excursionista', 'guia']
export const ORDEN_LIDERAZGO: LiderazgoId[] = ['gm', 'master', 'master_avanzado']

export const COLOR_CLASE: Record<ClaseId, string> = {
  amigo: '#1F5FD1',
  companero: '#D7242F',
  explorador: '#1E9A4B',
  pionero: '#9AA0A6',
  excursionista: '#7A1F3D', // bordó
  guia: '#F6C21C',
}

export const esAdulto = (r: Rango) => r !== 'conquistador'
export const esGuiaMayor = (r: Rango) => r === 'guia_mayor' || r === 'gm_master' || r === 'gm_master_avanzado'
