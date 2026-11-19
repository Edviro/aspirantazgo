/**
 * Plaza Central del Gran Campamento Conquistador: el mundo abierto donde se encuentran todos los clubes.
 * Isla con forma del triángulo del emblema (borde dorado y franja roja), un muelle con el barco hacia los
 * campamentos, la avenida, la plaza con el santuario (fogata, bandera y banderín de unidad), el tablero de honor,
 * el puesto del reto del día, la carpa de tu club y el escenario para programas.
 *
 * Todo es determinista y sin dependencias de la interfaz: el mismo mapa y las mismas rutas en todos los equipos,
 * así basta con enviar a dónde camina cada uno (no cada paso).
 */

export const ANCHO = 48, ALTO = 40

export const Suelo = { AGUA: 0, ORO: 1, ROJO: 2, PASTO: 3, PIEDRA: 4, CAMINO: 5, MUELLE: 6, CERCA: 7, PUERTA: 8 } as const
export type Suelo = (typeof Suelo)[keyof typeof Suelo]

export type TipoObjeto = 'barco' | 'tablero' | 'reto' | 'carpa-club' | 'escenario' | 'santuario' | 'letrero'
  | 'pino' | 'carpa' | 'farol' | 'banca' | 'fogata' | 'bandera' | 'banderin'

export interface Objeto {
  tipo: TipoObjeto
  /** Esquina superior izquierda de lo que ocupa (en baldosas). */
  x: number; y: number; w: number; h: number
  /** Si se puede usar: punto (en baldosas) al que se camina para usarlo. */
  uso?: { x: number; y: number }
  color?: string
}

const VERT = { top: 6, apex: 37, cx: 24, mitad: 20.5 }
/** Distancia (en baldosas, positiva adentro) al borde del triángulo invertido. */
export function dentroTriangulo(x: number, y: number) {
  if (y < VERT.top) return y - VERT.top
  const media = (VERT.mitad * (VERT.apex - y)) / (VERT.apex - VERT.top)
  return Math.min(y - VERT.top, media - Math.abs(x - VERT.cx))
}

export const SALIDA = { x: 24.5, y: 8.5 }
export const SANTUARIO = { x: 21, y: 12, w: 7, h: 7 }
export const CENTRO_PLAZA = { x: 24.5, y: 15.5 }

function construir() {
  const s = new Uint8Array(ANCHO * ALTO)
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < ANCHO && y < ALTO) s[y * ANCHO + x] = v }
  for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO; x++) {
    const d = dentroTriangulo(x + 0.5, y + 0.5)
    set(x, y, d < 0 ? Suelo.AGUA : d < 1 ? Suelo.ORO : d < 2 ? Suelo.ROJO : Suelo.PASTO)
  }
  // Muelle (atraviesa el borde) y avenida hasta la plaza
  for (let y = 1; y <= 7; y++) for (let x = 23; x <= 25; x++) set(x, y, Suelo.MUELLE)
  for (let y = 7; y <= 9; y++) for (let x = 22; x <= 26; x++) set(x, y, Suelo.PIEDRA)
  // Plaza redonda alrededor del santuario
  for (let y = 7; y < 24; y++) for (let x = 14; x < 36; x++) {
    const r = Math.hypot((x + 0.5 - CENTRO_PLAZA.x) / 1.2, y + 0.5 - CENTRO_PLAZA.y)
    if (r < 6.6 && dentroTriangulo(x + 0.5, y + 0.5) >= 2) set(x, y, Suelo.PIEDRA)
  }
  // Caminos de tierra hacia el tablero, el reto y el escenario
  for (let x = 12; x <= 17; x++) set(x, 13, Suelo.CAMINO), set(x, 14, Suelo.CAMINO)
  for (let x = 32; x <= 36; x++) set(x, 13, Suelo.CAMINO), set(x, 14, Suelo.CAMINO)
  for (let y = 21; y <= 24; y++) set(24, y, Suelo.CAMINO), set(25, y, Suelo.CAMINO)
  for (let i = 0; i < 3; i++) set(19 - i, 20 + i, Suelo.CAMINO), set(20 - i, 20 + i, Suelo.CAMINO)
  // Santuario cercado: la puerta (abajo) se abre al completar todos los campamentos
  const { x: sx, y: sy, w: sw, h: sh } = SANTUARIO
  for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) {
    const borde = x === sx || y === sy || x === sx + sw - 1 || y === sy + sh - 1
    set(x, y, borde ? Suelo.CERCA : Suelo.PASTO)
  }
  set(24, sy + sh - 1, Suelo.PUERTA)
  return s
}

