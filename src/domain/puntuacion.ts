export type Calidad = 'perfecto' | 'bien' | 'cerca' | 'fallo'

/** Precisión al centímetro: qué tan lejos quedó la pieza de su medida del manual. */
export function evaluarPrecision(errorCm: number): { calidad: Calidad; factor: number } {
  const e = Math.abs(errorCm)
  if (e <= 0.5) return { calidad: 'perfecto', factor: 1 }
  if (e <= 1.2) return { calidad: 'bien', factor: 0.75 }
  if (e <= 2.2) return { calidad: 'cerca', factor: 0.45 }
  return { calidad: 'fallo', factor: 0 }
}

export interface ResultadoReto {
  puntaje: number
  estrellas: 0 | 1 | 2 | 3
  precision: number // 0..1
  errores: number
  segundos: number
}

/**
 * Puntaje máximo 1000: 78 % precisión + 22 % rapidez (la rapidez solo cuenta si hubo precisión),
 * y cada error resta 40. El servidor vuelve a acotar el valor y valida el tiempo.
 */
export function calcularPuntaje(factores: number[], errores: number, segundos: number, parSeg: number, multiplicador = 1): ResultadoReto {
  const precision = factores.length ? factores.reduce((a, b) => a + b, 0) / factores.length : 0
  const rapidez = segundos <= parSeg ? 1 : Math.max(0, 1 - (segundos - parSeg) / (parSeg * 2))
  const bruto = 780 * precision + 220 * rapidez * precision - 40 * errores
  const base = Math.max(0, Math.min(1000, bruto))
  const puntaje = Math.round(base * multiplicador)
  return { puntaje, estrellas: estrellas(base), precision, errores, segundos }
}

/** Las estrellas miden la calidad del intento (sobre 1000), sin importar la dificultad. */
export function estrellas(p: number): 0 | 1 | 2 | 3 {
  return p >= 900 ? 3 : p >= 700 ? 2 : p >= 400 ? 1 : 0
}

/** Estrellas a partir de un puntaje guardado, que puede venir multiplicado por la dificultad. */
export function estrellasDeMejor(p: number): 0 | 1 | 2 | 3 {
  return estrellas(Math.min(1000, p))
}

export const APROBADO = 400
