/**
 * Isla en pixel art generada por código (mosaico de 16 px).
 * Costa con brillo, acantilados, playas, bosques, lago, río con puente, montañas nevadas,
 * caminos de arena entre niveles y lugares del campamento. Todo determinista por semilla y tamaño.
 */
export const T = 16

export const MAR = 0, ARENA = 2, PASTO = 3, BOSQUE = 4, MONTE = 5, NIEVE = 6, LAGO = 7, RIO = 8, CAMINO = 9, PUENTE = 10

export type Hito = { tipo: 'carpas' | 'fogata' | 'cabana' | 'asta' | 'torre' | 'muelle' | 'bote' | 'cumbre'; c: number; r: number }
export interface Isla {
  cols: number; rows: number; t: Uint8Array; dTierra: Int16Array
  nodos: { c: number; r: number }[]; hitos: Hito[]; seed: number
}

// ---------- azar y ruido ----------
function h01(i: number, j: number, s: number) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
function ruido(seed: number, esc: number) {
  return (x: number, y: number) => {
    x /= esc; y /= esc
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    const a = h01(i, j, seed), b = h01(i + 1, j, seed), c = h01(i, j + 1, seed), d = h01(i + 1, j + 1, seed)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
  }
}
function fbm(seed: number, esc: number) {
  const n1 = ruido(seed, esc), n2 = ruido(seed + 1, esc / 2), n3 = ruido(seed + 2, esc / 4)
  return (x: number, y: number) => n1(x, y) * 0.6 + n2(x, y) * 0.28 + n3(x, y) * 0.12
}

// Recorridos diseñados (normalizados) para pantalla horizontal y vertical: dejan libre el HUD y los botones.
const RUTA_H: [number, number][] = [[.09, .74], [.24, .83], [.41, .77], [.36, .6], [.19, .53], [.14, .36], [.29, .26], [.46, .32], [.55, .5], [.7, .63], [.87, .55], [.86, .36], [.73, .26], [.59, .22]]
const RUTA_V: [number, number][] = [[.2, .83], [.5, .86], [.8, .79], [.72, .68], [.4, .66], [.18, .57], [.38, .49], [.74, .49], [.82, .38], [.56, .32], [.26, .32], [.3, .23], [.64, .23]]

function muestrear(ruta: [number, number][], n: number): [number, number][] {
  const seg = ruta.slice(1).map((p, i) => Math.hypot(p[0] - ruta[i][0], p[1] - ruta[i][1]))
  const total = seg.reduce((a, b) => a + b, 0)
  return Array.from({ length: n }, (_, k) => {
    let d = n === 1 ? 0 : (k / (n - 1)) * total, i = 0
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++ }
    const f = seg[i] ? d / seg[i] : 0
    return [ruta[i][0] + (ruta[i + 1][0] - ruta[i][0]) * f, ruta[i][1] + (ruta[i + 1][1] - ruta[i][1]) * f]
  })
}

/** Distancias (4 vecinos) desde todas las celdas que cumplen `fuente`. */
function bfs(cols: number, rows: number, fuente: (k: number) => boolean, pasa: (k: number) => boolean = () => true) {
  const d = new Int16Array(cols * rows).fill(9999)
  const cola: number[] = []
  for (let k = 0; k < d.length; k++) if (fuente(k)) { d[k] = 0; cola.push(k) }
  for (let q = 0; q < cola.length; q++) {
    const k = cola[q], c = k % cols, r = (k / cols) | 0
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
      const nk = nr * cols + nc
      if (d[nk] > d[k] + 1 && pasa(nk)) { d[nk] = d[k] + 1; cola.push(nk) }
    }
  }
  return d
}

