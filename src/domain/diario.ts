import { MUNDO_UNIFORMES, type Nivel } from './niveles'

/** Fecha del día en hora de Lima (YYYY-MM-DD): el reto cambia a medianoche para todos. */
export const hoy = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

function hash(t: string) {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const ELEGIBLES = MUNDO_UNIFORMES.niveles.filter(n => n.tipo !== 'ceremonia')

/** El reto del día: mismo nivel y mismas piezas (misma semilla) para todos los jugadores. */
export function retoDelDia(fecha = hoy()): { fecha: string; nivel: Nivel; semilla: number } {
  const h = hash('aspirantazgo-' + fecha)
  return { fecha, nivel: ELEGIBLES[h % ELEGIBLES.length], semilla: 1 + (h % 2_000_000_000) }
}

/** Días entre dos fechas YYYY-MM-DD. */
export function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000)
}

export interface Racha { ultimo: string | null; actual: number; mejor: number; total: number }

/** Marca el reto de hoy como cumplido y actualiza la racha. */
export function cumplirHoy(r: Racha, fecha = hoy()): Racha {
  if (r.ultimo === fecha) return r
  const seguida = r.ultimo !== null && diasEntre(r.ultimo, fecha) === 1
  const actual = seguida ? r.actual + 1 : 1
  return { ultimo: fecha, actual, mejor: Math.max(r.mejor, actual), total: r.total + 1 }
}

/** La racha se corta si pasó más de un día sin cumplir. */
export function rachaVigente(r: Racha, fecha = hoy()) {
  return r.ultimo !== null && diasEntre(r.ultimo, fecha) <= 1 ? r.actual : 0
}
