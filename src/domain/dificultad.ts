import type { Dificultad } from './tipos'

export interface ReglasDificultad {
  nombre: string
  descripcion: string
  /** Multiplicador del puntaje máximo (el servidor aplica el mismo). */
  multiplicador: number
  /** Escala la tolerancia de precisión y del imán. */
  tolerancia: number
  /** Escala el tiempo par y los relojes. */
  tiempo: number
  pistas: boolean
  reglaConNumeros: boolean
  trampasExtra: boolean
  preguntas: number
  segPorPregunta: number
  erroresExtra: number
  velocidadLluvia: number
}

export const DIFICULTADES: Record<Dificultad, ReglasDificultad> = {
  facil: {
    nombre: 'Fácil', descripcion: 'Con pistas y mucho margen. Ideal para empezar.',
    multiplicador: 0.6, tolerancia: 1.6, tiempo: 1.5, pistas: true, reglaConNumeros: true, trampasExtra: false,
    preguntas: 8, segPorPregunta: 18, erroresExtra: -1, velocidadLluvia: 0.75,
  },
  medio: {
    nombre: 'Medio', descripcion: 'Sin pistas. Como en la revista del club.',
    multiplicador: 1, tolerancia: 1, tiempo: 1, pistas: false, reglaConNumeros: true, trampasExtra: false,
    preguntas: 10, segPorPregunta: 12, erroresExtra: 0, velocidadLluvia: 1,
  },
  leyenda: {
    nombre: 'Leyenda', descripcion: 'Regla sin números, más trampas y menos tiempo. Vale 1,5 veces más.',
    multiplicador: 1.5, tolerancia: 0.7, tiempo: 0.7, pistas: false, reglaConNumeros: false, trampasExtra: true,
    preguntas: 12, segPorPregunta: 7, erroresExtra: 1, velocidadLluvia: 1.4,
  },
}