export function generarIsla(cols: number, rows: number, nNiveles: number, seed: number): Isla {
  const N = cols * rows
  const t = new Uint8Array(N)
  const vertical = rows > cols * 1.15
  const idx = (c: number, r: number) => r * cols + c
  const dentro = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows

  // Niveles a lo largo del recorrido
  const nodos = muestrear(vertical ? RUTA_V : RUTA_H, nNiveles).map(([x, y]) => ({
    c: Math.min(cols - 3, Math.max(2, Math.round(x * cols))), r: Math.min(rows - 3, Math.max(2, Math.round(y * rows))),
  }))

  // Caminos en "L" entre niveles (estilo mapa clásico)
  const camino = new Uint8Array(N)
  for (let i = 0; i < nodos.length - 1; i++) {
    const a = nodos[i], b = nodos[i + 1]
    const horizPrimero = h01(i, 7, seed) < 0.5
    const marcar = (c: number, r: number) => { if (dentro(c, r)) camino[idx(c, r)] = 1 }
    const tramo = (hp: boolean) => {
      if (hp) { for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) marcar(c, a.r); for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) marcar(b.c, r) }
      else { for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) marcar(a.c, r); for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) marcar(c, b.r) }
    }
    tramo(horizPrimero)
  }

  // Tierra: elipse deformada por ruido + todo lo que rodea a caminos y niveles
  const forma = fbm(seed + 3, Math.max(cols, rows) * 0.28)
  const cerca = bfs(cols, rows, k => camino[k] === 1)
  const rx = vertical ? 0.46 : 0.45, ry = vertical ? 0.44 : 0.41
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = idx(c, r)
    const dx = ((c + 0.5) / cols - 0.5) / rx, dy = ((r + 0.5) / rows - 0.52) / ry
    const v = 1 - Math.hypot(dx, dy) + (forma(c, r) - 0.5) * 0.75
    const borde = Math.min(c, r, cols - 1 - c, rows - 1 - r)
    let tierra = v > 0.16 || cerca[k] <= 2
    if (borde < 1) tierra = false
    t[k] = tierra ? PASTO : MAR
  }
  // islotes sueltos para dar vida al mar
  for (let s = 0; s < 3; s++) {
    const c0 = Math.floor(h01(s, 91, seed) * cols), r0 = Math.floor(h01(s, 92, seed) * rows)
    if (dentro(c0, r0) && t[idx(c0, r0)] === MAR && Math.min(c0, r0, cols - 1 - c0, rows - 1 - r0) > 2) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (Math.abs(dc) + Math.abs(dr) < 2 && dentro(c0 + dc, r0 + dr)) t[idx(c0 + dc, r0 + dr)] = PASTO
    }
  }

  const dMar = bfs(cols, rows, k => t[k] === MAR)
  const nodoEn = new Uint8Array(N)
  nodos.forEach(n => { nodoEn[idx(n.c, n.r)] = 1 })
  const dNodo = bfs(cols, rows, k => nodoEn[k] === 1)

  // Lago y río
  for (let intento = 0; intento < 60; intento++) {
    const c0 = 2 + Math.floor(h01(intento, 33, seed) * (cols - 4)), r0 = 2 + Math.floor(h01(intento, 34, seed) * (rows - 4))
    const k0 = idx(c0, r0)
    if (t[k0] !== PASTO || dMar[k0] < 4 || cerca[k0] < 4) continue
    const lr = 2 + Math.floor(h01(intento, 35, seed) * 2), lv = 1 + Math.floor(h01(intento, 36, seed) * 2)
    for (let r = r0 - lv; r <= r0 + lv; r++) for (let c = c0 - lr; c <= c0 + lr; c++) {
      if (!dentro(c, r)) continue
      const e = ((c - c0) / (lr + 0.5)) ** 2 + ((r - r0) / (lv + 0.5)) ** 2
      if (e <= 1 && t[idx(c, r)] === PASTO && cerca[idx(c, r)] >= 2) t[idx(c, r)] = LAGO
    }
    // río: baja hacia el mar más cercano
    let c = c0 + lr, r = r0
    for (let paso = 0; paso < 80 && dentro(c, r); paso++) {
      const k = idx(c, r)
      if (t[k] === MAR) break
      if (t[k] !== LAGO) t[k] = camino[k] ? PUENTE : RIO
      let mejor: [number, number] | null = null, md = dMar[k]
      for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const nc = c + dc, nr = r + dr
        if (!dentro(nc, nr)) continue
        const v = dMar[idx(nc, nr)] + h01(nc, nr, seed + 8) * 0.9
        if (v < md) { md = v; mejor = [nc, nr] }
      }
      if (!mejor) break
      ;[c, r] = mejor
    }
    break
  }

  // Caminos sobre la tierra (puentes donde cruzan agua)
  for (let k = 0; k < N; k++) if (camino[k]) t[k] = (t[k] === RIO || t[k] === LAGO) ? PUENTE : CAMINO

  // Montañas hacia la cumbre (último nivel) y bosques
  const ult = nodos[nodos.length - 1]
  const elev = fbm(seed + 11, Math.max(cols, rows) * 0.2)
  const bosq = fbm(seed + 21, 5)
  const playa = fbm(seed + 31, 6)
  const diag = Math.hypot(cols, rows)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = idx(c, r)
    if (t[k] !== PASTO) continue
    const E = elev(c, r) + 0.34 * (1 - Math.hypot(c - ult.c, r - ult.r) / (diag * 0.5)) - 0.12
    if (E > 0.64 && dMar[k] >= 2 && cerca[k] >= 2 && dNodo[k] >= 2) { t[k] = E > 0.76 ? NIEVE : MONTE; continue }
    if (bosq(c, r) > 0.5 && cerca[k] >= 2 && dNodo[k] >= 2 && dMar[k] >= 2) t[k] = BOSQUE
  }
  // playas en parte de la costa
  for (let k = 0; k < N; k++) {
    if (t[k] !== PASTO || dMar[k] !== 1) continue
    const c = k % cols, r = (k / cols) | 0
    if (playa(c, r) > 0.42) t[k] = ARENA
  }

  const dTierra = bfs(cols, rows, k => t[k] !== MAR)

  // Lugares del campamento junto a algunos niveles
  const ocupado = new Uint8Array(N)
  const hitos: Hito[] = []
  const buscar = (n: { c: number; r: number }, ancho = 1, min = 2, max = 4, ok = (k: number) => t[k] === PASTO || t[k] === ARENA) => {
    for (let rad = min; rad <= max; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue
      const c = n.c + dc, r = n.r + dr
      let libre = true
      for (let w = 0; w < ancho; w++) {
        const cc = c + w
        if (!dentro(cc, r) || !ok(idx(cc, r)) || ocupado[idx(cc, r)] || camino[idx(cc, r)] || dNodo[idx(cc, r)] < 1) { libre = false; break }
      }
      if (libre) { for (let w = 0; w < ancho; w++) ocupado[idx(c + w, r)] = 1; return { c, r } }
    }
    return null
  }
  const poner = (tipo: Hito['tipo'], n: { c: number; r: number } | undefined, ancho = 1) => {
    if (!n) return
    const p = buscar(n, ancho)
    if (p) hitos.push({ tipo, ...p })
  }
  const nn = nodos.length
  poner('carpas', nodos[0], 2)
  poner('fogata', nodos[0])
  poner('cabana', nodos[Math.floor(nn * 0.3)], 1)
  poner('asta', nodos[Math.floor(nn * 0.5)])
  poner('torre', nodos[Math.floor(nn * 0.72)])
  poner('cumbre', nodos[nn - 1])
  // muelle y bote cerca del primer nivel
  let mejorK = -1, mejorD = 1e9
  for (let k = 0; k < N; k++) if (t[k] === MAR && dTierra[k] === 1) {
    const c = k % cols, r = (k / cols) | 0
    const d = Math.hypot(c - nodos[0].c, r - nodos[0].r)
    if (d < mejorD) { mejorD = d; mejorK = k }
  }
  if (mejorK >= 0) {
    const c = mejorK % cols, r = (mejorK / cols) | 0
    hitos.push({ tipo: 'muelle', c, r })
    for (const [dc, dr] of [[0, 2], [2, 0], [-2, 0], [0, -2], [2, 2], [-2, 2]]) {
      const bc = c + dc, br = r + dr
      if (dentro(bc, br) && t[idx(bc, br)] === MAR && dTierra[idx(bc, br)] >= 2) { hitos.push({ tipo: 'bote', c: bc, r: br }); break }
    }
  }
  return { cols, rows, t, dTierra, nodos, hitos, seed }
}

