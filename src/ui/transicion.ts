/**
 * Transición pendiente entre el mapa de un campamento y el mapa de todos los campamentos.
 * La deja quien sale (barquito que zarpa / zoom hacia la isla) y la usa la pantalla que entra.
 * Se lee sin consumir (React puede montar dos veces en desarrollo) y se limpia en un efecto.
 */
export type Transicion = { tipo: 'alejar'; desde: string } | { tipo: 'llegar' }

let pendiente: Transicion | null = null

export const marcarTransicion = (t: Transicion) => { pendiente = t }
export const verTransicion = () => pendiente
export const limpiarTransicion = () => { pendiente = null }

export const menosMovimiento = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
