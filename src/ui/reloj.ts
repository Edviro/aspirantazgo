import { useJuego } from './estado'

/**
 * Reloj del juego: se detiene en la pausa. Todos los minijuegos y el puntaje lo usan
 * en lugar de performance.now(), así la pausa no cuenta como tiempo jugado.
 */
let pausaDesde: number | null = null
let acumulado = 0

export const ahora = () => (pausaDesde ?? performance.now()) - acumulado
export const estaPausado = () => pausaDesde !== null

export function pausar() {
  if (pausaDesde !== null) return
  pausaDesde = performance.now()
  useJuego.setState({ pausado: true })
}
export function reanudar() {
  if (pausaDesde === null) return
  acumulado += performance.now() - pausaDesde
  pausaDesde = null
  useJuego.setState({ pausado: false })
}
