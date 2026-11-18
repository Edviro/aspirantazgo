import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Npc } from '../../domain/niveles'
import { sfx } from '../sonido'

const NPC_IMG: Record<Npc, string> = { trompeta: 'npc-trompeta', lectora: 'npc-lectora', nudo: 'npc-nudo' }
const NPC_NOMBRE: Record<Npc, string> = { trompeta: 'Mateo', lectora: 'Sara', nudo: 'Diego' }

export const asset = (n: string) => `${import.meta.env.BASE_URL}assets/${n}.webp`

export function Boton({ children, onClick, tipo = 'oro', disabled, className = '', type = 'button' }: {
  children: ReactNode; onClick?: () => void; tipo?: 'oro' | 'rojo' | 'azul' | 'fantasma' | 'verde'; disabled?: boolean; className?: string; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} className={`btn btn-${tipo} ${className}`} disabled={disabled} onClick={() => { sfx.click(); onClick?.() }}>
      {children}
    </button>
  )
}

export function Dialogo({ npc, titulo, children, accion, onAccion, secundaria, onSecundaria }: {
  npc: Npc; titulo?: string; children: ReactNode; accion: string; onAccion: () => void; secundaria?: string; onSecundaria?: () => void
}) {
  return (
    <div className="velo">
      <div className="dialogo pop">
        <img className="dialogo-npc" src={asset(NPC_IMG[npc])} alt={NPC_NOMBRE[npc]} />
        <div className="dialogo-cuerpo">
          <div className="dialogo-quien">{NPC_NOMBRE[npc]}</div>
          {titulo && <h2>{titulo}</h2>}
          <div className="dialogo-texto">{children}</div>
          <div className="fila-botones">
            {secundaria && <Boton tipo="fantasma" onClick={onSecundaria}>{secundaria}</Boton>}
            <Boton onClick={onAccion}>{accion}</Boton>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Estrellas({ n, grande }: { n: number; grande?: boolean }) {
  return (
    <div className={`estrellas ${grande ? 'grande' : ''}`}>
      {[0, 1, 2].map(i => (
        <svg key={i} viewBox="-12 -12 24 24" className={i < n ? 'on' : 'off'} style={{ animationDelay: `${0.25 + i * 0.22}s` }}>
          <polygon points="0,-10 2.9,-3.4 10,-3.1 4.5,1.6 6.2,8.6 0,4.8 -6.2,8.6 -4.5,1.6 -10,-3.1 -2.9,-3.4" />
        </svg>
      ))}
    </div>
  )
}

export function Confeti({ cantidad = 90 }: { cantidad?: number }) {
  const piezas = useMemo(() => Array.from({ length: cantidad }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.8, dur: 2.2 + Math.random() * 1.8, rot: Math.random() * 360,
    color: ['#FFC20E', '#D7242F', '#1F5FD1', '#1E9A4B', '#fff', '#7A1F3D'][i % 6], w: 6 + Math.random() * 6,
  })), [cantidad])
  return (
    <div className="confeti" aria-hidden>
      {piezas.map((p, i) => (
        <i key={i} style={{ left: p.left + '%', animationDelay: p.delay + 's', animationDuration: p.dur + 's', background: p.color, width: p.w, height: p.w * 0.45, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  )
}

export function Toast({ texto, tipo, onFin }: { texto: string; tipo: 'bien' | 'mal' | 'info'; onFin: () => void }) {
  const fin = useRef(onFin)
  fin.current = onFin
  useEffect(() => { const t = setTimeout(() => fin.current(), tipo === 'mal' ? 3400 : 1900); return () => clearTimeout(t) }, [texto, tipo])
  return <div className={`toast toast-${tipo}`} role="status">{texto}</div>
}

export function Cielo() {
  const estrellas = useMemo(() => Array.from({ length: 70 }, () => ({ x: Math.random() * 100, y: Math.random() * 70, s: Math.random() * 2 + 0.6, d: Math.random() * 4 })), [])
  return (
    <div className="cielo" aria-hidden>
      {estrellas.map((e, i) => <i key={i} style={{ left: e.x + '%', top: e.y + '%', width: e.s, height: e.s, animationDelay: e.d + 's' }} />)}
    </div>
  )
}
