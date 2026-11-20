/**
 * Gran Campamento Conquistador: el mundo abierto donde se encuentran todos los clubes.
 *
 *  - Una isla grande con un muelle al norte (el barco lleva a los campamentos de desafíos).
 *  - Al centro, la Plaza Central con forma del triángulo del emblema (borde dorado y franja roja) y tres puertas:
 *    santuario con la gran fogata, bandera y banderín de unidad; tablero de honor; reto del día; tienda de parches y
 *    pines (ConquisCoins) y el escenario para cultos.
 *  - Abajo, el Fuego del Consejo: un círculo de troncos alrededor de una fogata grande.
 *  - Alrededor, las parcelas cercadas de los clubes: un pórtico de troncos amarrados con las banderas (país,
 *    Conquistadores y club), patio de formación frente al pórtico, carpas de varones a la izquierda y de damas a la
 *    derecha (arriba y abajo) y su fogata (reflector, tipi o estrella).
 *    Los clubes reciben parcela conforme van llegando al canal.
 *
 * Todo es determinista y sin dependencias de la interfaz: el mismo mapa y las mismas rutas en todos los equipos,
 * así basta con enviar a dónde camina cada uno (no cada paso).
 */

export const ANCHO = 96, ALTO = 86

export const Suelo = { AGUA: 0, ORO: 1, ROJO: 2, PASTO: 3, PIEDRA: 4, CAMINO: 5, MUELLE: 6, CERCA: 7, PUERTA: 8 } as const
export type Suelo = (typeof Suelo)[keyof typeof Suelo]

export type TipoFogata = 'gran' | 'consejo' | 'reflector' | 'tipi' | 'estrella'
export type TipoObjeto = 'barco' | 'tablero' | 'reto' | 'tienda' | 'escenario' | 'santuario' | 'letrero' | 'consejo'
  | 'pino' | 'carpa' | 'farol' | 'banca' | 'tronco' | 'fogata' | 'bandera' | 'banderin'
  /** De las parcelas de clubes: */
  | 'carpa-p' | 'portada'

export interface Objeto {
  tipo: TipoObjeto
  /** Esquina superior izquierda de lo que ocupa (en baldosas). */
  x: number; y: number; w: number; h: number
  /** Si se puede usar: punto (en baldosas) al que se camina para usarlo. */
  uso?: { x: number; y: number }
  color?: string
  fogata?: TipoFogata
  /** Parcela a la que pertenece (carpas, astas y portada de los clubes). */
  parcela?: number
  /** Carpa: número de carpa dentro de su lado. */
  slot?: number
  sexo?: 'm' | 'f'
}

// ---------------- Geometría base ----------------

const TRI = { top: 14, apex: 48, cx: 48, mitad: 24 }
/** Distancia (en baldosas, positiva adentro) al borde del triángulo invertido de la plaza. */
export function dentroTriangulo(x: number, y: number) {
  if (y < TRI.top) return -Math.hypot(Math.max(0, Math.abs(x - TRI.cx) - TRI.mitad), TRI.top - y)
  const media = (TRI.mitad * (TRI.apex - y)) / (TRI.apex - TRI.top)
  return Math.min(y - TRI.top, media - Math.abs(x - TRI.cx))
}

