import { useEffect, useMemo, useState } from 'react'
import { useJuego } from '../estado'
import { Boton, Cielo, Confeti } from '../componentes/Comunes'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { MUNDOS_JUGABLES, MUNDO_UNIFORMES, TODOS_LOS_NIVELES } from '../../domain/niveles'
import { DIFICULTADES } from '../../domain/dificultad'
import type { Dificultad } from '../../domain/tipos'

/** Sala en vivo: el líder elige el nivel, todos juegan a la vez y el avance se ve en tiempo real. */
export default function Sala() {
  const { sala, perfil, ir, dejarSala, iniciarRonda } = useJuego()
  const [nivelId, setNivelId] = useState(MUNDO_UNIFORMES.niveles[1].id)
  const [dif, setDif] = useState<Dificultad>('medio')
  const [cuenta, setCuenta] = useState<number | null>(null)
  const [copiado, setCopiado] = useState(false)
  const ronda = sala?.ronda

  useEffect(() => {
    if (!ronda) return
    const restante = ronda.cuentaAtras - Math.floor((Date.now() - (sala?.rondaRecibida ?? 0)) / 1000)
    if (restante <= 0) return
    setCuenta(restante)
    const t = setInterval(() => setCuenta(c => (c === null || c <= 1 ? null : c - 1)), 1000)
    return () => clearInterval(t)
  }, [ronda]) // eslint-disable-line react-hooks/exhaustive-deps

  const jugadores = useMemo(() => (sala?.jugadores ?? []).filter(j => !j.anfitrion), [sala?.jugadores])
  const tabla = useMemo(() => {
    const p = sala?.progresos ?? {}
    return jugadores.map(j => ({ ...j, prog: p[j.id] })).sort((a, b) =>
      (b.prog?.puntaje ?? -1) - (a.prog?.puntaje ?? -1) || (b.prog?.avance ?? 0) - (a.prog?.avance ?? 0))
  }, [jugadores, sala?.progresos])

  if (!sala || !perfil) {
    return (
      <div className="pantalla sala"><Cielo />
        <div className="sala-cuerpo"><p>La sala se cerró.</p><Boton onClick={() => ir('mapa')}>Volver al mapa</Boton></div>
      </div>
    )
  }

  const anfitrion = sala.rol === 'anfitrion'
  const duelo = sala.tipo === 'duelo' ? sala.duelo : undefined
  const nivelRonda = ronda ? TODOS_LOS_NIVELES.find(n => n.id === ronda.nivelId) : null
  const terminaron = tabla.filter(t => t.prog?.puntaje !== undefined).length
  const todosTerminaron = !!ronda && jugadores.length > 0 && terminaron === jugadores.length
  const copiar = async () => { try { await navigator.clipboard.writeText(sala.conexion.codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1400) } catch { /* */ } }
  const salirSala = async () => { await dejarSala(); ir(duelo ? 'club' : 'mapa') }
  const yoProg = sala.progresos[perfil.id], rivalProg = duelo ? sala.progresos[duelo.rival.id] : undefined
  const dueloFin = !!duelo && yoProg?.puntaje !== undefined && rivalProg?.puntaje !== undefined
  const gane = dueloFin && (yoProg!.puntaje! > rivalProg!.puntaje! || (yoProg!.puntaje === rivalProg!.puntaje && (yoProg!.segundos ?? 0) < (rivalProg!.segundos ?? 0)))
  const empate = dueloFin && yoProg!.puntaje === rivalProg!.puntaje && yoProg!.segundos === rivalProg!.segundos

  return (
    <div className="pantalla sala">
      <Cielo />
      {(duelo ? dueloFin && gane : todosTerminaron) && <Confeti cantidad={60} />}
      <header className="juego-cabeza">
        <button className="icono" onClick={salirSala} aria-label="Salir de la sala">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><strong>{duelo ? `Duelo contra ${duelo.rival.apodo}` : anfitrion ? 'Tu sala en vivo' : 'Sala en vivo'}</strong></div>
        {!duelo && <button className="codigo-sala" onClick={copiar} aria-label="Copiar código de la sala">{copiado ? '¡Copiado!' : sala.conexion.codigo}</button>}
      </header>

      <div className="sala-cuerpo">
        {sala.cerrada && <p className="aviso-demo">El líder cerró la sala.</p>}

        {anfitrion && !ronda && (
          <section className="parche sala-codigo">
            <p>Pide a tus Conquistadores que toquen <b>Unirme a una sala</b> en el mapa y escriban:</p>
            <div className="codigo grande">{sala.conexion.codigo}</div>
          </section>
        )}

        {duelo && (
          <section className={`parche duelo-vs ${dueloFin ? (empate ? 'empate' : gane ? 'gane' : 'perdi') : ''}`}>
            {dueloFin && <div className="fin-titular"><span>{empate ? '¡Empate!' : gane ? '¡Ganaste el duelo!' : `Ganó ${duelo.rival.apodo}`}</span></div>}
            <div className="reto-vs">
              <div><PixelAvatar a={perfil.avatar} rango={perfil.rango} animo={dueloFin && gane ? 'celebra' : 'idle'} alto={128} /><b>{perfil.apodo}</b><span className="pts">{yoProg?.puntaje ?? (ronda ? `${Math.round((yoProg?.avance ?? 0) * 100)}%` : '…')}</span></div>
              <b className="vs">VS</b>
              <div><PixelAvatar a={duelo.rival.avatar ?? {}} rango={duelo.rival.rango} animo={dueloFin && !gane && !empate ? 'celebra' : 'idle'} alto={128} /><b>{duelo.rival.apodo}</b><span className="pts">{rivalProg?.puntaje ?? (ronda ? `${Math.round((rivalProg?.avance ?? 0) * 100)}%` : '…')}</span></div>
            </div>
            {!ronda && <p>Esperando a que {duelo.rival.apodo} entre…</p>}
            {ronda && !dueloFin && <p>{yoProg?.puntaje !== undefined ? `Terminaste. Esperando a ${duelo.rival.apodo}…` : '¡A jugar!'}</p>}
            {sala.cerrada && !dueloFin && <p>{duelo.rival.apodo} salió del duelo.</p>}
            <Boton onClick={salirSala}>Volver a la isla</Boton>
          </section>
        )}

        {!anfitrion && !ronda && !duelo && (
          <section className="parche sala-espera">
            <div className="latido-sala" aria-hidden />
            <p>Estás dentro. Espera a que el líder empiece la ronda.</p>
          </section>
        )}

        {ronda && nivelRonda && !duelo && (
          <section className="parche ronda-info">
            <span>Ronda {ronda.ronda}</span>
            <strong>{nivelRonda.titulo}</strong>
            <small>Dificultad {DIFICULTADES[ronda.dificultad].nombre}. Terminaron {terminaron} de {jugadores.length}.</small>
          </section>
        )}

        {!duelo && <section className="parche">
          <h3>{ronda ? 'Carrera en vivo' : `Conectados (${jugadores.length})`}</h3>
          <ul className="carrera">
            {tabla.map((j, i) => (
              <li key={j.id} className={j.id === perfil.id ? 'yo' : ''}>
                <span className="pos">{ronda && j.prog?.puntaje !== undefined ? i + 1 : '·'}</span>
                <span className="quien"><b>{j.apodo}</b><small>{j.club}</small></span>
                {ronda ? (
                  <span className="pista-carrera"><i style={{ width: `${Math.round((j.prog?.avance ?? 0) * 100)}%` }} /></span>
                ) : <span className="listo">Listo</span>}
                {ronda && <span className="pts">{j.prog?.puntaje ?? '…'}</span>}
              </li>
            ))}
            {tabla.length === 0 && <li className="vacio">Todavía no entra nadie.</li>}
          </ul>
        </section>}

        {anfitrion && (
          <section className="parche">
            <h3>{ronda ? 'Siguiente ronda' : 'Elige el reto'}</h3>
            <label className="campo-select">Nivel
              <select id="sala-nivel" value={nivelId} onChange={e => setNivelId(e.target.value)}>
                {MUNDOS_JUGABLES.map(m => (
                  <optgroup key={m.id} label={m.nombre}>
                    {m.niveles.filter(n => n.tipo !== 'ceremonia').map(n => <option key={n.id} value={n.id}>{n.num}. {n.titulo}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="chips dificultad">
              {(Object.keys(DIFICULTADES) as Dificultad[]).map(d => (
                <button key={d} className={dif === d ? 'on' : ''} onClick={() => setDif(d)}>{DIFICULTADES[d].nombre}</button>
              ))}
            </div>
            <Boton onClick={() => iniciarRonda(nivelId, dif)} disabled={jugadores.length === 0}>{ronda ? 'Empezar otra ronda' : 'Empezar ronda'}</Boton>
            {jugadores.length === 0 && <p className="ayuda">Necesitas al menos un jugador conectado.</p>}
          </section>
        )}

        {!anfitrion && ronda && nivelRonda && (
          <p className="ayuda centro">Cuando termines tu ronda, aquí verás cómo van los demás.</p>
        )}
      </div>

      {cuenta !== null && !anfitrion && (
        <div className="velo cuenta"><span key={cuenta}>{cuenta}</span></div>
      )}
    </div>
  )
}
