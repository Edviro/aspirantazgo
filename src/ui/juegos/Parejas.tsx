import { useMemo, useRef, useState } from 'react'
import { azar } from '../../domain/azar'
import { useJuego } from '../estado'
import { sfx } from '../sonido'

/** Unir parejas: toca un ideal y luego la frase que le corresponde. */
export function Parejas({ parejas, semilla, onFin }: { parejas: { a: string; b: string }[]; semilla: number | null; onFin: (f: number[], e: number) => void }) {
  const rnd = useMemo(() => (semilla ? azar(semilla) : Math.random), [semilla])
  const izq = useMemo(() => parejas.map((p, i) => ({ t: p.a, i })).sort(() => rnd() - 0.5), [parejas, rnd])
  const der = useMemo(() => parejas.map((p, i) => ({ t: p.b, i })).sort(() => rnd() - 0.5), [parejas, rnd])
  const [sel, setSel] = useState<number | null>(null)
  const [unidas, setUnidas] = useState<Set<number>>(new Set())
  const [mal, setMal] = useState<number | null>(null)
  const intentos = useRef<Record<number, number>>({})
  const errores = useRef(0)

  const elegirDer = (i: number) => {
    if (sel === null || unidas.has(i)) return
    if (i === sel) {
      const n = new Set(unidas).add(i)
      setUnidas(n); setSel(null); sfx.perfecto()
      useJuego.getState().reportarProgreso(n.size / parejas.length)
      if (n.size === parejas.length) {
        setTimeout(() => onFin(parejas.map((_, k) => ((intentos.current[k] ?? 0) === 0 ? 1 : 0.5)), errores.current), 700)
      }
    } else {
      errores.current++
      intentos.current[sel] = (intentos.current[sel] ?? 0) + 1
      setMal(i); setSel(null); sfx.mal()
      setTimeout(() => setMal(m => (m === i ? null : m)), 500)
    }
  }

  return (
    <div className="parejas">
      <h2>Une cada ideal con su frase</h2>
      <div className="parejas-columnas">
        <div className="parejas-col">
          {izq.map(x => (
            <button key={x.i} className={`pareja-a ${sel === x.i ? 'sel' : ''} ${unidas.has(x.i) ? 'unida' : ''}`} disabled={unidas.has(x.i)}
              onClick={() => { sfx.click(); setSel(x.i) }}>{x.t}</button>
          ))}
        </div>
        <div className="parejas-col">
          {der.map(x => (
            <button key={x.i} className={`pareja-b ${unidas.has(x.i) ? 'unida' : ''} ${mal === x.i ? 'tiembla-dom error' : ''}`} disabled={unidas.has(x.i) || sel === null}
              onClick={() => elegirDer(x.i)}>{x.t}</button>
          ))}
        </div>
      </div>
      <p className="ayuda centro">{sel === null ? 'Primero toca un ideal de la izquierda.' : 'Ahora toca su frase.'}</p>
    </div>
  )
}
