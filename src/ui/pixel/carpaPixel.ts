/**
 * Dentro de tu carpa (pixel art 240×150): lona del color de tu club, palo central, piso, sleepings y tus cosas.
 * Los parches, pines y logros van encima en HTML (íconos nítidos y botones).
 */
import type { AvatarConfig } from '../../application/puertos'
import { PELOS, PIELES } from './dibujo'

export const KW = 240, KH = 150
const TINTA = '#1E140C'
type Px = (x: number, y: number, w: number, h: number, c: string) => void

const tono = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('')}`
}

/** Lugares de las cosas (en pixeles lógicos), para dibujarlas y poner los botones encima. */
export const LUGAR = {
  sleeping: { x: 82, y: 110, w: 76, h: 30 },
  mochila: { x: 46, y: 80, w: 24, h: 22 },
  biblia: { x: 160, y: 120, w: 16, h: 10 },
  guitarra: { x: 174, y: 46, w: 16, h: 56 },
  brujula: { x: 62, y: 122, w: 12, h: 9 },
  linterna: { x: 113, y: 40, w: 14, h: 16 },
  cantimplora: { x: 126, y: 62, w: 9, h: 13 },
  hamaca: { x: 58, y: 64, w: 124, h: 22 },
  parches: { x: 12, y: 28, w: 44, h: 52 },
  pines: { x: 190, y: 30, w: 40, h: 50 },
  logros: { x: 68, y: 46, w: 44, h: 26 },
  salida: { x: 100, y: 138, w: 40, h: 12 },
}
export const OTROS_SLEEPING = [{ x: 18, y: 104, w: 56, h: 24 }, { x: 166, y: 104, w: 56, h: 24 }, { x: 50, y: 92, w: 44, h: 16 }]

export function dibujarCarpa(ctx: CanvasRenderingContext2D, o: { color: string; tengo: Set<string> }) {
  const p: Px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }
  ctx.clearRect(0, 0, KW, KH)
  const lona = o.color, lonaO = tono(o.color, 0.62), lonaC = tono(o.color, 1.18)
  // Paredes laterales (la lona inclinada) y la pared del fondo (triángulo)
  p(0, 0, KW, KH, lonaO)
  for (let y = 14; y <= 100; y++) {
    const k = (y - 14) / 86, mitad = 80 * k
    p(120 - mitad, y, mitad * 2, 1, y % 9 === 0 ? lonaO : lona)
  }
  for (let y = 0; y < 100; y++) { // costuras de las paredes laterales
    const xL = Math.round(40 * (1 - y / 100) * 0 + (y / 100) * 40), xR = KW - xL
    if (y % 2 === 0) { p(xL - 1, y, 1, 1, lonaC); p(xR, y, 1, 1, lonaC) }
  }
  for (let y = 14; y <= 100; y += 3) { const k = (y - 14) / 86; p(120 - 80 * k, y, 1, 1, lonaC); p(119 + 80 * k, y, 1, 1, lonaC) }
  // Piso: lona del suelo en perspectiva
  for (let y = 100; y < KH; y++) {
    const k = (y - 100) / 50, x0 = 40 * (1 - k), x1 = KW - x0
    p(x0, y, x1 - x0, 1, y % 6 === 0 ? '#556b52' : '#62795e')
  }
  p(40, 100, 160, 1, TINTA)
  // Palo central
  p(118, 14, 4, 86, TINTA); p(119, 14, 2, 86, '#c98d55')
  p(117, 12, 6, 3, TINTA)
  // Hamaca (si la compraste), colgada de lado a lado
  if (o.tengo.has('obj-hamaca')) {
    const { x, y, w } = LUGAR.hamaca
    for (let i = 0; i <= w; i++) { const dy = Math.round(Math.sin((i / w) * Math.PI) * 14); p(x + i, y + dy, 1, 4, i % 4 < 2 ? '#E8771E' : '#F2C230'); p(x + i, y + dy + 4, 1, 1, TINTA) }
    p(x - 2, y - 2, 3, 4, TINTA); p(x + w, y - 2, 3, 4, TINTA)
  }
  // Mochila
  { const { x, y, w, h } = LUGAR.mochila
    p(x, y, w, h, TINTA); p(x + 1, y + 1, w - 2, h - 2, '#2C5F2D'); p(x + 3, y + 3, w - 6, 6, '#3B7A3C'); p(x + 4, y + 11, w - 8, 8, '#244D25'); p(x + w / 2 - 2, y + 4, 4, 2, '#F2B90F') }
  // Guitarra apoyada en la pared
  if (o.tengo.has('obj-guitarra')) {
    const { x, y } = LUGAR.guitarra
    p(x + 6, y, 4, 26, TINTA); p(x + 7, y + 1, 2, 25, '#5e3a1a')
    for (let i = 0; i < 4; i++) p(x + 5, y + 2 + i * 3, 1, 1, '#d9d7ce')
    p(x + 1, y + 26, 14, 12, TINTA); p(x + 2, y + 27, 12, 10, '#C98F00')
    p(x, y + 38, 16, 17, TINTA); p(x + 1, y + 39, 14, 15, '#C98F00'); p(x + 5, y + 42, 6, 6, TINTA); p(x + 6, y + 43, 4, 4, '#3a2410')
    p(x + 7, y + 26, 2, 24, '#e9dcc0')
  }
  // Linterna colgada del palo (o una vela si no tienes)
  if (o.tengo.has('obj-linterna')) {
    const { x, y } = LUGAR.linterna
    p(x + 6, y - 4, 2, 4, TINTA); p(x + 2, y, 10, 3, TINTA); p(x + 3, y + 3, 8, 9, '#FFE680'); p(x + 3, y + 3, 1, 9, TINTA); p(x + 10, y + 3, 1, 9, TINTA); p(x + 2, y + 12, 10, 3, TINTA)
  }
  // Cantimplora
  if (o.tengo.has('obj-cantimplora')) { const { x, y } = LUGAR.cantimplora; p(x, y + 2, 9, 11, TINTA); p(x + 1, y + 3, 7, 9, '#8d8d86'); p(x + 3, y, 3, 3, TINTA); p(x + 1, y + 6, 7, 2, '#6b6b64') }
  // Tablero de logros (madera) en la pared del fondo
  { const { x, y, w, h } = LUGAR.logros; p(x, y, w, h, TINTA); p(x + 1, y + 1, w - 2, h - 2, '#8a5a2e'); p(x + 2, y + 2, w - 4, h - 4, '#a36c39') }
  // Banderín de parches (fieltro) y banda de pines
  { const { x, y, w, h } = LUGAR.parches
    p(x, y, w, h, TINTA); p(x + 1, y + 1, w - 2, h - 2, '#1F4FB8')
    for (let i = 0; i < 6; i++) p(x + 1 + i * 7, y + h - 1, 4, 3 + (i % 2), '#1F4FB8') }
  { const { x, y, w, h } = LUGAR.pines; p(x, y, w, h, TINTA); p(x + 1, y + 1, w - 2, h - 2, '#D7242F'); p(x + 1, y + 1, w - 2, 3, '#F2B90F') }
  // Brújula en el piso
  if (o.tengo.has('obj-brujula')) { const { x, y } = LUGAR.brujula; p(x, y, 12, 9, TINTA); p(x + 1, y + 1, 10, 7, '#F3F1EA'); p(x + 5, y + 1, 2, 4, '#D7242F'); p(x + 5, y + 4, 2, 4, '#1F4FB8') }
}

/** Un sleeping en el piso; con la cabeza de quien duerme (si duerme). */
export function dibujarSleeping(ctx: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, color: string, quien?: AvatarConfig | null) {
  const p: Px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }
  p(r.x, r.y, r.w, r.h, TINTA)
  p(r.x + 1, r.y + 1, r.w - 2, r.h - 2, color)
  for (let i = 4; i < r.w - 4; i += 6) p(r.x + i, r.y + 2, 1, r.h - 4, tono(color, 0.75))
  p(r.x + r.w - 2, r.y + 2, 1, r.h - 4, '#c9c9c0') // cierre
  p(r.x + 2, r.y + 2, Math.min(16, r.w / 4), r.h - 4, '#F3F1EA') // almohada
  if (quien) {
    const piel = PIELES[quien.piel ?? 2] ?? PIELES[2], pelo = PELOS[quien.colorPelo ?? 0] ?? PELOS[0]
    const cx = r.x + 4, cy = r.y + r.h / 2 - 5
    p(cx, cy, 11, 10, TINTA); p(cx + 1, cy + 1, 9, 8, piel); p(cx + 1, cy + 1, 4, 8, pelo)
    p(cx + 6, cy + 4, 2, 1, TINTA) // ojo cerrado
    p(cx + 10, cy + 2, r.w * 0.6, r.h - 6, tono(color, 0.9))
  }
}
