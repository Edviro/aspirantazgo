import { useEffect, useMemo, useState } from 'react'
import { useJuego } from '../estado'
import { musica } from '../musica'
import { Boton, Cielo, Confeti } from '../componentes/Comunes'
import { CodigoQR, enlaceSala } from '../componentes/CodigoQR'
import { MUNDO_UNIFORMES, TODOS_LOS_NIVELES } from '../../domain/niveles'
import { CAMPAMENTOS, campamentoDeNivel, nivelesDe } from '../../domain/campamentos'
import { DIFICULTADES } from '../../domain/dificultad'
import type { Dificultad } from '../../domain/tipos'
import type { FilaSala, FilaTotalSala } from '../../application/puertos'
import { Podio } from '../componentes/Podio'
import { RetoVivo } from '../componentes/RetoVivo'

/** Sala en vivo: el líder elige el nivel, todos juegan a la vez y el avance se ve en tiempo real. */
export default function Sala() {
  const { sala, perfil, ir, dejarSala, iniciarRonda, repo } = useJuego()
  useEffect(() => { musica('himno_epico') }, [])
  const [podio, setPodio] = useState<FilaSala[] | null>(null)
  const [total, setTotal] = useState<FilaTotalSala[] | null>(null)
  const pedirTotal = () => {
    const s = useJuego.getState().sala
    if (!s || !repo.salas || s.tipo === 'duelo') return
    repo.salas.totalSala(s.conexion.codigo).then(setTotal).catch(() => undefined)
  }
  const pedirPodio = () => {
    const s = useJuego.getState().sala
    if (!s?.ronda || !repo.salas) return
    repo.salas.resultadoSala(s.conexion.codigo, s.ronda.nivelId, new Date(s.rondaRecibida - 120000).toISOString())
      .then(f => { setPodio(f); pedirTotal() }).catch(() => undefined)
  }
  // Plan de dinámicas del líder (varios niveles seguidos; el puntaje de la sala se acumula)
  const [plan, setPlan] = useState<string[]>([])
  const [paso, setPaso] = useState(0)
  const [nivelId, setNivelId] = useState(MUNDO_UNIFORMES.niveles[1].id)
  const [campId, setCampId] = useState(CAMPAMENTOS[0].id)
  const elegirCamp = (id: string) => {
    const c = CAMPAMENTOS.find(x => x.id === id)
    const primero = c && nivelesDe(c).find(n => n.tipo !== 'ceremonia')
    if (!primero) return
    setCampId(id); setNivelId(primero.id)
  }
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
  // Campamento de la sala: el del nivel en juego, o el que el líder está eligiendo
  const campSala = ronda ? campamentoDeNivel(ronda.nivelId) : anfitrion ? CAMPAMENTOS.find(c => c.id === campId) ?? CAMPAMENTOS[0] : null
  const campElegido = CAMPAMENTOS.find(c => c.id === campId) ?? CAMPAMENTOS[0]
  const terminaron = tabla.filter(t => t.prog?.puntaje !== undefined).length
  const todosTerminaron = !!ronda && jugadores.length > 0 && terminaron === jugadores.length
  const copiar = async () => { try { await navigator.clipboard.writeText(sala.conexion.codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1400) } catch { /* */ } }
  const salirSala = async () => { await dejarSala(); ir(duelo ? 'club' : 'mapa') }
  return (
    <div className="pantalla sala">
      <Cielo />
      {!duelo && todosTerminaron && <Confeti cantidad={60} />}
      <header className="juego-cabeza">
        <button className="icono" onClick={salirSala} aria-label="Salir de la sala">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><strong>{duelo ? (duelo.rivales.length > 1 || jugadores.length > 2 ? `Reto de ${Math.max(jugadores.length, duelo.rivales.length + 1)} jugadores` : `Duelo contra ${duelo.rivales[0]?.apodo ?? ''}`) : anfitrion ? 'Tu sala en vivo' : 'Sala en vivo'}</strong>
          {!duelo && campSala && <small className="sala-camp" style={{ ['--c' as string]: campSala.color }}><i aria-hidden />{campSala.nombre}</small>}</div>
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

        {duelo && <RetoVivo sala={sala} onSalir={salirSala} />}

        {!anfitrion && !ronda && !duelo && (
          <section className="parche sala-espera">
            <div className="latido-sala" aria-hidden />
            <p>Estás dentro. Espera a que el líder empiece la ronda.</p>
          </section>
        )}

        {ronda && nivelRonda && !duelo && (
          <section className="parche ronda-info">
            <span>Ronda {ronda.ronda} · {campamentoDeNivel(ronda.nivelId).corto}</span>
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

        {total && total.length > 0 && !duelo && (ronda?.ronda ?? 0) >= 2 && (
          <section className="parche podio-sala total-sala">
            <h3 className="podio-titulo">Puntaje total de la sala</h3>
            <p className="ayuda centro">Suma de las {ronda?.ronda} dinámicas jugadas.</p>
            <Podio top={total.slice(0, 3).map(f => ({ nombre: f.apodo, avatar: f.avatar, rango: f.rango, puntos: f.puntaje }))} />
            <ol className="carrera oficial">
              {total.map(f => (
                <li key={f.id} className={f.id === perfil.id ? 'yo' : ''}>
                  <span className="pos">{f.posicion}</span>
                  <span className="quien"><b>{f.apodo}</b><small>{f.club} · {f.rondas} {f.rondas === 1 ? 'dinámica' : 'dinámicas'}</small></span>
                  <span className="pts">{f.puntaje}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {anfitrion && (
          <section className="parche plan-sala">
            <h3>Dinámicas de la sala</h3>
            <p className="ayuda">Arma la lista de retos que jugarán tus Conquistadores. Al final se suma el puntaje de todas.</p>
            {plan.length > 0 && (
              <ol className="plan-lista">
                {plan.map((id, i) => {
                  const n = TODOS_LOS_NIVELES.find(x => x.id === id)
                  return (
                    <li key={id + i} className={i < paso ? 'hecha' : i === paso ? 'siguiente' : ''}>
                      <span className="pos">{i + 1}</span><span className="quien"><b>{n?.titulo}</b><small>{campamentoDeNivel(id).corto}{i < paso ? ' · Jugada' : ''}</small></span>
                      {i >= paso && <button className="quitar" onClick={() => setPlan(p => p.filter((_, k) => k !== i))} aria-label={`Quitar ${n?.titulo}`}>×</button>}
                    </li>
                  )
                })}
              </ol>
            )}
            <div className="chips sala-camps" role="radiogroup" aria-label="Campamento">
              {CAMPAMENTOS.map(c => {
                const listo = nivelesDe(c).length > 0
                return <button key={c.id} role="radio" aria-checked={campId === c.id} className={campId === c.id ? 'on' : ''} style={{ ['--c' as string]: c.color }}
                  disabled={!listo} onClick={() => elegirCamp(c.id)} title={listo ? c.nombre : `${c.nombre}: próximamente`}><i aria-hidden />{c.corto}{listo ? '' : ' 🔒'}</button>
              })}
            </div>
            <div className="plan-agregar">
              <label className="campo-select">Nivel del {campElegido.nombre}
                <select id="sala-nivel" value={nivelId} onChange={e => setNivelId(e.target.value)}>
                  {nivelesDe(campElegido).filter(n => n.tipo !== 'ceremonia').map(n => <option key={n.id} value={n.id}>{n.num}. {n.titulo}</option>)}
                </select>
              </label>
              <Boton tipo="azul" onClick={() => setPlan(p => (p.length < 10 ? [...p, nivelId] : p))} disabled={plan.length >= 10}>＋ Agregar</Boton>
            </div>
            <div className="chips dificultad">
              {(Object.keys(DIFICULTADES) as Dificultad[]).map(d => (
                <button key={d} className={dif === d ? 'on' : ''} onClick={() => setDif(d)}>{DIFICULTADES[d].nombre}</button>
              ))}
            </div>
            {ronda && !podio && terminaron > 0 && <Boton tipo="azul" onClick={pedirPodio}>Ver podio ahora ({terminaron} de {jugadores.length} terminaron)</Boton>}
            {plan.length > 0 ? (
              paso < plan.length
                ? <Boton onClick={() => { iniciarRonda(plan[paso], dif); setPaso(p => p + 1) }} disabled={jugadores.length === 0}>
                    {paso === 0 ? 'Empezar' : 'Siguiente'}: dinámica {paso + 1} de {plan.length}
                  </Boton>
                : <p className="aviso-ok">¡Terminaron las {plan.length} dinámicas! El puntaje total está arriba.</p>
            ) : (
              <Boton onClick={() => iniciarRonda(nivelId, dif)} disabled={jugadores.length === 0}>{ronda ? 'Jugar este nivel ahora' : 'Empezar con este nivel'}</Boton>
            )}
            {(ronda?.ronda ?? 0) >= 1 && <button className="enlace" onClick={pedirTotal}>Actualizar puntaje total</button>}
            {jugadores.length === 0 && <p className="ayuda">Necesitas al menos un jugador conectado.</p>}
          </section>
        )}

        {!anfitrion && !duelo && ronda && nivelRonda && (
          <p className="ayuda centro">Cuando termines tu ronda, aquí verás cómo van los demás.</p>
        )}
      </div>

      {cuenta !== null && !anfitrion && (
        <div className="velo cuenta"><span key={cuenta}>{cuenta}</span></div>
      )}
    </div>
  )
}
