/**
 * Plaza Central en pixel art, dibujada por código (sin imágenes que descargar).
 * El suelo va en un lienzo (dos cuadros para las olas); los objetos altos van como sprites aparte para que los
 * avatares puedan pasar delante o detrás de ellos.
 */
import { ALTO, ANCHO, SANTUARIO, Suelo, dentroTriangulo, suelo, type Objeto } from '../../domain/plaza'
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
      if (tx === 23 || tx === 25) p(tx === 23 ? x : x + B - 2, y, 2, B, COL.maderaO)
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
 * Redibuja pixel a pixel la orilla, el borde dorado y la franja roja siguiendo la diagonal exacta del triángulo
 * (sin escalones de baldosa). El muelle no se toca.
 */
function bordeFino(ctx: CanvasRenderingContext2D, frame: 0 | 1) {
  const W = ANCHO * B, H = ALTO * B
  const img = ctx.getImageData(0, 0, W, H), d = img.data
  const oro = rgb(ORO), oroO = rgb(ORO_O), oroC = rgb(ORO_C), rojo = rgb(ROJO), rojoO = rgb(ROJO_O)
  const pasto = rgb(COL.pasto), pastoO = rgb(COL.pastoO), espuma = rgb(COL.espuma), ola = rgb(COL.ola), MARES = COL.mar.map(rgb)
  const libre = new Set<number>([Suelo.AGUA, Suelo.ORO, Suelo.ROJO, Suelo.PASTO])
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const v = suelo(px >> 4, py >> 4)
    if (!libre.has(v)) continue
    const k = dentroTriangulo((px + 0.5) / B, (py + 0.5) / B)
    if (k > 2.25 && v === Suelo.PASTO) continue
    let c: number[]
    if (k < 0) {
      // Mar con profundidad suave (tramado ordenado) según la distancia a la isla, espuma en la orilla y olitas
      if (k > -0.18 - frame * 0.06) c = espuma
      else {
        const nivel = Math.min(5, Math.max(0, Math.floor(-k * 1.25 + BAYER[(py & 3) * 4 + (px & 3)] / 16)))
        c = MARES[nivel]
        if (nivel >= 1 && hash(px >> 2, py, 13 + frame) < 0.006) c = ola
      }
    } else if (k > 2.25) c = hash(px, py, 6) < 0.08 ? pastoO : pasto
    else if (k < 1) {
      const fila = Math.floor(k * 4) // ladrillos a lo largo del borde
      c = k < 0.12 ? oroO : fila === 2 && (px + py) % 9 === 0 ? oroO : k > 0.8 ? oroO : (px * 7 + py * 3) % 23 === 0 ? oroC : oro
    } else if (k < 2) c = k < 1.1 || hash(px, py, 4) < 0.05 ? rojoO : rojo
    else c = hash(px, py, 6) < 0.08 ? pastoO : pasto
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

/** Sprites de los objetos altos (los planos van en el suelo). */
export function spriteDe(ob: Objeto, abierto: boolean): Sprite | null {
  const X = ob.x * B, Y = ob.y * B, W = ob.w * B, H = ob.h * B
  switch (ob.tipo) {
    case 'pino': return { x: X - 2, y: Y - 22, w: 20, h: 38, pie: Y + B, dibujar: p => pino(p, 10, 37) }
    case 'carpa': return { x: X - 1, y: Y - 2, w: W + 2, h: H + 2, pie: Y + H, dibujar: p => carpa(p, 1, 6, W - 2, H - 8, ob.color ?? ROJO) }
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
    case 'letrero': return {
      x: X, y: Y - 12, w: 18, h: 28, pie: Y + B,
      dibujar: p => {
        p(7, 10, 3, 18, TINTA); p(8, 10, 1, 18, COL.madera)
        p(0, 0, 18, 11, TINTA); p(1, 1, 16, 9, '#e8cb85')
        // flecha hacia el muelle (arriba) y un barquito
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
        // toldo a rayas
        p(0, 6, W, 12, TINTA)
        for (let i = 0; i < W - 2; i += 6) p(1 + i, 7, 3, 10, ROJO), p(4 + i, 7, 3, 10, '#fff')
        for (let i = 0; i < W; i += 6) p(i + 1, 17, 4, 2, TINTA)
        // letrero con estrella
        p(W / 2 - 9, -2 + f, 18, 9, TINTA); p(W / 2 - 8, -1 + f, 16, 7, ORO)
        p(W / 2 - 1, 0 + f, 2, 5, ROJO); p(W / 2 - 3, 2 + f, 6, 1, ROJO)
      },
      animado: true,
    }
    case 'carpa-club': return {
      x: X - 4, y: Y - 16, w: W + 8, h: H + 16, pie: Y + H,
      dibujar: (p, f) => {
        p(W / 2 + 4, 0, 2, 14, TINTA)
        banderaConquis(p, W / 2 + 6, 0, f)
        carpa(p, 2, 8, W + 4, H + 6, AZUL)
        p(6, H + 13, W - 4, 2, ORO)
      },
      animado: true,
    }
    case 'escenario': return {
      x: X, y: Y - 28, w: W, h: H + 28, pie: Y + H,
      dibujar: p => {
        // fondo con telón rojo y borde dorado
        p(4, 0, W - 8, 30, TINTA); p(6, 2, W - 12, 26, ROJO_O)
        for (let i = 8; i < W - 8; i += 6) p(i, 4, 3, 24, ROJO)
        p(6, 2, W - 12, 4, ORO); p(6, 5, W - 12, 1, ORO_O)
        // tarima de madera
        p(0, 28, W, H, TINTA); p(1, 29, W - 2, 5, '#c98d55')
        for (let i = 0; i < 3; i++) p(1, 35 + i * 4, W - 2, 3, i % 2 ? COL.madera : '#9a6436')
        // parlantes
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
        // banderín triangular de unidad: borde de tinta, azul y blanco
        for (let i = 0; i < 9; i++) { const w = 14 - Math.round(i * 1.5) + (f ? -1 : 0); p(6, 2 + i, Math.max(1, w), 1, TINTA); if (w > 2) p(6, 2 + i, w - 1, 1, i < 4 ? AZUL : '#fff') }
      },
      animado: true,
    }
    case 'fogata': return {
      x: X - 4, y: Y - 10, w: 24, h: 26, pie: Y + B,
      dibujar: (p, f) => {
        // piedras y leños
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p(11 + Math.round(Math.cos(a) * 9), 19 + Math.round(Math.sin(a) * 4), 3, 2, '#8d8d86') }
        p(6, 19, 12, 2, '#6b4423'); p(8, 17, 8, 2, '#8a5a2e')
        if (!abierto) { p(9, 16, 6, 1, '#555'); return }
        p(8, 9 - f, 8, 9 + f, '#FF8A1E'); p(10, 6 - f, 4, 6, '#FFC02E'); p(11, 3 - f, 2, 4, '#FFE58A')
        if (f) p(6, 12, 2, 2, '#FFC02E'); else p(16, 10, 2, 2, '#FF8A1E')
      },
      animado: true,
    }
    case 'barco': return {
      x: X, y: Y * 1 + 2, w: W, h: H + 8, pie: Y + H,
      dibujar: (p, f) => {
        const hw = W, cy = 22 + f
        // casco visto desde arriba (proa a la izquierda), con cubierta
        for (let r = -10; r <= 10; r++) {
          const ancho = Math.round(Math.sqrt(1 - (r / 11) ** 2) * (hw / 2 - 4))
          p(hw / 2 - ancho - 1, cy + r, ancho * 2 + 2, 1, TINTA)
          p(hw / 2 - ancho, cy + r, ancho * 2, 1, Math.abs(r) > 7 ? '#5e3a1a' : COL.madera)
        }
        for (let i = -7; i <= 7; i += 3) p(14, cy + i, hw - 28, 1, '#7a4b22')
        p(hw / 2 - 30, cy - 1, 60, 3, ORO)
        // vela vista desde arriba y mástil
        p(hw / 2 - 2, cy - 9, 4, 18, '#fff7e3'); p(hw / 2 - 1, cy - 9, 2, 18, '#e7dcc0'); p(hw / 2 - 2, cy - 2, 4, 4, TINTA)
        banderaConquis(p, hw / 2 + 2, cy - 18, f)
        // estela
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
export function lucesDeNoche(objetos: Objeto[], abierto: boolean) {
  const l: { x: number; y: number; r: number; calida: boolean }[] = []
  for (const ob of objetos) {
    if (ob.tipo === 'farol') l.push({ x: ob.x + 0.5, y: ob.y - 0.6, r: 2.4, calida: false })
    else if (ob.tipo === 'fogata' && abierto) l.push({ x: ob.x + 0.5, y: ob.y + 0.2, r: 4.2, calida: true })
    else if (ob.tipo === 'escenario') l.push({ x: ob.x + ob.w / 2, y: ob.y - 0.4, r: 3.4, calida: false })
    else if (ob.tipo === 'reto') l.push({ x: ob.x + ob.w / 2, y: ob.y + 0.6, r: 2.6, calida: true })
    else if (ob.tipo === 'carpa-club') l.push({ x: ob.x + ob.w / 2, y: ob.y + 1.2, r: 2.6, calida: true })
  }
  return l
}
