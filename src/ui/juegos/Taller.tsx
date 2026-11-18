import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Nivel } from '../../domain/niveles'
import type { Dificultad, PanelId, Pieza } from '../../domain/tipos'
import { esAdulto } from '../../domain/tipos'
import { evaluarPrecision, type Calidad } from '../../domain/puntuacion'
import { DIFICULTADES } from '../../domain/dificultad'
import { PiezaIcono, PiezaSVG, nombrePieza } from '../componentes/Insignias'
import { NOMBRE_PANEL, PanelFondo } from '../componentes/Paneles'
import { Toast } from '../componentes/Comunes'
import { Tablero, escalaActual, puntoEnPanel } from './Tablero'
import { useJuego } from '../estado'
import { sfx } from '../sonido'

interface ItemBandeja { id: string; pieza: Pieza; real: boolean }
interface Colocada { slot: number; x: number; y: number; calidad: Calidad; n: number }
interface Arrastre { item: ItemBandeja; cx: number; cy: number; lift: number; movido: boolean; x0: number; y0: number }
interface Flotante { id: number; texto: string; tipo: 'pts' | 'combo' }

const fmt = (n: number) => n.toFixed(1).replace('.', ',')
const FILA = new Set(['boton_clase', 'boton_liderazgo', 'barra_avanzada'])
const grupoDe = (p: Pieza) => p.grupo ?? p.key
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

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