function h01(i: number, j: number, s = 3) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
function ruido(x: number, y: number, esc: number) {
  x /= esc; y /= esc
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = h01(i, j), b = h01(i + 1, j), c = h01(i, j + 1), d = h01(i + 1, j + 1)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
/** Distancia (positiva adentro) a la costa de la isla: un rectángulo redondeado con orilla irregular. */
export function dentroIsla(x: number, y: number) {
  const cx = 48, cy = 46, hx = 44, hy = 38, r = 9
  const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r
  const fuera = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  return -fuera + (ruido(x, y, 7) - 0.5) * 2.4
}

export const SALIDA = { x: 48.5, y: 17.5 }
export const SANTUARIO = { x: 45, y: 20, w: 7, h: 7 }
export const CENTRO_PLAZA = { x: 48.5, y: 23.5 }
export const CONSEJO = { x: 48.5, y: 59.5, r: 4.2 }
export const MUELLE = { x: 48.5, y: 5.2 }

// ---------------- Parcelas de los clubes ----------------

export interface Parcela {
  i: number
  x: number; y: number; w: number; h: number
  /** Lado de la portada (mira hacia la plaza). */
  puerta: 'este' | 'oeste'
  fogata: TipoFogata
  /** Centro del patio de formación. */
  patio: { x: number; y: number }
}
const PW = 14, PH = 12

export const PARCELAS: Parcela[] = (() => {
  const cands: { x: number; y: number; puerta: 'este' | 'oeste' }[] = []
  for (const y of [14, 28, 42, 56, 70]) for (const x of [8, 23, 41, 59, 74]) cands.push({ x, y, puerta: x + PW / 2 < 48 ? 'este' : 'oeste' })
  const ok = (c: { x: number; y: number }) => {
    for (let y = c.y - 1; y <= c.y + PH; y++) for (let x = c.x - 1; x <= c.x + PW; x++) {
      if (dentroIsla(x + 0.5, y + 0.5) < 1.2) return false
      if (dentroTriangulo(x + 0.5, y + 0.5) > -3) return false
      if (Math.hypot(x + 0.5 - CONSEJO.x, y + 0.5 - CONSEJO.y) < CONSEJO.r + 4) return false
      if (y < 15 && x >= 44 && x <= 52) return false
    }
    return true
  }
  const dist = (c: { x: number; y: number }) => Math.hypot(c.x + PW / 2 - CENTRO_PLAZA.x, c.y + PH / 2 - CENTRO_PLAZA.y)
  const elegidas: { x: number; y: number; puerta: 'este' | 'oeste' }[] = []
  for (const c of cands.filter(ok).sort((a, b) => dist(a) - dist(b) || a.x - b.x)) {
    // sin encimarse y con un pasillo de 1 baldosa entre parcelas
    if (elegidas.some(e => c.x < e.x + PW + 1 && e.x < c.x + PW + 1 && c.y < e.y + PH + 1 && e.y < c.y + PH + 1)) continue
    elegidas.push(c)
  }
  const fogatas: TipoFogata[] = ['reflector', 'tipi', 'estrella']
  return elegidas.map((c, i) => ({ i, ...c, w: PW, h: PH, fogata: fogatas[i % 3], patio: { x: c.x + PW / 2, y: c.y + 4.5 } }))
})()

/** Carpas de cada lado de la parcela (3 abajo y 2 arriba) y cuántos duermen en cada una (mismo sexo). */
export const CARPAS_POR_LADO = 5, POR_CARPA = 4

// ---------------- Construcción del suelo ----------------

function construir() {
  const s = new Uint8Array(ANCHO * ALTO)
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < ANCHO && y < ALTO) s[y * ANCHO + x] = v }
  for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO; x++) {
    const px = x + 0.5, py = y + 0.5
    if (dentroIsla(px, py) < 0) { set(x, y, Suelo.AGUA); continue }
    const d = dentroTriangulo(px, py)
    set(x, y, d >= 0 && d < 1 ? Suelo.ORO : d >= 1 && d < 2 ? Suelo.ROJO : Suelo.PASTO)
  }
  const piedra = (x: number, y: number) => set(x, y, Suelo.PIEDRA)
  const camino = (x: number, y: number) => { if (s[y * ANCHO + x] === Suelo.PASTO) set(x, y, Suelo.CAMINO) }

  // Camino que rodea la plaza por fuera (paralelo al borde del emblema)
  for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO; x++) {
    const d = dentroTriangulo(x + 0.5, y + 0.5)
    if (d > -2.6 && d <= -1.2 && y > 10) camino(x, y)
  }
  // Muelle y avenida norte hasta la puerta de la plaza
  for (let y = 1; y <= 10; y++) for (let x = 47; x <= 49; x++) if (s[y * ANCHO + x] === Suelo.AGUA || y < 9) set(x, y, Suelo.MUELLE)
  for (let y = 9; y <= 17; y++) for (let x = 46; x <= 50; x++) piedra(x, y)
  // Puertas suroeste y sureste del emblema
  for (const gx of [41.6, 55.4]) for (let y = 34; y <= 42; y++) for (let x = 36; x <= 61; x++) {
    const d = dentroTriangulo(x + 0.5, y + 0.5)
    if (Math.hypot(x + 0.5 - gx, (y + 0.5 - 38.5) * 0.8) < 2.2 && d < 2.6 && d > -1.5) piedra(x, y)
  }
  // Plaza redonda alrededor del santuario
  for (let y = 15; y < 32; y++) for (let x = 38; x < 60; x++) {
    const r = Math.hypot((x + 0.5 - CENTRO_PLAZA.x) / 1.2, y + 0.5 - CENTRO_PLAZA.y)
    if (r < 6.6 && dentroTriangulo(x + 0.5, y + 0.5) >= 2) piedra(x, y)
  }
  // Caminos de la plaza: al tablero, al reto, a la tienda y al escenario
  for (let x = 36; x <= 41; x++) camino(x, 21), camino(x, 22)
  for (let x = 56; x <= 60; x++) camino(x, 21), camino(x, 22)
  for (let y = 29; y <= 33; y++) camino(48, y), camino(49, y)
  // De las puertas del sur al Fuego del Consejo
  for (let i = 0; i <= 18; i++) {
    const t = i / 18
    for (const gx of [41.6, 55.4]) {
      const x = Math.round(gx + (CONSEJO.x - gx) * t), y = Math.round(40 + (CONSEJO.y - 5 - 40) * t)
      camino(x, y); camino(x + 1, y)
    }
  }
  // Fuego del Consejo: claro de tierra en círculo
  for (let y = 50; y < 70; y++) for (let x = 38; x < 60; x++) if (Math.hypot(x + 0.5 - CONSEJO.x, y + 0.5 - CONSEJO.y) < CONSEJO.r + 1.6) camino(x, y)
  // Santuario cercado: la puerta (abajo) se abre al completar todos los campamentos
  const { x: sx, y: sy, w: sw, h: sh } = SANTUARIO
  for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) {
    const borde = x === sx || y === sy || x === sx + sw - 1 || y === sy + sh - 1
    set(x, y, borde ? Suelo.CERCA : Suelo.PASTO)
  }
  set(48, sy + sh - 1, Suelo.PUERTA)
  // Parcelas: cerco con portada hacia la plaza, patio de formación de tierra
  for (const p of PARCELAS) {
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
      const borde = x === p.x || y === p.y || x === p.x + p.w - 1 || y === p.y + p.h - 1
      set(x, y, borde ? Suelo.CERCA : Suelo.PASTO)
    }
    for (let y = p.y + 3; y <= p.y + 6; y++) for (let x = p.x + 1; x < p.x + p.w - 1; x++) set(x, y, Suelo.CAMINO)
    const gx = p.puerta === 'este' ? p.x + p.w - 1 : p.x
    for (let y = p.y + 3; y <= p.y + 5; y++) piedra(gx, y)
    // sendero desde la portada hasta el camino que rodea la plaza
    const dir = p.puerta === 'este' ? 1 : -1
    for (let x = gx + dir; x >= 0 && x < ANCHO; x += dir) {
      const v = s[(p.y + 4) * ANCHO + x]
      if (v !== Suelo.PASTO) break
      set(x, p.y + 4, Suelo.CAMINO)
    }
  }
  return s
}

