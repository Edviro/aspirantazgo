/**
 * Plaza Central en pixel art, dibujada por código (sin imágenes que descargar).
 * El suelo va en un lienzo (dos cuadros para las olas); los objetos altos van como sprites aparte para que los
 * avatares puedan pasar delante o detrás de ellos.
 */
import { ALTO, ANCHO, SANTUARIO, Suelo, dentroIsla, dentroTriangulo, suelo, type Objeto, type TipoFogata } from '../../domain/plaza'
import { COL } from './islaPixel'

export const B = 16 // pixeles lógicos por baldosa
type P = (x: number, y: number, w: number, h: number, c: string) => void
const TINTA = '#1E140C', AZUL = '#1F4FB8', ORO = '#F2B90F', ORO_O = '#C98F00', ORO_C = '#FFD54A', ROJO = '#D7242F', ROJO_O = '#A3141E'

function hash(i: number, j: number, s = 7) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Distancia (en baldosas) de cada baldosa de agua a la tierra más cercana. */
const PROFUNDIDAD = (() => {
  const d = new Int16Array(ANCHO * ALTO).fill(99), cola: number[] = []
  for (let k = 0; k < ANCHO * ALTO; k++) if (suelo(k % ANCHO, Math.floor(k / ANCHO)) !== Suelo.AGUA) { d[k] = 0; cola.push(k) }
  for (let i = 0; i < cola.length; i++) {
    const k = cola[i], x = k % ANCHO, y = Math.floor(k / ANCHO)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= ANCHO || ny >= ALTO) continue
      const n = ny * ANCHO + nx
      if (d[n] > d[k] + 1) { d[n] = d[k] + 1; cola.push(n) }
    }
  }
  return d
})()

