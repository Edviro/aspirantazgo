/**
 * Mapa de campamentos en pixel art, dibujado por código.
 * Al centro, el Gran Campamento Conquistador con forma del triángulo del emblema (borde dorado, franja roja,
 * fogata, bandera y banderín de unidad). Alrededor, una isla por campamento con carpas de su color.
 * Los campamentos sin niveles se ven grises con candado. Todo es determinista: mismo tamaño, mismo dibujo.
 */
import { COL } from './islaPixel'

export interface IslaCamp { x: number; y: number; r: number; color: string; bloqueado: boolean; completo: boolean }
export interface Central { x: number; y: number; R: number; bloqueado: boolean }

type P = (x: number, y: number, w: number, h: number, c: string) => void

function hash(i: number, j: number, s = 7) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
function ruido(x: number, y: number, esc: number, s: number) {
  x /= esc; y /= esc
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
const rgb = (hx: string): [number, number, number] => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)]
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const MAR = COL.mar.map(rgb)
const GRIS_PASTO = ['#7f9a7a', '#728d6e', '#8ca687']

/** Distancia (en px, positiva adentro) al borde del triángulo invertido del emblema. */
function dentroTriangulo(px: number, py: number, c: Central) {
  const mitad = c.R * Math.sqrt(3) / 2
  const A = [c.x - mitad, c.y - c.R / 2], B = [c.x + mitad, c.y - c.R / 2], C = [c.x, c.y + c.R]
  const lado = (p: number[], q: number[]) => {
    const nx = q[1] - p[1], ny = p[0] - q[0], l = Math.hypot(nx, ny)
    return ((px - p[0]) * nx + (py - p[1]) * ny) / l
  }
  // Orden horario: distancias negativas fuera; se invierte el signo para que adentro sea positivo
  return -Math.max(lado(A, B), lado(B, C), lado(C, A))
}

/** Grosor del borde dorado y de la franja roja del emblema, proporcional a su tamaño. */
const bandas = (c: Central): [number, number] => { const oro = Math.max(2, Math.round(c.R * 0.07)); return [oro, oro + Math.max(2, Math.round(c.R * 0.09))] }

/** Terreno: mar con profundidad, islas redondas orgánicas y el triángulo central. */
function terreno(W: number, H: number, camps: IslaCamp[], central: Central, frame: 0 | 1) {
  const img = new ImageData(W, H), d = img.data
  const put = (x: number, y: number, c: [number, number, number]) => { const o = (y * W + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255 }
  const C = {
    pasto: rgb(COL.pasto), pastoO: rgb(COL.pastoO), pastoC: rgb(COL.pastoC), arena: rgb(COL.arena), arenaO: rgb(COL.arenaO),
    espuma: rgb(COL.espuma), ola: rgb(COL.ola), oro: rgb('#F2B90F'), oroO: rgb('#C98F00'), rojo: rgb('#D7242F'), rojoO: rgb('#A3141E'),
    gris: GRIS_PASTO.map(rgb), arenaG: rgb('#c9c1a5'),
  }
  const [bOro, bRojo] = bandas(central)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = ruido(x, y, 9, 3) - 0.5
    // Isla más cercana (distancia normalizada al radio, con borde irregular)
    let mejor = 9, isla: IslaCamp | null = null
    for (const c of camps) {
      const v = Math.hypot(x - c.x, (y - c.y) * 1.08) / c.r + n * 0.28
      if (v < mejor) { mejor = v; isla = c }
    }
    const t = dentroTriangulo(x, y, central) + n * 2.2
    const tierraT = t > 0, tierraC = mejor < 1
    const bayer = BAYER[(y & 3) * 4 + (x & 3)] / 16
    if (tierraT) {
      // Emblema: borde dorado, franja roja y pasto adentro
      if (t < bOro) put(x, y, t < 1 ? C.oroO : C.oro)
      else if (t < bRojo) put(x, y, t < bOro + 1 ? C.rojoO : C.rojo)
      else {
        const k = hash(x, y, 11)
        put(x, y, central.bloqueado ? C.gris[k < 0.1 ? 1 : k > 0.93 ? 2 : 0] : k < 0.08 ? C.pastoO : k > 0.94 ? C.pastoC : C.pasto)
      }
      continue
    }
    if (tierraC && isla) {
      const k = hash(x, y, 5)
      if (mejor > 0.84) put(x, y, isla.bloqueado ? C.arenaG : k < 0.12 ? C.arenaO : C.arena)
      else put(x, y, isla.bloqueado ? C.gris[k < 0.1 ? 1 : k > 0.93 ? 2 : 0] : k < 0.08 ? C.pastoO : k > 0.94 ? C.pastoC : C.pasto)
      continue
    }
    // Mar: más claro cerca de la tierra (tramado ordenado) y olitas que se mueven
    const cerca = Math.min(mejor - 1, Math.max(0, -t) / (central.R * 0.35))
    if (cerca < 0.06 + (frame ? 0.015 : 0)) { put(x, y, C.espuma); continue }
    const nivel = Math.max(0, Math.min(5, Math.floor(cerca * 6 + bayer)))
    put(x, y, MAR[nivel])
    if (nivel >= 2 && hash(x >> 2, y, 13 + frame) < 0.012) put(x, y, C.ola)
  }
  return img
}

