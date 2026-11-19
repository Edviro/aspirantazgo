import { useEffect, useRef, useState } from 'react'
import { FRASES, type JugadorEnLinea } from '../../application/puertos'
import type { Perfil } from '../../application/puertos'
import { useJuego } from '../estado'
import { Campamento } from './Campamento'
import { PixelAvatar } from './PixelAvatar'

interface Pos { x: number; mira: 1 | -1; camina: boolean }

/**
 * La isla del club en vivo: los conectados caminan sobre el pasto, con su sombra y su nombre.
 * Tocas el pasto para mover a tu personaje (los demás lo ven) y los globitos muestran las frases rápidas.
 */
export function EscenaClub({ perfil, otros, onRetar }: { perfil: Perfil; otros: JugadorEnLinea[]; onRetar: (j: JugadorEnLinea) => void }) {
  const { miX, moverme, gestos } = useJuego()
  const [pos, setPos] = useState<Record<string, Pos>>({})
  const [yo, setYo] = useState<Pos>({ x: miX, mira: 1, camina: false })
  const caja = useRef<HTMLDivElement>(null)
  const [, setAhora] = useState(0)

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
    }, 2600)
    return () => clearInterval(t)
  }, [otros])

  const tocarPasto = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = caja.current!.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    setYo(p => ({ x: Math.min(0.92, Math.max(0.08, x)), mira: x < p.x ? -1 : 1, camina: true }))
    moverme(x)
  }

  const globo = (id: string) => {
    const g = gestos[id]
    return g && Date.now() - g.t < 3200 ? <span className="globo-frase" key={g.t}>{FRASES[g.frase]}</span> : null
  }

  return (
    <div className="club-escena" ref={caja} onPointerDown={tocarPasto} aria-label="Isla de tu club. Toca el pasto para caminar.">
      <Campamento />
      <div className="club-suelo">
        {otros.slice(0, 10).map(j => {
          const p = pos[j.id] ?? { x: 0.5, mira: 1, camina: false }
          return (
            <button key={j.id} className={`club-pj ${p.camina ? 'camina' : ''} ${j.ocupado ? 'ocupado' : ''}`} style={{ left: `${p.x * 100}%` }}
              onPointerDown={e => e.stopPropagation()} onClick={() => !j.ocupado && onRetar(j)}
              onTransitionEnd={() => setPos(s => (s[j.id] ? { ...s, [j.id]: { ...s[j.id], camina: false } } : s))}
              aria-label={j.ocupado ? `${j.apodo} está jugando` : `Retar a ${j.apodo}`}>
              {globo(j.id)}
              <span className="club-nombre">{j.apodo}{j.ocupado ? ' · jugando' : ''}</span>
              <span className="club-cuerpo-pj" style={{ transform: `scaleX(${p.mira})` }}><PixelAvatar a={j.avatar ?? {}} rango={j.rango} alto={128} /></span>
              <i className="club-sombra" />
            </button>
          )
        })}
        <div className={`club-pj yo ${yo.camina ? 'camina' : ''}`} style={{ left: `${yo.x * 100}%` }} onTransitionEnd={() => setYo(p => ({ ...p, camina: false }))}>
          {globo(perfil.id)}
          <span className="club-nombre">Tú</span>
          <span className="club-cuerpo-pj" style={{ transform: `scaleX(${yo.mira})` }}><PixelAvatar a={perfil.avatar} rango={perfil.rango} animo="saluda" alto={128} /></span>
          <i className="club-sombra" />
        </div>
      </div>
    </div>
  )
}