/** Dibuja todo el suelo de la plaza (ANCHO·B × ALTO·B pixeles lógicos). */
export function dibujarSuelo(ctx: CanvasRenderingContext2D, frame: 0 | 1, abierto: boolean) {
  const p: P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
  for (let ty = 0; ty < ALTO; ty++) for (let tx = 0; tx < ANCHO; tx++) {
    const v = suelo(tx, ty), x = tx * B, y = ty * B, h = (i: number) => hash(tx * 31 + i, ty * 17 - i)
    if (v === Suelo.AGUA) {
      const d = PROFUNDIDAD[ty * ANCHO + tx]
      p(x, y, B, B, COL.mar[Math.min(5, d - 1)])
      if (d === 1) { // espuma en la orilla
        for (let i = 0; i < 4; i++) if (h(i) < 0.55) p(x + Math.floor(h(i + 9) * 14), y + Math.floor(h(i + 5) * 14), 2, 1, COL.espuma)
      }
      if (h(20) < 0.3) { const ox = (Math.floor(h(21) * 10) + frame * 3) % 12; p(x + ox, y + 3 + Math.floor(h(22) * 10), 4, 1, COL.ola) }
      continue
    }
    if (v === Suelo.ORO) { // borde dorado del emblema, como bloques
      p(x, y, B, B, ORO); p(x, y + B - 2, B, 2, ORO_O)
      p(x + ((ty % 2) * 8), y, 1, B, ORO_O); p(x, y + 7, B, 1, ORO_O)
      if (h(3) < 0.5) p(x + 3, y + 2, 3, 1, ORO_C)
      continue
    }
    if (v === Suelo.ROJO) {
      p(x, y, B, B, ROJO)
      for (let i = 0; i < 3; i++) p(x + Math.floor(h(i) * 14), y + Math.floor(h(i + 4) * 14), 2, 1, ROJO_O)
      continue
    }
    if (v === Suelo.MUELLE) { // tablones
      p(x, y, B, B, COL.madera)
      for (let i = 0; i < 4; i++) p(x, y + i * 4 + 3, B, 1, COL.maderaO)
      if (tx === 47 || tx === 49) p(tx === 47 ? x : x + B - 2, y, 2, B, COL.maderaO)
      if (h(1) < 0.3) p(x + 4 + Math.floor(h(2) * 8), y + 1, 1, 1, '#5e3a1a')
      continue
    }
    // Suelo de tierra firme
    p(x, y, B, B, COL.pasto)
    for (let i = 0; i < 5; i++) { const k = h(i + 30); p(x + Math.floor(h(i) * 15), y + Math.floor(h(i + 7) * 15), 1, 1, k < 0.5 ? COL.pastoO : COL.pastoC) }
    if (h(40) < 0.12) { p(x + 5, y + 9, 1, 2, COL.borde); p(x + 7, y + 8, 1, 3, COL.borde) } // matita
    if (v === Suelo.PIEDRA) {
      p(x, y, B, B, '#d9cbb0')
      // adoquines en hileras alternadas
      for (let r = 0; r < 4; r++) {
        const off = (r + ty) % 2 ? 4 : 0
        for (let c = -1; c < 3; c++) {
          const sx = x + c * 8 + off, sy = y + r * 4
          const tono = hash(tx * 8 + c, ty * 4 + r, 3) < 0.3 ? '#c9b994' : hash(tx * 8 + c, ty * 4 + r, 4) < 0.15 ? '#e8dcc2' : '#d4c4a3'
          p(Math.max(x, sx + 1), sy + 1, Math.min(x + B, sx + 8) - Math.max(x, sx + 1), 3, tono)
        }
      }
    } else if (v === Suelo.CAMINO) {
      p(x, y, B, B, COL.camino)
      for (let i = 0; i < 4; i++) p(x + Math.floor(h(i + 50) * 15), y + Math.floor(h(i + 60) * 15), 2, 1, COL.caminoO)
    } else if (v === Suelo.CERCA) {
      cerca(p, tx, ty)
    } else if (v === Suelo.PUERTA) {
      puerta(p, x, y, abierto)
    }
  }
  bordeFino(ctx, frame)
  // Fogones de piedra alrededor del santuario y pasto más oscuro adentro (lugar especial)
  const { x: sx, y: sy, w: sw, h: sh } = SANTUARIO
  for (let ty = sy + 1; ty < sy + sh - 1; ty++) for (let tx = sx + 1; tx < sx + sw - 1; tx++) {
    if (hash(tx, ty, 9) < 0.5) p(tx * B + Math.floor(hash(tx, ty, 2) * 12), ty * B + Math.floor(hash(tx, ty, 5) * 12), 3, 2, abierto ? '#7fd36b' : COL.pastoO)
  }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const rgb = (hx: string) => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)]
/**
 * Redibuja pixel a pixel la costa (mar con profundidad suave, espuma y playa) y el borde dorado y la franja roja
 * del emblema siguiendo la diagonal exacta (sin escalones de baldosa). El muelle, la piedra y los caminos no se tocan.
 */
