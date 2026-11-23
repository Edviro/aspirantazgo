import { useCallback, useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { Boton, Cielo } from '../componentes/Comunes'
import { mensajeError } from '../../application/errores'
import { AdminCargos } from '../componentes/admin/AdminCargos'
import { AdminCultos } from '../componentes/admin/AdminCultos'
import { AdminTorneos } from '../componentes/admin/AdminTorneos'
import type { ClubAdmin, JugadorAdmin, ResumenAdmin, SalaAdmin, SesionAdmin } from '../../application/puertos'

type Pestana = 'resumen' | 'cargos' | 'solicitudes' | 'cultos' | 'torneos' | 'usuarios' | 'clubes' | 'salas' | 'importar'
const PESTANAS: [Pestana, string][] = [['resumen', 'Resumen'], ['cargos', 'Directores'], ['solicitudes', 'Solicitudes'], ['cultos', 'Cultos'], ['torneos', 'Torneos'], ['usuarios', 'Usuarios'], ['clubes', 'Clubes'], ['salas', 'Salas'], ['importar', 'Importar']]
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')
const RANGO: Record<string, string> = { conquistador: 'Conquistador', lider: 'Líder', guia_mayor: 'Guía Mayor', gm_master: 'GM Máster', gm_master_avanzado: 'GM Máster Av.' }

/** Lee una tabla pegada desde Excel/Sheets: pais; union; asociacion o mision; tipo; club; ciudad */
function leerTabla(texto: string) {
  const uniones = new Map<string, { pais: string; nombre: string }>()
  const campos = new Map<string, { pais: string; union: string; nombre: string; tipo: string }>()
  const clubes: { pais: string; campo: string; nombre: string; ciudad: string }[] = []
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  for (const [i, l] of lineas.entries()) {
    const c = l.split(/\t|;|,/).map(x => x.trim())
    if (i === 0 && /pa[ií]s/i.test(c[0])) continue
    const [pais, union, campo, tipoRaw, club, ciudad] = c
    if (!pais || !union) continue
    const P = pais.toUpperCase().slice(0, 2)
    uniones.set(P + union, { pais: P, nombre: union })
    if (campo) {
      const tipo = /mis/i.test(tipoRaw ?? '') || /^misi[oó]n/i.test(campo) ? 'mision' : 'asociacion'
      campos.set(P + union + campo, { pais: P, union, nombre: campo, tipo })
      if (club) clubes.push({ pais: P, campo, nombre: club, ciudad: ciudad ?? '' })
    }
  }
  return { uniones: [...uniones.values()], campos: [...campos.values()], clubes }
}

/** Panel del superadministrador. Cada llamada la vuelve a verificar el servidor: ocultar este botón no es la seguridad, el servidor sí. */
export default function Admin() {
  const { perfil, repo, ir, enLinea, abrirSala, hub } = useJuego()
  const admin = repo.admin
  const [tab, setTab] = useState<Pestana>('resumen')
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null)
  const [sesiones, setSesiones] = useState<SesionAdmin[]>([])
  const [filtroSes, setFiltroSes] = useState<string | null>('pendiente')
  const [jugadores, setJugadores] = useState<JugadorAdmin[]>([])
  const [clubes, setClubes] = useState<ClubAdmin[]>([])
  const [salas, setSalas] = useState<SalaAdmin[]>([])
  const [buscar, setBuscar] = useState('')
  const [respuesta, setRespuesta] = useState<Record<string, string>>({})
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [confirmar, setConfirmar] = useState<{ t: string; fn: () => Promise<void> } | null>(null)
  const [regalo, setRegalo] = useState<{ club: boolean; id: string; nombre: string } | null>(null)
  const [cuantas, setCuantas] = useState(3)

  const hacer = useCallback(async (fn: () => Promise<void>, ok?: string) => {
    setMsg(null)
    try { await fn(); if (ok) setMsg({ t: ok, ok: true }) } catch (e) { setMsg({ t: mensajeError(e), ok: false }) }
  }, [])

  const cargar = useCallback(() => {
    if (!admin) return
    if (tab === 'resumen') hacer(async () => setResumen(await admin.resumen()))
    if (tab === 'solicitudes') hacer(async () => setSesiones(await admin.sesiones(filtroSes)))
    if (tab === 'usuarios') hacer(async () => setJugadores(await admin.jugadores(buscar)))
    if (tab === 'clubes') hacer(async () => setClubes(await admin.clubes(buscar)))
    if (tab === 'salas') hacer(async () => setSalas(await admin.salas()))
  }, [admin, tab, filtroSes, buscar, hacer])
  useEffect(() => { cargar() }, [tab, filtroSes]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!perfil?.superadmin || !admin) {
    return (
      <div className="pantalla admin"><Cielo />
        <div className="director-cuerpo"><section className="tarjeta"><p>No tienes acceso a este panel.</p><Boton onClick={() => ir(hub)}>Volver</Boton></section></div>
      </div>
    )
  }

  const vivos = enLinea.length
  const vivosNinos = enLinea.filter(j => j.rango === 'conquistador').length

  return (
    <div className="pantalla admin">
      <Cielo />
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir(hub)} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><small>Superadministrador</small><strong>Control de Aspirantazgo</strong></div>
        <span className="en-vivo"><i />{vivos} en línea</span>
      </header>
      <nav className="tabs admin-tabs" role="tablist">
        {PESTANAS.map(([k, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(null) }}>
            {n}{k === 'solicitudes' && resumen && resumen.solicitudes > 0 && <i className="quedan">{resumen.solicitudes}</i>}
          </button>
        ))}
      </nav>
      <div className="admin-cuerpo">
        {msg && <p className={msg.ok ? 'aviso-ok' : 'error'} role="status">{msg.t}</p>}

        {tab === 'resumen' && resumen && (
          <>
            <div className="kpis">
              <div className="kpi"><b>{vivos}</b><small>en línea ahora ({vivosNinos} conquis)</small></div>
              <div className="kpi"><b>{resumen.ninos}</b><small>Conquistadores</small></div>
              <div className="kpi"><b>{resumen.adultos}</b><small>líderes y +16</small></div>
              <div className="kpi"><b>{resumen.clubes}</b><small>clubes</small></div>
              <div className="kpi"><b>{resumen.activos_24h}</b><small>activos en 24 h</small></div>
              <div className="kpi"><b>{resumen.activos_7d}</b><small>activos en 7 días</small></div>
              <div className="kpi"><b>{resumen.nuevos_7d}</b><small>nuevos en 7 días</small></div>
              <div className="kpi"><b>{resumen.partidas_7d}</b><small>partidas en 7 días</small></div>
              <div className="kpi"><b>{resumen.salas_abiertas}</b><small>salas abiertas</small></div>
              <div className="kpi"><b>{resumen.duelos_hoy}</b><small>duelos hoy</small></div>
              <div className={`kpi ${resumen.solicitudes ? 'alerta' : ''}`}><b>{resumen.solicitudes}</b><small>solicitudes pendientes</small></div>
            </div>
            <section className="tarjeta">
              <h3>Reglas de las salas</h3>
              <label className="check"><input type="checkbox" checked={resumen.salas_requieren_aprobacion}
                onChange={e => hacer(async () => { await admin.config('salas_requieren_aprobacion', e.target.checked); setResumen(await admin.resumen()) }, 'Guardado.')} />
                <span>Los líderes solo pueden abrir salas con una sesión aprobada por ti.</span></label>
              <label className="campo-select">Máximo de jugadores por sala rápida
                <input type="number" min={2} max={300} defaultValue={resumen.max_jugadores_sala}
                  onBlur={e => { const v = Math.max(2, Math.min(300, Number(e.target.value) || 60)); hacer(() => admin.config('max_jugadores_sala', v), 'Guardado.') }} />
              </label>
              <Boton tipo="azul" onClick={() => hacer(() => abrirSala(null))}>Abrir una sala yo mismo</Boton>
            </section>
          </>
        )}

        {tab === 'cargos' && <AdminCargos admin={admin} hacer={hacer} />}
        {tab === 'cultos' && <AdminCultos admin={admin} hacer={hacer} />}
        {tab === 'torneos' && <AdminTorneos admin={admin} hacer={hacer} />}

        {tab === 'solicitudes' && (
          <>
            <div className="chips">
              {([['pendiente', 'Pendientes'], ['aprobada', 'Aprobadas'], ['rechazada', 'Rechazadas'], [null, 'Todas']] as [string | null, string][]).map(([v, n]) => (
                <button key={n} className={filtroSes === v ? 'on' : ''} onClick={() => setFiltroSes(v)}>{n}</button>
              ))}
            </div>
            <ul className="admin-lista">
              {sesiones.map(s => (
                <li key={s.id} className={`sesion ${s.estado}`}>
                  <div className="admin-fila">
                    <b>{s.titulo}</b><span className={`estado ${s.estado}`}>{s.estado}</span>
                  </div>
                  <small>{fecha(s.inicia)} · {s.minutos} min · {s.cupo_ninos} conquis y {s.cupo_lideres} líderes</small>
                  <small>{s.club} ({s.campo}) · pidió {s.solicitante}{s.email ? ` <${s.email}>` : ''}</small>
                  {s.nota && <small>Nota: {s.nota}</small>}
                  {s.estado === 'pendiente' && (
                    <div className="admin-acciones">
                      <input placeholder="Respuesta (opcional)" maxLength={300} value={respuesta[s.id] ?? ''} onChange={e => setRespuesta({ ...respuesta, [s.id]: e.target.value })} />
                      <Boton tipo="verde" onClick={() => hacer(async () => { await admin.resolverSesion(s.id, 'aprobada', respuesta[s.id] ?? ''); cargar() }, 'Aprobada.')}>Aprobar</Boton>
                      <Boton tipo="rojo" onClick={() => hacer(async () => { await admin.resolverSesion(s.id, 'rechazada', respuesta[s.id] ?? ''); cargar() }, 'Rechazada.')}>Rechazar</Boton>
                    </div>
                  )}
                </li>
              ))}
              {sesiones.length === 0 && <li className="vacio">No hay solicitudes aquí.</li>}
            </ul>
          </>
        )}

        {(tab === 'usuarios' || tab === 'clubes') && (
          <form className="admin-buscar" onSubmit={e => { e.preventDefault(); cargar() }}>
            <input value={buscar} onChange={e => setBuscar(e.target.value.slice(0, 60))} placeholder={tab === 'usuarios' ? 'Buscar por nombre, club o correo' : 'Buscar club o asociación'} />
            <Boton type="submit" tipo="azul">Buscar</Boton>
          </form>
        )}

        {tab === 'usuarios' && (
          <div className="tabla-scroll">
            <table className="admin-tabla">
              <thead><tr><th>Nombre</th><th>Rango</th><th>Club</th><th>Correo</th><th>Puntos</th><th>Última vez</th><th /></tr></thead>
              <tbody>
                {jugadores.map(j => (
                  <tr key={j.id} className={j.bloqueado ? 'bloqueado' : ''}>
                    <td><b>{j.apodo}</b>{j.director && <small> director</small>}</td>
                    <td>{RANGO[j.rango] ?? j.rango}{j.cargo ? <small> · {j.cargo.toLowerCase()}</small> : null}</td>
                    <td>{j.club}<small> {j.campo}</small></td>
                    <td>{j.email ?? <small>sin correo (menor)</small>}</td>
                    <td>{j.puntos}</td>
                    <td>{fecha(j.ultima_actividad)}</td>
                    <td className="admin-acciones">
                      <button className="dar-vidas" onClick={() => setRegalo({ club: false, id: j.id, nombre: j.apodo })} aria-label={`Dar vidas a ${j.apodo}`}>♥ Vidas</button>
                      <button className="borrar" onClick={() => hacer(async () => { await admin.bloquear(j.id, !j.bloqueado); cargar() })}>{j.bloqueado ? 'Activar' : 'Suspender'}</button>
                      <button className="borrar" onClick={() => setConfirmar({ t: `¿Borrar a ${j.apodo} y todos sus puntajes?`, fn: async () => { await admin.borrarJugador(j.id); cargar() } })}>Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jugadores.length === 0 && <p className="vacio">Sin resultados.</p>}
          </div>
        )}

        {tab === 'clubes' && (
          <div className="tabla-scroll">
            <table className="admin-tabla">
              <thead><tr><th>Club</th><th>Código</th><th>Asociación / Misión</th><th>Director</th><th>Miembros</th><th>Creado</th><th /></tr></thead>
              <tbody>
                {clubes.map(c => (
                  <tr key={c.id}>
                    <td><b>{c.nombre}</b><small> {c.ciudad}</small></td>
                    <td><code>{c.codigo}</code></td>
                    <td>{c.campo}<small> {c.union_nombre}</small></td>
                    <td>{c.director ?? <small>sin director</small>}</td>
                    <td>{c.miembros} <small>({c.ninos} conquis)</small></td>
                    <td>{fecha(c.creado)}</td>
                    <td className="admin-acciones"><button className="dar-vidas" onClick={() => setRegalo({ club: true, id: c.id, nombre: c.nombre })} aria-label={`Dar vidas al club ${c.nombre}`}>♥ Vidas</button>
                      <button className="borrar" onClick={() => setConfirmar({ t: `¿Borrar el club ${c.nombre} con sus ${c.miembros} miembros?`, fn: async () => { await admin.borrarClub(c.id); cargar() } })}>Borrar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clubes.length === 0 && <p className="vacio">Sin resultados.</p>}
          </div>
        )}

        {tab === 'salas' && (
          <div className="tabla-scroll">
            <table className="admin-tabla">
              <thead><tr><th>Código</th><th>Tipo</th><th>Abrió</th><th>Club / rival</th><th>Entraron</th><th>Creada</th><th /></tr></thead>
              <tbody>
                {salas.map(s => (
                  <tr key={s.codigo} className={s.abierta ? 'abierta' : ''}>
                    <td><code>{s.codigo}</code></td>
                    <td>{s.tipo === 'duelo' ? 'Duelo' : 'Sala'}{s.sesion ? <small> {s.sesion}</small> : null}</td>
                    <td>{s.anfitrion ?? '—'}</td>
                    <td>{s.tipo === 'duelo' ? `vs ${s.rival ?? '—'}` : s.club ?? '—'}</td>
                    <td>{s.entradas}/{s.cupo}</td>
                    <td>{fecha(s.creada)}</td>
                    <td>{s.abierta ? <button className="borrar" onClick={() => hacer(async () => { await admin.cerrarSala(s.codigo); cargar() }, 'Sala cerrada.')}>Cerrar</button> : <small>cerrada</small>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salas.length === 0 && <p className="vacio">Todavía no se abrieron salas.</p>}
          </div>
        )}

        {tab === 'importar' && (
          <section className="tarjeta">
            <h3>Cargar uniones, asociaciones, misiones y clubes</h3>
            <p className="ayuda">Pega una tabla desde Excel o Google Sheets con estas columnas, en este orden: <b>País</b> (PE, BO, BR…), <b>Unión</b>, <b>Asociación o Misión</b>, <b>Tipo</b> (Asociación o Misión), <b>Club</b>, <b>Ciudad</b>. Las filas sin club solo crean la unión o el campo. Nada se duplica: si ya existe, se salta.</p>
            <textarea className="admin-texto" value={texto} onChange={e => setTexto(e.target.value)} rows={10}
              placeholder={'País;Unión;Asociación o Misión;Tipo;Club;Ciudad\nPE;Unión Peruana del Norte;Asociación Peruana Central Este;Asociación;Halcones;Ate'} />
            <Boton onClick={() => hacer(async () => {
              const t = texto.trim()
              const datos = t.startsWith('{') ? JSON.parse(t) : leerTabla(t)
              const r = await admin.importar(datos)
              setMsg({ t: `Listo: ${r.uniones} uniones y ${r.campos} campos revisados, ${r.clubes_nuevos} clubes nuevos.`, ok: true })
            })}>Importar</Boton>
          </section>
        )}
      </div>

      {regalo && (
        <div className="velo">
          <div className="resultado pop" role="dialog" aria-modal="true" aria-label="Regalar vidas">
            <h2>Regalar vidas</h2>
            <p>{regalo.club ? <>A cada miembro del club <b>{regalo.nombre}</b>.</> : <>Para <b>{regalo.nombre}</b>.</>} Se suman a las que ya tiene, hasta un máximo de 10.</p>
            <div className="chips" role="radiogroup" aria-label="Cantidad de vidas" style={{ justifyContent: 'center' }}>
              {[1, 3, 5, 10].map(n => <button key={n} role="radio" aria-checked={cuantas === n} className={cuantas === n ? 'on' : ''} onClick={() => setCuantas(n)}>♥ {n}</button>)}
            </div>
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => setRegalo(null)}>Cancelar</Boton>
              <Boton tipo="verde" onClick={() => {
                const r = regalo, n = cuantas
                setRegalo(null)
                hacer(async () => {
                  if (r.club) { const k = await admin.darVidasClub(r.id, n); setMsg({ t: `Listo: ${n} ${n === 1 ? 'vida' : 'vidas'} para ${k} jugadores de ${r.nombre}.`, ok: true }) }
                  else { const v = await admin.darVidas(r.id, n); setMsg({ t: `Listo: ${r.nombre} ahora tiene ${v} vidas.`, ok: true }) }
                })
              }}>Regalar {cuantas} {cuantas === 1 ? 'vida' : 'vidas'}</Boton>
            </div>
          </div>
        </div>
      )}

      {confirmar && (
        <div className="velo">
          <div className="resultado pop">
            <h2>¿Seguro?</h2>
            <p>{confirmar.t} No se puede deshacer.</p>
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => setConfirmar(null)}>Cancelar</Boton>
              <Boton tipo="rojo" onClick={() => { const c = confirmar; setConfirmar(null); hacer(c.fn, 'Hecho.') }}>Sí, borrar</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
