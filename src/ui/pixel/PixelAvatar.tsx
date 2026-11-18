import { useEffect, useRef } from 'react'
import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { PX_H, PX_W, dibujarAvatar, opcionesDe } from './dibujo'

/**
 * Avatar en pixel art, dibujado por código en un <canvas> (sin modelos 3D).
 * Liviano y crocante en cualquier tamaño. Una animación suave de "respiración" o saludo.
 */
export function PixelAvatar({ a, rango = 'conquistador', animo = 'idle', alto = 180, className }: {
  a: AvatarConfig; rango?: Rango; animo?: 'idle' | 'saluda' | 'celebra'; alto?: number; className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const opts = opcionesDe(a, rango)
    let raf = 0
    const fase = Math.random() * 6
    const pintar = (t: number) => {
      const s = t / 1000 + fase
      const salto = animo === 'celebra' ? Math.abs(Math.sin(s * 5)) * 3 : Math.sin(s * 2) * 0.6
      ctx.clearRect(0, 0, PX_W, PX_H + 4)
      ctx.save()
      ctx.translate(0, -Math.round(salto))
      dibujarAvatar(ctx, opts)
      if (animo === 'saluda' || animo === 'celebra') {
        // brazo derecho levantado (bloques)
        ctx.fillStyle = '#F3F1EA'; ctx.fillRect(35, 20, 4, 9)
        ctx.fillStyle = opts.piel !== undefined ? ['#F3D1B5', '#E8B793', '#D39A73', '#B87A55', '#8A5A3C', '#5E3B26'][opts.piel] : '#D39A73'
        ctx.fillRect(36, 17, 3, 4)
      }
      ctx.restore()
      raf = requestAnimationFrame(pintar)
    }
    raf = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(raf)
  }, [a, rango, animo])
  return <canvas ref={ref} width={PX_W} height={PX_H} className={className}
    style={{ height: alto, width: 'auto', imageRendering: 'pixelated', display: 'block' }} aria-hidden />
}
