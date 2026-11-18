import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import type { Nivel } from '../../domain/niveles'
import { T, dibujarIsla, dibujarNube, generarIsla } from './islaPixel'
import { MINI_H, MINI_W, dibujarMini, opcionesDe } from './dibujo'

export type EstadoNodo = 'bloqueado' | 'abierto' | 'hecho'

const semillaDe = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0 }

const NUBES = [
  { x: 0.01, y: 0.1, w: 6, d: 46 }, { x: 0.78, y: 0.04, w: 7, d: 58 }, { x: 0.86, y: 0.78, w: 6, d: 52 },
  { x: 0.03, y: 0.86, w: 5, d: 40 }, { x: 0.5, y: 0.93, w: 4, d: 64 },
]

function useNubes() {
  return useMemo(() => [0, 1, 2].map(i => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 28
    dibujarNube(c.getContext('2d')!, 64, 28, 17 + i * 13)
    return c.toDataURL()
  }), [])
}

/** Mapa de niveles: una isla completa en pixel art que llena la pantalla (sin scroll). */
export function MapaPixel({ niveles, estados, estrellas, actual, avatar, rango, onElegir }: {
  niveles: Nivel[]; estados: EstadoNodo[]; estrellas: number[]; actual: number
  avatar: AvatarConfig; rango: Rango; onElegir: (i: number) => void
}) {
  const caja = useRef<HTMLDivElement>(null)
  const capa0 = useRef<HTMLCanvasElement>(null), capa1 = useRef<HTMLCanvasElement>(null)
  const mini = useRef<HTMLCanvasElement>(null)
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null)
  const nubes = useNubes()

  useLayoutEffect(() => {
    const el = caja.current
    if (!el) return
    let t: number | undefined
    const medir = () => setTam(prev => {
      const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight)
      return prev && Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 2 ? prev : { w, h }
    })
    medir()
    const ro = new ResizeObserver(() => { clearTimeout(t); t = window.setTimeout(medir, 120) })
    ro.observe(el)
    return () => { ro.disconnect(); clearTimeout(t) }
  }, [])

  // Escala entera: el pixel de la isla siempre es nítido y del mismo tamaño
  const s = !tam ? 1 : tam.w >= 2100 && tam.h >= 1100 ? 3 : tam.w >= 700 && tam.h >= 500 ? 2 : 1
  const cols = tam ? Math.ceil(tam.w / (T * s)) : 0
  const rows = tam ? Math.ceil(tam.h / (T * s)) : 0
  const semilla = semillaDe(niveles[0]?.id ?? 'isla')
  const isla = useMemo(() => (cols && rows ? generarIsla(cols, rows, niveles.length, semilla) : null), [cols, rows, niveles.length, semilla])

  useEffect(() => {
    if (!isla) return
    for (const [ref, f] of [[capa0, 0], [capa1, 1]] as const) {
      const cv = ref.current
      if (!cv) continue
      cv.width = isla.cols * T; cv.height = isla.rows * T
      dibujarIsla(cv.getContext('2d')!, isla, f)
    }
  }, [isla])

  const opts = useMemo(() => opcionesDe(avatar, rango), [avatar, rango])
  useEffect(() => {
    const cv = mini.current
    if (!cv) return
    dibujarMini(cv.getContext('2d')!, opts)
  }, [opts, isla])

  const W = cols * T * s, H = rows * T * s
  const offX = tam ? Math.floor((tam.w - W) / 2) : 0, offY = tam ? Math.floor((tam.h - H) / 2) : 0
  const escAv = Math.max(2, s)
  const pos = (n: { c: number; r: number }) => ({ left: (n.c + 0.5) * T * s, top: (n.r + 0.5) * T * s })

  return (
    <div className="isla-pixel" ref={caja} style={{ ['--s' as string]: s }}>
      {isla && (
        <div className="isla-lienzo" style={{ width: W, height: H, left: offX, top: offY }}>
          <canvas ref={capa0} className="isla-capa" style={{ width: W, height: H }} aria-hidden />
          <canvas ref={capa1} className="isla-capa isla-ola" style={{ width: W, height: H }} aria-hidden />
          {NUBES.map((n, i) => (
            <div key={i} className="isla-nube" aria-hidden style={{
              left: n.x * W, top: n.y * H, width: n.w * T * s, height: (n.w * T * s * 28) / 64,
              backgroundImage: `url(${nubes[i % nubes.length]})`, animationDuration: `${n.d}s`, animationDelay: `-${i * 7}s`,
            }} />
          ))}
          {isla.nodos.map((n, i) => {
            const e = estados[i], nv = niveles[i]
            if (!nv) return null
            return (
              <div key={nv.id} className={`isla-nodo ${e} ${i === actual ? 'actual' : ''}`} style={pos(n)}>
                {i === actual && (
                  <canvas ref={mini} className="isla-yo" width={MINI_W + 2} height={MINI_H + 2}
                    style={{ width: (MINI_W + 2) * escAv, height: (MINI_H + 2) * escAv }} aria-hidden />
                )}
                <button className="isla-boton nodo-etiqueta" onClick={() => onElegir(i)} disabled={e === 'bloqueado'}
                  aria-label={`Nivel ${nv.num}: ${nv.titulo}${e === 'bloqueado' ? ' (bloqueado)' : ''}`} title={nv.titulo}>
                  {e === 'bloqueado'
                    ? <svg viewBox="0 0 8 8" width="60%" height="60%" shapeRendering="crispEdges" aria-hidden><path d="M2 3V2h1V1h2v1h1v1h1v4H1V3h1zm1 0h2V2H3v1z" fill="currentColor" /></svg>
                    : nv.num}
                </button>
                {e === 'hecho' && <div className="isla-estrellas" aria-label={`${estrellas[i]} de 3 estrellas`}>
                  {[0, 1, 2].map(k => <i key={k} className={k < estrellas[i] ? 'on' : ''} />)}
                </div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
