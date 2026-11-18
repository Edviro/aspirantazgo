import { useEffect, useRef } from 'react'

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const TINTA = '#1E140C'

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** Mezcla dos colores con trama ordenada (sin degradados lisos: así se ve pixel art de verdad). */
function trama(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, a: string, b: string, t: (y: number) => number) {
  for (let y = y0; y < y0 + h; y++) {
    const k = t(y)
    for (let x = x0; x < x0 + w; x++) {
      ctx.fillStyle = BAYER[(y % 4) * 4 + (x % 4)] / 16 < k ? b : a
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

function pino(ctx: CanvasRenderingContext2D, x: number, base: number, alto: number, c1: string, c2: string) {
  ctx.fillStyle = '#5A3A1E'; ctx.fillRect(x - 1, base - 3, 2, 3)
  for (let i = 0; i < alto; i++) {
    const y = base - 3 - i
    const ancho = Math.max(1, Math.round((alto - i) * 0.42 + ((i % 4) === 0 ? 1 : 0)))
    ctx.fillStyle = TINTA; ctx.fillRect(x - ancho - 1, y, ancho * 2 + 2, 1)
    ctx.fillStyle = c1; ctx.fillRect(x - ancho, y, ancho * 2, 1)
    ctx.fillStyle = c2; ctx.fillRect(x, y, ancho, 1)
  }
  ctx.fillStyle = TINTA; ctx.fillRect(x - 1, base - 4 - alto, 2, 1)
}

function carpa(ctx: CanvasRenderingContext2D, cx: number, base: number) {
  const h = 16
  for (let i = 0; i <= h; i++) {
    const y = base - h + i
    const m = Math.round(i * 1.15)
    ctx.fillStyle = TINTA; ctx.fillRect(cx - m - 1, y, m * 2 + 3, 1)
    ctx.fillStyle = '#D7242F'; ctx.fillRect(cx - m, y, m, 1)
    ctx.fillStyle = '#A3161F'; ctx.fillRect(cx, y, m + 1, 1)
    const p = Math.round(i * 0.45)
    if (i > 4) { ctx.fillStyle = '#3A0D10'; ctx.fillRect(cx - p + 1, y, p * 2 - 1, 1) }
  }
  ctx.fillStyle = '#FFC20E'; ctx.fillRect(cx - Math.round(h * 1.15) - 1, base, Math.round(h * 2.3) + 3, 1)
  ctx.fillStyle = TINTA; ctx.fillRect(cx, base - h - 3, 1, 3)
  ctx.fillStyle = '#FFC20E'; ctx.fillRect(cx + 1, base - h - 3, 3, 2)
}

function fogata(ctx: CanvasRenderingContext2D, cx: number, base: number, frame: number) {
  ctx.fillStyle = TINTA; ctx.fillRect(cx - 6, base - 2, 13, 3)
  ctx.fillStyle = '#7A4A22'; ctx.fillRect(cx - 5, base - 1, 11, 1)
  ctx.fillStyle = '#9C6430'; ctx.fillRect(cx - 4, base - 2, 4, 1); ctx.fillRect(cx + 1, base - 2, 4, 1)
  const llamas = frame ? [[0, 7], [-2, 4], [2, 5], [-3, 2], [3, 3]] : [[0, 6], [-2, 5], [2, 4], [-3, 3], [3, 2]]
  for (const [dx, h] of llamas) {
    ctx.fillStyle = '#D7242F'; ctx.fillRect(cx + dx - 1, base - 2 - h, 3, h)
    ctx.fillStyle = '#FF8A00'; ctx.fillRect(cx + dx, base - 2 - h + 1, 1, h - 1)
  }
  ctx.fillStyle = '#FFE58A'; ctx.fillRect(cx, base - 4 - (frame ? 1 : 0), 1, 2)
  // chispas
  ctx.fillStyle = '#FFC20E'
  ctx.fillRect(cx + (frame ? 2 : -2), base - 11 - frame, 1, 1)
}

function dibujar(cv: HTMLCanvasElement, fuego: HTMLCanvasElement, W: number, H: number) {
  const ctx = cv.getContext('2d')!
  const suelo = H - Math.max(16, Math.round(H * 0.24))
  // Cielo en bandas planas; solo el borde entre bandas lleva trama (como en los juegos de 16 bits)
  const BANDAS = ['#2A5CBE', '#3874D6', '#4C90E6', '#68ABF0', '#8DCBFA']
  const cortes = [0.34, 0.56, 0.74, 0.88].map(f => Math.round(f * suelo))
  ctx.fillStyle = BANDAS[0]; ctx.fillRect(0, 0, W, suelo)
  cortes.forEach((c, i) => {
    ctx.fillStyle = BANDAS[i + 1]; ctx.fillRect(0, c, W, suelo - c)
    trama(ctx, 0, c - 3, W, 6, BANDAS[i], BANDAS[i + 1], y => (y - (c - 3)) / 6)
  })
  // Nubes pixel
  for (let k = 0; k < Math.ceil(W / 70); k++) {
    const nx = Math.round(hash(k, 3) * W), ny = Math.round(6 + hash(k, 7) * suelo * 0.35), nw = 14 + Math.round(hash(k, 9) * 14)
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(nx, ny, nw, 3); ctx.fillRect(nx + 3, ny - 2, nw - 8, 2)
    ctx.fillStyle = '#CFE6FF'; ctx.fillRect(nx, ny + 3, nw, 1)
  }
  // Cordillera lejana y cerros
  for (let x = 0; x < W; x++) {
    const m = Math.round(suelo - 10 - Math.abs(Math.sin(x / 23) * 14 + Math.sin(x / 9 + 1) * 4) - hash(x >> 2, 1) * 2)
    ctx.fillStyle = '#6F8FC8'; ctx.fillRect(x, m, 1, suelo - m)
    if (m < suelo - 20) { ctx.fillStyle = '#E8F1FF'; ctx.fillRect(x, m, 1, 2) }
    const c = Math.round(suelo - 4 - (Math.sin(x / 31 + 2) + 1) * 4)
    ctx.fillStyle = '#3F8A55'; ctx.fillRect(x, c, 1, suelo - c)
    ctx.fillStyle = '#4FA463'; ctx.fillRect(x, c, 1, 1)
  }
  // Bosque al fondo (deja libre el centro, donde está el personaje)
  const centro = W / 2
  for (let x = 4; x < W; x += 7 + Math.round(hash(x, 5) * 6)) {
    if (Math.abs(x - centro) < 26) continue
    pino(ctx, x, suelo + 1, 12 + Math.round(hash(x, 11) * 10), '#1F5C3A', '#2E7D4A')
  }
  // Pasto con trama y matas
  trama(ctx, 0, suelo, W, H - suelo, '#5DAE48', '#4A9A3C', y => (y - suelo) / (H - suelo))
  ctx.fillStyle = TINTA; ctx.fillRect(0, suelo, W, 1)
  ctx.fillStyle = '#8BD36A'; ctx.fillRect(0, suelo + 1, W, 1)
  for (let i = 0; i < W * (H - suelo) / 40; i++) {
    const x = Math.round(hash(i, 21) * W), y = suelo + 3 + Math.round(hash(i, 23) * (H - suelo - 4))
    ctx.fillStyle = '#3B8030'; ctx.fillRect(x, y, 1, 2); ctx.fillRect(x + 2, y + 1, 1, 1)
    if (hash(i, 29) > 0.9) { ctx.fillStyle = '#FFE58A'; ctx.fillRect(x + 1, y - 1, 1, 1) }
  }
  // Tarima donde se para el personaje
  const tw = 30
  ctx.fillStyle = TINTA; ctx.fillRect(Math.round(centro - tw / 2) - 1, suelo + 4, tw + 2, 6)
  ctx.fillStyle = '#C08A4E'; ctx.fillRect(Math.round(centro - tw / 2), suelo + 5, tw, 2)
  ctx.fillStyle = '#93622F'; ctx.fillRect(Math.round(centro - tw / 2), suelo + 7, tw, 2)
  // Carpa a la izquierda y fogata a la derecha
  if (W > 110) carpa(ctx, Math.round(centro - Math.min(60, W * 0.3)), suelo + 6)
  const fx = Math.round(centro + Math.min(52, W * 0.27))
  const f = fuego.getContext('2d')!
  let frame = 0
  const pintarFuego = () => {
    f.clearRect(0, 0, W, H)
    if (W > 90) fogata(f, fx, suelo + 8, frame)
    frame ^= 1
  }
  pintarFuego()
  return pintarFuego
}

/** Escenario pixel: un campamento de club al atardecer, detrás del personaje. */
export function Campamento() {
  const caja = useRef<HTMLDivElement>(null)
  const cielo = useRef<HTMLCanvasElement>(null)
  const fuego = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = caja.current!, a = cielo.current!, b = fuego.current!
    let timer = 0
    const montar = () => {
      const { width, height } = el.getBoundingClientRect()
      if (!width || !height) return
      const s = Math.max(2, Math.round(height / 120))
      const W = Math.ceil(width / s), H = Math.ceil(height / s)
      for (const c of [a, b]) { c.width = W; c.height = H; c.style.width = `${W * s}px`; c.style.height = `${H * s}px` }
      const tick = dibujar(a, b, W, H)
      // Dónde quedan los pies del personaje: sobre la tarima
      const suelo = H - Math.max(16, Math.round(H * 0.24))
      el.parentElement?.style.setProperty('--pie', `${(H - suelo - 5) * s - 10}px`)
      clearInterval(timer)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = window.setInterval(tick, 260)
    }
    const ro = new ResizeObserver(montar)
    ro.observe(el)
    return () => { ro.disconnect(); clearInterval(timer) }
  }, [])

  return (
    <div className="campamento" ref={caja} aria-hidden>
      <canvas ref={cielo} />
      <canvas ref={fuego} />
    </div>
  )
}