export function Taller({ nivel, desafio, dificultad, apodo, club, onFin }: {
  nivel: Nivel; desafio: boolean; dificultad: Dificultad; apodo: string; club: string; onFin: (factores: number[], errores: number) => void
}) {
  const reglas = DIFICULTADES[dificultad]
  const pistas = !desafio || reglas.pistas
  const tol = desafio ? reglas.tolerancia : 1.6
  const slots = useMemo(() => nivel.objetivo(apodo, club), [nivel, apodo, club])
  const items = useMemo<ItemBandeja[]>(() => {
    const reales = slots.map((c, i) => ({ id: c.pieza.key + '#' + i, pieza: c.pieza, real: true }))
    const trampas = [...(nivel.distractores ?? []), ...(desafio && reglas.trampasExtra ? nivel.trampasLeyenda ?? [] : [])]
    const falsos = trampas.map((p, i) => ({ id: 'x' + i + p.key, pieza: { ...p, texto: p.texto ?? (p.tipo === 'tira_cargo' ? 'DIRECTOR' : undefined) }, real: false }))
    return [...reales, ...falsos].sort(() => Math.random() - 0.5)
  }, [slots, nivel, desafio, reglas.trampasExtra])
  const blanca = esAdulto(nivel.rango)

  const [colocadas, setColocadas] = useState<Record<string, Colocada>>({})
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set())
  const intentos = useRef<Record<string, number>>({})
  const factores = useRef<Record<string, number>>({})
  const [errores, setErrores] = useState(0)
  const [combo, setCombo] = useState(0)
  const [puntos, setPuntos] = useState(0)
  const [flotantes, setFlotantes] = useState<Flotante[]>([])
  const [toast, setToast] = useState<{ t: string; k: 'bien' | 'mal' | 'info'; n: number } | null>(null)
  const [drag, setDrag] = useState<Arrastre | null>(null)
  const [sel, setSel] = useState<ItemBandeja | null>(null)
  const [guia, setGuia] = useState<{ panel: PanelId; top: number; slot: number | null } | null>(null)
  const [sacudir, setSacudir] = useState<'mal' | 'golpe' | null>(null)
  const movil = useMovil()
  const [activo, setActivo] = useState<PanelId>(nivel.paneles.includes('pecho') ? 'pecho' : nivel.paneles[0])
  const visibles = movil && nivel.paneles.length > 1 ? [activo] : nivel.paneles
  const terminado = useRef(false)
  const contador = useRef(0)

  const ocupados = useMemo(() => new Set(Object.values(colocadas).map(c => c.slot)), [colocadas])
  const pendientes = items.filter(i => !colocadas[i.id] && !descartadas.has(i.id))
  const total = items.length
  const hechos = total - pendientes.length
  const valorPieza = (1000 / total) * (desafio ? reglas.multiplicador : 1)

  const avisar = (t: string, k: 'bien' | 'mal' | 'info') => setToast({ t, k, n: Date.now() })
  const flotar = (texto: string, tipo: Flotante['tipo']) => {
    const id = ++contador.current
    setFlotantes(f => [...f, { id, texto, tipo }])
    setTimeout(() => setFlotantes(f => f.filter(x => x.id !== id)), 1100)
  }

  const fallo = useCallback((it: ItemBandeja, msg: string) => {
    intentos.current[it.id] = (intentos.current[it.id] ?? 0) + 1
    setErrores(e => e + 1)
    setCombo(0)
    setSacudir('mal'); setTimeout(() => setSacudir(null), 400)
    sfx.mal()
    avisar(msg, 'mal')
  }, [])

  const acierto = useCallback((it: ItemBandeja, factor: number) => {
    const pen = (intentos.current[it.id] ?? 0) > 0 ? 0.6 : 1
    const f = factor * pen
    factores.current[it.id] = f
    const gana = Math.round(f * valorPieza)
    setPuntos(p => p + gana)
    setCombo(c => {
      const n = factor >= 0.99 && pen === 1 ? c + 1 : 0
      if (n >= 3) flotar(`¡Combo x${n}!`, 'combo')
      return n
    })
    flotar(`+${gana}`, 'pts')
    setSacudir('golpe'); setTimeout(() => setSacudir(null), 260)
    const st = useJuego.getState()
    st.reportarProgreso((Object.keys(factores.current).length) / total)
  }, [valorPieza, total])

  /** Decide a qué lugar iría la pieza si se suelta en ese punto (el "imán"). */
  const resolver = useCallback((it: ItemBandeja, panel: PanelId, x: number, y: number) => {
    const g = grupoDe(it.pieza)
    const libres = slots.map((s, i) => ({ s, i })).filter(({ s, i }) => grupoDe(s.pieza) === g && !ocupados.has(i))
    const enPanel = libres.filter(({ s }) => s.panel === panel)
    if (!enPanel.length) return { tipo: 'otroPanel' as const, regla: libres[0]?.s.regla ?? '' }
    const cerca = enPanel.reduce((a, b) => dist(x, y, a.s.x, a.s.y) <= dist(x, y, b.s.x, b.s.y) ? a : b)
    const s = cerca.s
    if (s.modo === 'precision') {
      const err = (y - s.pieza.h / 2) - (s.y - s.pieza.h / 2)
      return { tipo: 'precision' as const, slot: cerca.i, err, top: y - s.pieza.h / 2 }
    }
    if (FILA.has(s.pieza.tipo)) {
      // En una fila de botones gana el lugar más cercano entre TODOS los de esa fila.
      const fila = slots.map((o, i) => ({ o, i })).filter(({ o }) => o.panel === panel && o.pieza.tipo === s.pieza.tipo)
      const masCerca = fila.reduce((a, b) => dist(x, y, a.o.x, a.o.y) <= dist(x, y, b.o.x, b.o.y) ? a : b)
      const ok = masCerca.i === cerca.i && dist(x, y, s.x, s.y) <= 2.4 * tol
      return { tipo: ok ? 'ok' as const : 'posicion' as const, slot: cerca.i, regla: s.regla }
    }
    const dx = Math.max(0, Math.abs(x - s.x) - s.pieza.w / 2)
    const dy = Math.max(0, Math.abs(y - s.y) - s.pieza.h / 2)
    const margenIman = (2 + Math.max(s.pieza.w, s.pieza.h) * 0.12) * tol
    return { tipo: Math.hypot(dx, dy) <= margenIman ? 'ok' as const : 'posicion' as const, slot: cerca.i, regla: s.regla }
  }, [slots, ocupados, tol])

  const soltar = useCallback((it: ItemBandeja, cx: number, cy: number) => {
    const sobre = document.elementsFromPoint(cx, cy).find(el => (el as HTMLElement).closest?.('[data-descarte]'))
    if (sobre) {
      if (!it.real) {
        acierto(it, 1)
        setDescartadas(s => new Set(s).add(it.id))
        sfx.bien()
        avisar('¡Bien visto! Esa pieza no va aquí.', 'bien')
      } else fallo(it, `¡Esa sí va! ${slots.find(s => grupoDe(s.pieza) === grupoDe(it.pieza))?.regla ?? ''}`)
      return
    }
    const pt = puntoEnPanel(cx, cy)
    if (!pt) return
    if (!it.real) {
      fallo(it, `${nombrePieza(it.pieza)}: no va en este uniforme. Llévala a la caja "No va".`)
      return
    }
    const r = resolver(it, pt.panel, pt.x, pt.y)
    if (r.tipo === 'otroPanel') { fallo(it, `No va en ${NOMBRE_PANEL[pt.panel].toLowerCase()}. ${r.regla}`); return }
    if (r.tipo === 'posicion') { fallo(it, FILA.has(it.pieza.tipo) ? `Va en otra posición. ${r.regla}` : r.regla); return }
    const s = slots[r.slot]
    if (r.tipo === 'precision') {
      const ev = evaluarPrecision(r.err / tol)
      if (ev.calidad === 'fallo') { fallo(it, `Quedó a ${fmt(Math.max(0, r.top))} cm de la costura. ${s.regla}`); return }
      acierto(it, ev.factor)
      setColocadas(c => ({ ...c, [it.id]: { slot: r.slot, x: s.x, y: pt.y, calidad: ev.calidad, n: Date.now() } }))
      if (ev.calidad === 'perfecto') { sfx.perfecto(); avisar(`¡Perfecto! ${fmt(Math.max(0, r.top))} cm`, 'bien') }
      else { sfx.bien(); avisar(`${ev.calidad === 'bien' ? 'Bien' : 'Casi'}: te desviaste ${fmt(Math.abs(r.err))} cm`, 'info') }
      return
    }
    acierto(it, 1)
    setColocadas(c => ({ ...c, [it.id]: { slot: r.slot, x: s.x, y: s.y, calidad: 'perfecto', n: Date.now() } }))
    sfx.bien()
    if (!desafio) avisar(s.regla, 'bien')
  }, [acierto, fallo, desafio, resolver, slots, tol])

  useEffect(() => {
    if (pendientes.length === 0 && !terminado.current) {
      terminado.current = true
      const lista = items.map(i => factores.current[i.id] ?? 0)
      setTimeout(() => onFin(lista, errores), 750)
    }
  }, [pendientes.length, items, errores, onFin])

  useEffect(() => {
    if (!drag) return
    const mover = (e: PointerEvent) => {
      const movido = drag.movido || Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6
      setDrag(d => d && { ...d, cx: e.clientX, cy: e.clientY, movido })
      if (!movido) return
      const pt = puntoEnPanel(e.clientX, e.clientY - drag.lift)
      if (!pt) { setGuia(null); return }
      let slot: number | null = null
      if (pistas && drag.item.real) {
        const r = resolver(drag.item, pt.panel, pt.x, pt.y)
        slot = r.tipo === 'ok' || r.tipo === 'precision' ? r.slot : null
      }
      setGuia({ panel: pt.panel, top: pt.y - drag.item.pieza.h / 2, slot })
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
  }, [drag, soltar, resolver, pistas])

  const tomar = (it: ItemBandeja, e: React.PointerEvent) => {
    e.preventDefault()
    sfx.tomar()
    setDrag({ item: it, cx: e.clientX, cy: e.clientY, x0: e.clientX, y0: e.clientY, lift: e.pointerType === 'touch' ? 56 : 0, movido: false })
  }

  const clicPanel = (_p: PanelId, e: React.PointerEvent<SVGSVGElement>) => {
    if (sel) { soltar(sel, e.clientX, e.clientY); setSel(null) }
  }

  const esc = drag ? escalaActual() : 10
  const conRegla = (p: PanelId) => p === 'manga_der' || p === 'manga_izq' || p === 'banda'

  return (
    <div className={`taller ${sacudir === 'mal' ? 'sacudir' : ''} ${sacudir === 'golpe' ? 'golpe' : ''}`}>
      <div className="taller-barra">
        <div className="taller-progreso" aria-label={`${hechos} de ${total} piezas`}><div style={{ width: `${(hechos / total) * 100}%` }} /></div>
        <div className="marcador"><b>{puntos}</b> pts{combo >= 2 && <span className="combo">x{combo}</span>}</div>
      </div>

      {movil && nivel.paneles.length > 1 && (
        <div className="tabs-panel" role="tablist">
          {nivel.paneles.map(p => {
            const quedan = items.filter(i => i.real && !colocadas[i.id] && slots.some(s => s.panel === p && grupoDe(s.pieza) === grupoDe(i.pieza))).length
            return (
              <button key={p} role="tab" aria-selected={activo === p} className={activo === p ? 'on' : ''} onClick={() => { sfx.click(); setActivo(p) }}>
                {NOMBRE_PANEL[p]}{pistas && quedan > 0 && <i className="quedan">{quedan}</i>}
              </button>
            )
          })}
        </div>
      )}

      <Tablero paneles={visibles} onPanelClick={clicPanel} render={p => (
        <>
          <PanelFondo panel={p} blanca={blanca} regla={conRegla(p)} numeros={!desafio || reglas.reglaConNumeros} />
          {pistas && slots.map((s, i) => s.panel !== p || ocupados.has(i) ? null : (
            <g key={'h' + i} transform={`translate(${s.x},${s.y})`} className={`pista ${guia?.slot === i ? 'iman' : ''}`} data-grupo={grupoDe(s.pieza)}>
              <rect x={-s.pieza.w / 2} y={-s.pieza.h / 2} width={s.pieza.w} height={s.pieza.h} rx={Math.min(0.4, s.pieza.w * 0.05)} />
            </g>
          ))}
          {items.filter(i => colocadas[i.id] && slots[colocadas[i.id].slot].panel === p).sort((a, b) => colocadas[a.id].slot - colocadas[b.id].slot).map(i => {
            const c = colocadas[i.id]
            const s = slots[c.slot]
            const r = Math.min(4, Math.max(i.pieza.w, i.pieza.h) / 2)
            return (
              <g key={i.id + c.n} transform={`translate(${c.x},${c.y})`}>
                <g className="cae"><PiezaSVG p={i.pieza} /></g>
                <g className="polvo" aria-hidden>
                  <circle r={r * 0.9} className="onda" />
                  {[-1, -0.5, 0.5, 1].map(k => <circle key={k} cx={k * r * 0.7} cy={Math.min(i.pieza.h / 2, 4)} r={Math.max(0.18, r * 0.07)} style={{ ['--dx' as string]: `${k * r * 0.5}px` }} />)}
                </g>
                {s.modo === 'precision' && (
                  <g transform={`translate(${i.pieza.w / 2 + 0.4},${-i.pieza.h / 2})`} className="etiqueta-cm">
                    <rect x={0} y={-0.45} width={3.2} height={0.9} rx={0.45} fill={c.calidad === 'perfecto' ? '#1E9A4B' : c.calidad === 'bien' ? '#1F5FD1' : '#E07B00'} />
                    <text x={1.6} y={0.02} fontSize={0.58} fill="#fff" textAnchor="middle" dominantBaseline="central" fontFamily="Nunito" fontWeight={900}>{fmt(c.y - i.pieza.h / 2)} cm</text>
                  </g>
                )}
              </g>
            )
          })}
          {guia && guia.panel === p && conRegla(p) && (
            <g pointerEvents="none">
              <line x1={-0.6} x2={p === 'banda' ? 12 : 20} y1={guia.top} y2={guia.top} stroke="#FFC20E" strokeWidth={0.09} strokeDasharray="0.3 0.18" />
              <rect x={-3.1} y={guia.top - 0.55} width={2.6} height={1.1} rx={0.3} fill="#FFC20E" />
              <text x={-1.8} y={guia.top + 0.02} fontSize={0.66} textAnchor="middle" dominantBaseline="central" fontFamily="Nunito" fontWeight={900} fill="#1B2440">
                {!desafio || reglas.reglaConNumeros ? fmt(Math.max(0, guia.top)) : '?'}
              </text>
            </g>
          )}
        </>
      )} />

      <div className="flotantes" aria-hidden>
        {flotantes.map(f => <span key={f.id} className={`flotante ${f.tipo}`}>{f.texto}</span>)}
      </div>

      <div className="bandeja" aria-label="Piezas por colocar">
        <div className="caja-descarte" data-descarte>
          <svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          <span>No va</span>
        </div>
        <div className="bandeja-scroll">
          {pendientes.map(it => (
            <button key={it.id} className={`pieza-bandeja ${sel?.id === it.id ? 'sel' : ''} ${drag?.item.id === it.id && drag.movido ? 'fantasma' : ''}`}
              data-pieza={it.id} data-grupo={grupoDe(it.pieza)} data-falso={it.real ? undefined : '1'} onPointerDown={e => tomar(it, e)} aria-label={nombrePieza(it.pieza)}>
              <PiezaIcono p={it.pieza} size={58} />
              <span>{nombrePieza(it.pieza)}</span>
            </button>
          ))}
          {pendientes.length === 0 && <div className="bandeja-vacia">¡Listo!</div>}
        </div>
      </div>

      {sel && !drag && <div className="ayuda-sel">Toca el lugar donde va: <b>{nombrePieza(sel.pieza)}</b></div>}

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

