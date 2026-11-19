import { useEffect, useMemo, useRef, useState } from 'react'
import type { AvatarConfig, ResultadoDuelo } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { useJuego, type EstadoSala } from '../estado'
import { useProgreso } from '../progreso'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { Boton, Confeti } from './Comunes'
import { Podio } from './Podio'
import { sfx } from '../sonido'

interface Quien { id: string; apodo: string; club: string; avatar?: AvatarConfig | null; rango?: Rango }
interface Fila extends Quien { avance: number; puntaje?: number; segundos?: number; posicion?: number; presente: boolean }

/**
 * Reto en vivo de 2 a 4 jugadores. Durante la partida se ve cómo avanza cada uno; al final, el resultado OFICIAL
 * (calculado por el servidor con los intentos guardados) con el ganador y, si son 3 o más, el podio.
 * Si alguien se desconecta y los demás ya terminaron, a los 40 s se cierra y gana el mejor de los que terminaron.
 */
export function RetoVivo({ sala, onSalir }: { sala: EstadoSala; onSalir: () => void }) {
  const { perfil, repo } = useJuego()
  const [oficial, setOficial] = useState<ResultadoDuelo | null>(null)
  const [espera, setEspera] = useState<number | null>(null)

  // Todos los que alguna vez estuvieron en el reto (aunque luego se desconecten)
  const conocidos = useRef(new Map<string, Quien>())
  for (const r of sala.duelo?.rivales ?? []) if (!conocidos.current.has(r.id)) conocidos.current.set(r.id, r)
  for (const j of sala.jugadores) conocidos.current.set(j.id, { ...conocidos.current.get(j.id), ...j })
  if (perfil) conocidos.current.set(perfil.id, { id: perfil.id, apodo: perfil.apodo, club: perfil.club.nombre, avatar: perfil.avatar, rango: perfil.rango })

  // Quiénes juegan: los que estaban en la sala cuando empezó la ronda (+ los que sigan dentro)
  const [alInicio, setAlInicio] = useState<string[]>([])
  useEffect(() => { if (sala.ronda) setAlInicio(useJuego.getState().sala?.jugadores.map(j => j.id) ?? []) }, [sala.ronda?.ronda]) // eslint-disable-line react-hooks/exhaustive-deps
  const presentes = new Set(sala.jugadores.map(j => j.id))
  const ids = [...new Set([...alInicio, ...sala.jugadores.map(j => j.id)])]

  const filas: Fila[] = useMemo(() => ids.map(id => {
    const q = conocidos.current.get(id) ?? { id, apodo: '…', club: '' }
    const p = sala.progresos[id], o = oficial?.jugadores.find(j => j.id === id)
    return { ...q, avance: p?.avance ?? 0, puntaje: o?.puntaje ?? p?.puntaje, segundos: o?.segundos ?? p?.segundos, posicion: o?.posicion ?? undefined, presente: presentes.has(id) }
  }).sort((a, b) => (a.posicion ?? 99) - (b.posicion ?? 99) || (b.puntaje ?? -1) - (a.puntaje ?? -1) || b.avance - a.avance),
  [ids.join(), sala.progresos, oficial, sala.jugadores]) // eslint-disable-line react-hooks/exhaustive-deps

  const yo = perfil?.id ?? ''
  const todosAvisaron = !!sala.ronda && filas.length >= 2 && filas.every(f => f.puntaje !== undefined)
  const yoTermine = sala.progresos[yo]?.puntaje !== undefined
  const ausentes = filas.filter(f => !f.presente && f.puntaje === undefined)

  // Resultado oficial: cuando todos avisaron que terminaron (reintenta unas veces por si el servidor aún guarda)
  useEffect(() => {
    if (!todosAvisaron || oficial?.terminado || !repo.salas) return
    let vivo = true, intentos = 0
    const pedir = () => repo.salas!.resultadoDuelo(sala.conexion.codigo)
      .then(r => { if (!vivo) return; if (r.terminado) { setOficial(r); useProgreso.getState().refrescarStats() } else if (++intentos < 6) setTimeout(pedir, 1500) })
      .catch(() => undefined)
    pedir()
    return () => { vivo = false }
  }, [todosAvisaron]) // eslint-disable-line react-hooks/exhaustive-deps

  // Abandono: alguien se fue sin terminar y tú ya terminaste → a los 40 s se pide cerrar el reto
  useEffect(() => {
    if (!sala.ronda || ausentes.length === 0 || !yoTermine || oficial?.terminado || !repo.salas) { setEspera(null); return }
    let resta = 40, vivo = true
    setEspera(resta)
    const t = setInterval(() => {
      resta -= 1
      if (!vivo) return
      setEspera(Math.max(0, resta))
      if (resta <= 0 && resta % 20 === 0) {
        repo.salas!.reclamarAbandono(sala.conexion.codigo)
          .then(r => { if (vivo && r.terminado) { setOficial(r); useProgreso.getState().refrescarStats() } })
          .catch(() => undefined)
      }
    }, 1000)
    return () => { vivo = false; clearInterval(t) }
  }, [!!sala.ronda, ausentes.length, yoTermine, oficial?.terminado]) // eslint-disable-line react-hooks/exhaustive-deps

  const fin = !!oficial?.terminado || todosAvisaron
  const lider = filas[0]
  const gane = oficial ? oficial.ganador === yo : fin && lider?.id === yo
  const empate = oficial ? oficial.terminado && oficial.ganador === null : false
  const ganador = oficial?.ganador ? filas.find(f => f.id === oficial.ganador) : fin ? lider : undefined
  useEffect(() => { if (oficial?.terminado) (gane ? sfx.victoria : sfx.nivel)() }, [oficial?.terminado]) // eslint-disable-line react-hooks/exhaustive-deps

  const grupo = filas.length > 2 || (sala.duelo?.rivales.length ?? 1) > 1
  const otros = filas.filter(f => f.id !== yo)
  const titular = !fin ? null : empate ? '¡Empate!' : gane ? (grupo ? '¡Ganaste el reto!' : '¡Ganaste el duelo!') : `Ganó ${ganador?.apodo ?? '…'}`
  const pts = (f: Fila) => f.puntaje ?? (sala.ronda ? `${Math.round(f.avance * 100)}%` : '…')

  return (
    <section className={`parche duelo-vs ${grupo ? 'grupo' : ''} ${fin ? (empate ? 'empate' : gane ? 'gane' : 'perdi') : ''}`}>
      {fin && gane && <Confeti cantidad={70} />}
      {titular && <div className="fin-titular"><span>{titular}</span></div>}

      {!grupo ? (
        <div className="reto-vs">
          {[filas.find(f => f.id === yo), otros[0]].map((f, k) => f && (
            <div key={f.id} className={!f.presente && f.puntaje === undefined ? 'ausente' : ''}>
              <PixelAvatar a={f.avatar ?? {}} rango={f.rango ?? 'conquistador'} animo={fin && ganador?.id === f.id ? 'celebra' : 'idle'} alto={128} />
              <b>{k === 0 ? `${f.apodo} (tú)` : f.apodo}</b>
              <span className="pts">{pts(f)}</span>
              {sala.ronda && !fin && <span className="mini-pista"><i style={{ width: `${Math.round(f.avance * 100)}%` }} /></span>}
            </div>
          )).flatMap((el, k) => (k === 0 ? [el, <b key="vs" className="vs">VS</b>] : [el]))}
        </div>
      ) : fin ? (
        <>
          <Podio top={filas.slice(0, 3).map(f => ({ nombre: f.id === yo ? `${f.apodo} (tú)` : f.apodo, avatar: f.avatar, rango: f.rango, puntos: f.puntaje }))} />
          <ol className="carrera oficial">
            {filas.map((f, i) => (
              <li key={f.id} className={f.id === yo ? 'yo' : ''}>
                <span className="pos">{f.posicion ?? i + 1}</span>
                <span className="quien"><b>{f.apodo}</b><small>{f.club}</small></span>
                <span className="pts">{f.puntaje ?? 'no terminó'}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="arena-grupo">
          {filas.map((f, i) => (
            <div key={f.id} className={`arena-jugador ${f.id === yo ? 'yo' : ''} ${!f.presente && f.puntaje === undefined ? 'ausente' : ''} ${sala.ronda && i === 0 && f.avance > 0 ? 'punta' : ''}`}>
              {sala.ronda && i === 0 && f.avance > 0 && <span className="corona" aria-label="Va primero">👑</span>}
              <PixelAvatar a={f.avatar ?? {}} rango={f.rango ?? 'conquistador'} animo={f.puntaje !== undefined ? 'saluda' : 'idle'} alto={92} />
              <b>{f.id === yo ? 'Tú' : f.apodo}</b>
              <span className="mini-pista"><i style={{ width: `${Math.round(f.avance * 100)}%` }} /></span>
              <span className="pts">{f.puntaje !== undefined ? `${f.puntaje} pts` : sala.ronda ? `${Math.round(f.avance * 100)}%` : f.presente ? 'Listo' : 'Esperando…'}</span>
            </div>
          ))}
        </div>
      )}

      {fin && <p className="verificado">{oficial?.abandono ? 'Alguien se desconectó: gana el mejor de los que terminaron' : oficial ? 'Resultado verificado por el servidor' : 'Verificando el resultado…'}</p>}
      {espera !== null && !fin && <p className="aviso-abandono">{ausentes.map(a => a.apodo).join(', ')} se desconectó. {espera > 0 ? `Si no vuelve en ${espera} s, el reto se cierra con los que terminaron.` : 'Comprobando con el servidor…'}</p>}
      {!sala.ronda && <p>Esperando a que entren todos…</p>}
      {sala.ronda && !fin && <p>{yoTermine ? `Terminaste. Esperando a ${otros.filter(o => o.puntaje === undefined).map(o => o.apodo).join(', ') || 'los demás'}…` : '¡A jugar!'}</p>}
      <Boton onClick={onSalir}>Volver al club</Boton>
    </section>
  )
}
