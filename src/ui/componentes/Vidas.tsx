import { useEffect, useState } from 'react'
import { useProgreso } from '../progreso'
import { Boton } from './Comunes'

/** Segundos que faltan para la próxima vida (descontando lo que pasó desde que se leyó). */
export function useProximaVida() {
  const { vidas, vidasEn, cargarVidas } = useProgreso()
  const [, tic] = useState(0)
  useEffect(() => {
    if (!vidas || vidas.proxima_s === null) return
    const t = setInterval(() => tic(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [vidas])
  const resta = !vidas || vidas.proxima_s === null ? null : Math.max(0, vidas.proxima_s - Math.floor((Date.now() - vidasEn) / 1000))
  // Llegó la hora: se pide al servidor la vida nueva
  useEffect(() => { if (resta === 0) { const t = setTimeout(() => { void cargarVidas() }, 800); return () => clearTimeout(t) } }, [resta === 0]) // eslint-disable-line react-hooks/exhaustive-deps
  return resta
}
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Corazones en el mapa: cuántas vidas tienes y cuándo llega la próxima. */
export function HudVidas() {
  const vidas = useProgreso(s => s.vidas)
  const resta = useProximaVida()
  const [ayuda, setAyuda] = useState(false)
  if (!vidas) return null
  return (
    <>
      <button className={`hud-vidas ${vidas.vidas === 0 ? 'vacias' : ''}`} onClick={() => setAyuda(true)} aria-label={`Vidas: ${vidas.vidas} de ${vidas.max}`}>
        <i className="corazon" aria-hidden />
        <b>{vidas.vidas}</b>
        {resta !== null && <small>+1 en {mmss(resta)}</small>}
      </button>
      {ayuda && <AyudaVidas onCerrar={() => setAyuda(false)} />}
    </>
  )
}

export function AyudaVidas({ onCerrar }: { onCerrar: () => void }) {
  const vidas = useProgreso(s => s.vidas)
  const resta = useProximaVida()
  if (!vidas) return null
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop ayuda-vidas" role="dialog" aria-modal="true" aria-label="Tus vidas" onClick={e => e.stopPropagation()}>
        <h2>Tus vidas</h2>
        <div className="fila-corazones" aria-hidden>
          {Array.from({ length: Math.max(vidas.max, vidas.vidas) }, (_, i) => <i key={i} className={`corazon ${i < vidas.vidas ? '' : 'vacio'}`} />)}
        </div>
        <ul>
          <li>Cada <b>desafío</b> usa 1 vida. <b>Si lo apruebas, la recuperas.</b></li>
          <li>Se recarga <b>1 vida cada 20 minutos</b>{resta !== null ? ` (la próxima en ${mmss(resta)})` : ''}.</li>
          <li>El <b>reto del día</b> es gratis una vez al día y, si lo cumples, <b>recarga todas tus vidas</b>.</li>
          <li>Con racha de 3 días tienes <b>6 vidas</b>; con 7 días, <b>7</b>. Tu racha: <b>{vidas.racha}</b> {vidas.racha === 1 ? 'día' : 'días'}.</li>
          <li>Máximo normal: <b>5 vidas</b>. Si tu líder o el administrador te regala vidas, puedes llegar hasta <b>10</b>.</li>
          <li>Practicar, las salas del líder y los duelos <b>no gastan vidas</b>.</li>
        </ul>
        <Boton onClick={onCerrar}>Entendido</Boton>
      </div>
    </div>
  )
}
