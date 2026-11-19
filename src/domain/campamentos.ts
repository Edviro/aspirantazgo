import { APROBADO } from './puntuacion'
import { MUNDOS_JUGABLES, type Nivel } from './niveles'

/**
 * Los campamentos del juego. El Campamento Conquistador (el triángulo central) se abre al completar
 * todos los demás. Para agregar un campamento nuevo: crea su mundo de niveles en niveles.ts,
 * agrégalo a MUNDOS_JUGABLES y pon su id en `mundo` aquí.
 */
export type IconoCampamento = 'camisa' | 'pergamino' | 'tambor' | 'insignia' | 'carpa' | 'emblema' | 'triangulo'

export interface Campamento {
  id: string
  nombre: string
  /** Nombre corto para botones y etiquetas. */
  corto: string
  descripcion: string
  /** Color de sus carpas y banderas. */
  color: string
  icono: IconoCampamento
  /** Id del mundo de niveles (null = todavía no tiene niveles: se ve bloqueado). */
  mundo: string | null
}

export const CAMPAMENTOS: Campamento[] = [
  { id: 'uniforme', nombre: 'Campamento del Uniforme', corto: 'Uniforme', color: '#F2B90F', icono: 'camisa', mundo: 'uniformes',
    descripcion: 'Arma uniformes al centímetro, encuentra errores y domina cada insignia.' },
  { id: 'historia', nombre: 'Campamento de Historia', corto: 'Historia', color: '#B07A3A', icono: 'pergamino', mundo: null,
    descripcion: 'Cómo nacieron los Conquistadores y los momentos que marcaron al club.' },
  { id: 'orden-cerrado', nombre: 'Campamento de Orden Cerrado', corto: 'Orden cerrado', color: '#1E9A4B', icono: 'tambor', mundo: null,
    descripcion: 'Voces de mando, formaciones y marchas como en el desfile.' },
  { id: 'clases', nombre: 'Campamento de Clases y Especialidades', corto: 'Clases', color: '#1F5FD1', icono: 'insignia', mundo: null,
    descripcion: 'Las seis clases, sus colores, requisitos y las especialidades.' },
  { id: 'organizacion', nombre: 'Campamento de Organización del Club', corto: 'Organización', color: '#D7242F', icono: 'carpa', mundo: null,
    descripcion: 'Directiva, unidades, cargos y cómo funciona un club.' },
  { id: 'emblemas', nombre: 'Campamento de Emblemas e Ideales', corto: 'Emblemas', color: '#7A1F3D', icono: 'emblema', mundo: null,
    descripcion: 'El voto, la ley, el emblema y el significado de cada color.' },
]

export const CAMPAMENTO_CENTRAL: Campamento = {
  id: 'conquistador', nombre: 'Gran Campamento Conquistador', corto: 'Conquistador', color: '#D7242F', icono: 'triangulo', mundo: null,
  descripcion: 'El corazón del juego: la fogata, la bandera y el banderín de unidad. Solo llegas al completar todos los campamentos.',
}

export type EstadoCampamento = 'pronto' | 'abierto' | 'completo'

export const nivelesDe = (c: Campamento): Nivel[] => MUNDOS_JUGABLES.find(m => m.id === c.mundo)?.niveles ?? []
export const campamentoDeMundo = (mundo: string) => CAMPAMENTOS.find(c => c.mundo === mundo) ?? CAMPAMENTOS[0]
export const campamentoDeNivel = (nivelId: string) =>
  CAMPAMENTOS.find(c => nivelesDe(c).some(n => n.id === nivelId)) ?? CAMPAMENTOS[0]

export function progresoCampamento(c: Campamento, puntajes: Record<string, number>) {
  const niveles = nivelesDe(c)
  const hechos = niveles.filter(n => (puntajes[n.id] ?? 0) >= APROBADO).length
  const estado: EstadoCampamento = !niveles.length ? 'pronto' : hechos === niveles.length ? 'completo' : 'abierto'
  return { estado, hechos, total: niveles.length }
}

/** El triángulo central se abre cuando TODOS los campamentos están completos. */
export const centralAbierto = (puntajes: Record<string, number>) =>
  CAMPAMENTOS.every(c => progresoCampamento(c, puntajes).estado === 'completo')
