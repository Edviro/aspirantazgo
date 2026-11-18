import { useMemo, useRef, useState } from 'react'
import type { RondaFrase } from '../../domain/aspirantazgo'
import { azar } from '../../domain/azar'
import type { Dificultad } from '../../domain/tipos'
import { useJuego } from '../estado'
import { sfx } from '../sonido'

/** Armar frases tocando las piezas en orden (voto, ley). En Leyenda aparecen piezas trampa. */
export function Frase({ rondas, dificultad, semilla, onFin }: {
  rondas: RondaFrase[]; dificultad: Dificultad; semilla: number | null; onFin: (f: number[], e: number) => void
}) {
  const rnd = useMemo(() => (semilla ? azar(semilla) : Math.random), [semilla])
  const [r, setR] = useState(0)
  const [hechas, setHechas] = useState<number[]>([])
  const [mal, setMal] = useState<string | null>(null)
  const [quitadas, setQuitadas] = useState<Set<string>>(new Set())
  const errores = useRef(0)
  const fallos = useRef(0)
  const factores = useRef<number[]>([])
  const ronda = rondas[r]
  const conTrampas = dificultad !== 'facil'

  const fichas = useMemo(() => {
    const reales = ronda.piezas.map((t, i) => ({ t, i, falsa: false }))
    const falsas = conTrampas ? (ronda.trampas ?? []).map((t, k) => ({ t, i: -1 - k, falsa: true })) : []
    return [...reales, ...falsas].sort(() => rnd() - 0.5)
  }, [ronda, rnd, conTrampas])

  const tocar = (f: { t: string; i: number; falsa: boolean }) => {
    if (hechas.includes(f.i)) return
    if (!f.falsa && f.i === hechas.length) {
      const n = [...hechas, f.i]
      setHechas(n)
      sfx.bien()
      useJuego.getState().reportarProgreso((r + n.length / ronda.piezas.length) / rondas.length)
      if (n.length === ronda.piezas.length) {
        factores.current.push(Math.max(0, 1 - fallos.current * 0.15))
        fallos.current = 0
        sfx.perfecto()
        setTimeout(() => {
          if (r + 1 >= rondas.length) onFin(factores.current, errores.current)
          else { setR(r + 1); setHechas([]); setQuitadas(new Set()) }
        }, 900)
      }
    } else {
      errores.current++
      fallos.current++
      setMal(f.t)
      sfx.mal()
      if (f.falsa) setQuitadas(q => new Set(q).add(f.t))
      setTimeout(() => setMal(null), 450)
    }
  }

  const completa = hechas.length === ronda.piezas.length
  return (
    <div className="frase">
      <h2>{ronda.titulo}</h2>
      <div className={`frase-armada ${completa ? 'completa' : ''}`} aria-live="polite">
        {hechas.length === 0 && <span className="frase-vacia">Toca la primera parte…</span>}
        {hechas.map(i => <span key={i} className="frase-pieza puesta">{ronda.piezas[i]}</span>)}
        {dificultad === 'facil' && !completa && <span className="frase-pista">{ronda.piezas[hechas.length].split(' ')[0]}…</span>}
      </div>
      <div className="frase-fichas">
        {fichas.filter(f => !hechas.includes(f.i) && !quitadas.has(f.t)).map(f => (
          <button key={f.t + f.i} onClick={() => tocar(f)} className={`frase-pieza ${mal === f.t ? 'tiembla-dom error' : ''}`}>{f.t}</button>
        ))}
      </div>
      <p className="ayuda centro">Ronda {r + 1} de {rondas.length}</p>
    </div>
  )
}
