import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import type { Nivel } from '../../domain/niveles'
import { PixelAvatar } from './PixelAvatar'

export type EstadoNodo = 'bloqueado' | 'abierto' | 'hecho'

const GAP = 118   // separación vertical entre nodos
const AMPL = 32   // amplitud del zigzag (% del ancho)

/** Mapa 2D en pixel art: un camino en zigzag con los niveles, el avatar en el nivel actual. */
export function MapaPixel({ niveles, estados, estrellas, actual, avatar, rango, onElegir }: {
  niveles: Nivel[]; estados: EstadoNodo[]; estrellas: number[]; actual: number
  avatar: AvatarConfig; rango: Rango; onElegir: (i: number) => void
}) {
  const scroll = useRef<HTMLDivElement>(null)
  const n = niveles.length
  const alto = n * GAP + 160
  // posición de cada nodo: x en %, y en px (nivel 1 arriba)
  const pos = useMemo(() => niveles.map((_, i) => ({
    x: 50 + Math.sin(i * 0.9) * AMPL,
    y: 80 + i * GAP,
  })), [niveles])

  // auto-centrar en el nivel actual al entrar
  useLayoutEffect(() => {
    const el = scroll.current
    if (el) el.scrollTop = Math.max(0, pos[actual].y - el.clientHeight * 0.55)
  }, [actual, pos])

  // pequeños árboles/carpas de decoración (deterministas por posición)
  const decor = useMemo(() => Array.from({ length: Math.ceil(alto / 90) }, (_, k) => ({
    x: (k * 37) % 92 + 4, y: 40 + k * 90 + (k % 3) * 18, t: k % 4, lado: k % 2,
  })), [alto])

  return (
    <div className="mapa-pixel" ref={scroll}>
      <div className="mapa-lienzo" style={{ height: alto }}>
        {decor.map((d, k) => (
          <div key={k} className={`deco deco-${d.t}`} style={{ left: `${d.lado ? d.x : 100 - d.x}%`, top: d.y }} aria-hidden />
        ))}
        <svg className="mapa-camino" viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" aria-hidden>
          <path d={pos.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')} fill="none" stroke="#C9A84B" strokeWidth={3.4} strokeLinecap="round" strokeDasharray="0.1 5.2" strokeOpacity={0.9} />
        </svg>
        {niveles.map((nv, i) => {
          const e = estados[i]
          return (
            <div key={nv.id} className={`nodo-pixel ${e} ${i === actual ? 'actual' : ''}`} style={{ left: `${pos[i].x}%`, top: pos[i].y }}>
              {i === actual && <div className="nodo-avatar"><PixelAvatar a={avatar} rango={rango} animo="saluda" alto={74} /></div>}
              <button className="nodo-btn" onClick={() => onElegir(i)} aria-label={`Nivel ${nv.num}: ${nv.titulo}`} disabled={e === 'bloqueado'}>
                {e === 'bloqueado' ? '🔒' : nv.num}
              </button>
              {e !== 'bloqueado' && (
                <div className="nodo-estrellas">{'★'.repeat(estrellas[i])}{'☆'.repeat(3 - estrellas[i])}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Fondo fijo del mapa (agua + isla), detrás del scroll. */
export function FondoMapa() {
  useEffect(() => {}, [])
  return <div className="mapa-fondo" aria-hidden />
}
