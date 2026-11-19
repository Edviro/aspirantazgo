import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FRASES, type JugadorEnLinea } from '../../application/puertos'
import type { Perfil } from '../../application/puertos'
import { useJuego } from '../estado'
import { sfx } from '../sonido'
import { Campamento } from './Campamento'
import { PixelAvatar } from './PixelAvatar'

interface Pos { x: number; mira: 1 | -1; camina: boolean }
const VIDA_GLOBO = 4200

/** Fila de profundidad estable para cada jugador (0 = adelante): así no se tapan los nombres. */
function carrilDe(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 1 + (h % 2) }

/**
 * La isla del club en vivo: los conectados caminan sobre el pasto en tres filas de profundidad, con su sombra y su nombre.
 * Tocas el pasto para mover a tu personaje (los demás lo ven). Las frases salen en globos grandes y en la pizarra de mensajes.
 */
export function EscenaClub({ perfil, otros, onRetar }: { perfil: Perfil; otros: JugadorEnLinea[]; onRetar: (j: JugadorEnLinea) => void }) {
  const { miX, moverme, gestos } = useJuego()
  const [pos, setPos] = useState<Record<string, Pos>>({})
  const [yo, setYo] = useState<Pos>({ x: miX, mira: 1, camina: false })
  const caja = useRef<HTMLDivElement>(null)
  const [, setAhora] = useState(0)
  const [alto, setAlto] = useState(128)

  // El tamaño de los personajes sigue al alto de la escena (en PC se ven grandes)
  useLayoutEffect(() => {
    const el = caja.current
    if (!el) return
    const medir = () => setAlto(Math.round(Math.min(176, Math.max(96, el.clientHeight * 0.4))))
    medir()
    const ro = new ResizeObserver(medir); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Los demás: si mandan su posición se van hasta ahí; si no, pasean solos de vez en cuando
  useEffect(() => {
    setPos(prev => {
      const sig: Record<string, Pos> = {}
      otros.forEach((j, i) => {
        const antes = prev[j.id]
        const x = j.x ?? antes?.x ?? [0.58, 0.8, 0.14, 0.42, 0.9, 0.68, 0.24, 0.5, 0.33, 0.74][i % 10]
        sig[j.id] = { x, mira: antes && x < antes.x ? -1 : 1, camina: !!antes && Math.abs(x - antes.x) > 0.01 }
      })
      return sig
    })
  }, [otros])
  useEffect(() => {
    const t = setInterval(() => {
      setPos(prev => {
        const sig = { ...prev }
        for (const j of otros) {
          if (j.x !== undefined || Math.random() > 0.35 || !sig[j.id]) continue
          const x = Math.min(0.9, Math.max(0.1, sig[j.id].x + (Math.random() - 0.5) * 0.3))
          sig[j.id] = { x, mira: x < sig[j.id].x ? -1 : 1, camina: true }
        }
        return sig
      })
      setAhora(Date.now())
    }, 1300)
    return () => clearInterval(t)
  }, [otros])

  // Pizarra: los últimos mensajes (de cualquiera), y un "pop" cuando escribe otro
  const nombres = useMemo(() => new Map([[perfil.id, 'Tú'], ...otros.map(j => [j.id, j.apodo] as [string, string])]), [otros, perfil.id])
  const recientes = Object.entries(gestos).filter(([id, g]) => nombres.has(id) && Date.now() - g.t < 9000).sort((a, b) => b[1].t - a[1].t).slice(0, 4)
  const ultimoAjeno = Math.max(0, ...Object.entries(gestos).filter(([id]) => id !== perfil.id).map(([, g]) => g.t))
  useEffect(() => { if (ultimoAjeno && Date.now() - ultimoAjeno < 1000) sfx.burbuja() }, [ultimoAjeno])

  const tocarPasto = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = caja.current!.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    setYo(p => ({ x: Math.min(0.92, Math.max(0.08, x)), mira: x < p.x ? -1 : 1, camina: true }))
    moverme(x)
  }

  const hablando = (id: string) => { const g = gestos[id]; return !!g && Date.now() - g.t < VIDA_GLOBO }
  const globo = (id: string) => {
    const g = gestos[id]
    if (!g || Date.now() - g.t >= VIDA_GLOBO) return null
    const f = FRASES[g.frase]
    return <span className={`globo-frase ${/^\p{Extended_Pictographic}$/u.test(f) ? 'emoji' : ''}`} key={g.t}>{f}</span>
  }

  return (
    <div className="club-escena" ref={caja} onPointerDown={tocarPasto} style={{ ['--alto-pj' as string]: `${alto}px` }} aria-label="Isla de tu club. Toca el pasto para caminar.">
      <Campamento />
      {recientes.length > 0 && (
        <ol className="club-pizarra" aria-live="polite" aria-label="Mensajes recientes">
          {recientes.map(([id, g]) => (
            <li key={id + g.t} className={id === perfil.id ? 'mio' : ''}><b>{nombres.get(id)}</b> {FRASES[g.frase]}</li>
          ))}
        </ol>
      )}
      <div className="club-suelo">
        {otros.slice(0, 10).map(j => {
          const p = pos[j.id] ?? { x: 0.5, mira: 1, camina: false }
          const habla = hablando(j.id)
          return (
            <button key={j.id} className={`club-pj carril-${carrilDe(j.id)} ${p.camina ? 'camina' : ''} ${j.ocupado ? 'ocupado' : ''} ${habla ? 'habla' : ''}`} style={{ left: `${p.x * 100}%` }}
              onPointerDown={e => e.stopPropagation()} onClick={() => !j.ocupado && onRetar(j)}
              onTransitionEnd={() => setPos(s => (s[j.id] ? { ...s, [j.id]: { ...s[j.id], camina: false } } : s))}
              aria-label={j.ocupado ? `${j.apodo} está jugando` : `Retar a ${j.apodo}`}>
              {globo(j.id)}
              <span className="club-nombre">{j.apodo}{j.ocupado ? ' · jugando' : ''}</span>
              <span className="club-cuerpo-pj" style={{ transform: `scaleX(${p.mira})` }}><PixelAvatar a={j.avatar ?? {}} rango={j.rango} animo={habla ? 'saluda' : 'idle'} alto={alto} /></span>
              <i className="club-sombra" />
            </button>
          )
        })}
        <div className={`club-pj yo carril-0 ${yo.camina ? 'camina' : ''} ${hablando(perfil.id) ? 'habla' : ''}`} style={{ left: `${yo.x * 100}%` }} onTransitionEnd={() => setYo(p => ({ ...p, camina: false }))}>
          {globo(perfil.id)}
          <span className="club-nombre">Tú</span>
          <span className="club-cuerpo-pj" style={{ transform: `scaleX(${yo.mira})` }}><PixelAvatar a={perfil.avatar} rango={perfil.rango} animo="saluda" alto={alto} /></span>
          <i className="club-sombra" />
        </div>
      </div>
    </div>
  )
}