// ---------- dibujo ----------
const COL = {
  mar: ['#4c93e3', '#3b80d6', '#2f6ec8', '#2861bb', '#2356ad', '#1f4ea2'],
  espuma: '#d8efff', ola: '#7fb6f0',
  pasto: '#5cba4d', pastoO: '#4aa53f', pastoC: '#73cc5e', borde: '#3c8b35',
  arena: '#ecd592', arenaO: '#d6bd73',
  agua: '#3f88dc', aguaC: '#78b4ef',
  camino: '#e8cb85', caminoO: '#c3a05a',
  acant: '#9a6a3d', acantO: '#744b29', acantB: '#55361d',
  tronco: '#6b4423', copa: '#2f7d34', copaM: '#3f9b40', copaC: '#6cc65a', copaB: '#1d5a26',
  monte: '#b98a57', monteC: '#d6a96f', monteO: '#7d5534', monteB: '#4a3020', nieve: '#f4f7fb', nieveS: '#c9d4e3',
  madera: '#a8703c', maderaO: '#6b4423',
}

export function dibujarIsla(ctx: CanvasRenderingContext2D, isla: Isla, frame: 0 | 1) {
  const { cols, rows, t, dTierra, seed } = isla
  const p = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
  const at = (c: number, r: number) => (c < 0 || r < 0 || c >= cols || r >= rows) ? MAR : t[r * cols + c]
  const agua = (v: number) => v === MAR || v === LAGO || v === RIO
  const esTierra = (v: number) => !agua(v) && v !== PUENTE

  marDegradado(ctx, isla)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = t[r * cols + c], x = c * T, y = r * T
    const h = (i: number) => h01(c * 31 + i, r * 17 - i, seed)
    if (v === MAR) {
      const d = Math.min(5, dTierra[r * cols + c] - 1)
      // olitas animadas
      if (h(20) < 0.22 && d >= 1) { const ox = (Math.floor(h(21) * 10) + frame * 2) % 12; p(x + ox, y + 4 + Math.floor(h(22) * 8), 4, 1, COL.ola) }
      // espuma junto a la orilla
      if (d === 0) {
        ctx.fillStyle = COL.espuma
        const lados: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]
        for (const [dc, dr] of lados) {
          if (!esTierra(at(c + dc, r + dr))) continue
          for (let i = 0; i < T; i += 3) {
            if ((i / 3 + frame) % 2) continue
            if (dr) ctx.fillRect(x + i, dr < 0 ? y + 7 : y + T - 3, 2, 1)
            else ctx.fillRect(dc < 0 ? x + 2 : x + T - 3, y + i, 1, 2)
          }
        }
      }
      continue
    }
    if (v === LAGO || v === RIO || v === PUENTE) {
      p(x, y, T, T, COL.agua)
      if (h(4) < 0.5) p(x + ((Math.floor(h(5) * 10) + frame * 3) % 12), y + 3 + Math.floor(h(6) * 9), 3, 1, COL.aguaC)
      if (v !== PUENTE) continue
    }
    if (v === PASTO || v === BOSQUE || v === MONTE || v === NIEVE || v === CAMINO) {
      p(x, y, T, T, COL.pasto)
      for (let i = 0; i < 5; i++) p(x + Math.floor(h(i) * 15), y + Math.floor(h(i + 5) * 15), 1, 1, i % 2 ? COL.pastoO : COL.pastoC)
      if (v === PASTO && h(30) < 0.12) { // matita o flor
        const fx = x + 3 + Math.floor(h(31) * 9), fy = y + 4 + Math.floor(h(32) * 8)
        if (h(33) < 0.5) { p(fx, fy, 1, 2, COL.pastoO); p(fx + 2, fy, 1, 2, COL.pastoO); p(fx + 1, fy - 1, 1, 3, COL.pastoO) }
        else { p(fx, fy, 2, 2, ['#ffffff', '#ffd54a', '#ff8fb0'][Math.floor(h(34) * 3)]); p(fx, fy + 2, 1, 1, COL.pastoO) }
      }
    }
    if (v === ARENA) {
      p(x, y, T, T, COL.arena)
      for (let i = 0; i < 4; i++) p(x + Math.floor(h(i) * 15), y + Math.floor(h(i + 5) * 15), 1, 1, COL.arenaO)
    }
  }

  // Bordes de la tierra (contorno oscuro) y acantilados hacia el sur
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = at(c, r), x = c * T, y = r * T
    if (!esTierra(v)) continue
    const bc = v === ARENA ? COL.arenaO : COL.borde
    if (agua(at(c, r - 1))) p(x, y, T, 1, bc)
    if (agua(at(c - 1, r))) p(x, y, 1, T, bc)
    if (agua(at(c + 1, r))) p(x + T - 1, y, 1, T, bc)
    if (agua(at(c, r + 1))) {
      // pared del acantilado sobre el agua de abajo
      const alto = v === ARENA ? 3 : 6, yy = y + T
      p(x, yy, T, alto, COL.acant)
      for (let i = 1; i < T; i += 4) p(x + i, yy + 1, 1, alto - 1, COL.acantO)
      p(x, yy + alto - 1, T, 1, COL.acantB)
      p(x, yy + alto, T, 1, COL.espuma)
    }
  }

  // Caminos (franja de arena que conecta con sus vecinos)
  const conecta = (v: number) => v === CAMINO || v === PUENTE
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = at(c, r)
    if (!conecta(v)) continue
    const x = c * T, y = r * T
    const N_ = conecta(at(c, r - 1)), S_ = conecta(at(c, r + 1)), O_ = conecta(at(c - 1, r)), E_ = conecta(at(c + 1, r))
    if (v === PUENTE) {
      const horiz = O_ || E_
      p(x, y, T, T, COL.agua)
      if (horiz) { p(x, y + 3, T, 10, COL.madera); for (let i = 1; i < T; i += 3) p(x + i, y + 3, 1, 10, COL.maderaO); p(x, y + 2, T, 1, COL.maderaO); p(x, y + 13, T, 1, COL.maderaO) }
      else { p(x + 3, y, 10, T, COL.madera); for (let i = 1; i < T; i += 3) p(x + 3, y + i, 10, 1, COL.maderaO); p(x + 2, y, 1, T, COL.maderaO); p(x + 13, y, 1, T, COL.maderaO) }
      continue
    }
    const band = (bx: number, by: number, bw: number, bh: number) => { p(bx - 1, by - 1, bw + 2, bh + 2, COL.caminoO); }
    const fill = (bx: number, by: number, bw: number, bh: number) => p(bx, by, bw, bh, COL.camino)
    band(x + 5, y + 5, 6, 6)
    if (N_) band(x + 5, y, 6, 6); if (S_) band(x + 5, y + 10, 6, 6); if (O_) band(x, y + 5, 6, 6); if (E_) band(x + 10, y + 5, 6, 6)
    fill(x + 5, y + 5, 6, 6)
    if (N_) fill(x + 5, y, 6, 6); if (S_) fill(x + 5, y + 10, 6, 6); if (O_) fill(x, y + 5, 6, 6); if (E_) fill(x + 10, y + 5, 6, 6)
    p(x + 6 + Math.floor(h01(c, r, seed + 4) * 3), y + 6 + Math.floor(h01(r, c, seed + 4) * 3), 1, 1, COL.caminoO)
  }

  // Elementos con volumen, por filas (lo de abajo tapa lo de arriba)
  const hitosPorFila = new Map<number, Hito[]>()
  for (const hi of isla.hitos) { const l = hitosPorFila.get(hi.r) ?? []; l.push(hi); hitosPorFila.set(hi.r, l) }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = at(c, r), x = c * T, y = r * T
      if (v === BOSQUE) arbol(p, x, y, h01(c, r, seed + 5))
      else if (v === MONTE || v === NIEVE) montana(p, x, y, v === NIEVE, h01(c, r, seed + 6))
    }
    for (const hi of hitosPorFila.get(r) ?? []) hito(p, hi, frame)
  }
}

