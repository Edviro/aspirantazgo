import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/** Código QR dibujado como SVG (sin insertar HTML): al escanearlo, el celular abre el juego y entra a la sala. */
export function CodigoQR({ texto, size = 200 }: { texto: string; size?: number }) {
  const { n, celdas } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(texto)
    qr.make()
    const n = qr.getModuleCount()
    const celdas: string[] = []
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) celdas.push(`M${x},${y}h1v1h-1z`)
    return { n, celdas }
  }, [texto])
  return (
    <svg className="codigo-qr" viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} role="img" aria-label="Código QR para entrar a la sala" shapeRendering="crispEdges">
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={celdas.join('')} fill="#1E140C" />
    </svg>
  )
}

/**
 * Enlace corto que abre el juego directo en una sala: https://aspirantazgo.vercel.app/s/ABCDE
 * (corto = QR con cuadros más grandes, que la cámara reconoce como enlace aunque se proyecte lejos).
 */
export const enlaceSala = (codigo: string) => `${window.location.origin}/s/${codigo}`
/** El mismo enlace sin "https://", para escribirlo a mano. */
export const enlaceSalaCorto = (codigo: string) => `${window.location.host}/s/${codigo}`

const CLAVE = 'asp_sala_pendiente'
/** Lee el código de sala que vino en el enlace (/s/ABCDE o ?sala=ABCDE) o en el QR y lo guarda hasta usarlo. */
export function salaDelEnlace(): string | null {
  try {
    const u = new URL(window.location.href)
    const m = u.pathname.match(/^\/s\/([A-Za-z]{5})\/?$/)
    const c = (m ? m[1] : u.searchParams.get('sala') ?? '').toUpperCase()
    if (m || u.searchParams.has('sala')) { u.searchParams.delete('sala'); window.history.replaceState(null, '', (m ? '/' : u.pathname) + u.search + u.hash) }
    if (/^[A-Z]{5}$/.test(c)) { sessionStorage.setItem(CLAVE, c); return c }
    return leerSalaPendiente()
  } catch { return null }
}
export function leerSalaPendiente(): string | null {
  try { const c = sessionStorage.getItem(CLAVE); return c && /^[A-Z]{5}$/.test(c) ? c : null } catch { return null }
}
export const olvidarSalaPendiente = () => { try { sessionStorage.removeItem(CLAVE) } catch { /* */ } }