export const SUELO = construir()
export const suelo = (x: number, y: number) => (x < 0 || y < 0 || x >= ANCHO || y >= ALTO ? Suelo.AGUA : SUELO[y * ANCHO + x])

/** Los objetos del mundo (decoración e interactivos). */
export const OBJETOS: Objeto[] = (() => {
  const o: Objeto[] = [
    { tipo: 'barco', x: 45, y: -1, w: 7, h: 3, uso: { x: 48.5, y: 3.2 } },
    { tipo: 'letrero', x: 51, y: 12, w: 1, h: 1, uso: { x: 51.5, y: 13.8 } },
    { tipo: 'tablero', x: 34, y: 19, w: 4, h: 2, uso: { x: 36.5, y: 21.6 } },
    { tipo: 'reto', x: 59, y: 19, w: 3, h: 2, uso: { x: 59.5, y: 21.6 } },
    { tipo: 'tienda', x: 38, y: 26, w: 4, h: 2, uso: { x: 41.5, y: 28.6 } },
    { tipo: 'escenario', x: 45, y: 33, w: 7, h: 2, uso: { x: 48.5, y: 35.8 } },
    { tipo: 'santuario', x: SANTUARIO.x, y: SANTUARIO.y, w: SANTUARIO.w, h: SANTUARIO.h, uso: { x: 48.5, y: 27.6 } },
    { tipo: 'fogata', fogata: 'gran', x: 47, y: 22, w: 3, h: 2 },
    { tipo: 'bandera', x: 46, y: 21, w: 1, h: 1 },
    { tipo: 'banderin', x: 51, y: 21, w: 1, h: 1 },
    { tipo: 'consejo', x: 47, y: 58, w: 3, h: 2, uso: { x: 48.5, y: CONSEJO.y + CONSEJO.r + 0.4 } },
    { tipo: 'fogata', fogata: 'consejo', x: 47, y: 58, w: 3, h: 2 },
  ]
  // Troncos para sentarse alrededor del Fuego del Consejo (con huecos para entrar)
  for (let k = 0; k < 10; k++) {
    if (k === 2 || k === 7) continue
    const a = (k / 10) * Math.PI * 2 + 0.31
    o.push({ tipo: 'tronco', x: Math.floor(CONSEJO.x + Math.cos(a) * CONSEJO.r - 0.5), y: Math.floor(CONSEJO.y + Math.sin(a) * CONSEJO.r * 0.85), w: 1, h: 1 })
  }
  // Faroles en la avenida, la plaza y los caminos (de noche se encienden)
  for (const [x, y] of [[45, 12], [51, 16], [41, 18], [55, 18], [39, 23], [57, 23], [42, 29], [54, 29], [44, 31], [53, 31],
    [43, 44], [53, 44], [44, 52], [52, 53]] as const) o.push({ tipo: 'farol', x, y, w: 1, h: 1 })
  // Bancas frente al escenario (el público mira el telón desde el sur, de frente)
  for (const x of [45, 50]) o.push({ tipo: 'banca', x, y: 37, w: 2, h: 1 })
  // Parcelas de clubes: pórtico con las banderas, carpas por sexo (abajo y arriba) y su fogata
  for (const p of PARCELAS) {
    const gx = p.puerta === 'este' ? p.x + p.w - 1 : p.x
    o.push({ tipo: 'portada', parcela: p.i, x: gx, y: p.y + 3, w: 1, h: 3, uso: { x: gx + (p.puerta === 'este' ? 1.5 : -0.5), y: p.y + 4.5 } })
    for (let k = 0; k < CARPAS_POR_LADO; k++) {
      // 0 a 2: fila de abajo (la puerta mira al patio, hacia arriba); 3 y 4: fila de arriba (la puerta mira hacia abajo)
      const abajo = k < 3, j = abajo ? k : k - 3, y = abajo ? p.y + 8 : p.y + 1, uy = abajo ? p.y + 7.4 : p.y + 3.5
      o.push({ tipo: 'carpa-p', parcela: p.i, slot: k, sexo: 'm', x: p.x + 1 + j * 2, y, w: 2, h: 2, uso: { x: p.x + 2 + j * 2, y: uy } })
      o.push({ tipo: 'carpa-p', parcela: p.i, slot: k, sexo: 'f', x: p.x + p.w - 3 - j * 2, y, w: 2, h: 2, uso: { x: p.x + p.w - 2 - j * 2, y: uy } })
    }
    o.push({ tipo: 'fogata', fogata: p.fogata, parcela: p.i, x: p.x + Math.floor(p.w / 2) - 1, y: p.y + 10, w: 2, h: 1 })
  }
  // Carpas de colores y pinos decorativos en el campo (sin tapar parcelas, caminos ni la plaza)
  const ocupadas = new Set<number>()
  for (const ob of o) for (let y = ob.y - 1; y <= ob.y + ob.h; y++) for (let x = ob.x - 1; x <= ob.x + ob.w; x++) ocupadas.add(y * ANCHO + x)
  const libreParaDeco = (x: number, y: number) => !ocupadas.has(y * ANCHO + x) && suelo(x, y) === Suelo.PASTO && dentroIsla(x + 0.5, y + 0.5) > 1.6 && dentroTriangulo(x + 0.5, y + 0.5) < -3.2
    && !PARCELAS.some(p => x >= p.x - 1 && x <= p.x + p.w && y >= p.y - 1 && y <= p.y + p.h)
  const pinosPlaza: [number, number][] = [[40, 17], [56, 17], [39, 20], [58, 25], [44, 36], [53, 36], [43, 32], [54, 32]]
  for (const [x, y] of pinosPlaza) if (dentroTriangulo(x + 0.5, y + 0.5) >= 2.2 && suelo(x, y) === Suelo.PASTO) o.push({ tipo: 'pino', x, y, w: 1, h: 1 })
  for (let y = 6; y < ALTO - 2; y++) for (let x = 2; x < ANCHO - 2; x++) {
    if (!libreParaDeco(x, y)) continue
    const h = h01(x, y, 17)
    if (h < 0.055 && libreParaDeco(x, y + 1)) o.push({ tipo: 'pino', x, y, w: 1, h: 1 })
  }
  return o
})()

