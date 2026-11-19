import { useEffect, useMemo, useRef, useState } from 'react'
import type { Nivel } from '../../domain/niveles'
import { sembrarErrores } from '../../domain/inspector'
import { esAdulto, type Colocacion, type Dificultad, type Rango } from '../../domain/tipos'
import { DIFICULTADES } from '../../domain/dificultad'
import { azar } from '../../domain/azar'
import { useJuego } from '../estado'
import { PiezaSVG } from '../componentes/Insignias'
import { NOMBRE_PANEL, PanelFondo } from '../componentes/Paneles'
import { Toast } from '../componentes/Comunes'
import { Tablero } from './Tablero'
import { sfx } from '../sonido'


export function Inspector({ nivel, base, fijas = [], rango, dificultad, semilla, onFin }: {
  nivel: Nivel; base: Colocacion[]; fijas?: Colocacion[]; rango: Rango; dificultad: Dificultad; semilla: number | null; onFin: (factores: number[], errores: number) => void
}) {
  const reglas = DIFICULTADES[dificultad]
  const LIMITE = Math.round(75 * reglas.tiempo)
  const { uniforme, errores } = useMemo(
    () => sembrarErrores(base, rango, Math.max(2, (nivel.errores ?? 4) + reglas.erroresExtra), semilla ? azar(semilla + 7) : Math.random),
    [base, rango, nivel.errores, reglas.erroresExtra, semilla])
  const [hallados, setHallados] = useState<Set<number>>(new Set())
  const [fallos, setFallos] = useState(0)
  const [marcasMal, setMarcasMal] = useState<number[]>([])
  const [toast, setToast] = useState<{ t: string; k: 'bien' | 'mal'; n: number } | null>(null)
  const [resta, setResta] = useState(LIMITE)
  const [activo, setActivo] = useState(nivel.paneles[1] ?? nivel.paneles[0])
  const movil = window.matchMedia('(max-width: 820px)').matches
  const visibles = movil ? [activo] : nivel.paneles
  const fin = useRef(false)

  const terminar = (h: Set<number>, f: number) => {
    if (fin.current) return
    fin.current = true
    const factores = errores.map((_, i) => (h.has(i) ? 1 : 0))
    setTimeout(() => onFin(factores, f), 900)
  }

  const vivo = useRef({ hallados, fallos })
  vivo.current = { hallados, fallos }
  useEffect(() => {
    const t = setInterval(() => setResta(r => {
      if (useJuego.getState().pausado) return r
      if (r <= 1) { clearInterval(t); terminar(vivo.current.hallados, vivo.current.fallos); return 0 }
      return r - 1
    }), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tocar = (i: number) => {
    if (fin.current) return
    const e = errores.findIndex(er => er.indices.includes(i))
    if (e >= 0) {
      if (hallados.has(e)) return
      const h = new Set(hallados).add(e)
      setHallados(h)
      useJuego.getState().reportarProgreso(h.size / errores.length)
      sfx.perfecto()
      setToast({ t: errores[e].explicacion, k: 'bien', n: Date.now() })
      if (h.size === errores.length) terminar(h, fallos)
    } else {
      setFallos(f => f + 1)
      setMarcasMal(m => [...m, i])
      setTimeout(() => setMarcasMal(m => m.filter(x => x !== i)), 700)
      sfx.mal()
      setToast({ t: 'Esa pieza está bien puesta. ¡Sigue buscando!', k: 'mal', n: Date.now() })
    }
  }

  const piezasMal = new Set(errores.flatMap((e, k) => (hallados.has(k) ? e.indices : [])))

  return (
    <div className="taller inspector">
      <div className="inspector-barra">
        <div className="lupa">🔎 {hallados.size} / {errores.length} errores</div>
        <div className={`reloj ${resta <= 10 ? 'urgente' : ''}`}>{resta}s</div>
      </div>
      {movil && (
        <div className="tabs-panel" role="tablist">
          {nivel.paneles.map(p => (
            <button key={p} role="tab" aria-selected={activo === p} className={activo === p ? 'on' : ''} onClick={() => setActivo(p)}>{NOMBRE_PANEL[p]}</button>
          ))}
        </div>
      )}
      <Tablero paneles={visibles} render={p => (
        <>
          <PanelFondo panel={p} blanca={esAdulto(rango)} regla={false} />
          {fijas.filter(f => f.panel === p).map((f, i) => <g key={'fija' + i} transform={`translate(${f.x},${f.y})`} className="pieza-fija" aria-hidden><PiezaSVG p={f.pieza} /></g>)}
          {uniforme.map((c, i) => c.panel !== p ? null : (
            <g key={i} transform={`translate(${c.x},${c.y})`} className={`tocable ${marcasMal.includes(i) ? 'tiembla' : ''}`}
              onPointerDown={e => { e.stopPropagation(); tocar(i) }}>
              <rect x={-c.pieza.w / 2 - 0.3} y={-c.pieza.h / 2 - 0.3} width={c.pieza.w + 0.6} height={c.pieza.h + 0.6} fill="transparent" />
              <PiezaSVG p={c.pieza} />
              {piezasMal.has(i) && (
                <g>
                  <rect x={-c.pieza.w / 2 - 0.25} y={-c.pieza.h / 2 - 0.25} width={c.pieza.w + 0.5} height={c.pieza.h + 0.5} rx={0.3} fill="none" stroke="#D7242F" strokeWidth={0.22} />
                  <circle cx={c.pieza.w / 2} cy={-c.pieza.h / 2} r={0.6} fill="#D7242F" />
                  <path d={`M${c.pieza.w / 2 - 0.25},${-c.pieza.h / 2 - 0.25} l0.5,0.5 m0,-0.5 l-0.5,0.5`} stroke="#fff" strokeWidth={0.14} />
                </g>
              )}
            </g>
          ))}
        </>
      )} />
      {toast && <Toast key={toast.n} texto={toast.t} tipo={toast.k} onFin={() => setToast(null)} />}
    </div>
  )
}
