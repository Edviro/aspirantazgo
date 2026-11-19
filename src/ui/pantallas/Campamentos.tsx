import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useJuego } from '../estado'
import { musica } from '../musica'
import { sfx } from '../sonido'
import { Boton } from '../componentes/Comunes'
import { HudVidas } from '../componentes/Vidas'
import { Travesia } from '../componentes/Travesia'
import { CAMPAMENTOS, CAMPAMENTO_CENTRAL, centralAbierto, progresoCampamento, type Campamento } from '../../domain/campamentos'
import { dibujarMundo, type Central, type IslaCamp } from '../pixel/mundoPixel'

/**
 * El mapa de todos los campamentos. Al centro el Gran Campamento Conquistador (triángulo del emblema);
 * alrededor, los seis campamentos. Se viaja entre ellos en barquito.
 */
export default function Campamentos() {
  const { puntajes, ir, setMundo, mundo } = useJuego()
  useEffect(() => { musica('mapa') }, [])
  const caja = useRef<HTMLDivElement>(null)
  const lienzo0 = useRef<HTMLCanvasElement>(null), lienzo1 = useRef<HTMLCanvasElement>(null)
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null)
  const actual = CAMPAMENTOS.find(c => c.mundo === mundo) ?? CAMPAMENTOS[0]
  const [sel, setSel] = useState<Campamento>(actual)
  const [viaje, setViaje] = useState<Campamento | null>(null)

  useLayoutEffect(() => {
    const el = caja.current
    if (!el) return
    let t = 0
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight })
    medir()
    const ro = new ResizeObserver(() => { clearTimeout(t); t = window.setTimeout(medir, 120) })
    ro.observe(el)
    return () => { ro.disconnect(); clearTimeout(t) }
  }, [])

  const progreso = useMemo(() => new Map(CAMPAMENTOS.map(c => [c.id, progresoCampamento(c, puntajes)])), [puntajes])
  const abiertoCentral = centralAbierto(puntajes)

  // Geometría (en pixeles lógicos): escala entera para que el pixel art se vea nítido
  const geo = useMemo(() => {
    if (!tam) return null
    const s = Math.max(2, Math.round(Math.min(tam.w, tam.h) / 150))
    const W = Math.ceil(tam.w / s), H = Math.ceil(tam.h / s)
    const vertical = H > W
    // En pantalla ancha el panel va a la derecha encima del mar: el anillo se corre a la izquierda
    const reserva = tam.w >= 740 ? Math.ceil(390 / s) : 0
    const Wu = W - reserva
    const cx = Wu / 2, cy = H * (vertical ? 0.49 : 0.5)
    const rx = Wu * (vertical ? 0.33 : 0.3), ry = H * (vertical ? 0.31 : 0.35)
    const r = Math.min(Wu, H) * (vertical ? 0.12 : 0.1)
    const camps: (IslaCamp & { c: Campamento })[] = CAMPAMENTOS.map((c, i) => {
      const a = (-90 + i * 60) * Math.PI / 180
      const pr = progreso.get(c.id)!
      return { c, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, r, color: c.color, bloqueado: pr.estado === 'pronto', completo: pr.estado === 'completo' }
    })
    const central: Central = { x: cx, y: cy - Math.min(Wu, H) * 0.03, R: Math.min(Wu, H) * (vertical ? 0.2 : 0.19), bloqueado: !abiertoCentral }
    return { s, W, H, camps, central }
  }, [tam, progreso, abiertoCentral])

  useEffect(() => {
    if (!geo) return
    for (const [ref, f] of [[lienzo0, 0], [lienzo1, 1]] as const) {
      const cv = ref.current
      if (!cv) continue
      cv.width = geo.W; cv.height = geo.H
      dibujarMundo(cv.getContext('2d')!, geo.W, geo.H, geo.camps, geo.central, f)
    }
  }, [geo])

  const elegir = (c: Campamento) => { sfx.click(); setSel(c) }
  const viajar = (c: Campamento) => { if (!c.mundo) return; sfx.zas(); setViaje(c) }
  const llegar = () => { if (viaje?.mundo) { setMundo(viaje.mundo); ir('mapa') } }
  const indice = [...CAMPAMENTOS, CAMPAMENTO_CENTRAL].findIndex(c => c.id === sel.id)
  const mover = (d: number) => { const l = [...CAMPAMENTOS, CAMPAMENTO_CENTRAL]; elegir(l[(indice + d + l.length) % l.length]) }
  const pr = sel.id === CAMPAMENTO_CENTRAL.id ? null : progreso.get(sel.id)!
  const pos = (x: number, y: number) => (geo ? { left: x * geo.s, top: y * geo.s } : {})

  return (
    <div className="pantalla campamentos">
      <header className="hud">
        <button className="icono" onClick={() => ir('mapa')} aria-label="Volver a mi campamento">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="campamentos-titulo"><small>Mapa de</small><strong>Campamentos</strong></div>
        <HudVidas />
      </header>

      <div className="mundo-pixel" ref={caja}>
        {geo && (
          <>
            <canvas ref={lienzo0} className="mundo-capa" style={{ width: geo.W * geo.s, height: geo.H * geo.s }} aria-hidden />
            <canvas ref={lienzo1} className="mundo-capa isla-ola" style={{ width: geo.W * geo.s, height: geo.H * geo.s }} aria-hidden />
            {geo.camps.map(({ c, x, y, r }) => {
              const p = progreso.get(c.id)!
              return (
                <button key={c.id} className={`mundo-isla ${p.estado} ${sel.id === c.id ? 'sel' : ''}`} style={{ ...pos(x, y), width: r * 2 * geo.s, height: r * 2 * geo.s, ['--c' as string]: c.color }}
                  onClick={() => elegir(c)} aria-label={`${c.nombre}: ${p.estado === 'pronto' ? 'próximamente' : `${p.hechos} de ${p.total} niveles`}`}>
                  <span className="mundo-etiqueta">{c.corto}{p.estado === 'pronto' ? ' 🔒' : p.estado === 'completo' ? ' ★' : ''}</span>
                </button>
              )
            })}
            <button className={`mundo-isla central ${abiertoCentral ? 'abierto' : 'pronto'} ${sel.id === CAMPAMENTO_CENTRAL.id ? 'sel' : ''}`}
              style={{ ...pos(geo.central.x, geo.central.y + geo.central.R / 4), width: geo.central.R * 1.75 * geo.s, height: geo.central.R * 1.5 * geo.s }}
              onClick={() => elegir(CAMPAMENTO_CENTRAL)} aria-label={`${CAMPAMENTO_CENTRAL.nombre}: ${abiertoCentral ? 'abierto' : 'se abre al completar todos los campamentos'}`}>
              <span className="mundo-etiqueta central">{CAMPAMENTO_CENTRAL.corto}{abiertoCentral ? '' : ' 🔒'}</span>
            </button>
          </>
        )}
      </div>

      <section className="mundo-panel" style={{ ['--c' as string]: sel.color }}>
        <div className="mundo-panel-nav">
          <button className="icono" onClick={() => mover(-1)} aria-label="Campamento anterior">‹</button>
          <div className="mundo-panel-tit">
            <strong>{sel.nombre}</strong>
            {pr && pr.estado !== 'pronto' && <span className="mundo-avance"><i style={{ width: `${(pr.hechos / Math.max(1, pr.total)) * 100}%` }} /><small>{pr.hechos} de {pr.total} niveles</small></span>}
          </div>
          <button className="icono" onClick={() => mover(1)} aria-label="Campamento siguiente">›</button>
        </div>
        <p>{sel.descripcion}</p>
        {sel.mundo
          ? <Boton onClick={() => viajar(sel)}>{sel.mundo === mundo ? 'Volver a este campamento' : `⛵ Ir al ${sel.nombre}`}</Boton>
          : <Boton tipo="fantasma" disabled>{sel.id === CAMPAMENTO_CENTRAL.id ? '🔒 Completa todos los campamentos' : '🔒 Próximamente'}</Boton>}
        <div className="mundo-chips" role="tablist" aria-label="Campamentos">
          {[...CAMPAMENTOS, CAMPAMENTO_CENTRAL].map(c => {
            const p = c.id === CAMPAMENTO_CENTRAL.id ? null : progreso.get(c.id)!
            return <button key={c.id} role="tab" aria-selected={sel.id === c.id} className={sel.id === c.id ? 'on' : ''} style={{ ['--c' as string]: c.color }} onClick={() => elegir(c)}>
              <i aria-hidden />{c.corto}{(!p ? !abiertoCentral : p.estado === 'pronto') ? ' 🔒' : ''}
            </button>
          })}
        </div>
      </section>

      {viaje && <Travesia destino={viaje.nombre} color={viaje.color} onFin={llegar} />}
    </div>
  )
}
