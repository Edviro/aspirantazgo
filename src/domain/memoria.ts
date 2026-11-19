import type { Pieza } from './tipos'
import { pieza } from './uniformes'

/** Cada pareja: una pieza y el lugar EXACTO donde va según el Manual de Uniformes (uniforme de Conquistador). */
export interface ParejaMemoria { id: string; pieza: Pieza; lugar: string }

export const PAREJAS_UNIFORME: ParejaMemoria[] = [
  { id: 'club', pieza: pieza.tiraClub('TU CLUB'), lugar: 'Manga derecha, a 1,5 cm de la costura' },
  { id: 'c1', pieza: pieza.c1(), lugar: 'Manga derecha, debajo de la tira del club' },
  { id: 'campo', pieza: pieza.campo(), lugar: 'Manga izquierda, a 1,5 cm de la costura' },
  { id: 'c2', pieza: pieza.c2('caqui'), lugar: 'Manga izquierda, 1 cm bajo el Campo' },
  { id: 'divisa', pieza: pieza.divisa('conquistador', 3), lugar: 'Manga izquierda, 1 cm bajo el C2' },
  { id: 'nombre', pieza: pieza.nombre('TU NOMBRE', 'caqui'), lugar: 'Encima del bolsillo derecho' },
  { id: 'bautismo', pieza: pieza.bautismo(), lugar: 'Centrado en la solapa del bolsillo derecho' },
  { id: 'clase', pieza: pieza.boton('amigo'), lugar: 'Solapa del bolsillo izquierdo, en orden' },
  { id: 'avanzada', pieza: pieza.avanzada('amigo'), lugar: '0,5 cm sobre la tapa del bolsillo izquierdo' },
  { id: 'panoleta', pieza: pieza.panoleta(false), lugar: 'Al cuello, desde la ceremonia de admisión' },
]

export interface Carta { clave: string; pareja: string; cara: 'pieza' | 'lugar' }

/** Mezcla n parejas en 2n cartas (misma semilla = mismas cartas para todos en un duelo). */
export function repartir(n: number, rnd: () => number): Carta[] {
  const elegidas = [...PAREJAS_UNIFORME].sort(() => rnd() - 0.5).slice(0, n)
  const cartas: Carta[] = elegidas.flatMap(p => [
    { clave: p.id + '-p', pareja: p.id, cara: 'pieza' as const },
    { clave: p.id + '-l', pareja: p.id, cara: 'lugar' as const },
  ])
  for (let i = cartas.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cartas[i], cartas[j]] = [cartas[j], cartas[i]] }
  return cartas
}
