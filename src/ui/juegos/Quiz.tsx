import { useEffect, useMemo, useRef, useState } from 'react'
import { mezclarPreguntas } from '../../domain/quiz'
import { sfx } from '../sonido'

const POR_PREGUNTA = 12

export function Quiz({ onFin }: { onFin: (factores: number[], errores: number) => void }) {
  const preguntas = useMemo(() => mezclarPreguntas(10), [])
  const [i, setI] = useState(0)
  const [eleg, setEleg] = useState<number | null>(null)
  const [resta, setResta] = useState(POR_PREGUNTA)
  const factores = useRef<number[]>([])
  const errores = useRef(0)
  const p = preguntas[i]

  const siguiente = () => {
    if (i + 1 >= preguntas.length) onFin(factores.current, errores.current)
    else { setI(i + 1); setEleg(null); setResta(POR_PREGUNTA) }
  }

  const responder = (k: number) => {
    if (eleg !== null) return
    setEleg(k)
    if (k === p.correcta) { factores.current.push(0.55 + 0.45 * (resta / POR_PREGUNTA)); sfx.bien() }
    else { factores.current.push(0); sfx.mal() }
  }

  useEffect(() => {
    if (eleg !== null) return
    if (resta <= 0) { responder(-1); return }
    const t = setTimeout(() => setResta(r => r - 1), 1000)
    return () => clearTimeout(t)
  })

  return (
    <div className="quiz">
      <div className="quiz-cabeza">
        <span>Pregunta {i + 1} de {preguntas.length}</span>
        <div className="quiz-reloj"><div style={{ width: `${(resta / POR_PREGUNTA) * 100}%` }} /></div>
      </div>
      <h2 className="quiz-q" key={i}>{p.q}</h2>
      <div className="quiz-ops">
        {p.opciones.map((o, k) => (
          <button key={k} onClick={() => responder(k)} disabled={eleg !== null}
            className={eleg === null ? '' : k === p.correcta ? 'ok' : k === eleg ? 'no' : 'apagada'}>
            <b>{'ABCD'[k]}</b>{o}
          </button>
        ))}
      </div>
      {eleg !== null && (
        <div className="quiz-porque pop">
          <p>{eleg === p.correcta ? '¡Correcto! ' : eleg === -1 ? '¡Se acabó el tiempo! ' : 'Casi. '}{p.porque}</p>
          <button className="btn btn-oro" onClick={() => { sfx.click(); siguiente() }}>{i + 1 >= preguntas.length ? 'Ver resultado' : 'Siguiente'}</button>
        </div>
      )}
    </div>
  )
}
