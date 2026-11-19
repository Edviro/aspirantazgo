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

/** Enlace que abre el juego directo en una sala. */
export const enlaceSala = (codigo: string) => `${window.location.origin}${window.location.pathname}?sala=${codigo}`

/** Lee (una sola vez) el código de sala que vino en el enlace o en el QR. */
export function salaDelEnlace(): string | null {
  try {
    const u = new URL(window.location.href)
    const c = (u.searchParams.get('sala') ?? '').toUpperCase()
    if (u.searchParams.has('sala')) { u.searchParams.delete('sala'); window.history.replaceState(null, '', u.pathname + u.search + u.hash) }
    if (/^[A-Z]{5}$/.test(c)) { sessionStorage.setItem('asp_sala_pendiente', c); return c }
    return sessionStorage.getItem('asp_sala_pendiente')
  } catch { return null }
}
export const olvidarSalaPendiente = () => { try { sessionStorage.removeItem('asp_sala_pendiente') } catch { /* */ } }