const OCUPA = (() => {
  const m = new Uint8Array(ANCHO * ALTO)
  for (const ob of OBJETOS) {
    if (ob.tipo === 'santuario' || ob.tipo === 'consejo' || ob.tipo === 'bandera' || ob.tipo === 'banderin' || ob.tipo === 'barco' || ob.tipo === 'portada') continue
    if (ob.tipo === 'fogata' && ob.fogata === 'gran') continue // está dentro del santuario
    for (let y = ob.y; y < ob.y + ob.h; y++) for (let x = ob.x; x < ob.x + ob.w; x++) if (x >= 0 && y >= 0 && x < ANCHO && y < ALTO) m[y * ANCHO + x] = 1
  }
  return m
})()

/** Si se puede pisar la baldosa. La puerta del santuario solo si está abierto. */
export function transitable(x: number, y: number, santuarioAbierto = false) {
  if (x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return false
  const v = SUELO[y * ANCHO + x]
  if (OCUPA[y * ANCHO + x]) return false
  return v === Suelo.PASTO || v === Suelo.PIEDRA || v === Suelo.CAMINO || v === Suelo.MUELLE || (v === Suelo.PUERTA && santuarioAbierto)
}

/** Baldosa transitable más cercana a un punto (para cuando tocas el agua o un objeto). */
export function masCercana(x: number, y: number, abierto = false): { x: number; y: number } | null {
  const cx = Math.floor(x), cy = Math.floor(y)
  if (transitable(cx, cy, abierto)) return { x: cx, y: cy }
  for (let r = 1; r < 8; r++) {
    let mejor: { x: number; y: number; d: number } | null = null
    for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) {
      if (Math.max(Math.abs(i - cx), Math.abs(j - cy)) !== r || !transitable(i, j, abierto)) continue
      const d = Math.hypot(i + 0.5 - x, j + 0.5 - y)
      if (!mejor || d < mejor.d) mejor = { x: i, y: j, d }
    }
    if (mejor) return { x: mejor.x, y: mejor.y }
  }
  return null
}

