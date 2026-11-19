import { useEffect, useRef, useState } from 'react'
import { useJuego } from '../estado'
import { menosMovimiento } from '../transicion'
import { VeleroLado } from './Barco'

/** Islita de origen en pixel art (24 × 10), con dos carpas del color del campamento. */
function IslaLado({ color }: { color: string }) {
  const r: [number, number, number, number, string][] = [
    [3, 6, 18, 1, '#E8D39A'], [1, 7, 22, 1, '#E8D39A'], [0, 8, 24, 2, '#C9B27A'],
    [5, 4, 14, 2, '#3FA34D'], [4, 5, 16, 1, '#2E8A3E'], [7, 3, 10, 1, '#3FA34D'],
    [17, 0, 1, 4, '#4a3020'], [16, 1, 1, 2, '#2E6B33'], [18, 1, 1, 2, '#2E6B33'], [15, 2, 5, 1, '#2E6B33'],
  ]
  for (const [x0] of [[6], [11]]) for (let i = 0; i < 3; i++) r.push([x0 + 2 - i, 2 + i, i * 2 + 1, 1, color])
  return (
    <svg viewBox="0 0 24 10" width="100%" height="100%" shapeRendering="crispEdges" aria-hidden>
      {r.map(([x, y, w, h, c], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={c} />)}
    </svg>
  )
}

const DURACION = 2100

/**
 * El barquito zarpa: tu avatar a bordo con la bandera de Conquistadores, la isla se queda atrás y,
 * al final, un destello blanco da paso a la vista aérea (la pantalla siguiente hace el zoom).
 */
export function Travesia({ texto, destino, color, onFin }: { texto: string; destino: string; color: string; onFin: () => void }) {
  const perfil = useJuego(s => s.perfil)
  const [px] = useState(() => (Math.min(window.innerWidth, window.innerHeight * 1.2) >= 760 ? 10 : 7))
  const fin = useRef(onFin)
  fin.current = onFin
  useEffect(() => {
    const t = setTimeout(() => fin.current(), menosMovimiento() ? 400 : DURACION)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="travesia" role="status" aria-live="polite" style={{ ['--px' as string]: `${px}px` }}>
      <div className="travesia-nube n1" aria-hidden /><div className="travesia-nube n2" aria-hidden />
      <div className="travesia-isla" aria-hidden><IslaLado color={color} /></div>
      <div className="travesia-mar" aria-hidden />
      <div className="travesia-barco" aria-hidden>
        <span className="travesia-estela" />
        <VeleroLado avatar={perfil?.avatar} rango={perfil?.rango} px={px} />
      </div>
      <div className="travesia-olas-frente" aria-hidden />
      <p className="travesia-texto"><small>{texto}</small><strong>{destino}</strong></p>
      <div className="travesia-flash" aria-hidden />
    </div>
  )
}