function bordeFino(ctx: CanvasRenderingContext2D, frame: 0 | 1) {
  const W = ANCHO * B, H = ALTO * B
  const img = ctx.getImageData(0, 0, W, H), d = img.data
  const oro = rgb(ORO), oroO = rgb(ORO_O), oroC = rgb(ORO_C), rojo = rgb(ROJO), rojoO = rgb(ROJO_O)
  const pasto = rgb(COL.pasto), pastoO = rgb(COL.pastoO), espuma = rgb(COL.espuma), ola = rgb(COL.ola), MARES = COL.mar.map(rgb)
  const arena = rgb(COL.arena), arenaO = rgb(COL.arenaO)
  // Solo se procesan las baldosas cerca de la costa o del borde del emblema (el resto ya está bien pintado)
  const cerca = new Uint8Array(ANCHO * ALTO)
  for (let ty = 0; ty < ALTO; ty++) for (let tx = 0; tx < ANCHO; tx++) {
    const di = dentroIsla(tx + 0.5, ty + 0.5), dt = dentroTriangulo(tx + 0.5, ty + 0.5)
    if ((di > -7 && di < 2.2) || (dt > -1.2 && dt < 3)) cerca[ty * ANCHO + tx] = 1
  }
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const tx = px >> 4, ty = py >> 4
    if (!cerca[ty * ANCHO + tx]) continue
    const v = suelo(tx, ty)
    if (v === Suelo.MUELLE || v === Suelo.PIEDRA || v === Suelo.CAMINO || v === Suelo.CERCA || v === Suelo.PUERTA) continue
    const fx = (px + 0.5) / B, fy = (py + 0.5) / B
    const di = dentroIsla(fx, fy), k = dentroTriangulo(fx, fy)
    let c: number[] | null = null
    if (di < 0) {
      // Mar con profundidad suave (tramado ordenado), espuma en la orilla y olitas
      if (di > -0.2 - frame * 0.07) c = espuma
      else {
        const nivel = Math.min(5, Math.max(0, Math.floor(-di * 0.95 + BAYER[(py & 3) * 4 + (px & 3)] / 16)))
        c = MARES[nivel]
        if (nivel >= 1 && hash(px >> 2, py, 13 + frame) < 0.006) c = ola
      }
    } else if (di < 0.9) c = hash(px, py, 8) < 0.12 ? arenaO : arena
    else if (k >= -0.45 && k < 2.25) {
      if (k < 0) c = hash(px, py, 6) < 0.08 ? pastoO : pasto
      else if (k < 1) {
        const fila = Math.floor(k * 4) // ladrillos a lo largo del borde
        c = k < 0.12 ? oroO : fila === 2 && (px + py) % 9 === 0 ? oroO : k > 0.8 ? oroO : (px * 7 + py * 3) % 23 === 0 ? oroC : oro
      } else if (k < 2) c = k < 1.1 || hash(px, py, 4) < 0.05 ? rojoO : rojo
      else c = hash(px, py, 6) < 0.08 ? pastoO : pasto
    } else if (v === Suelo.AGUA || v === Suelo.ORO || v === Suelo.ROJO) c = hash(px, py, 6) < 0.08 ? pastoO : pasto
    if (!c) continue
    const o = (py * W + px) * 4
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

function cerca(p: P, tx: number, ty: number) {
  const x = tx * B, y = ty * B
  const horiz = suelo(tx - 1, ty) === Suelo.CERCA || suelo(tx + 1, ty) === Suelo.CERCA || suelo(tx - 1, ty) === Suelo.PUERTA || suelo(tx + 1, ty) === Suelo.PUERTA
  const vert = suelo(tx, ty - 1) === Suelo.CERCA || suelo(tx, ty + 1) === Suelo.CERCA
  if (horiz) { p(x, y + 5, B, 2, TINTA); p(x, y + 6, B, 1, COL.madera); p(x, y + 10, B, 2, TINTA); p(x, y + 11, B, 1, COL.madera) }
  if (vert) { p(x + 6, y, 4, B, TINTA); p(x + 7, y, 2, B, COL.madera) }
  // poste
  p(x + 5, y + 2, 6, 12, TINTA); p(x + 6, y + 3, 4, 10, COL.madera); p(x + 6, y + 3, 4, 2, ORO)
}

function puerta(p: P, x: number, y: number, abierta: boolean) {
  if (abierta) { p(x, y + 6, 3, 6, COL.maderaO); p(x + B - 3, y + 6, 3, 6, COL.maderaO); return }
  p(x, y + 3, B, 11, TINTA); p(x + 1, y + 4, B - 2, 9, ORO)
  for (let i = 0; i < 4; i++) p(x + 2 + i * 4, y + 4, 1, 9, ORO_O)
  // candado
  p(x + 6, y + 6, 4, 4, TINTA); p(x + 7, y + 7, 2, 2, '#c9c9c4')
}

// ------------------------- Sprites de objetos -------------------------

export interface Sprite {
  /** Posición del lienzo en pixeles lógicos del mundo. */
  x: number; y: number; w: number; h: number
  /** Profundidad: los avatares con pies más abajo que esto se dibujan delante. */
  pie: number
  dibujar: (p: P, frame: 0 | 1) => void
  /** Si cambia entre cuadros (fuego, banderas). */
  animado?: boolean
}

function pino(p: P, cx: number, base: number) {
  p(cx - 5, base - 2, 10, 2, COL.pastoO)
  p(cx - 1, base - 6, 2, 5, COL.tronco)
  for (let i = 0; i < 4; i++) {
    const top = base - 30 + i * 6, ancho = 2 + i * 2
    for (let j = 0; j < 7; j++) {
      const w = Math.min(ancho, 1 + j)
      p(cx - w - 1, top + j, w * 2 + 2, 1, COL.copaB)
      p(cx - w, top + j, w * 2, 1, j < 2 ? COL.copaM : COL.copa)
    }
    p(cx - ancho + 1, top + 5, 1, 1, COL.copaC)
  }
}

function carpa(p: P, x: number, y: number, w: number, alto: number, color: string) {
  const cx = x + Math.floor(w / 2)
  for (let i = 0; i < alto; i++) {
    const half = Math.round(((i + 1) / alto) * (w / 2))
    p(cx - half - 1, y + i, half * 2 + 2, 1, TINTA)
    p(cx - half, y + i, half, 1, color)
    p(cx, y + i, half, 1, sombra(color))
  }
  p(cx - Math.round(w / 2) - 1, y + alto, w + 2, 1, TINTA)
  // puerta
  for (let i = 0; i < Math.floor(alto / 2); i++) { const half = Math.round((i / alto) * (w / 3)); p(cx - half, y + alto - Math.floor(alto / 2) + i, half * 2 + 1, 1, '#2a1a0e') }
}

function sombra(hex: string) {
  const n = parseInt(hex.slice(1), 16), k = 0.72
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k)
  return `rgb(${r},${g},${b})`
}