/**
 * Ruta A* en 8 direcciones (sin cortar esquinas). Devuelve los centros de baldosa a recorrer, sin la de partida.
 * Se usa igual para ti y para los demás, así todos ven el mismo recorrido.
 */
export function ruta(desde: { x: number; y: number }, hasta: { x: number; y: number }, abierto = false): { x: number; y: number }[] {
  const a = masCercana(desde.x, desde.y, abierto), b = masCercana(hasta.x, hasta.y, abierto)
  if (!a || !b) return []
  const N = ANCHO * ALTO, ini = a.y * ANCHO + a.x, fin = b.y * ANCHO + b.x
  if (ini === fin) return [{ x: b.x + 0.5, y: b.y + 0.5 }]
  const g = new Float32Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N), f = new Float32Array(N)
  const heap: number[] = []
  const h = (k: number) => { const dx = Math.abs((k % ANCHO) - b.x), dy = Math.abs(Math.floor(k / ANCHO) - b.y); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy) }
  const push = (k: number) => {
    heap.push(k); let i = heap.length - 1
    while (i > 0) { const p = (i - 1) >> 1; if (f[heap[p]] <= f[heap[i]]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p }
  }
  const pop = () => {
    const top = heap[0], last = heap.pop()!
    if (heap.length) {
      heap[0] = last; let i = 0
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i
        if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l
        if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]; i = m
      }
    }
    return top
  }
  g[ini] = 0; f[ini] = h(ini); push(ini)
  let pasos = 0
  while (heap.length && pasos++ < 30000) {
    const k = pop()
    if (k === fin) break
    if (cerrado[k]) continue
    cerrado[k] = 1
    const kx = k % ANCHO, ky = Math.floor(k / ANCHO)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = kx + dx, ny = ky + dy
      if (!transitable(nx, ny, abierto)) continue
      if (dx && dy && (!transitable(kx + dx, ky, abierto) || !transitable(kx, ky + dy, abierto))) continue
      const n = ny * ANCHO + nx, ng = g[k] + (dx && dy ? 1.414 : 1)
      if (ng < g[n]) { g[n] = ng; de[n] = k; f[n] = ng + h(n); push(n) }
    }
  }
  if (de[fin] === -1) return []
  const camino: { x: number; y: number }[] = []
  for (let k = fin; k !== ini && k !== -1; k = de[k]) camino.push({ x: (k % ANCHO) + 0.5, y: Math.floor(k / ANCHO) + 0.5 })
  return camino.reverse()
}

