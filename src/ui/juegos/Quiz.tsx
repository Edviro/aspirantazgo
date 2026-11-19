import { useEffect, useMemo, useRef, useState } from 'react'
import { mezclarPreguntas, type Pregunta } from '../../domain/quiz'
import { DIFICULTADES } from '../../domain/dificultad'
import { azar } from '../../domain/azar'
import type { Dificultad } from '../../domain/tipos'
import { Figura } from '../componentes/Figura'
import { useJuego } from '../estado'
import { sfx } from '../sonido'
import { useAutoAvance } from './useAutoAvance'

/** Tiempo que se ve la respuesta antes de pasar sola a la siguiente (al fallar, un poco más para leer el porqué). */
const VER_BIEN = 1700, VER_MAL = 3400

/** Alto de la imagen según la pantalla (fijo durante la partida: no salta entre preguntas). */
function altoFigura() { return Math.round(Math.min(230, Math.max(105, window.innerHeight * 0.24))) }

/**
 * Trivia con estructura FIJA: imagen, enunciado y opciones ocupan siempre el mismo lugar,
 * y la explicación aparece encima (no empuja nada).
 */
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
  const [alto] = useState(altoFigura)
  const avanzado = useRef(-1)

  const siguiente = () => {
    if (avanzado.current === i) return
    avanzado.current = i
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

  const pausado = useJuego(st => st.pausado)
  // Últimos 3 segundos: tic-tac
  useEffect(() => { if (eleg === null && resta > 0 && resta <= 3) sfx.tic() }, [resta]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pausado) return
    if (eleg !== null) return
    if (resta <= 0) { responder(-1); return }
    const t = setTimeout(() => setResta(r => r - 1), 1000)
    return () => clearTimeout(t)
  })

  const acerto = eleg === p.correcta
  const espera = eleg === null ? null : acerto ? VER_BIEN : VER_MAL
  // Se pasa sola a la siguiente: no hace falta tocar nada (tocar el aviso la adelanta)
  useAutoAvance(espera, i, siguiente)
  return (
    <div className="quiz">
      <div className="quiz-cabeza">
        <span>Pregunta {i + 1} de {preguntas.length}</span>
        {p.para && <span className={`quiz-para ${p.para}`}>{p.para === 'lider' ? 'Uniforme de líder / GM' : 'Uniforme de Conquistador'}</span>}
        <div className={`quiz-reloj ${resta <= 3 && eleg === null ? 'urgente' : ''}`}><div style={{ width: `${(resta / POR_PREGUNTA) * 100}%` }} /></div>
      </div>
      <Figura key={'f' + i} img={p.img} ilus={p.ilus} imagen={imagen} alto={alto} />
      <h2 className="quiz-q">{p.q}</h2>
      <div className="quiz-ops">
        {p.opciones.map((o, k) => (
          <button key={k} onClick={() => responder(k)} disabled={eleg !== null}
            className={eleg === null ? '' : k === p.correcta ? 'ok' : k === eleg ? 'no' : 'apagada'}>
            <b>{'ABCD'[k]}</b><span>{o}</span>
          </button>
        ))}
      </div>
      {eleg !== null && (
        <div className={`quiz-porque auto ${acerto ? 'bien' : 'mal'}`} role="status" onClick={siguiente} key={'p' + i}>
          <strong>{acerto ? '¡Correcto!' : eleg === -1 ? '¡Se acabó el tiempo!' : 'Casi…'}</strong>
          <p>{!acerto && <>La respuesta es <b>{p.opciones[p.correcta]}</b>. </>}{p.porque}</p>
          <span className="quiz-auto" aria-hidden><i style={{ animationDuration: `${espera}ms` }} /></span>
        </div>
      )}
    </div>
  )
}