function banderaConquis(p: P, x: number, y: number, frame: 0 | 1) {
  const w = 14, h = 9, o = frame
  p(x, y + o, w + 2, h + 2, TINTA)
  p(x + 1, y + 1 + o, 7, 4, AZUL); p(x + 8, y + 1 + o, 7, 4, '#fff')
  p(x + 1, y + 5 + o, 7, 5, '#fff'); p(x + 8, y + 5 + o, 7, 5, AZUL)
  // C1 al centro: triángulo rojo con borde dorado
  p(x + 6, y + 3 + o, 5, 1, ORO); p(x + 6, y + 4 + o, 5, 1, ROJO); p(x + 7, y + 5 + o, 3, 1, ROJO); p(x + 8, y + 6 + o, 1, 1, ORO)
}

/** Llama de pixel art: base ancha naranja, centro amarillo y punta clara (dos cuadros). */
function llama(p: P, cx: number, base: number, alto: number, f: 0 | 1) {
  const a = alto + (f ? 2 : 0)
  for (let i = 0; i < a; i++) {
    const t = i / a, w = Math.max(1, Math.round((1 - t) ** 0.8 * (alto * 0.42)) + (i % 3 === f ? 1 : 0))
    p(cx - w, base - i, w * 2, 1, t < 0.45 ? '#FF7A1A' : t < 0.75 ? '#FFB02E' : '#FFE58A')
    if (w > 2 && t < 0.6) p(cx - Math.ceil(w / 2), base - i, Math.ceil(w / 2) * 2, 1, t < 0.3 ? '#FFB02E' : '#FFD54A')
  }
  if (f) { p(cx - alto * 0.5, base - a * 0.6, 2, 2, '#FFD54A'); p(cx + alto * 0.35, base - a * 0.85, 1, 2, '#FFE58A') }
  else { p(cx + alto * 0.45, base - a * 0.5, 2, 2, '#FF8A1E'); p(cx - alto * 0.3, base - a * 0.9, 1, 2, '#FFE58A') }
}
function leno(p: P, x: number, y: number, w: number, h = 3) { p(x, y, w, h, TINTA); p(x + 1, y + 1, w - 2, h - 2, '#8a5a2e'); p(x + 1, y + 1, 2, h - 2, '#c98d55') }
function piedras(p: P, cx: number, cy: number, rx: number, ry: number, n: number) {
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p(cx + Math.round(Math.cos(a) * rx) - 2, cy + Math.round(Math.sin(a) * ry) - 1, 4, 3, i % 2 ? '#9b9b93' : '#7e7e77') }
}

