/**
 * Banderas en pixel art: la del país del club, la de Conquistadores y la del club.
 * La del club la sube el director: se convierte aquí mismo (en su equipo) a 24×16 pixeles con hasta 16 colores y se
 * guarda como texto validado ("p:paleta;d:pixeles"). Nunca se sube la imagen.
 */
import { pintarBanderaConquis } from './plazaPixel'

export const BANDERA_W = 24, BANDERA_H = 16
const TINTA = '#1E140C'
const FORMATO = /^p:([0-9a-f]{6},){0,15}[0-9a-f]{6};d:[0-9a-f]{384}$/

type Rect = (x: number, y: number, w: number, h: number, c: string) => void

/** Franjas horizontales iguales. */
const horiz = (r: Rect, cols: string[]) => { const h = 9 / cols.length; cols.forEach((c, i) => r(1, 1 + Math.round(i * h), 14, Math.round((i + 1) * h) - Math.round(i * h), c)) }
const vert = (r: Rect, cols: string[]) => { const w = 14 / cols.length; cols.forEach((c, i) => r(1 + Math.round(i * w), 1, Math.round((i + 1) * w) - Math.round(i * w), 9, c)) }

const PAISES: Record<string, (r: Rect) => void> = {
  PE: r => vert(r, ['#D91023', '#ffffff', '#D91023']),
  BO: r => horiz(r, ['#D52B1E', '#F9E300', '#007934']),
  CO: r => { r(1, 1, 14, 5, '#FCD116'); r(1, 6, 14, 2, '#003893'); r(1, 8, 14, 2, '#CE1126') },
  EC: r => { r(1, 1, 14, 5, '#FFD100'); r(1, 6, 14, 2, '#034EA2'); r(1, 8, 14, 2, '#ED1C24'); r(7, 4, 2, 3, '#7a5a2e') },
  VE: r => { horiz(r, ['#FCE300', '#003DA5', '#EF3340']); for (let i = 0; i < 5; i++) r(5 + i, 4 + (i % 2), 1, 1, '#fff') },
  AR: r => { horiz(r, ['#74ACDF', '#ffffff', '#74ACDF']); r(7, 4, 2, 2, '#F6B40E') },
  UY: r => { for (let i = 0; i < 9; i++) r(1, 1 + i, 14, 1, i % 2 ? '#0038A8' : '#ffffff'); r(1, 1, 5, 5, '#ffffff'); r(2, 2, 3, 3, '#FCD116') },
  PY: r => { horiz(r, ['#D52B1E', '#ffffff', '#0038A8']); r(7, 4, 2, 2, '#1E9A4B') },
  CL: r => { r(1, 1, 14, 5, '#ffffff'); r(1, 6, 14, 4, '#D52B1E'); r(1, 1, 5, 5, '#0039A6'); r(3, 3, 1, 1, '#ffffff') },
  BR: r => { r(1, 1, 14, 9, '#009C3B'); for (let i = 0; i < 4; i++) r(4 + i, 4 - i, 8 - i * 2, 1 + i * 2 > 7 ? 7 : 1 + i * 2, '#FFDF00'); r(3, 5, 10, 1, '#FFDF00'); r(6, 4, 4, 3, '#002776') },
  MX: r => { vert(r, ['#006847', '#ffffff', '#CE1126']); r(7, 4, 2, 3, '#8a5a2e') },
  US: r => { for (let i = 0; i < 9; i++) r(1, 1 + i, 14, 1, i % 2 ? '#ffffff' : '#B22234'); r(1, 1, 6, 5, '#3C3B6E') },
  ES: r => { r(1, 1, 14, 2, '#AA151B'); r(1, 3, 14, 5, '#F1BF00'); r(1, 8, 14, 2, '#AA151B') },
  GT: r => vert(r, ['#4997D0', '#ffffff', '#4997D0']),
  HN: r => horiz(r, ['#0073CF', '#ffffff', '#0073CF']),
  SV: r => horiz(r, ['#0F47AF', '#ffffff', '#0F47AF']),
  NI: r => horiz(r, ['#0067C6', '#ffffff', '#0067C6']),
  CR: r => { r(1, 1, 14, 1, '#002B7F'); r(1, 2, 14, 1, '#ffffff'); r(1, 3, 14, 3, '#CE1126'); r(1, 6, 14, 1, '#ffffff'); r(1, 7, 14, 3, '#002B7F') },
  PA: r => { r(1, 1, 7, 4, '#ffffff'); r(8, 1, 7, 4, '#D21034'); r(1, 5, 7, 5, '#005293'); r(8, 5, 7, 5, '#ffffff') },
  DO: r => { r(1, 1, 6, 4, '#002D62'); r(9, 1, 6, 4, '#CE1126'); r(1, 6, 6, 4, '#CE1126'); r(9, 6, 6, 4, '#002D62'); r(7, 1, 2, 9, '#ffffff'); r(1, 5, 14, 1, '#ffffff') },
}

