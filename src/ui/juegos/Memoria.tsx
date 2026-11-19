import { useEffect, useMemo, useRef, useState } from 'react'
import { PAREJAS_UNIFORME, repartir } from '../../domain/memoria'
import { azar } from '../../domain/azar'
import type { Dificultad } from '../../domain/tipos'
import { PiezaIcono } from '../componentes/Insignias'
import { useJuego } from '../estado'
import { sfx } from '../sonido'

const PAREJAS: Record<Dificultad, number> = { facil: 4, medio: 6, leyenda: 8 }

/** Memoria: voltea dos cartas y une cada pieza con el lugar exacto donde va. */
export function Memoria({ dificultad, semilla, onFin }: { dificultad: Dificultad; semilla: number | null; onFin: (f: number[], e: number) => void }) {
  const cartas = useMemo(() => repartir(PAREJAS[dificultad], semilla ? azar(semilla) : Math.random), [dificultad, semilla])
  const porId = useMemo(() => Object.fromEntries(PAREJAS_UNIFORME.map(p => [p.id, p])), [])
  const [abiertas, setAbiertas] = useState<number[]>([])
  const [halladas, setHalladas] = useState<Set<string>>(new Set())
  const [fallo, setFallo] = useState<number[]>([])
  const [intentos, setIntentos] = useState(0)
  const fallos = useRef<Record<string, number>>({})
  const vistas = useRef(new Set<string>())
  const terminado = useRef(false)
  const pausado = useJuego(s => s.pausado)
  const total = cartas.length / 2

  useEffect(() => {
    if (halladas.size === total && !terminado.current) {
      terminado.current = true
      const factores = Object.keys(porId).filter(id => halladas.has(id)).map(id => Math.max(0.35, 1 - 0.2 * (fallos.current[id] ?? 0)))
      setTimeout(() => onFin(factores, 0), 700)
    }
  }, [halladas, total, porId, onFin])

  const tocar = (i: number) => {
    if (pausado || abiertas.length === 2 || abiertas.includes(i) || halladas.has(cartas[i].pareja)) return
    sfx.tomar()
    const nuevas = [...abiertas, i]
    setAbiertas(nuevas)
    if (nuevas.length < 2) return
    const [a, b] = nuevas.map(k => cartas[k])
    setIntentos(n => n + 1)
    if (a.pareja === b.pareja && a.cara !== b.cara) {
      sfx.perfecto()
      setTimeout(() => {
        setHalladas(h => { const n = new Set(h); n.add(a.pareja); useJuego.getState().reportarProgreso(n.size / total); return n })
        setAbiertas([])
      }, 380)
    } else {
      // Solo cuenta como error si ya habías visto alguna de las dos (si no, es pura exploración)
      for (const c of [a, b]) if (vistas.current.has(c.clave)) fallos.current[c.pareja] = (fallos.current[c.pareja] ?? 0) + 1
      sfx.mal()
      setFallo(nuevas)
      setTimeout(() => { setAbiertas([]); setFallo([]) }, 950)
    }
    for (const c of [a, b]) vistas.current.add(c.clave)
  }

  return (
    <div className="memoria">
      <div className="memoria-datos">
        <span>{halladas.size} de {total} parejas</span>
        <span>{intentos} intentos</span>
      </div>
      <div className={`memoria-tablero n${cartas.length}`}>
        {cartas.map((c, i) => {
          const p = porId[c.pareja]
          const hallada = halladas.has(c.pareja)
          const vuelta = hallada || abiertas.includes(i)
          return (
            <button key={c.clave} className={`carta ${vuelta ? 'vuelta' : ''} ${hallada ? 'hallada' : ''} ${fallo.includes(i) ? 'fallo' : ''}`}
              onClick={() => tocar(i)} aria-label={vuelta ? (c.cara === 'pieza' ? 'Pieza' : p.lugar) : `Carta ${i + 1}, boca abajo`} disabled={hallada}>
              <span className="carta-dorso" aria-hidden><i /></span>
              <span className="carta-cara" aria-hidden={!vuelta}>
                {c.cara === 'pieza'
                  ? <PiezaIcono p={p.pieza} size={p.pieza.w / p.pieza.h > 2.2 ? 92 : 62} />
                  : <b>{p.lugar}</b>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