type P = (x: number, y: number, w: number, h: number, c: string) => void

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const rgb = (hx: string) => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)]
const MAR_RGB = COL.mar.map(rgb)
/** Profundidad del mar interpolada por pixel y cuantizada con tramado ordenado: brillo suave junto a la costa. */
function marDegradado(ctx: CanvasRenderingContext2D, isla: Isla) {
  const { cols, rows, dTierra } = isla
  const W = cols * T, H = rows * T
  const img = ctx.createImageData(W, H), px = img.data
  const d = (c: number, r: number) => dTierra[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))]
  for (let y = 0; y < H; y++) {
    const fy = y / T - 0.5, r0 = Math.floor(fy), ty = fy - r0
    for (let x = 0; x < W; x++) {
      const fx = x / T - 0.5, c0 = Math.floor(fx), tx = fx - c0
      const v = (d(c0, r0) * (1 - tx) + d(c0 + 1, r0) * tx) * (1 - ty) + (d(c0, r0 + 1) * (1 - tx) + d(c0 + 1, r0 + 1) * tx) * ty
      const k = Math.max(0, Math.min(5, Math.floor(v * 0.9 - 0.35 + BAYER[(y & 3) * 4 + (x & 3)] / 16)))
      const col = MAR_RGB[k], o = (y * W + x) * 4
      px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

function disco(p: P, cx: number, cy: number, rad: number, col: string) {
  for (let dy = -rad; dy <= rad; dy++) {
    const w = Math.round(Math.sqrt(rad * rad - dy * dy + rad * 0.6))
    p(cx - w, cy + dy, w * 2, 1, col)
  }
}

function arbol(p: P, x: number, y: number, h: number) {
  const ox = Math.round((h - 0.5) * 4)
  if (h < 0.35) { // pino
    const cx = x + 8 + ox
    p(cx - 4, y + 14, 8, 2, COL.pastoO)
    p(cx - 1, y + 11, 2, 4, COL.tronco)
    for (let i = 0; i < 3; i++) {
      const top = y - 2 + i * 4, ancho = 2 + i * 2
      for (let j = 0; j < 5; j++) {
        const w = Math.min(ancho, 1 + j)
        p(cx - w - 1, top + j, w * 2 + 2, 1, COL.copaB)
        p(cx - w, top + j, w * 2, 1, j < 2 ? COL.copaM : COL.copa)
      }
      p(cx - ancho + 1, top + 3, 1, 1, COL.copaC)
    }
    return
  }
  const cx = x + 8 + ox, cy = y + 5
  p(cx - 5, y + 13, 10, 2, COL.pastoO)
  p(cx - 1, y + 10, 2, 4, COL.tronco)
  disco(p, cx, cy, 6, COL.copaB)
  disco(p, cx, cy, 5, COL.copa)
  disco(p, cx - 1, cy - 1, 3, COL.copaM)
  p(cx - 3, cy - 3, 2, 2, COL.copaC)
}

function montana(p: P, x: number, y: number, nieve: boolean, h: number) {
  const cx = x + 8, base = y + 15, alto = 16 + Math.round(h * 4)
  for (let i = 0; i < alto; i++) {
    const yy = base - i, w = Math.round(((alto - i) / alto) * 9)
    p(cx - w - 1, yy, w * 2 + 2, 1, COL.monteB)
    p(cx - w, yy, w, 1, COL.monteC)
    p(cx, yy, w, 1, COL.monteO)
    if (i % 5 === 2 && w > 3) p(cx - 2, yy, 1, 1, COL.monte)
  }
  if (nieve) {
    for (let i = 0; i < 7; i++) {
      const yy = base - alto + 1 + i, w = Math.round(((i + 1) / alto) * 9)
      p(cx - w, yy, w, 1, COL.nieve)
      p(cx, yy, w, 1, COL.nieveS)
    }
    p(cx - 3, base - alto + 8, 2, 1, COL.nieve); p(cx + 1, base - alto + 8, 2, 1, COL.nieveS)
  }
}

function hito(p: P, hi: Hito, frame: 0 | 1) {
  const x = hi.c * T, y = hi.r * T
  switch (hi.tipo) {
    case 'carpas': {
      for (const [ox, col, cs] of [[1, '#d7242f', '#8e1018'], [17, '#1f5fd1', '#123b8a']] as [number, string, string][]) {
        const bx = x + ox
        p(bx, y + 14, 14, 2, COL.pastoO)
        for (let i = 0; i < 10; i++) { const w = Math.round(i * 0.7); p(bx + 7 - w - 1, y + 4 + i, w * 2 + 2, 1, '#2a1208'); p(bx + 7 - w, y + 4 + i, w, 1, col); p(bx + 7, y + 4 + i, w, 1, cs) }
        p(bx + 6, y + 10, 2, 4, '#2a1208')
      }
      break
    }
    case 'fogata': {
      p(x + 3, y + 12, 10, 2, '#5a3a20'); p(x + 4, y + 11, 8, 1, '#6b4423')
      p(x + 2, y + 13, 2, 2, '#8a8f98'); p(x + 12, y + 13, 2, 2, '#8a8f98')
      const llama = frame ? [[7, 5, 2, 6], [5, 8, 2, 3], [9, 7, 2, 4]] : [[6, 4, 3, 7], [4, 7, 2, 4], [10, 8, 2, 3]]
      for (const [lx, ly, lw, lh] of llama) p(x + lx, y + ly, lw, lh, '#ff7a1a')
      p(x + 7, y + 8 - frame, 2, 3, '#ffd54a')
      break
    }
    case 'cabana': {
      p(x, y + 14, 16, 2, COL.pastoO)
      p(x + 2, y + 7, 12, 8, '#c8925a'); p(x + 2, y + 7, 12, 1, '#8a5a32')
      for (let i = 0; i < 6; i++) p(x + 7 - i - 1, y + 1 + i, i * 2 + 4, 1, i < 5 ? '#b23a2a' : '#7a2018')
      p(x + 7, y + 10, 3, 5, '#5a3418'); p(x + 3, y + 9, 3, 3, '#ffe08a'); p(x + 3, y + 9, 3, 1, '#8a5a32')
      break
    }
    case 'asta': {
      p(x + 7, y - 4, 1, 19, '#e9eef5'); p(x + 6, y + 14, 3, 2, '#8a8f98')
      const ola = frame ? [0, 1, 1, 0, 0, 1, 1, 0] : [1, 0, 0, 1, 1, 0, 0, 1]
      for (let i = 0; i < 8; i++) { p(x + 8 + i, y - 3 + ola[i], 1, 3, '#1f5fd1'); p(x + 8 + i, y + ola[i], 1, 3, '#ffffff') }
      p(x + 9, y - 2 + ola[1], 2, 2, '#d7242f')
      break
    }
    case 'torre': {
      p(x + 3, y + 14, 10, 2, COL.pastoO)
      p(x + 4, y + 2, 8, 13, '#9aa3ae'); p(x + 4, y + 2, 1, 13, '#c3cad3'); p(x + 11, y + 2, 1, 13, '#6e7782')
      for (let i = 0; i < 4; i++) p(x + 3 + i * 3, y - 1, 2, 3, '#9aa3ae')
      p(x + 7, y + 5, 2, 3, '#2a2a3a'); p(x + 7, y + 10, 2, 5, '#3a2a1a')
      break
    }
    case 'muelle': {
      p(x + 4, y, 8, 12, COL.madera)
      for (let i = 1; i < 12; i += 3) p(x + 4, y + i, 8, 1, COL.maderaO)
      p(x + 4, y + 11, 1, 4, COL.maderaO); p(x + 11, y + 11, 1, 4, COL.maderaO)
      break
    }
    case 'bote': {
      const b = frame
      p(x + 2, y + 10 + b, 12, 3, '#8a5a32'); p(x + 3, y + 13 + b, 10, 1, '#5a3a20')
      p(x + 7, y + 1 + b, 1, 9, '#5a3a20')
      for (let i = 0; i < 7; i++) p(x + 8, y + 2 + i + b, Math.max(1, 6 - i), 1, '#ffffff')
      p(x + 4, y + 14 + b, 8, 1, COL.espuma)
      break
    }
    case 'cumbre': {
      p(x + 7, y - 8, 1, 23, '#e9eef5'); p(x + 5, y + 14, 5, 2, '#8a8f98')
      const ola = frame ? [0, 0, 1, 1, 1, 0, 0, 0, 1] : [1, 1, 0, 0, 0, 1, 1, 1, 0]
      for (let i = 0; i < 9; i++) { const alto = Math.max(1, 7 - Math.floor(i * 0.7)); p(x + 8 + i, y - 7 + ola[i], 1, alto, '#d7242f'); p(x + 8 + i, y - 7 + ola[i], 1, 1, '#ffc20e') }
      break
    }
  }
}

/** Nube en pixel art (para la capa animada). */
export function dibujarNube(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  ctx.clearRect(0, 0, w, h)
  const bolas = 4 + Math.floor(h01(1, 2, seed) * 3)
  const sombra: [number, number, number][] = []
  for (let i = 0; i < bolas; i++) {
    const cx = Math.round(w * (0.18 + 0.64 * (i / (bolas - 1)))), rad = Math.round(h * (0.26 + h01(i, 3, seed) * 0.2))
    const cy = Math.round(h * 0.62 - rad * 0.4 * h01(i, 4, seed))
    sombra.push([cx, cy, rad])
  }
  const disc = (cx: number, cy: number, rad: number, col: string) => {
    ctx.fillStyle = col
    for (let dy = -rad; dy <= rad; dy++) { const ww = Math.round(Math.sqrt(rad * rad - dy * dy)); ctx.fillRect(cx - ww, cy + dy, ww * 2, 1) }
  }
  for (const [cx, cy, rad] of sombra) disc(cx, cy + 2, rad, '#b9c9e6')
  for (const [cx, cy, rad] of sombra) disc(cx, cy, rad, '#ffffff')
  ctx.fillStyle = '#b9c9e6'; ctx.fillRect(Math.round(w * 0.12), Math.round(h * 0.82), Math.round(w * 0.76), 2)
}