/** Objeto usable más cercano (a menos de `radio` baldosas de su punto de uso). */
export function usableCerca(x: number, y: number, radio = 1.6) {
  let mejor: { ob: Objeto; d: number } | null = null
  for (const ob of OBJETOS) {
    if (!ob.uso) continue
    const d = Math.hypot(ob.uso.x - x, ob.uso.y - y)
    if (d <= radio && (!mejor || d < mejor.d)) mejor = { ob, d }
  }
  return mejor?.ob ?? null
}

/** Objeto usable que ocupa (o casi) la baldosa tocada. */
export function objetoEn(x: number, y: number) {
  return OBJETOS.find(ob => ob.uso && ob.tipo !== 'consejo' && x >= ob.x - 0.3 && x < ob.x + ob.w + 0.3 && y >= ob.y - 0.6 && y < ob.y + ob.h + 0.3)
    ?? (Math.hypot(x - CONSEJO.x, y - CONSEJO.y) < 1.8 ? OBJETOS.find(o => o.tipo === 'consejo')! : null)
}

export const parcelaEn = (x: number, y: number) => PARCELAS.find(p => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) ?? null

export type Zona = { tipo: 'parcela'; parcela: number } | { tipo: 'plaza' | 'consejo' | 'muelle' | 'campo' }
/** En qué parte del Gran Campamento está un punto. */
export function zonaDe(x: number, y: number): Zona {
  const p = parcelaEn(x, y)
  if (p) return { tipo: 'parcela', parcela: p.i }
  if (dentroTriangulo(x, y) >= 0) return { tipo: 'plaza' }
  if (Math.hypot(x - CONSEJO.x, y - CONSEJO.y) < CONSEJO.r + 2.5) return { tipo: 'consejo' }
  if (y < 11 && Math.abs(x - 48.5) < 3) return { tipo: 'muelle' }
  return { tipo: 'campo' }
}

// ---------------- Llegada: clubes a sus parcelas y miembros a sus carpas ----------------

export interface Campista { id: string; clubId: string; t: number; genero: 'm' | 'f' }
export interface Asignacion {
  /** clubId → número de parcela (en orden de llegada). */
  parcelas: Map<string, number>
  /** id → carpa: parcela, lado (sexo) y número de carpa. */
  carpas: Map<string, { parcela: number; sexo: 'm' | 'f'; slot: number }>
}
/**
 * Los clubes reciben parcela en el orden en que llegó su primer miembro; dentro del club, cada uno duerme en una carpa
 * de su lado (varones o damas), hasta 4 por carpa. Es determinista: todos los equipos calculan lo mismo.
 */
