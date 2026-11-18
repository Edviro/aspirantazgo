import { useEffect, useMemo, useRef, useState } from 'react'
import { DIFICULTADES } from '../../domain/dificultad'
import { azar } from '../../domain/azar'
import { perfilDemo, pieza, uniformeCorrecto } from '../../domain/uniformes'
import type { Dificultad, Pieza } from '../../domain/tipos'
import { PiezaIcono } from '../componentes/Insignias'
import { useJuego } from '../estado'
import { ahora, estaPausado } from '../reloj'
import { sfx } from '../sonido'

type Cat = 'manga_der' | 'manga_izq' | 'bolsillo_der' | 'bolsillo_izq' | 'no_conquis'
const ORDEN: Cat[] = ['manga_der', 'bolsillo_izq', 'manga_izq', 'no_conquis', 'bolsillo_der']
const TEXTO: Record<Cat, string> = {
  manga_der: 'la manga derecha',
  manga_izq: 'la manga izquierda',
  bolsillo_der: 'el bolsillo derecho',
  bolsillo_izq: 'el bolsillo izquierdo',
  no_conquis: 'lo que NO usa un Conquistador (es de líder o Guía Mayor)',
}
const DURACION = 45
const POR_CONSIGNA = 9

interface Cayendo { id: number; p: Pieza; cat: Cat; x: number; t0: number; dur: number; estado: 'cae' | 'ok' | 'mal'; y?: number }

function catalogo(): { p: Pieza; cat: Cat }[] {
  const out: { p: Pieza; cat: Cat }[] = []
  for (const c of uniformeCorrecto({ ...perfilDemo('conquistador', 'TU APODO', 'TU CLUB'), clasesRegulares: ['amigo', 'companero', 'explorador'], clasesAvanzadas: ['amigo'], excelencia: true })) {
    if (c.pieza.tipo === 'panoleta' || c.pieza.tipo === 'correa') continue
    const cat: Cat = c.panel === 'manga_der' ? 'manga_der' : c.panel === 'manga_izq' ? 'manga_izq' : c.x < 25 ? 'bolsillo_der' : 'bolsillo_izq'
    out.push({ p: c.pieza, cat })
  }
  for (const p of [pieza.tiraCargo('DIRECTOR'), pieza.estrella(3), pieza.divisa('guia_mayor', 6), pieza.liderazgo('gm'), pieza.lcManga('master'), pieza.panoleta(true)]) {
    out.push({ p, cat: 'no_conquis' })
  }
  return out
}

/** Arcade: caen insignias y solo hay que atrapar las que van donde dice la consigna. */
export function Lluvia({ dificultad, semilla, onFin }: { dificultad: Dificultad; semilla: number | null; onFin: (f: number[], e: number) => void }) {
  const vel = DIFICULTADES[dificultad].velocidadLluvia
  const rnd = useMemo(() => (semilla ? azar(semilla) : Math.random), [semilla])
  const piezas = useMemo(catalogo, [])
  const [lista, setLista] = useState<Cayendo[]>([])
  const [t, setT] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [alto, setAlto] = useState(600)
  const factores = useRef<number[]>([])
  const errores = useRef(0)
  const sig = useRef(1)
  const fin = useRef(false)
  const zona = useRef<HTMLDivElement>(null)
  const onFinRef = useRef(onFin)
  onFinRef.current = onFin

  const consigna = ORDEN[Math.floor(t / POR_CONSIGNA) % ORDEN.length]
  const consignaRef = useRef(consigna)
  consignaRef.current = consigna

  useEffect(() => {
    const medir = () => setAlto(zona.current?.clientHeight ?? 600)
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  // Reloj del juego
  useEffect(() => {
    const inicio = ahora()
    const reloj = setInterval(() => {
      const seg = (ahora() - inicio) / 1000
      setT(Math.floor(seg))
      useJuego.getState().reportarProgreso(Math.min(1, seg / DURACION))
      if (seg >= DURACION && !fin.current) {
        fin.current = true
        clearInterval(reloj)
        onFinRef.current(factores.current.length ? factores.current : [0], errores.current)
      }
    }, 250)
    return () => clearInterval(reloj)
  }, [])

  // Generador: la caída la hace el CSS (fluida aunque el celular esté ocupado)
  useEffect(() => {
    const gen = setInterval(() => {
      if (fin.current || estaPausado()) return
      const objetivo = rnd() < 0.45
      const cat = consignaRef.current
      const pool = piezas.filter(x => (objetivo ? x.cat === cat : x.cat !== cat))
      const elegido = pool[Math.floor(rnd() * pool.length)]
      if (!elegido) return
      const nuevo: Cayendo = { id: sig.current++, p: elegido.p, cat: elegido.cat, x: 0.1 + rnd() * 0.8, t0: ahora(), dur: (4600 + rnd() * 1400) / vel, estado: 'cae' }
      setLista(l => [...l.filter(x => x.estado === 'cae' || ahora() - x.t0 < x.dur + 600), nuevo])
    }, 820 / vel)
    return () => clearInterval(gen)
  }, [piezas, rnd, vel])

  const marcar = (it: Cayendo, estado: Cayendo['estado']) => {
    const y = Math.min(1, (ahora() - it.t0) / it.dur) * (alto + 120)
    setLista(l => l.map(x => (x.id === it.id ? { ...x, estado, y } : x)))
  }

  const tocar = (it: Cayendo) => {
    if (it.estado !== 'cae' || fin.current) return
    const ok = it.cat === consignaRef.current
    if (ok) { factores.current.push(1); setAciertos(a => a + 1); sfx.perfecto() } else { errores.current++; sfx.mal() }
    marcar(it, ok ? 'ok' : 'mal')
  }

  const caida = (it: Cayendo) => {
    if (it.estado !== 'cae') return
    if (it.cat === consignaRef.current) factores.current.push(0.3)
    setLista(l => l.filter(x => x.id !== it.id))
  }

  const resta = Math.max(0, DURACION - t)
  return (
    <div className="lluvia">
      <div className="lluvia-titulo">👕 Uniforme de <b>Conquistador</b> (10–15 años)</div>
      <div className="lluvia-consigna" key={consigna}>
        <small>{consigna === 'no_conquis' ? 'Atrapa solo' : 'Atrapa lo que va en'}</small>
        <strong>{TEXTO[consigna]}</strong>
      </div>
      <div className="lluvia-datos"><span>{aciertos} atrapadas</span><span className={resta <= 5 ? 'urgente' : ''}>{resta}s</span></div>
      <div className="lluvia-zona" ref={zona}>
        {lista.map(it => (
          <button key={it.id} className={`cayendo ${it.estado}`}
            style={{ left: `${it.x * 100}%`, animationDuration: it.estado === 'cae' ? `${it.dur}ms` : undefined, transform: it.y !== undefined ? `translateY(${it.y}px)` : undefined, ['--caida' as string]: `${alto + 120}px` }}
            onAnimationEnd={e => { if (e.animationName === 'caerLluvia') caida(it) }}
            onPointerDown={() => tocar(it)} aria-label="Insignia">
            <PiezaIcono p={it.p} size={70} />
          </button>
        ))}
      </div>
    </div>
  )
}