// ---------- Sprites (en pixeles lógicos) ----------
const TINTA = '#1E140C'
function carpa(p: P, x: number, y: number, color: string, gris: boolean) {
  const tela = gris ? '#9a9a92' : color
  for (let i = 0; i < 6; i++) { p(x - i - 1, y + i, i * 2 + 3, 1, TINTA); p(x - i, y + i, i * 2 + 1, 1, tela) }
  p(x - 6, y + 6, 13, 1, TINTA)
  p(x, y + 3, 1, 3, TINTA) // puerta
  p(x - 1, y + 5, 3, 1, gris ? '#6f6f69' : '#00000055')
}
function pino(p: P, x: number, y: number, gris: boolean) {
  const o = gris ? '#4f5f4c' : COL.copaB, m = gris ? '#6b7d67' : COL.copa
  p(x, y + 6, 1, 2, COL.tronco)
  for (let i = 0; i < 6; i++) { const w = 1 + Math.floor(i / 2); p(x - w, y + i, w * 2 + 1, 1, o); if (w > 1) p(x - w + 1, y + i, w * 2 - 1, 1, m) }
}
function asta(p: P, x: number, y: number, alto: number, tela: string, gris: boolean) {
  p(x, y, 1, alto, '#4a3020')
  const c = gris ? '#a7a7a0' : tela
  p(x + 1, y, 6, 4, TINTA); p(x + 1, y + 1, 5, 2, c)
}
function banderin(p: P, x: number, y: number, gris: boolean, frame: 0 | 1) {
  p(x, y, 1, 11, '#4a3020')
  const az = gris ? '#8d8d88' : '#1F5FD1', bl = gris ? '#c9c9c4' : '#ffffff'
  for (let i = 0; i < 4; i++) { const w = 7 - i * 2 + frame; p(x + 1, y + i, Math.max(1, w), 1, i % 2 ? bl : az) }
}
function fogata(p: P, x: number, y: number, prendida: boolean, frame: 0 | 1) {
  p(x - 3, y + 3, 7, 1, '#6b4423'); p(x - 2, y + 2, 5, 1, '#8a5a2e')
  if (!prendida) { p(x - 1, y + 1, 3, 1, '#555'); return }
  p(x - 1, y - 1 - frame, 3, 3 + frame, '#FF8A1E'); p(x, y - 2 - frame, 1, 2, '#FFD54A')
  if (frame) p(x - 2, y, 1, 1, '#FFD54A'); else p(x + 2, y - 1, 1, 1, '#FF8A1E')
}
function candado(p: P, x: number, y: number, grande = false) {
  const k = grande ? 2 : 1
  p(x - 2 * k, y - 4 * k, 5 * k, 4 * k, TINTA); p(x - k, y - 3 * k, 3 * k, 3 * k, '#c9c9c4'); p(x, y - 3 * k, k, 3 * k, TINTA)
  p(x - 3 * k, y, 7 * k, 6 * k, TINTA); p(x - 2 * k, y + k, 5 * k, 4 * k, '#F2B90F'); p(x, y + 2 * k, k, 2 * k, TINTA)
}

/** Dibuja todo el mapa de campamentos en un lienzo de W×H pixeles lógicos. */
export function dibujarMundo(ctx: CanvasRenderingContext2D, W: number, H: number, camps: IslaCamp[], central: Central, frame: 0 | 1) {
  ctx.putImageData(terreno(W, H, camps, central, frame), 0, 0)
  const p: P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h) }

  camps.forEach((c, i) => {
    const g = c.bloqueado
    // pinos en el borde
    for (let k = 0; k < 5; k++) {
      const a = hash(i, k, 21) * Math.PI * 2, rr = c.r * (0.55 + hash(k, i, 22) * 0.2)
      const px = c.x + Math.cos(a) * rr, py = c.y + Math.sin(a) * rr * 0.9
      if (Math.abs(px - c.x) < c.r * 0.4 && py > c.y - c.r * 0.2) continue // no tapar las carpas
      pino(p, px, py - 6, g)
    }
    carpa(p, c.x - c.r * 0.28, c.y - 2, c.color, g)
    carpa(p, c.x + c.r * 0.28, c.y + 1, c.color, g)
    asta(p, c.x, c.y - c.r * 0.55, 11, c.color, g)
    if (g) candado(p, c.x, c.y - c.r * 0.05)
    else if (c.completo) { p(c.x - 2, c.y + c.r * 0.45, 5, 1, '#FFD54A'); p(c.x - 1, c.y + c.r * 0.45 - 1, 3, 3, '#FFD54A') }
  })

  // Triángulo central: dos carpas arriba (donde el triángulo es ancho), bandera y banderín de unidad a los lados
  // de la fogata, y el candado abajo, hacia la punta
  const g = central.bloqueado, R = central.R, cx = central.x, cy = central.y
  const arriba = cy - R / 2 + bandas(central)[1] + 4
  carpa(p, cx - R * 0.34, arriba, '#D7242F', g)
  carpa(p, cx + R * 0.34, arriba, '#1F5FD1', g)
  asta(p, cx - R * 0.12, arriba - 2, 14, '#D7242F', g)
  banderin(p, cx + R * 0.06, arriba, g, frame)
  fogata(p, cx, cy + R * 0.18, !g, frame)
  if (g) candado(p, cx, cy + R * 0.5, R > 44)
}
