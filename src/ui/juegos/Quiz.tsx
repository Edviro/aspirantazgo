import { useEffect, useMemo, useRef, useState } from 'react'
import { mezclarPreguntas, type Pregunta } from '../../domain/quiz'
import { DIFICULTADES } from '../../domain/dificultad'
import { azar } from '../../domain/azar'
import type { Dificultad } from '../../domain/tipos'
import { PiezaIcono } from '../componentes/Insignias'
import { useJuego } from '../estado'
import { sfx } from '../sonido'

export function Quiz({ dificultad, semilla, banco, imagen, segPregunta, onFin }: { dificultad: Dificultad; semilla: number | null; banco?: Pregunta[]; imagen?: string; segPregunta?: number; onFin: (factores: number[], errores: number) => void }) {
  const reglas = DIFICULTADES[dificultad]
  const POR_PREGUNTA = segPregunta ?? reglas.segPorPregunta
  const preguntas = useMemo(() => mezclarPreguntas(Math.min(reglas.preguntas, banco?.length ?? 99), semilla ? azar(semilla) : Math.random, banco), [reglas.preguntas, semilla, banco])
  const [i, setI] = useState(0)
  const [eleg, setEleg] = useState<number | null>(null)
  const [resta, setResta] = useState(POR_PREGUNTA)
  const factores = useRef<number[]>([])
  const errores = useRef(0)
  const p = preguntas[i]

  const siguiente = () => {
    useJuego.getState().reportarProgreso((i + 1) / preguntas.length)
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
      {imagen && <img className="quiz-imagen" src={`${import.meta.env.BASE_URL}assets/${imagen}.webp`} alt="" />}
      {p.img && (
        <div className="quiz-pieza" key={'img' + i} aria-hidden>
          <PiezaIcono p={p.img} size={Math.round(Math.min(130, Math.max(p.img.w, p.img.h) * 15))} />
        </div>
      )}
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
