import { asset } from './componentes/Comunes'

const TINTA = '#1E140C'
const cargar = (src: string) => new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src })

function centrado(ctx: CanvasRenderingContext2D, t: string, y: number, max: number) {
  let tam = parseInt(ctx.font, 10)
  const resto = ctx.font.replace(/^\d+px/, '')
  while (ctx.measureText(t).width > max && tam > 18) { tam -= 2; ctx.font = `${tam}px${resto}` }
  ctx.fillText(t, ctx.canvas.width / 2, y)
}

export interface DatosCertificado { nombre: string; club: string; campo?: string; fecha: string }

/**
 * Dibuja el certificado (1600 × 1130, horizontal) en el celular del jugador.
 * El nombre real NO se envía al servidor: solo se usa aquí para la imagen.
 */
export async function dibujarCertificado(d: DatosCertificado): Promise<HTMLCanvasElement> {
  await Promise.all(['72px Bangers', '700 30px Nunito', '900 30px Nunito'].map(f => document.fonts?.load(f).catch(() => undefined)))
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1130
  const ctx = cv.getContext('2d')!
  // Papel con trama suave
  ctx.fillStyle = '#F6E7C1'; ctx.fillRect(0, 0, 1600, 1130)
  ctx.fillStyle = 'rgba(30,20,12,.05)'
  for (let y = 0; y < 1130; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < 1600; x += 14) ctx.fillRect(x, y, 2, 2)
  // Marco doble con puntada
  ctx.strokeStyle = TINTA; ctx.lineWidth = 10; ctx.strokeRect(36, 36, 1528, 1058)
  ctx.strokeStyle = '#0E4B45'; ctx.lineWidth = 18; ctx.strokeRect(62, 62, 1476, 1006)
  ctx.setLineDash([14, 10]); ctx.strokeStyle = '#FFC20E'; ctx.lineWidth = 3; ctx.strokeRect(62, 62, 1476, 1006); ctx.setLineDash([])
  // Emblemas
  try {
    const [logo, c1] = await Promise.all([cargar(asset('logo-alas')), cargar(asset('emblema-c1'))])
    ctx.drawImage(logo, 800 - 170, 96, 340, 340 * (logo.height / logo.width))
    ctx.drawImage(c1, 140, 820, 150, 150 * (c1.height / c1.width))
    ctx.drawImage(c1, 1310, 820, 150, 150 * (c1.height / c1.width))
  } catch { /* sin imágenes, el certificado igual sale */ }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  // Título con contorno de cómic
  ctx.font = '120px Bangers, Impact, sans-serif'
  ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = TINTA; ctx.strokeText('CERTIFICADO', 800, 420)
  ctx.fillStyle = '#D7242F'; ctx.fillText('CERTIFICADO', 800, 420)
  ctx.font = '700 30px Nunito, sans-serif'; ctx.fillStyle = '#5C4A2A'
  ctx.fillText('Aspirantazgo · Isla del Uniforme', 800, 470)
  ctx.font = '700 34px Nunito, sans-serif'; ctx.fillStyle = TINTA
  ctx.fillText('Se otorga a', 800, 560)
  ctx.font = '96px Bangers, Impact, sans-serif'; ctx.fillStyle = '#0E4B45'
  centrado(ctx, d.nombre.toUpperCase(), 665, 1250)
  ctx.strokeStyle = TINTA; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(330, 690); ctx.lineTo(1270, 690); ctx.stroke()
  ctx.font = '900 40px Nunito, sans-serif'; ctx.fillStyle = TINTA
  centrado(ctx, `Club ${d.club}`, 750, 1250)
  if (d.campo && d.campo !== '-') { ctx.font = '700 28px Nunito, sans-serif'; ctx.fillStyle = '#5C4A2A'; centrado(ctx, d.campo, 792, 1200) }
  ctx.font = '700 30px Nunito, sans-serif'; ctx.fillStyle = TINTA
  ctx.fillText('por completar todos los niveles de la Isla del Uniforme', 800, 860)
  ctx.fillText('y demostrar que conoce el uniforme oficial de Conquistadores.', 800, 900)
  // Firma y fecha
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(470, 985); ctx.lineTo(760, 985); ctx.moveTo(840, 985); ctx.lineTo(1130, 985); ctx.stroke()
  ctx.font = '700 24px Nunito, sans-serif'; ctx.fillStyle = '#5C4A2A'
  ctx.fillText('Director del club', 615, 1016)
  ctx.fillText(d.fecha, 985, 975); ctx.fillText('Fecha', 985, 1016)
  ctx.font = '700 18px Nunito, sans-serif'; ctx.fillText('aspirantazgo.vercel.app', 800, 1050)
  return cv
}

export async function descargarCertificado(d: DatosCertificado) {
  const cv = await dibujarCertificado(d)
  const blob: Blob | null = await new Promise(ok => cv.toBlob(ok, 'image/png'))
  if (!blob) throw new Error('SIN_IMAGEN')
  const archivo = `certificado-${d.nombre.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}.png`
  // En el celular se puede compartir directo (WhatsApp); si no, se descarga
  const f = new File([blob], archivo, { type: 'image/png' })
  if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: 'Mi certificado de Aspirantazgo' }); return } catch { /* canceló: se descarga */ } }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = archivo; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