/** Dibuja cada tipo de fogata en un lienzo de `w`×`h` (base abajo). */
function fogataTipo(p: P, tipo: TipoFogata, w: number, h: number, f: 0 | 1, prendida: boolean) {
  const cx = Math.round(w / 2), base = h - 4
  switch (tipo) {
    case 'gran': // la más grande: aro de piedras, montón de leños y llamas altas
      piedras(p, cx, base - 2, w / 2 - 3, 5, 14)
      for (let i = 0; i < 4; i++) leno(p, cx - 16 + i * 3, base - 6 - i * 2, 32 - i * 6)
      if (prendida) llama(p, cx, base - 8, 30, f)
      break
    case 'consejo': // fuego de consejo: troncos cruzados en forma de cabaña
      piedras(p, cx, base - 1, w / 2 - 3, 5, 12)
      for (let i = 0; i < 4; i++) {
        const y = base - 4 - i * 4
        if (i % 2) { leno(p, cx - 14, y, 6, 4); leno(p, cx + 8, y, 6, 4) } else leno(p, cx - 15, y, 30, 4)
      }
      if (prendida) llama(p, cx, base - 10, 24, f)
      break
    case 'reflector': // fuego reflector: pared de troncos atrás que devuelve el calor
      p(cx - 14, base - 22, 4, 24, TINTA); p(cx + 10, base - 22, 4, 24, TINTA)
      for (let i = 0; i < 5; i++) leno(p, cx - 13, base - 21 + i * 4, 26, 4)
      piedras(p, cx, base + 1, 9, 2, 8)
      if (prendida) llama(p, cx, base, 14, f)
      break
    case 'tipi': // fogata tipo tipi: palos en cono
      for (let i = 0; i < 6; i++) { const dx = (i - 2.5) * 3; p(cx + dx, base - 14 + Math.abs(dx) * 0.6, 2, 15 - Math.abs(dx) * 0.6, i % 2 ? '#6b4423' : '#8a5a2e') }
      piedras(p, cx, base + 1, 9, 2, 8)
      if (prendida) llama(p, cx, base - 2, 14, f)
      break
    case 'estrella': // fogata estrella: leños como rayos hacia el centro
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * 9, y = base - 1 + Math.sin(a) * 3; p(Math.min(x, cx) - 1, Math.min(y, base - 1) - 1, Math.abs(x - cx) + 3, Math.abs(y - base + 1) + 3, '#6b4423') }
      if (prendida) llama(p, cx, base - 1, 11, f)
      break
  }
}

/** Datos del club que ocupa una parcela (colorean carpas y portada). */
export interface ExtraSprite { color?: string; ocupada?: boolean; sabado?: boolean }

