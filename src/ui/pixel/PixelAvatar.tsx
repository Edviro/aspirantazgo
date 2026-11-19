import { useEffect, useMemo, useRef } from 'react'
import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { PX_H, PX_W, dibujarAvatar, opcionesDe } from './dibujo'

const TINTA = '#1E140C'

/** Sprite con contorno de tinta de 1 px (estilo cómic), listo para copiar en cada cuadro. */
function sprite(opts: ReturnType<typeof opcionesDe>, brazoArriba: boolean) {
  const base = document.createElement('canvas'); base.width = PX_W; base.height = PX_H
  dibujarAvatar(base.getContext('2d')!, { ...opts, brazoArriba })
  const sil = document.createElement('canvas'); sil.width = PX_W; sil.height = PX_H
  const sc = sil.getContext('2d')!
  sc.drawImage(base, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = TINTA; sc.fillRect(0, 0, PX_W, PX_H)
  const out = document.createElement('canvas'); out.width = PX_W; out.height = PX_H
  const oc = out.getContext('2d')!
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) oc.drawImage(sil, dx, dy)
  oc.drawImage(base, 0, 0)
  return out
}

/**
 * Avatar en pixel art, dibujado por código (sin modelos 3D). Refleja el rango:
 * camisa caqui o blanca, saco negro del departamental, pañoleta de GM, torzal, galón y botones de clase.
 */
export function PixelAvatar({ a, rango = 'conquistador', animo = 'idle', alto = 180, className }: {
  a: AvatarConfig; rango?: Rango; animo?: 'idle' | 'saluda' | 'celebra' | 'voto'; alto?: number; className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const opts = useMemo(() => opcionesDe(a, rango), [a, rango])
  const quieto = useMemo(() => sprite(opts, false), [opts])
  const arriba = useMemo(() => sprite(opts, true), [opts])

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const fase = Math.random() * 6
    const pintar = (t: number) => {
      const s = t / 1000 + fase
      const salto = reducir || animo === 'voto' ? 0 : animo === 'celebra' ? Math.round(Math.abs(Math.sin(s * 5)) * 3) : Math.round((Math.sin(s * 2) + 1) * 0.5)
      // al saludar, la mano sube y baja (dos cuadros), nunca un brazo extra
      const mano = animo === 'celebra' || animo === 'voto' || (animo === 'saluda' && Math.floor(s * 2.2) % 2 === 0)
      ctx.clearRect(0, 0, PX_W, PX_H)
      ctx.drawImage(mano ? arriba : quieto, 0, 1 - salto)
      raf = requestAnimationFrame(pintar)
    }
    raf = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(raf)
  }, [quieto, arriba, animo])

  return <canvas ref={ref} width={PX_W} height={PX_H} className={className}
    style={{ height: alto, width: 'auto', imageRendering: 'pixelated', display: 'block' }} aria-hidden />
}
