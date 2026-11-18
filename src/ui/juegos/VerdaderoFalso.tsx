import { useEffect, useMemo, useRef, useState } from 'react'
import { mezclarVF } from '../../domain/quiz'
import { DIFICULTADES } from '../../domain/dificultad'
import { azar } from '../../domain/azar'
import type { Dificultad } from '../../domain/tipos'
import { useJuego } from '../estado'
import { sfx } from '../sonido'

/** Verdadero o falso a ritmo rápido: la racha de aciertos suma más. */
export function VerdaderoFalso({ dificultad, semilla, onFin }: { dificultad: Dificultad; semilla: number | null; onFin: (f: number[], e: number) => void }) {
  const reglas = DIFICULTADES[dificultad]
  const limite = Math.max(4, Math.round(reglas.segPorPregunta * 0.7))
  const frases = useMemo(() => mezclarVF(reglas.preguntas + 2, semilla ? azar(semilla) : Math.random), [reglas.preguntas, semilla])
  const [i, setI] = useState(0)
  const [resp, setResp] = useState<null | { ok: boolean }>(null)
  const [resta, setResta] = useState(limite)
  const [racha, setRacha] = useState(0)
  const factores = useRef<number[]>([])
  const f = frases[i]

  const avanzar = () => {
    useJuego.getState().reportarProgreso((i + 1) / frases.length)
    if (i + 1 >= frases.length) onFin(factores.current, 0)
    else { setI(i + 1); setResp(null); setResta(limite) }
  }

  const responder = (v: boolean | null) => {
    if (resp) return
    const ok = v === f.v
    const nuevaRacha = ok ? racha + 1 : 0
    setRacha(nuevaRacha)
    factores.current.push(ok ? Math.min(1, (0.6 + 0.4 * (resta / limite)) * (1 + Math.min(nuevaRacha, 5) * 0.04)) : 0)
    if (ok) sfx.bien(); else sfx.mal()
    setResp({ ok })
    setTimeout(avanzar, ok ? 900 : 2200)
  }

  useEffect(() => {
    if (resp) return
    if (resta <= 0) { responder(null); return }
    const t = setTimeout(() => setResta(r => r - 1), 1000)
    return () => clearTimeout(t)
  })

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'v') responder(true)
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'f') responder(false)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  return (
    <div className="vf">
      <div className="vf-cabeza">
        <span>{i + 1} de {frases.length}</span>
        {racha >= 2 && <span className="racha">Racha x{racha}</span>}
        <span className={`vf-reloj ${resta <= 3 ? 'urgente' : ''}`}>{resta}s</span>
      </div>
      <div className={`vf-tarjeta ${resp ? (resp.ok ? 'ok' : 'no') : ''}`} key={i}>
        <p>{f.t}</p>
        {resp && <small>{resp.ok ? '¡Correcto! ' : `Es ${f.v ? 'verdadero' : 'falso'}. `}{f.porque}</small>}
      </div>
      <div className="vf-botones">
        <button className="vf-si" onClick={() => responder(true)} disabled={!!resp}>Verdadero</button>
        <button className="vf-no" onClick={() => responder(false)} disabled={!!resp}>Falso</button>
      </div>
    </div>
  )
}
