import { useEffect, useRef } from 'react'
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

// ---- Caché de sprites: el mismo avatar se dibuja una sola vez aunque aparezca en muchas listas ----
const CACHE = new Map<string, { quieto: HTMLCanvasElement; arriba: HTMLCanvasElement }>()
function sprites(a: AvatarConfig, rango: Rango) {
  const clave = rango + '|' + JSON.stringify(a)
  let s = CACHE.get(clave)
  if (!s) {
    const opts = opcionesDe(a, rango)
    s = { quieto: sprite(opts, false), arriba: sprite(opts, true) }
    if (CACHE.size > 120) CACHE.delete(CACHE.keys().next().value!)
    CACHE.set(clave, s)
  }
  return s
}

// ---- Un solo reloj para todos los avatares (8 cuadros por segundo: es pixel art, no hace falta más) ----
type Pintor = (s: number) => void
const pintores = new Set<Pintor>()
let tick = 0
function suscribir(p: Pintor) {
  pintores.add(p)
  if (!tick) tick = window.setInterval(() => {
    if (document.hidden) return
    const s = performance.now() / 1000
    pintores.forEach(f => f(s))
  }, 125)
  return () => { pintores.delete(p); if (!pintores.size) { clearInterval(tick); tick = 0 } }
}

/**
 * Avatar en pixel art, dibujado por código (sin modelos 3D). Refleja el rango:
 * camisa caqui o blanca, saco verde petróleo del departamental, pañoleta de GM, torzal, galón y botones de clase.
 * Rendimiento: comparte sprites y un único temporizador; solo repinta si cambia el cuadro y si está a la vista.
 */
export function PixelAvatar({ a, rango = 'conquistador', animo = 'idle', alto = 180, className }: {
  a: AvatarConfig; rango?: Rango; animo?: 'idle' | 'saluda' | 'celebra' | 'voto'; alto?: number; className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const clave = rango + '|' + JSON.stringify(a)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const { quieto, arriba } = sprites(a, rango)
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fase = Math.random() * 6
    let visible = true, ultimo = ''
    const pintar = (t: number) => {
      if (!visible) return
      const s = t + fase
      const salto = reducir || animo === 'voto' ? 0 : animo === 'celebra' ? Math.round(Math.abs(Math.sin(s * 5)) * 3) : Math.round((Math.sin(s * 2) + 1) * 0.5)
      // al saludar, la mano sube y baja (dos cuadros), nunca un brazo extra
      const mano = animo === 'celebra' || animo === 'voto' || (animo === 'saluda' && Math.floor(s * 2.2) % 2 === 0)
      const cuadro = salto + (mano ? 'm' : '')
      if (cuadro === ultimo) return
      ultimo = cuadro
      ctx.clearRect(0, 0, PX_W, PX_H)
      ctx.drawImage(mano ? arriba : quieto, 0, 1 - salto)
    }
    pintar(performance.now() / 1000)
    const io = new IntersectionObserver(e => { visible = e[0]?.isIntersecting ?? true })
    io.observe(cv)
    const quitar = reducir ? () => undefined : suscribir(pintar)
    return () => { quitar(); io.disconnect() }
  }, [clave, animo]) // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} width={PX_W} height={PX_H} className={className}
    style={{ height: alto, width: 'auto', imageRendering: 'pixelated', display: 'block' }} aria-hidden />
}
