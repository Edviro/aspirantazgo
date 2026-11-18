import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Nivel } from '../../domain/niveles'
import type { Colocacion, PanelId, Pieza } from '../../domain/tipos'
import { esAdulto } from '../../domain/tipos'
import { evaluarPrecision, type Calidad } from '../../domain/puntuacion'
import { PiezaIcono, PiezaSVG, nombrePieza } from '../componentes/Insignias'
import { NOMBRE_PANEL, PanelFondo } from '../componentes/Paneles'
import { Toast } from '../componentes/Comunes'
import { Tablero, escalaActual, puntoEnPanel } from './Tablero'
import { sfx } from '../sonido'

interface ItemBandeja { id: string; pieza: Pieza; objetivo: Colocacion | null }
interface Colocada { x: number; y: number; calidad: Calidad; errCm: number }
interface Arrastre { item: ItemBandeja; cx: number; cy: number; lift: number; movido: boolean; x0: number; y0: number }

const fmt = (n: number) => n.toFixed(1).replace('.', ',')
const TOL_FILA = new Set(['boton_clase', 'boton_liderazgo', 'barra_avanzada'])

function useMovil() {
  const q = '(max-width: 820px)'
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const f = () => setM(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return m
}

export function Taller({ nivel, desafio, apodo, club, onFin }: {
  nivel: Nivel; desafio: boolean; apodo: string; club: string; onFin: (factores: number[], errores: number) => void
}) {
  const objetivo = useMemo(() => nivel.objetivo(apodo, club), [nivel, apodo, club])
  const items = useMemo<ItemBandeja[]>(() => {
    const reales = objetivo.map((c, i) => ({ id: c.pieza.key + '#' + i, pieza: c.pieza, objetivo: c }))
    const falsos = (nivel.distractores ?? []).map((p, i) => ({ id: 'x' + i + p.key, pieza: { ...p, texto: p.texto ?? (p.tipo === 'tira_cargo' ? 'DIRECTOR' : undefined) }, objetivo: null }))
    return [...reales, ...falsos].sort(() => Math.random() - 0.5)
  }, [objetivo, nivel.distractores])
  const blanca = esAdulto(nivel.rango)

  const [colocadas, setColocadas] = useState<Record<string, Colocada>>({})
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set())
  const intentos = useRef<Record<string, number>>({})
  const factores = useRef<Record<string, number>>({})
  const [errores, setErrores] = useState(0)
  const [toast, setToast] = useState<{ t: string; k: 'bien' | 'mal' | 'info'; n: number } | null>(null)
  const [drag, setDrag] = useState<Arrastre | null>(null)
  const [sel, setSel] = useState<ItemBandeja | null>(null)
  const [guia, setGuia] = useState<{ panel: PanelId; y: number; top: number } | null>(null)
  const [sacudir, setSacudir] = useState(false)
  const movil = useMovil()
  const [activo, setActivo] = useState<PanelId>(nivel.paneles.includes('pecho') ? 'pecho' : nivel.paneles[0])
  const visibles = movil && nivel.paneles.length > 1 ? [activo] : nivel.paneles
  const terminado = useRef(false)

  const pendientes = items.filter(i => !colocadas[i.id] && !descartadas.has(i.id))
  const total = items.length
  const hechos = total - pendientes.length

  const avisar = (t: string, k: 'bien' | 'mal' | 'info') => setToast({ t, k, n: Date.now() })

  const fallo = useCallback((it: ItemBandeja, msg: string) => {
    intentos.current[it.id] = (intentos.current[it.id] ?? 0) + 1
    setErrores(e => e + 1)
    setSacudir(true); setTimeout(() => setSacudir(false), 400)
    sfx.mal()
    avisar(msg, 'mal')
  }, [])

  const acierto = useCallback((it: ItemBandeja, factor: number) => {
    const pen = (intentos.current[it.id] ?? 0) > 0 ? 0.6 : 1
    factores.current[it.id] = factor * pen
  }, [])

  const soltar = useCallback((it: ItemBandeja, cx: number, cy: number) => {
    const sobre = document.elementsFromPoint(cx, cy).find(el => (el as HTMLElement).closest?.('[data-descarte]'))
    if (sobre) {
      if (!it.objetivo) {
        acierto(it, 1)
        setDescartadas(s => new Set(s).add(it.id))
        sfx.bien()
        avisar('¡Bien visto! Esa pieza no va en este uniforme.', 'bien')
      } else fallo(it, `¡Esa sí va! ${it.objetivo.regla}`)
      return
    }
    const pt = puntoEnPanel(cx, cy)
    if (!pt) return
    if (!it.objetivo) {
      fallo(it, `${nombrePieza(it.pieza)}: esta pieza NO va en el uniforme de este rango. Llévala a la caja "No va".`)
      return
    }
    const o = it.objetivo
    if (o.panel !== pt.panel) {
      fallo(it, `No va en ${NOMBRE_PANEL[pt.panel].toLowerCase()}. ${o.regla}`)
      return
    }
    if (o.modo === 'precision') {
      const topSoltado = pt.y - o.pieza.h / 2
      const topObjetivo = o.y - o.pieza.h / 2
      const err = topSoltado - topObjetivo
      const ev = evaluarPrecision(err)
      if (ev.calidad === 'fallo') {
        fallo(it, `Quedó a ${fmt(Math.max(0, topSoltado))} cm de la costura. ${o.regla}`)
        return
      }
      acierto(it, ev.factor)
      setColocadas(c => ({ ...c, [it.id]: { x: o.x, y: pt.y, calidad: ev.calidad, errCm: err } }))
      if (ev.calidad === 'perfecto') { sfx.perfecto(); avisar(`¡Perfecto! ${fmt(Math.max(0, topSoltado))} cm`, 'bien') }
      else { sfx.bien(); avisar(`${ev.calidad === 'bien' ? 'Bien' : 'Casi'}: te desviaste ${fmt(Math.abs(err))} cm`, 'info') }
      return
    }
    const tol = TOL_FILA.has(o.pieza.tipo) ? 0.95 : 1.4
    const dentro = Math.abs(pt.x - o.x) <= o.pieza.w / 2 * (TOL_FILA.has(o.pieza.tipo) ? 0 : 1) + tol
      && Math.abs(pt.y - o.y) <= o.pieza.h / 2 * (TOL_FILA.has(o.pieza.tipo) ? 0 : 1) + tol
    if (!dentro) {
      fallo(it, TOL_FILA.has(o.pieza.tipo) ? `Va en otra posición. ${o.regla}` : o.regla)
      return
    }
    acierto(it, 1)
    setColocadas(c => ({ ...c, [it.id]: { x: o.x, y: o.y, calidad: 'perfecto', errCm: 0 } }))
    sfx.bien()
    if (!desafio) avisar(o.regla, 'bien')
  }, [acierto, fallo, desafio])

  // Fin del reto
  useEffect(() => {
    if (pendientes.length === 0 && !terminado.current) {
      terminado.current = true
      const lista = items.map(i => factores.current[i.id] ?? 0)
      setTimeout(() => onFin(lista, errores), 650)
    }
  }, [pendientes.length, items, errores, onFin])

  // Arrastre global
  useEffect(() => {
    if (!drag) return
    const mover = (e: PointerEvent) => {
      const movido = drag.movido || Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6
      setDrag(d => d && { ...d, cx: e.clientX, cy: e.clientY, movido })
      if (!movido) return
      const pt = puntoEnPanel(e.clientX, e.clientY - drag.lift)
      const o = drag.item.objetivo
      if (pt && (pt.panel === 'manga_der' || pt.panel === 'manga_izq' || pt.panel === 'banda')) {
        const top = pt.y - drag.item.pieza.h / 2
        setGuia({ panel: pt.panel, y: pt.y, top })
      } else setGuia(null)
      void o
    }
    const fin = (e: PointerEvent) => {
      setGuia(null)
      if (drag.movido) soltar(drag.item, e.clientX, e.clientY - drag.lift)
      else setSel(s => (s?.id === drag.item.id ? null : drag.item))
      setDrag(null)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', fin)
    window.addEventListener('pointercancel', fin)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', fin)
      window.removeEventListener('pointercancel', fin)
    }
  }, [drag, soltar])

  const tomar = (it: ItemBandeja, e: React.PointerEvent) => {
    e.preventDefault()
    sfx.tomar()
    setDrag({ item: it, cx: e.clientX, cy: e.clientY, x0: e.clientX, y0: e.clientY, lift: e.pointerType === 'touch' ? 56 : 0, movido: false })
  }

  const clicPanel = (_p: PanelId, e: React.PointerEvent<SVGSVGElement>) => {
    if (sel) { soltar(sel, e.clientX, e.clientY); setSel(null) }
  }

  const esc = drag ? escalaActual() : 10

  return (
    <div className={`taller ${sacudir ? 'sacudir' : ''}`}>
      <div className="taller-progreso"><div style={{ width: `${(hechos / total) * 100}%` }} /></div>

      {movil && nivel.paneles.length > 1 && (
        <div className="tabs-panel" role="tablist">
          {nivel.paneles.map(p => (
            <button key={p} role="tab" aria-selected={activo === p} className={activo === p ? 'on' : ''} onClick={() => { sfx.click(); setActivo(p) }}>
              {NOMBRE_PANEL[p]}
            </button>
          ))}
        </div>
      )}

      <Tablero paneles={visibles} onPanelClick={clicPanel} render={p => (
        <>
          <PanelFondo panel={p} blanca={blanca} regla={p !== 'pecho'} />
          {!desafio && items.filter(i => i.objetivo?.panel === p && !colocadas[i.id]).map(i => (
            <g key={'h' + i.id} transform={`translate(${i.objetivo!.x},${i.objetivo!.y})`} opacity={0.7} className="pista" data-pieza={i.id}>
              <rect x={-i.pieza.w / 2} y={-i.pieza.h / 2} width={i.pieza.w} height={i.pieza.h} rx={0.2} fill="none" stroke="#7A4A00" strokeWidth={0.14} strokeDasharray="0.3 0.2" />
              <rect x={-i.pieza.w / 2} y={-i.pieza.h / 2} width={i.pieza.w} height={i.pieza.h} rx={0.2} fill="#7A4A00" opacity={0.18} />
            </g>
          ))}
          {items.filter(i => colocadas[i.id] && i.objetivo?.panel === p).map(i => {
            const c = colocadas[i.id]
            return (
              <g key={i.id} transform={`translate(${c.x},${c.y})`} className="colocada">
                <PiezaSVG p={i.pieza} />
                {i.objetivo?.modo === 'precision' && (
                  <g transform={`translate(${i.pieza.w / 2 + 0.4},${-i.pieza.h / 2})`}>
                    <rect x={0} y={-0.45} width={3.2} height={0.9} rx={0.45} fill={c.calidad === 'perfecto' ? '#1E9A4B' : c.calidad === 'bien' ? '#1F5FD1' : '#E07B00'} />
                    <text x={1.6} y={0.02} fontSize={0.58} fill="#fff" textAnchor="middle" dominantBaseline="central" fontFamily="Nunito" fontWeight={900}>{fmt(c.y - i.pieza.h / 2)} cm</text>
                  </g>
                )}
              </g>
            )
          })}
          {guia && guia.panel === p && (
            <g pointerEvents="none">
              <line x1={-0.6} x2={p === 'banda' ? 12 : 20} y1={guia.top} y2={guia.top} stroke="#FFC20E" strokeWidth={0.09} strokeDasharray="0.3 0.18" />
              <rect x={-3.1} y={guia.top - 0.55} width={2.6} height={1.1} rx={0.3} fill="#FFC20E" />
              <text x={-1.8} y={guia.top + 0.02} fontSize={0.66} textAnchor="middle" dominantBaseline="central" fontFamily="Nunito" fontWeight={900} fill="#1B2440">{fmt(Math.max(0, guia.top))}</text>
            </g>
          )}
        </>
      )} />

      <div className="bandeja" aria-label="Piezas por colocar">
        <div className="caja-descarte" data-descarte>
          <svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          <span>No va</span>
        </div>
        <div className="bandeja-scroll">
          {pendientes.map(it => (
            <button key={it.id} className={`pieza-bandeja ${sel?.id === it.id ? 'sel' : ''} ${drag?.item.id === it.id && drag.movido ? 'fantasma' : ''}`}
              data-pieza={it.id} data-falso={it.objetivo ? undefined : '1'} onPointerDown={e => tomar(it, e)} aria-label={nombrePieza(it.pieza)}>
              <PiezaIcono p={it.pieza} size={58} />
              <span>{nombrePieza(it.pieza)}</span>
            </button>
          ))}
          {pendientes.length === 0 && <div className="bandeja-vacia">¡Uniforme completo!</div>}
        </div>
      </div>

      {sel && !drag && <div className="ayuda-sel">Toca el lugar del uniforme donde va: <b>{nombrePieza(sel.pieza)}</b></div>}

      {drag?.movido && (
        <div className="arrastre" style={{ left: drag.cx, top: drag.cy - drag.lift }}>
          <svg viewBox={`${-drag.item.pieza.w / 2} ${-drag.item.pieza.h / 2} ${drag.item.pieza.w} ${drag.item.pieza.h}`}
            width={drag.item.pieza.w * esc} height={drag.item.pieza.h * esc} style={{ overflow: 'visible' }}>
            <PiezaSVG p={drag.item.pieza} />
          </svg>
        </div>
      )}

      {toast && <Toast key={toast.n} texto={toast.t} tipo={toast.k} onFin={() => setToast(null)} />}
    </div>
  )
}