export function asignar(campistas: Campista[]): Asignacion {
  const llegada = new Map<string, number>()
  for (const c of campistas) llegada.set(c.clubId, Math.min(llegada.get(c.clubId) ?? Infinity, c.t))
  const clubes = [...llegada.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([id]) => id)
  const parcelas = new Map(clubes.slice(0, PARCELAS.length).map((id, i) => [id, i]))
  const carpas: Asignacion['carpas'] = new Map()
  for (const [club, parcela] of parcelas) {
    for (const sexo of ['m', 'f'] as const) {
      const del = campistas.filter(c => c.clubId === club && c.genero === sexo).sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))
      del.forEach((c, k) => { const slot = Math.floor(k / POR_CARPA); if (slot < CARPAS_POR_LADO) carpas.set(c.id, { parcela, sexo, slot }) })
    }
  }
  return { parcelas, carpas }
}

// ---------------- Ceremonia de banderas: izamiento 7:00 y arriamiento 18:00 ----------------
export const HORA_IZAMIENTO = 7, HORA_ARRIAMIENTO = 18

export interface Ceremonia {
  tipo: 'izamiento' | 'arriamiento'
  /** 'invitacion' (5 min antes), 'en_curso' (las banderas suben o bajan) o 'final'. */
  fase: 'invitacion' | 'en_curso' | 'final'
  /** 0 a 1: avance de las banderas durante 'en_curso'. */
  avance: number
  /** Minutos (pueden ser negativos) respecto a la hora exacta. */
  minutos: number
}
const DURACION_CER = 1.5 // minutos que tardan las banderas en subir o bajar
/** Si hay ceremonia ahora: desde 5 min antes hasta 4 min después de las 7:00 y las 18:00. */
export function ceremoniaAhora(hora: number): Ceremonia | null {
  for (const [h, tipo] of [[HORA_IZAMIENTO, 'izamiento'], [HORA_ARRIAMIENTO, 'arriamiento']] as const) {
    const m = (hora - h) * 60
    if (m < -5 || m > 4) continue
    if (m < 0) return { tipo, fase: 'invitacion', avance: 0, minutos: m }
    if (m < DURACION_CER) return { tipo, fase: 'en_curso', avance: m / DURACION_CER, minutos: m }
    return { tipo, fase: 'final', avance: 1, minutos: m }
  }
  return null
}
/** Altura de las banderas (0 abajo, 1 arriba) según la hora: arriba de 7:00 a 18:00, animadas en la ceremonia. */
export function alturaBanderas(hora: number) {
  const c = ceremoniaAhora(hora)
  if (c && c.fase === 'en_curso') return c.tipo === 'izamiento' ? c.avance : 1 - c.avance
  return hora >= HORA_IZAMIENTO + DURACION_CER / 60 && hora < HORA_ARRIAMIENTO ? 1 : 0
}

export interface Formado { id: string; sexo: 'm' | 'f'; lider: boolean; t: number }
/**
 * Formación en el patio de la parcela, mirando al pórtico donde están amarradas las banderas (todos la calculan igual):
 * los 3 primeros líderes izan o arrían las banderas al pie del pórtico; los demás líderes, la mitad adelante y la mitad
 * atrás; varones a la izquierda y damas a la derecha (según hacia dónde miran), en filas de 8.
 */
