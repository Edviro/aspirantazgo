import { useRef } from 'react'

/**
 * Palanca para caminar en el celular: arrastras el botón desde el centro y tu personaje camina hacia allá
 * (más lejos del centro, más rápido). Escribe en `valor` sin redibujar React (se lee en el bucle del juego).
 */
export function Joystick({ valor, onUsar }: { valor: React.MutableRefObject<{ x: number; y: number }>; onUsar?: () => void }) {
  const base = useRef<HTMLDivElement>(null), perilla = useRef<HTMLDivElement>(null), id = useRef<number | null>(null)
  const mover = (cx: number, cy: number) => {
    const b = base.current!.getBoundingClientRect(), r = b.width / 2
    let dx = cx - (b.left + r), dy = cy - (b.top + r)
    const d = Math.hypot(dx, dy), max = r * 0.62
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max }
    valor.current = { x: dx / max, y: dy / max }
    if (perilla.current) perilla.current.style.transform = `translate(${dx}px, ${dy}px)`
  }
  const soltar = () => {
    id.current = null
    valor.current = { x: 0, y: 0 }
    if (perilla.current) perilla.current.style.transform = ''
    base.current?.classList.remove('activo')
  }
  return (
    <div className="joystick" ref={base} aria-label="Palanca para caminar" role="application"
      onPointerDown={e => { e.stopPropagation(); id.current = e.pointerId; base.current?.setPointerCapture(e.pointerId); base.current?.classList.add('activo'); mover(e.clientX, e.clientY) }}
      onPointerMove={e => { if (id.current === e.pointerId) mover(e.clientX, e.clientY) }}
      onPointerUp={soltar} onPointerCancel={soltar}
      onDoubleClick={onUsar}>
      <i className="joystick-flechas" aria-hidden><b /><b /><b /><b /></i>
      <div className="joystick-perilla" ref={perilla} aria-hidden />
    </div>
  )
}