/** Bandera del país (16×11, con borde). Si no está en la lista, una bandera blanca con un globo. */
export function pintarBanderaPais(ctx: CanvasRenderingContext2D, codigo?: string | null) {
  const r: Rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
  r(0, 0, 16, 11, TINTA)
  const f = PAISES[(codigo ?? '').toUpperCase()]
  if (f) f(r)
  else { r(1, 1, 14, 9, '#ffffff'); r(6, 3, 4, 5, '#2E6FD8'); r(7, 4, 2, 3, '#1E9A4B') }
}

export { pintarBanderaConquis }

/** Lee la bandera del club guardada (o null si no es válida). */
export function leerBandera(txt?: string | null): { paleta: string[]; px: Uint8Array } | null {
  if (!txt || !FORMATO.test(txt)) return null
  const [p, d] = txt.split(';')
  const paleta = p.slice(2).split(',').map(c => '#' + c)
  const px = new Uint8Array(BANDERA_W * BANDERA_H)
  for (let i = 0; i < px.length; i++) px[i] = Math.min(paleta.length - 1, parseInt(d[2 + i], 16))
  return { paleta, px }
}

/** Pinta la bandera del club en un lienzo de 24×16 (o nada si no hay). */
export function pintarBanderaClub(ctx: CanvasRenderingContext2D, txt?: string | null) {
  const b = leerBandera(txt)
  if (!b) return false
  for (let y = 0; y < BANDERA_H; y++) for (let x = 0; x < BANDERA_W; x++) { ctx.fillStyle = b.paleta[b.px[y * BANDERA_W + x]]; ctx.fillRect(x, y, 1, 1) }
  return true
}

/**
 * Transforma una imagen en la bandera del club: la recorta para llenar 24×16, reduce a 16 colores
 * (corte por la mediana) y devuelve el texto para guardar.
 */
export async function pixelarImagen(archivo: Blob): Promise<string> {
  if (archivo.size > 8 * 1024 * 1024) throw new Error('IMAGEN_GRANDE')
  if (!/^image\/(png|jpeg|webp|gif)$/.test(archivo.type)) throw new Error('IMAGEN_INVALIDA')
  const bmp = await createImageBitmap(archivo)
  const cv = document.createElement('canvas'); cv.width = BANDERA_W; cv.height = BANDERA_H
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  // recorte tipo "cover" para no deformar
  const esc = Math.max(BANDERA_W / bmp.width, BANDERA_H / bmp.height)
  const w = bmp.width * esc, h = bmp.height * esc
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, BANDERA_W, BANDERA_H)
  ctx.drawImage(bmp, (BANDERA_W - w) / 2, (BANDERA_H - h) / 2, w, h)
  bmp.close?.()
  const data = ctx.getImageData(0, 0, BANDERA_W, BANDERA_H).data
  const pix: [number, number, number][] = []
  for (let i = 0; i < data.length; i += 4) pix.push([data[i], data[i + 1], data[i + 2]])
  // Corte por la mediana hasta 16 cajas
  let cajas: [number, number, number][][] = [pix.map(p => p)]
  while (cajas.length < 16) {
    let mejor = -1, eje = 0, rango = -1
    cajas.forEach((c, i) => {
      if (c.length < 2) return
      for (let e = 0; e < 3; e++) {
        let mn = 255, mx = 0
        for (const p of c) { mn = Math.min(mn, p[e]); mx = Math.max(mx, p[e]) }
        if (mx - mn > rango) { rango = mx - mn; mejor = i; eje = e }
      }
    })
    if (mejor < 0 || rango < 12) break
    const c = cajas[mejor].sort((a, b) => a[eje] - b[eje]), m = Math.floor(c.length / 2)
    cajas = [...cajas.slice(0, mejor), c.slice(0, m), c.slice(m), ...cajas.slice(mejor + 1)]
  }
  const paleta = cajas.map(c => [0, 1, 2].map(e => Math.round(c.reduce((a, p) => a + p[e], 0) / c.length)) as [number, number, number])
  const hex = (v: number) => v.toString(16).padStart(2, '0')
  const idx = pix.map(p => {
    let k = 0, d = Infinity
    paleta.forEach((q, i) => { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (dd < d) { d = dd; k = i } })
    return k.toString(16)
  }).join('')
  const txt = `p:${paleta.map(q => q.map(hex).join('')).join(',')};d:${idx}`
  if (!FORMATO.test(txt)) throw new Error('IMAGEN_INVALIDA')
  return txt
}