export const SUELO = construir()
export const suelo = (x: number, y: number) => (x < 0 || y < 0 || x >= ANCHO || y >= ALTO ? Suelo.AGUA : SUELO[y * ANCHO + x])

/** Los objetos del mundo (decoración e interactivos). */
export const OBJETOS: Objeto[] = (() => {
  const o: Objeto[] = [
    { tipo: 'barco', x: 21, y: -1, w: 7, h: 3, uso: { x: 24.5, y: 3.2 } },
    { tipo: 'letrero', x: 26, y: 6, w: 1, h: 1, uso: { x: 26.5, y: 7.8 } },
    { tipo: 'tablero', x: 10, y: 11, w: 4, h: 2, uso: { x: 12.5, y: 13.6 } },
    { tipo: 'reto', x: 35, y: 11, w: 3, h: 2, uso: { x: 35.5, y: 13.6 } },
    { tipo: 'carpa-club', x: 15, y: 18, w: 3, h: 2, uso: { x: 17.5, y: 21.4 } },
    { tipo: 'escenario', x: 21, y: 25, w: 7, h: 2, uso: { x: 24.5, y: 24.2 } },
    { tipo: 'santuario', x: SANTUARIO.x, y: SANTUARIO.y, w: SANTUARIO.w, h: SANTUARIO.h, uso: { x: 24.5, y: 19.6 } },
    { tipo: 'fogata', x: 24, y: 15, w: 1, h: 1 },
    { tipo: 'bandera', x: 22, y: 13, w: 1, h: 1 },
    { tipo: 'banderin', x: 26, y: 13, w: 1, h: 1 },
  ]
  // Faroles a lo largo de la avenida y alrededor de la plaza (de noche se encienden)
  for (const [x, y] of [[21, 8], [27, 8], [17, 10], [31, 10], [15, 15], [33, 15], [18, 21], [30, 21], [22, 23], [27, 23]] as const) o.push({ tipo: 'farol', x, y, w: 1, h: 1 })
  // Bancas frente al escenario
  for (const x of [21, 26]) o.push({ tipo: 'banca', x, y: 23, w: 2, h: 1 })
  // Carpas de colores y pinos en el pasto
  const carpas: [number, number, string][] = [[8, 8, '#D7242F'], [13, 8, '#1F5FD1'], [33, 8, '#F2B90F'], [38, 8, '#1E9A4B'], [30, 18, '#7A1F3D'], [29, 21, '#B07A3A']]
  for (const [x, y, color] of carpas) o.push({ tipo: 'carpa', x, y, w: 2, h: 2, color })
  const pinos: [number, number][] = [[5, 7], [10, 8], [17, 7], [19, 8], [29, 7], [31, 8], [41, 7], [36, 9], [9, 10], [15, 11], [33, 11], [39, 10],
    [14, 16], [34, 17], [16, 23], [32, 23], [19, 25], [29, 25], [20, 28], [28, 28], [22, 30], [26, 31], [24, 33], [18, 24], [31, 25]]
  for (const [x, y] of pinos) if (dentroTriangulo(x + 0.5, y + 0.5) >= 2.2 && suelo(x, y) === Suelo.PASTO) o.push({ tipo: 'pino', x, y, w: 1, h: 1 })
  return o
})()

const OCUPA = (() => {
  const m = new Uint8Array(ANCHO * ALTO)
  for (const ob of OBJETOS) {
    if (ob.tipo === 'santuario' || ob.tipo === 'fogata' || ob.tipo === 'bandera' || ob.tipo === 'banderin' || ob.tipo === 'barco') continue
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
  const ini = a.y * ANCHO + a.x, fin = b.y * ANCHO + b.x
  if (ini === fin) return [{ x: b.x + 0.5, y: b.y + 0.5 }]
  const g = new Float32Array(ANCHO * ALTO).fill(Infinity)
  const de = new Int32Array(ANCHO * ALTO).fill(-1)
  const cerrado = new Uint8Array(ANCHO * ALTO)
  // Montículo binario sencillo por costo f
  const heap: number[] = [], f = new Float32Array(ANCHO * ALTO)
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
  while (heap.length && pasos++ < 6000) {
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
  return OBJETOS.find(ob => ob.uso && x >= ob.x - 0.3 && x < ob.x + ob.w + 0.3 && y >= ob.y - 0.6 && y < ob.y + ob.h + 0.3) ?? null
}

// ---------------- Día y noche con la hora de Perú ----------------

/** Hora decimal en Lima (0 a 24). */
export function horaLima(fecha = new Date()) {
  const p = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(fecha)
  const v = (t: string) => Number(p.find(x => x.type === t)?.value ?? 0)
  return v('hour') + v('minute') / 60
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
