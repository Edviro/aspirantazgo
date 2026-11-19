import { useEffect, useRef } from 'react'

/** Barquito en pixel art (cada caracter es un pixel). */
const BARCO = [
  '......f.......',
  '......fb......',
  '......fbb.....',
  '......fbbb....',
  '......fbbbb...',
  '......fbbbbb..',
  '......f.......',
  'cccccccccccccc',
  '.mmmmmmmmmmmm.',
  '..mmmmmmmmmm..',
]
const COLORES: Record<string, string> = { f: '#4a3020', c: '#1E140C', m: '#8a5a2e' }

const DURACION = 1900

/**
 * Transición entre campamentos: el barquito zarpa por el mar con la vela del color del destino.
 * Llama a onFin al llegar (o enseguida si el usuario prefiere menos movimiento).
 */
export function Travesia({ destino, color, onFin }: { destino: string; color: string; onFin: () => void }) {
  const fin = useRef(onFin)
  fin.current = onFin
  useEffect(() => {
    const menos = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => fin.current(), menos ? 500 : DURACION)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="travesia" role="status" aria-live="polite" style={{ ['--c' as string]: color }}>
      <div className="travesia-mar" aria-hidden />
      <div className="travesia-barco" aria-hidden>
        <svg viewBox="0 0 14 10" width="140" height="100" shapeRendering="crispEdges">
          {BARCO.flatMap((fila, y) => [...fila].map((ch, x) => ch === '.' ? null :
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={ch === 'b' ? 'var(--c)' : COLORES[ch]} />))}
        </svg>
        <span className="travesia-estela" />
      </div>
      <p className="travesia-texto"><small>Zarpando hacia</small><strong>{destino}</strong></p>
    </div>
  )
}
