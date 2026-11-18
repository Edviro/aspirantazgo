import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { PANEL } from '../../domain/uniformes'
import type { PanelId } from '../../domain/tipos'
import { margen, NOMBRE_PANEL, viewBoxPanel } from '../componentes/Paneles'

export const vbW = (p: PanelId) => PANEL[p].w + margen(p).izq + margen(p).der
export const vbH = (p: PanelId) => PANEL[p].h + margen(p).arriba + margen(p).abajo

/**
 * Coloca los paneles con UNA sola escala (px por cm), para que una pieza mida lo mismo en todas las mangas.
 */
export function Tablero({ paneles, render, onPanelClick }: {
  paneles: PanelId[]
  render: (p: PanelId) => ReactNode
  onPanelClick?: (p: PanelId, e: React.PointerEvent<SVGSVGElement>) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [esc, setEsc] = useState(10)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => {
      const gap = 12 * (paneles.length - 1)
      const etiqueta = 26
      const W = el.clientWidth - gap - 8
      const H = el.clientHeight - etiqueta - 8
      const sumW = paneles.reduce((a, p) => a + vbW(p), 0)
      const maxH = Math.max(...paneles.map(vbH))
      setEsc(Math.max(4, Math.min(W / sumW, H / maxH)))
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [paneles])

  return (
    <div className="tablero" ref={ref} data-escala={esc}>
      {paneles.map(p => (
        <figure key={p} className="panel-fig">
          <figcaption>{NOMBRE_PANEL[p]}</figcaption>
          <svg data-panel={p} viewBox={viewBoxPanel(p)} width={vbW(p) * esc} height={vbH(p) * esc}
            onPointerDown={e => onPanelClick?.(p, e)} role="img" aria-label={NOMBRE_PANEL[p]}>
            {render(p)}
          </svg>
        </figure>
      ))}
    </div>
  )
}

/** Convierte un punto de pantalla a cm dentro del panel que está debajo. */
export function puntoEnPanel(cx: number, cy: number): { panel: PanelId; x: number; y: number } | null {
  const els = document.elementsFromPoint(cx, cy)
  for (const el of els) {
    const svg = (el as Element).closest?.('svg[data-panel]') as SVGSVGElement | null
    if (svg) {
      const m = svg.getScreenCTM()
      if (!m) return null
      const pt = new DOMPoint(cx, cy).matrixTransform(m.inverse())
      return { panel: svg.dataset.panel as PanelId, x: pt.x, y: pt.y }
    }
  }
  return null
}

export function escalaActual(): number {
  const t = document.querySelector('.tablero') as HTMLElement | null
  return t ? Number(t.dataset.escala) || 10 : 10
}
