import { useEffect, useMemo, useState } from 'react'
import { useJuego } from '../estado'
import { musica } from '../musica'
import { Boton, Cielo, Confeti } from '../componentes/Comunes'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { CodigoQR, enlaceSala } from '../componentes/CodigoQR'
import { MUNDOS_JUGABLES, MUNDO_UNIFORMES, TODOS_LOS_NIVELES } from '../../domain/niveles'
import { DIFICULTADES } from '../../domain/dificultad'
import type { Dificultad } from '../../domain/tipos'
import type { FilaSala, ResultadoDuelo } from '../../application/puertos'
import { Podio } from '../componentes/Podio'
import { useProgreso } from '../progreso'

/** Sala en vivo: el líder elige el nivel, todos juegan a la vez y el avance se ve en tiempo real. */
export default function Sala() {
  const { sala, perfil, ir, dejarSala, iniciarRonda, repo } = useJuego()
  useEffect(() => { musica('himno_epico') }, [])
  const [oficial, setOficial] = useState<ResultadoDuelo | null>(null)
  const [podio, setPodio] = useState<FilaSala[] | null>(null)
  const pedirPodio = () => {
    const s = useJuego.getState().sala
    if (!s?.ronda || !repo.salas) return
    repo.salas.resultadoSala(s.conexion.codigo, s.ronda.nivelId, new Date(s.rondaRecibida - 120000).toISOString())
      .then(f => setPodio(f)).catch(() => undefined)
  }
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

  // Sala: al empezar otra ronda se borra el podio anterior
  useEffect(() => { setPodio(null) }, [sala?.ronda?.ronda])
  // Cuando todos terminan, el podio oficial se pide al servidor (una vez por ronda)
  const finTodos = !!sala?.ronda && sala.tipo !== 'duelo' && jugadores.length > 0 && tabla.every(t => t.prog?.puntaje !== undefined)
  useEffect(() => {
    if (!finTodos) return
    const t = setTimeout(pedirPodio, 1500)
    return () => clearTimeout(t)
  }, [finTodos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Duelo: cuando los dos avisan que terminaron, se pide el resultado OFICIAL al servidor (calculado con los intentos guardados)
  const esDuelo = sala?.tipo === 'duelo'
  const ambosAvisaron = esDuelo && !!perfil && !!sala?.duelo && sala.progresos[perfil.id]?.puntaje !== undefined && sala.progresos[sala.duelo.rival.id]?.puntaje !== undefined
  useEffect(() => {
    if (!ambosAvisaron || !sala || oficial?.terminado || !repo.salas) return
    let vivo = true, intentos = 0
    const pedir = () => repo.salas!.resultadoDuelo(sala.conexion.codigo)
      .then(r => { if (!vivo) return; if (r.terminado) { setOficial(r); useProgreso.getState().refrescarStats() } else if (++intentos < 6) setTimeout(pedir, 1500) })
      .catch(() => undefined)
    pedir()
    return () => { vivo = false }
  }, [ambosAvisaron]) // eslint-disable-line react-hooks/exhaustive-deps

  // Abandono: si el rival se desconectó y tú ya terminaste, cuenta 40 s y pide la victoria al servidor
  const rivalPresente = !!sala?.duelo && sala.jugadores.some(j => j.id === sala.duelo!.rival.id)
  const yoTermine = !!perfil && sala?.progresos[perfil.id]?.puntaje !== undefined
  const [espera, setEspera] = useState<number | null>(null)
  useEffect(() => {
    if (!esDuelo || !sala?.ronda || rivalPresente || !yoTermine || oficial?.terminado || !repo.salas) { setEspera(null); return }
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
  }, [esDuelo, !!sala?.ronda, rivalPresente, yoTermine, oficial?.terminado]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!sala || !perfil) {
    return (
      <div className="pantalla sala"><Cielo />
        <div className="sala-cuerpo"><p>La sala se cerró.</p><Boton onClick={() => ir('mapa')}>Volver al mapa</Boton></div>
      </div>
    )
  }

  const anfitrion = sala.rol === 'anfitrion'
  const clubes = new Set(jugadores.map(j => j.club)).size
  const duelo = sala.tipo === 'duelo' ? sala.duelo : undefined
  const nivelRonda = ronda ? TODOS_LOS_NIVELES.find(n => n.id === ronda.nivelId) : null
  const terminaron = tabla.filter(t => t.prog?.puntaje !== undefined).length
  const todosTerminaron = !!ronda && jugadores.length > 0 && terminaron === jugadores.length
  const copiar = async () => { try { await navigator.clipboard.writeText(sala.conexion.codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1400) } catch { /* */ } }
  const salirSala = async () => { await dejarSala(); ir(duelo ? 'club' : 'mapa') }
  const yoProg = sala.progresos[perfil.id], rivalProg = duelo ? sala.progresos[duelo.rival.id] : undefined
  const dueloFin = (!!duelo && yoProg?.puntaje !== undefined && rivalProg?.puntaje !== undefined) || !!oficial?.terminado
  const ptsOf = (id: string) => oficial?.jugadores.find(j => j.id === id)?.puntaje ?? undefined
  const misPts = ptsOf(perfil.id) ?? yoProg?.puntaje, susPts = duelo ? ptsOf(duelo.rival.id) ?? rivalProg?.puntaje : undefined
  const gane = oficial ? oficial.ganador === perfil.id
    : dueloFin && (yoProg!.puntaje! > rivalProg!.puntaje! || (yoProg!.puntaje === rivalProg!.puntaje && (yoProg!.segundos ?? 0) < (rivalProg!.segundos ?? 0)))
  const empate = oficial ? oficial.ganador === null : dueloFin && yoProg!.puntaje === rivalProg!.puntaje && yoProg!.segundos === rivalProg!.segundos

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
            <p>Conquistadores y líderes de <b>cualquier club</b> pueden entrar: escanean el QR con la cámara o tocan <b>Unirme a una sala</b> en el menú y escriben:</p>
            <div className="sala-entrada">
              <CodigoQR texto={enlaceSala(sala.conexion.codigo)} size={190} />
              <div className="codigo grande">{sala.conexion.codigo}</div>
            </div>
            <button className="enlace" onClick={() => navigator.clipboard?.writeText(enlaceSala(sala.conexion.codigo)).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1400) }).catch(() => undefined)}>{copiado ? '¡Enlace copiado!' : 'Copiar enlace para WhatsApp'}</button>
          </section>
        )}

        {duelo && (
          <section className={`parche duelo-vs ${dueloFin ? (empate ? 'empate' : gane ? 'gane' : 'perdi') : ''}`}>
            {dueloFin && <div className="fin-titular"><span>{empate ? '¡Empate!' : gane ? '¡Ganaste el duelo!' : `Ganó ${duelo.rival.apodo}`}</span></div>}
            <div className="reto-vs">
              <div><PixelAvatar a={perfil.avatar} rango={perfil.rango} animo={dueloFin && gane ? 'celebra' : 'idle'} alto={128} /><b>{perfil.apodo}</b><span className="pts">{misPts ?? (ronda ? `${Math.round((yoProg?.avance ?? 0) * 100)}%` : '…')}</span></div>
              <b className="vs">VS</b>
              <div><PixelAvatar a={duelo.rival.avatar ?? {}} rango={duelo.rival.rango} animo={dueloFin && !gane && !empate ? 'celebra' : 'idle'} alto={128} /><b>{duelo.rival.apodo}</b><span className="pts">{susPts ?? (ronda ? `${Math.round((rivalProg?.avance ?? 0) * 100)}%` : '…')}</span></div>
            </div>
            {dueloFin && <p className="verificado">{oficial?.abandono ? `${duelo.rival.apodo} se desconectó: ganas por abandono` : oficial ? 'Resultado verificado por el servidor' : 'Verificando el resultado…'}</p>}
            {espera !== null && !dueloFin && <p className="aviso-abandono">{duelo.rival.apodo} se desconectó. {espera > 0 ? `Si no vuelve en ${espera} s, ganas por abandono.` : 'Comprobando con el servidor…'}</p>}
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

        {podio && podio.length > 0 && !duelo && (
          <section className="parche podio-sala">
            <h3 className="podio-titulo">¡Podio de la ronda!</h3>
            <Podio top={podio.slice(0, 3).map(f => ({ nombre: f.apodo, avatar: f.avatar, rango: f.rango, puntos: f.puntaje }))} />
            <ol className="carrera oficial">
              {podio.map(f => (
                <li key={f.id} className={f.id === perfil.id ? 'yo' : ''}>
                  <span className="pos">{f.posicion}</span>
                  <span className="quien"><b>{f.apodo}</b><small>{f.club}</small></span>
                  <span className="pts">{f.puntaje}</span>
                </li>
              ))}
            </ol>
            <p className="verificado">Resultado verificado por el servidor</p>
          </section>
        )}

        {!duelo && <section className="parche">
          <h3>{ronda ? 'Carrera en vivo' : `Conectados (${jugadores.length})`}{clubes > 1 ? ` · ${clubes} clubes` : ''}</h3>
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
            {ronda && !podio && terminaron > 0 && <Boton tipo="azul" onClick={pedirPodio}>Ver podio ahora ({terminaron} de {jugadores.length} terminaron)</Boton>}
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