export function formacion(p: Parcela, formados: Formado[]): Map<string, { x: number; y: number; abanderado: boolean }> {
  const orden = [...formados].sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))
  const lideres = orden.filter(f => f.lider), resto = orden.filter(f => !f.lider)
  const abanderados = (lideres.length >= 3 ? lideres : [...lideres, ...resto]).slice(0, 3)
  const usados = new Set(abanderados.map(a => a.id))
  const libresL = lideres.filter(l => !usados.has(l.id))
  const adelante = libresL.slice(0, Math.ceil(libresL.length / 2)), atras = libresL.slice(Math.ceil(libresL.length / 2))
  const pos = new Map<string, { x: number; y: number; abanderado: boolean }>()
  const este = p.puerta === 'este', dir = este ? 1 : -1
  const gx = este ? p.x + p.w - 1 : p.x + 1 // borde interior del pórtico
  const yA = p.y + 3.25, yB = p.y + 6.75, yM = (yA + yB) / 2
  // Mirando al este, la izquierda es el norte (y menor); mirando al oeste, es el sur.
  const izq = este ? [yA, yM - 0.15] : [yB, yM + 0.15], der = este ? [yM + 0.15, yB] : [yM - 0.15, yA]
  abanderados.forEach((a, k) => pos.set(a.id, { x: gx - dir * 0.9, y: p.y + 3.5 + k * 1.5, abanderado: true }))
  const columna = (lista: Formado[], x: number, y0: number, y1: number) => {
    const n = Math.max(1, lista.length)
    lista.forEach((f, k) => pos.set(f.id, { x, y: n === 1 ? (y0 + y1) / 2 : y0 + ((y1 - y0) * k) / (n - 1), abanderado: false }))
  }
  let col = 0
  const x = (c: number) => gx - dir * (2.2 + c * 0.95)
  if (adelante.length) columna(adelante.slice(0, 8), x(col++), yA, yB)
  // Cada "fila de 8" (mirando al pórtico) son 4 varones a la izquierda y 4 damas a la derecha
  const m = resto.filter(f => !usados.has(f.id) && f.sexo === 'm'), f = resto.filter(f2 => !usados.has(f2.id) && f2.sexo === 'f')
  for (let r = 0; r * 4 < Math.max(m.length, f.length); r++) {
    columna(m.slice(r * 4, r * 4 + 4), x(col), izq[0], izq[1])
    columna(f.slice(r * 4, r * 4 + 4), x(col), der[0], der[1])
    col++
  }
  if (atras.length) columna(atras.slice(0, 8), x(col), yA, yB)
  return pos
}

// ---------------- Día, noche y sábado con la hora de Perú ----------------

function partesLima(fecha: Date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(fecha)
  const v = (t: string) => p.find(x => x.type === t)?.value ?? ''
  return { hora: Number(v('hour')) + Number(v('minute')) / 60, dia: v('weekday') }
}

/** Hora decimal en Lima (0 a 24). */
export function horaLima(fecha = new Date()) { return partesLima(fecha).hora }

/** Sábado: desde el viernes 18:00 hasta el sábado 18:00 (hora de Lima). Es día de culto: no hay desafíos. */
export function esSabado(fecha = new Date()) {
  const { hora, dia } = partesLima(fecha)
  return (dia === 'Fri' && hora >= 18) || (dia === 'Sat' && hora < 18)
}

export interface Luz {
  fase: 'dia' | 'atardecer' | 'noche' | 'amanecer'
  /** 0 = pleno día, ~0.78 = noche cerrada. */
  oscuridad: number
  /** 0 a 1: cuánto se tiñe de naranja (atardecer y amanecer). */
  dorado: number
  /** Si los faroles están prendidos. */
  faroles: boolean
}

const suave = (a: number, b: number, t: number) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k) }

/** Luz del mundo según la hora de Lima: amanece 5:30–7:00, atardece 17:30–19:15. */
export function luzDelDia(hora: number): Luz {
  const NOCHE = 0.78
  if (hora >= 7 && hora < 17.5) return { fase: 'dia', oscuridad: 0, dorado: 0, faroles: false }
  if (hora >= 17.5 && hora < 19.25) {
    const k = suave(17.5, 19.25, hora)
    return { fase: 'atardecer', oscuridad: k * NOCHE, dorado: Math.sin(k * Math.PI) * 0.9, faroles: k > 0.45 }
  }
  if (hora >= 5.5 && hora < 7) {
    const k = suave(5.5, 7, hora)
    return { fase: 'amanecer', oscuridad: (1 - k) * NOCHE, dorado: Math.sin(k * Math.PI) * 0.7, faroles: k < 0.5 }
  }
  return { fase: 'noche', oscuridad: NOCHE, dorado: 0, faroles: true }
}