/** Sprites de los objetos altos (los planos van en el suelo). */
export function spriteDe(ob: Objeto, abierto: boolean, extra: ExtraSprite = {}): Sprite | null {
  const X = ob.x * B, Y = ob.y * B, W = ob.w * B, H = ob.h * B
  switch (ob.tipo) {
    case 'pino': return { x: X - 2, y: Y - 22, w: 20, h: 38, pie: Y + B, dibujar: p => pino(p, 10, 37) }
    case 'carpa': return { x: X - 1, y: Y - 2, w: W + 2, h: H + 2, pie: Y + H, dibujar: p => carpa(p, 1, 6, W - 2, H - 8, ob.color ?? ROJO) }
    case 'carpa-p': {
      const color = extra.color ?? '#9a9a92'
      return {
        x: X - 1, y: Y - 6, w: W + 2, h: H + 6, pie: Y + H,
        dibujar: p => {
          if (!extra.ocupada) { p(4, H - 4, W - 6, 8, '#ffffff22'); for (const [a, b] of [[4, H - 4], [W - 4, H - 4], [4, H + 2], [W - 4, H + 2]]) p(a, b, 2, 3, '#6b4423'); return } // lugar para una carpa (estacas)
          carpa(p, 1, 8, W, H - 6, color)
          p(W / 2, 2, 1, 7, TINTA); p(W / 2 + 1, 2, 5, 3, ob.sexo === 'f' ? '#E25C8A' : '#2E6FD8') // banderita del lado
        },
      }
    }
    case 'farol': return {
      x: X + 3, y: Y - 22, w: 10, h: 38, pie: Y + B,
      dibujar: p => {
        p(1, 34, 8, 3, '#00000033')
        p(4, 6, 2, 30, TINTA); p(3, 34, 4, 2, TINTA)
        p(1, 0, 8, 8, TINTA); p(2, 1, 6, 6, '#FFE9A8'); p(2, 1, 6, 1, '#9b8a5a'); p(0, 0, 10, 1, TINTA)
      },
    }
    case 'banca': return {
      x: X, y: Y + 3, w: W, h: 11, pie: Y + B,
      dibujar: p => { p(0, 2, W, 5, TINTA); p(1, 3, W - 2, 3, COL.madera); p(2, 7, 2, 4, TINTA); p(W - 4, 7, 2, 4, TINTA); p(1, 3, W - 2, 1, '#c98d55') },
    }
    case 'tronco': return {
      x: X - 2, y: Y + 4, w: 20, h: 11, pie: Y + B,
      dibujar: p => { p(1, 9, 18, 2, '#00000033'); leno(p, 0, 2, 20, 8); p(15, 3, 4, 6, '#c98d55'); p(16, 5, 2, 2, '#8a5a2e') },
    }
    case 'letrero': return {
      x: X, y: Y - 12, w: 18, h: 28, pie: Y + B,
      dibujar: p => {
        p(7, 10, 3, 18, TINTA); p(8, 10, 1, 18, COL.madera)
        p(0, 0, 18, 11, TINTA); p(1, 1, 16, 9, '#e8cb85')
        p(4, 6, 6, 1, TINTA); p(5, 7, 4, 1, TINTA); p(6, 3, 1, 3, TINTA); p(12, 3, 2, 4, AZUL); p(11, 7, 4, 1, COL.maderaO)
      },
    }
    case 'tablero': return {
      x: X, y: Y - 14, w: W, h: H + 14, pie: Y + H,
      dibujar: p => {
        p(6, 26, 3, 20, TINTA); p(W - 9, 26, 3, 20, TINTA)
        p(0, 0, W, 30, TINTA); p(2, 2, W - 4, 26, '#8a5a2e'); p(4, 4, W - 8, 22, '#f3e7c8')
        p(4, 4, W - 8, 5, ORO); p(8, 6, W - 16, 1, ORO_O)
        const med = [ORO, '#c9cdd6', '#c98d55']
        for (let i = 0; i < 3; i++) { p(8, 11 + i * 5, 4, 4, med[i]); p(14, 12 + i * 5, W - 24 - i * 6, 2, '#b9a98a') }
      },
    }
    case 'reto': return {
      x: X, y: Y - 14, w: W, h: H + 14, pie: Y + H,
      dibujar: (p, f) => {
        p(2, 18, W - 4, 26, TINTA); p(3, 19, W - 6, 24, '#c98d55'); p(3, 26, W - 6, 2, COL.maderaO)
        p(0, 6, W, 12, TINTA)
        for (let i = 0; i < W - 2; i += 6) p(1 + i, 7, 3, 10, extra.sabado ? '#7b8fd1' : ROJO), p(4 + i, 7, 3, 10, '#fff')
        for (let i = 0; i < W; i += 6) p(i + 1, 17, 4, 2, TINTA)
        p(W / 2 - 9, -2 + f, 18, 9, TINTA); p(W / 2 - 8, -1 + f, 16, 7, ORO)
        p(W / 2 - 1, 0 + f, 2, 5, ROJO); p(W / 2 - 3, 2 + f, 6, 1, ROJO)
        if (extra.sabado) { p(4, 30, W - 8, 4, TINTA) } // cerrado: tabla cruzada
      },
      animado: true,
    }
    case 'tienda': return {
      x: X - 2, y: Y - 22, w: W + 4, h: H + 22, pie: Y + H,
      dibujar: (p, f) => {
        // mostrador
        p(2, 30, W, 22, TINTA); p(3, 31, W - 2, 20, '#c98d55'); p(3, 38, W - 2, 2, COL.maderaO)
        // vitrina con pines y parches de colores
        const cols = [ORO, ROJO, AZUL, '#1E9A4B', '#7A1F3D', '#fff']
        for (let i = 0; i < 9; i++) p(7 + i * 6, 33, 4, 4, cols[i % cols.length])
        // postes y toldo a rayas verdes
        p(3, 8, 3, 24, TINTA); p(W - 2, 8, 3, 24, TINTA)
        p(0, 6, W + 4, 12, TINTA)
        for (let i = 0; i < W; i += 6) p(1 + i, 7, 3, 10, extra.sabado ? '#7b8fd1' : '#1E9A4B'), p(4 + i, 7, 3, 10, '#fff')
        for (let i = 0; i < W + 2; i += 6) p(i + 1, 17, 4, 2, TINTA)
        // letrero con una moneda
        p(W / 2 - 10, -2 + f, 24, 10, TINTA); p(W / 2 - 9, -1 + f, 22, 8, '#f3e7c8')
        p(W / 2 - 5, 0 + f, 6, 6, ORO_O); p(W / 2 - 4, 1 + f, 4, 4, ORO); p(W / 2 + 3, 2 + f, 7, 2, '#8a5a2e')
      },
      animado: true,
    }
    case 'escenario': return {
      x: X, y: Y - 28, w: W, h: H + 28, pie: Y + H,
      dibujar: p => {
        p(4, 0, W - 8, 30, TINTA); p(6, 2, W - 12, 26, extra.sabado ? '#2a3f8f' : ROJO_O)
        for (let i = 8; i < W - 8; i += 6) p(i, 4, 3, 24, extra.sabado ? '#3b55b5' : ROJO)
        p(6, 2, W - 12, 4, ORO); p(6, 5, W - 12, 1, ORO_O)
        if (extra.sabado) { p(W / 2 - 1, 8, 3, 14, '#fff'); p(W / 2 - 5, 12, 11, 3, '#fff') } // cruz: culto
        p(0, 28, W, H, TINTA); p(1, 29, W - 2, 5, '#c98d55')
        for (let i = 0; i < 3; i++) p(1, 35 + i * 4, W - 2, 3, i % 2 ? COL.madera : '#9a6436')
        p(2, 18, 8, 11, TINTA); p(3, 19, 6, 9, '#3b3b3b'); p(5, 22, 2, 2, '#888')
        p(W - 10, 18, 8, 11, TINTA); p(W - 9, 19, 6, 9, '#3b3b3b'); p(W - 7, 22, 2, 2, '#888')
      },
    }
    case 'bandera': return {
      x: X, y: Y - 30, w: 22, h: 46, pie: Y + B,
      dibujar: (p, f) => { p(6, 42, 6, 3, '#00000033'); p(7, 2, 2, 42, TINTA); p(6, 0, 4, 3, ORO); banderaConquis(p, 9, 3, f) },
      animado: true,
    }
    case 'banderin': return {
      x: X, y: Y - 26, w: 20, h: 42, pie: Y + B,
      dibujar: (p, f) => {
        p(3, 38, 6, 3, '#00000033'); p(4, 0, 2, 40, TINTA)
        for (let i = 0; i < 9; i++) { const w = 14 - Math.round(i * 1.5) + (f ? -1 : 0); p(6, 2 + i, Math.max(1, w), 1, TINTA); if (w > 2) p(6, 2 + i, w - 1, 1, i < 4 ? AZUL : '#fff') }
      },
      animado: true,
    }
    case 'asta': return {
      // solo el mástil: las banderas van aparte (suben y bajan en la ceremonia)
      x: X + 4, y: Y - 40, w: 10, h: 56, pie: Y + B,
      dibujar: p => { p(0, 50, 10, 4, '#8d8d86'); p(1, 51, 8, 2, '#a9a9a1'); p(4, 2, 2, 50, TINTA); p(3, 0, 4, 3, ORO) },
    }
    case 'portada': {
      const color = extra.color ?? '#8d8d86', vertical = H > W
      return {
        x: X - 6, y: Y - 34, w: W + 12, h: H + 36, pie: Y + H,
        dibujar: p => {
          if (!vertical) return
          // dos postes de tronco en los extremos de la entrada y una viga con la placa del club
          for (const py of [6, H + 6]) { p(4, py, 8, 28, TINTA); p(5, py, 6, 27, '#8a5a2e'); p(5, py, 2, 27, '#c98d55') }
          p(2, 4, 12, H + 6, TINTA); p(3, 5, 10, H + 4, '#6b4423')
          p(1, H / 2 + 2, W + 10, 6, TINTA); p(2, H / 2 + 3, W + 8, 4, color)
        },
      }
    }
    case 'fogata': {
      const tipo = ob.fogata ?? 'tipi', grande = tipo === 'gran' || tipo === 'consejo'
      const w = grande ? 56 : 34, h = grande ? 58 : 34
      return {
        x: X + W / 2 - w / 2, y: Y + H - h + 4, w, h, pie: Y + H,
        dibujar: (p, f) => fogataTipo(p, tipo, w, h, f, tipo === 'gran' || tipo === 'consejo' || abierto || ob.parcela !== undefined),
        animado: true,
      }
    }
    case 'barco': return {
      x: X, y: Y * 1 + 2, w: W, h: H + 8, pie: Y + H,
      dibujar: (p, f) => {
        const hw = W, cy = 22 + f
        for (let r = -10; r <= 10; r++) {
          const ancho = Math.round(Math.sqrt(1 - (r / 11) ** 2) * (hw / 2 - 4))
          p(hw / 2 - ancho - 1, cy + r, ancho * 2 + 2, 1, TINTA)
          p(hw / 2 - ancho, cy + r, ancho * 2, 1, Math.abs(r) > 7 ? '#5e3a1a' : COL.madera)
        }
        for (let i = -7; i <= 7; i += 3) p(14, cy + i, hw - 28, 1, '#7a4b22')
        p(hw / 2 - 30, cy - 1, 60, 3, ORO)
        p(hw / 2 - 2, cy - 9, 4, 18, '#fff7e3'); p(hw / 2 - 1, cy - 9, 2, 18, '#e7dcc0'); p(hw / 2 - 2, cy - 2, 4, 4, TINTA)
        banderaConquis(p, hw / 2 + 2, cy - 18, f)
        p(hw - 6, cy - 3, 6, 1, '#d8efff'); p(hw - 4, cy + 3, 4, 1, '#d8efff')
      },
      animado: true,
    }
    default: return null
  }
}

