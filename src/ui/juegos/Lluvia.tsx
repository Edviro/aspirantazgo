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
const CORTO: Record<Cat, string> = {
  manga_der: 'Manga derecha', manga_izq: 'Manga izquierda', bolsillo_der: 'Bolsillo derecho', bolsillo_izq: 'Bolsillo izquierdo', no_conquis: 'Lo que NO usa un Conquistador',
}
const TEXTO: Record<Cat, string> = {
  manga_der: 'la manga derecha',
  manga_izq: 'la manga izquierda',
  bolsillo_der: 'el bolsillo derecho',
  bolsillo_izq: 'el bolsillo izquierdo',
  no_conquis: 'lo que NO usa un Conquistador (es de líder o Guía Mayor)',
}
/** Cada consigna: primero el letrero (sin caídas), luego la lluvia. */
const AVISO = 2.6
const JUEGO = 8.5
const TRAMO = AVISO + JUEGO
const DURACION = ORDEN.length * TRAMO

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

  const idx = Math.min(ORDEN.length - 1, Math.floor(t / TRAMO))
  const enAviso = t - idx * TRAMO < AVISO
  const consigna = ORDEN[idx]
  const consignaRef = useRef(consigna)
  consignaRef.current = consigna
  const avisoRef = useRef(enAviso)
  avisoRef.current = enAviso

  // Al empezar cada letrero, se limpia la pantalla: nada cae mientras se lee
  useEffect(() => {
    if (!enAviso) return
    setLista([])
    sfx.aviso()
  }, [idx, enAviso])

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
      setT(seg)
      useJuego.getState().reportarProgreso(Math.min(1, seg / DURACION))
      if (seg >= DURACION && !fin.current) {
        fin.current = true
        clearInterval(reloj)
        onFinRef.current(factores.current.length ? factores.current : [0], errores.current)
      }
    }, 100)
    return () => clearInterval(reloj)
  }, [])

  // Generador: la caída la hace el CSS (fluida aunque el celular esté ocupado)
  useEffect(() => {
    const gen = setInterval(() => {
      if (fin.current || estaPausado() || avisoRef.current) return
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
    if (it.estado !== 'cae' || fin.current || avisoRef.current) return
    const ok = it.cat === consignaRef.current
    if (ok) { factores.current.push(1); setAciertos(a => a + 1); sfx.perfecto() } else { errores.current++; sfx.mal() }
    marcar(it, ok ? 'ok' : 'mal')
  }

  const caida = (it: Cayendo) => {
    if (it.estado !== 'cae') return
    if (it.cat === consignaRef.current) factores.current.push(0.3)
    setLista(l => l.filter(x => x.id !== it.id))
  }

  const resta = Math.max(0, Math.ceil(DURACION - t))
  const faltaAviso = Math.max(0, AVISO - (t - idx * TRAMO))
  return (
    <div className="lluvia">
      <div className="lluvia-cabeza">
        <div className="lluvia-titulo">Uniforme de <b>Conquistador</b> (10 a 15 años)</div>
        <div className="lluvia-datos"><span>{aciertos} atrapadas</span><span>{idx + 1} de {ORDEN.length}</span><span className={resta <= 5 ? 'urgente' : ''}>{resta}s</span></div>
        <div className={`lluvia-consigna ${enAviso ? 'oculta' : ''}`}>
          <small>{consigna === 'no_conquis' ? 'Atrapa solo' : 'Atrapa lo que va en'}</small>
          <strong>{CORTO[consigna]}</strong>
        </div>
      </div>
      <div className="lluvia-zona" ref={zona}>
        {lista.map(it => (
          <button key={it.id} className={`cayendo ${it.estado}`}
            style={{ left: `${it.x * 100}%`, animationDuration: it.estado === 'cae' ? `${it.dur}ms` : undefined, transform: it.y !== undefined ? `translateY(${it.y}px)` : undefined, ['--caida' as string]: `${alto + 120}px` }}
            onAnimationEnd={e => { if (e.animationName === 'caerLluvia') caida(it) }}
            onPointerDown={() => tocar(it)} aria-label="Insignia">
            <PiezaIcono p={it.p} size={70} />
          </button>
        ))}
        {enAviso && (
          <div className="lluvia-aviso" role="status" key={idx}>
            <span className="lluvia-ahora">{idx === 0 ? '¡Prepárate!' : '¡Cambio!'}</span>
            <ZonaCamisa zona={consigna} />
            <p>{consigna === 'no_conquis' ? 'Atrapa solo' : 'Ahora atrapa lo que va en'}</p>
            <strong>{TEXTO[consigna]}</strong>
            <i className="lluvia-cuenta" style={{ width: `${(faltaAviso / AVISO) * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Camisa de frente con la zona de la consigna resaltada. Ojo: la manga derecha del que la viste se ve a la izquierda. */
function ZonaCamisa({ zona }: { zona: Cat }) {
  const marca = '#FFC20E'
  const caqui = '#C9AE78'
  const f = (z: Cat) => (zona === z ? marca : caqui)
  if (zona === 'no_conquis') {
    return (
      <svg className="lluvia-camisa" viewBox="0 0 120 100" aria-hidden>
        <path d="M38 8 L20 16 L4 44 L20 54 L28 42 L28 96 L92 96 L92 42 L100 54 L116 44 L100 16 L82 8 Q60 20 38 8 Z" fill="#F4F2EC" stroke="#1E140C" strokeWidth="3" strokeLinejoin="round" />
        <path d="M74 12 L52 66" stroke="#D7242F" strokeWidth="5" strokeLinecap="round" opacity=".9" />
        <text x="60" y="88" textAnchor="middle" fontFamily="Bangers, Impact, sans-serif" fontSize="15" fill="#1E140C">LÍDER / GM</text>
      </svg>
    )
  }
  return (
    <svg className="lluvia-camisa" viewBox="0 0 120 100" aria-hidden>
      <path d="M20 16 L4 44 L20 54 L30 38 Z" fill={f('manga_der')} stroke="#1E140C" strokeWidth="3" strokeLinejoin="round" />
      <path d="M100 16 L116 44 L100 54 L90 38 Z" fill={f('manga_izq')} stroke="#1E140C" strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 8 L20 16 L30 38 L28 96 L92 96 L90 38 L100 16 L82 8 Q60 20 38 8 Z" fill={caqui} stroke="#1E140C" strokeWidth="3" strokeLinejoin="round" />
      <rect x="34" y="40" width="20" height="18" rx="2" fill={f('bolsillo_der')} stroke="#1E140C" strokeWidth="2.5" />
      <rect x="66" y="40" width="20" height="18" rx="2" fill={f('bolsillo_izq')} stroke="#1E140C" strokeWidth="2.5" />
      <path d="M60 22 L60 96" stroke="#1E140C" strokeWidth="2" />
      <text x="12" y="70" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="8" fill="#fff">DER</text>
      <text x="96" y="70" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="8" fill="#fff">IZQ</text>
    </svg>
  )
}
