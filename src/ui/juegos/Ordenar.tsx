import { useMemo, useRef, useState } from 'react'
import { COLOR_CLASE, ORDEN_CLASES, type ClaseId, type Dificultad } from '../../domain/tipos'
import { pieza } from '../../domain/uniformes'
import { azar } from '../../domain/azar'
import { PiezaIcono } from '../componentes/Insignias'
import { useJuego } from '../estado'
import { sfx } from '../sonido'

const NOMBRE: Record<ClaseId, string> = { amigo: 'Amigo', companero: 'Compañero', explorador: 'Explorador', pionero: 'Pionero', excursionista: 'Excursionista', guia: 'Guía' }

const DIVISAS = [
  { q: 'Un Conquistador investido hasta Explorador. ¿Qué divisa lleva?', ok: 0, op: [pieza.divisa('conquistador', 3), pieza.divisa('conquistador', 4), pieza.divisa('lider', 3), pieza.divisa('guia_mayor', 3)] },
  { q: 'Un líder con sus seis clases que todavía no es Guía Mayor.', ok: 1, op: [pieza.divisa('guia_mayor', 6), pieza.divisa('lider', 6), pieza.divisa('conquistador', 6), pieza.divisa('lider', 5)] },
  { q: 'Un Guía Mayor investido.', ok: 2, op: [pieza.divisa('lider', 6), pieza.divisa('conquistador', 6), pieza.divisa('guia_mayor', 6), pieza.divisa('conquistador', 5)] },
]

/** Tres rondas cortas: orden de investidura, colores de las clases y la divisa correcta. */
export function Ordenar({ dificultad, semilla, onFin }: { dificultad: Dificultad; semilla: number | null; onFin: (f: number[], e: number) => void }) {
  const rnd = useMemo(() => (semilla ? azar(semilla) : Math.random), [semilla])
  const conNombres = dificultad !== 'leyenda'
  const [ronda, setRonda] = useState(0)
  const [hechas, setHechas] = useState<ClaseId[]>([])
  const [mal, setMal] = useState<string | null>(null)
  const [k, setK] = useState(0)
  const [eleccion, setEleccion] = useState<number | null>(null)
  const factores = useRef<number[]>([])
  const errores = useRef(0)
  const mezcladas = useMemo(() => [...ORDEN_CLASES].sort(() => rnd() - 0.5), [rnd])
  const preguntasColor = useMemo(() => [...ORDEN_CLASES].sort(() => rnd() - 0.5).map(c => ({
    c, ops: [c, ...ORDEN_CLASES.filter(x => x !== c).sort(() => rnd() - 0.5).slice(0, 3)].sort(() => rnd() - 0.5),
  })), [rnd])
  const divisas = useMemo(() => DIVISAS.map(d => {
    const orden = d.op.map((_, i) => i).sort(() => rnd() - 0.5)
    return { ...d, op: orden.map(i => d.op[i]), ok: orden.indexOf(d.ok) }
  }), [rnd])

  const fallar = (id: string) => { errores.current++; setMal(id); sfx.mal(); setTimeout(() => setMal(null), 450) }
  const progreso = (n: number) => useJuego.getState().reportarProgreso(n)

  const tocarClase = (c: ClaseId) => {
    if (hechas.includes(c)) return
    if (ORDEN_CLASES[hechas.length] === c) {
      const n = [...hechas, c]
      setHechas(n); factores.current.push(1); sfx.bien(); progreso(n.length / 15)
      if (n.length === 6) setTimeout(() => { setRonda(1); setK(0) }, 700)
    } else fallar(c)
  }

  const elegirColor = (c: ClaseId) => {
    const q = preguntasColor[k]
    if (eleccion !== null) return
    const ok = c === q.c
    factores.current.push(ok ? 1 : 0)
    if (ok) sfx.bien(); else fallar(c)
    setEleccion(0)
    progreso((6 + k + 1) / 15)
    setTimeout(() => {
      setEleccion(null)
      if (k + 1 >= preguntasColor.length) { setRonda(2); setK(0) } else setK(k + 1)
    }, ok ? 500 : 1100)
  }

  const elegirDivisa = (i: number) => {
    if (eleccion !== null) return
    const d = divisas[k]
    const ok = i === d.ok
    factores.current.push(ok ? 1 : 0)
    if (ok) sfx.perfecto(); else fallar('d' + i)
    setEleccion(i)
    progreso((12 + k + 1) / 15)
    setTimeout(() => {
      setEleccion(null)
      if (k + 1 >= divisas.length) onFin(factores.current, errores.current); else setK(k + 1)
    }, ok ? 700 : 1500)
  }

  return (
    <div className="ordenar">
      <div className="ordenar-rondas">{['Orden', 'Colores', 'Divisas'].map((r, i) => <span key={r} className={i === ronda ? 'on' : i < ronda ? 'hecha' : ''}>{r}</span>)}</div>

      {ronda === 0 && (
        <>
          <h2>Toca las clases en el orden en que se reciben</h2>
          <div className="fila-investidura">
            {ORDEN_CLASES.map((_, i) => (
              <span key={i} className={`hueco ${hechas[i] ? 'lleno con-logo' : ''}`} title={hechas[i] ? NOMBRE[hechas[i]] : undefined}>
                {hechas[i] ? <PiezaIcono p={pieza.boton(hechas[i])} size={54} /> : i + 1}
              </span>
            ))}
          </div>
          <div className="botones-clase">
            {mezcladas.map(c => (
              <button key={c} onClick={() => tocarClase(c)} disabled={hechas.includes(c)} className={mal === c ? 'tiembla-dom' : ''}>
                <PiezaIcono p={pieza.boton(c)} size={64} />
                {conNombres && <span>{NOMBRE[c]}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {ronda === 1 && (
        <>
          <h2>¿Cuál es el color de la clase <em>{NOMBRE[preguntasColor[k].c]}</em>?</h2>
          <div className="botones-color">
            {preguntasColor[k].ops.map(c => (
              <button key={c} onClick={() => elegirColor(c)} style={{ background: COLOR_CLASE[c] }} aria-label={NOMBRE[c]}
                className={eleccion !== null && c === preguntasColor[k].c ? 'correcto' : mal === c ? 'tiembla-dom' : ''} />
            ))}
          </div>
        </>
      )}

      {ronda === 2 && (
        <>
          <h2>{divisas[k].q}</h2>
          <div className="botones-divisa">
            {divisas[k].op.map((p, i) => (
              <button key={i} onClick={() => elegirDivisa(i)} className={eleccion !== null && i === divisas[k].ok ? 'correcto' : mal === 'd' + i ? 'tiembla-dom' : ''}>
                <PiezaIcono p={p} size={88} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