/** Pinta un sprite en su lienzo (ancho×alto lógicos). */
export function pintarSprite(ctx: CanvasRenderingContext2D, sp: Sprite, frame: 0 | 1) {
  ctx.clearRect(0, 0, sp.w, sp.h)
  sp.dibujar((x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }, frame)
}

/** Dónde brillan las luces de noche (en baldosas), y qué tan grandes. */
export function lucesDeNoche(objetos: Objeto[]) {
  const l: { x: number; y: number; r: number; calida: boolean }[] = []
  for (const ob of objetos) {
    if (ob.tipo === 'farol') l.push({ x: ob.x + 0.5, y: ob.y - 0.6, r: 2.4, calida: false })
    else if (ob.tipo === 'fogata') {
      const grande = ob.fogata === 'gran' || ob.fogata === 'consejo'
      l.push({ x: ob.x + ob.w / 2, y: ob.y + ob.h - 0.6, r: grande ? 5.2 : 3, calida: true })
    } else if (ob.tipo === 'escenario') l.push({ x: ob.x + ob.w / 2, y: ob.y - 0.4, r: 3.4, calida: false })
    else if (ob.tipo === 'reto' || ob.tipo === 'tienda') l.push({ x: ob.x + ob.w / 2, y: ob.y + 0.6, r: 2.6, calida: true })
  }
  return l
}

/** Bandera de Conquistadores en pixel art (para lienzos de banderas: 16×11). */
export function pintarBanderaConquis(ctx: CanvasRenderingContext2D, x = 0, y = 0) {
  banderaConquis((a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h) }, x, y, 0)
}
