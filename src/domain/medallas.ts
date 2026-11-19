import type { Dificultad } from './tipos'

/**
 * Medallas de cada nivel: tres metas que se coleccionan aparte de las estrellas.
 * Solo cuentan en el desafío y con el nivel aprobado (la práctica tiene pistas).
 */
export type MedallaId = 'perfecto' | 'combo' | 'leyenda'

export interface Medalla { id: MedallaId; nombre: string; como: string; color: string; icono: string }

export const COMBO_MEDALLA = 5

export const MEDALLAS: Medalla[] = [
  { id: 'perfecto', nombre: 'Sin errores', como: 'Aprueba el desafío sin un solo error.', color: '#2FB463', icono: '🎯' },
  { id: 'combo', nombre: `Combo x${COMBO_MEDALLA}`, como: `Encadena ${COMBO_MEDALLA} aciertos seguidos.`, color: '#F08A00', icono: '⚡' },
  { id: 'leyenda', nombre: 'Leyenda', como: 'Aprueba el desafío en dificultad Leyenda.', color: '#D7242F', icono: '🔥' },
]

export interface DatosPartida { desafio: boolean; aprobado: boolean; dificultad: Dificultad; errores: number; comboMax: number }

export function medallasDePartida(d: DatosPartida): MedallaId[] {
  if (!d.desafio || !d.aprobado) return []
  const out: MedallaId[] = []
  if (d.errores === 0) out.push('perfecto')
  if (d.comboMax >= COMBO_MEDALLA) out.push('combo')
  if (d.dificultad === 'leyenda') out.push('leyenda')
  return out
}

export const totalMedallas = (m: Record<string, MedallaId[]>) => Object.values(m).reduce((n, l) => n + l.length, 0)
