import { useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { Boton, Cielo } from '../componentes/Comunes'
import { mensajeError } from '../../application/errores'
import type { MiembroConAvatar, SesionProgramada } from '../../application/puertos'
import { Bandera } from '../componentes/plaza/Iconos'
import { pixelarImagen } from '../pixel/banderas'
import Editor from './Editor'
import { RetosClub } from '../componentes/RetosClub'

type Miembro = { apodo: string; rango: string; grupo_edad: string; puntos: number }

const ESTADO: Record<SesionProgramada['estado'], string> = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada', cancelada: 'Cancelada' }
const fecha = (iso: string) => new Date(iso).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const manana = () => { const d = new Date(Date.now() + 86400000); return d.toISOString().slice(0, 10) }

/** Panel del club: código, solicitudes de práctica (con aprobación), salas y miembros. */
export default function Director() {
  const { perfil, repo, ir, verLegal, abrirSala, hub, setPerfil } = useJuego()
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [sesiones, setSesiones] = useState<SesionProgramada[]>([])
  const [copiado, setCopiado] = useState(false)
  const [borrar, setBorrar] = useState<string | null>(null)
  const [form, setForm] = useState({ titulo: 'Práctica del uniforme', dia: manana(), hora: '16:00', minutos: 60, ninos: 20, lideres: 3, nota: '' })
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const director = !!perfil?.club.soy_director
  const [personajes, setPersonajes] = useState<Record<string, MiembroConAvatar>>({})
  const [editando, setEditando] = useState<MiembroConAvatar | null>(null)
  const [bandera, setBandera] = useState<string | null>(null)
  const [msgBandera, setMsgBandera] = useState<{ t: string; ok: boolean } | null>(null)

  const cargar = () => {
    if (director) repo.miembrosClub().then(setMiembros).catch(() => setMiembros([]))
    if (director) repo.directorMiembros?.().then(l => setPersonajes(Object.fromEntries(l.map(m => [m.apodo, m])))).catch(() => setPersonajes({}))
    repo.lider?.misSesiones().then(setSesiones).catch(() => setSesiones([]))
  }
  useEffect(() => { cargar() }, [repo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!perfil) return null
  const codigo = perfil.club.codigo
  const copiar = async () => {
    if (!codigo) return
    try { await navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1500) } catch { /* */ }
  }
  const hacer = async (fn: () => Promise<void>, ok?: string) => {
    setMsg(null); setOcupado(true)
    try { await fn(); if (ok) setMsg({ t: ok, ok: true }) } catch (e) { setMsg({ t: mensajeError(e), ok: false }) } finally { setOcupado(false) }
  }
  const solicitar = () => hacer(async () => {
    const inicia = new Date(`${form.dia}T${form.hora}:00`)
    if (Number.isNaN(inicia.getTime())) throw new Error('FECHA_INVALIDA')
    await repo.lider!.solicitarSesion({ titulo: form.titulo, inicia: inicia.toISOString(), minutos: form.minutos, ninos: form.ninos, lideres: form.lideres, nota: form.nota })
    cargar()
  }, 'Solicitud enviada. Te avisaremos aquí cuando la aprueben.')
  /** La imagen se convierte aquí, en el equipo del director: al servidor solo llega el texto de 24×16 pixeles. */
  const elegirBandera = async (f?: File) => {
    setMsgBandera(null)
    if (!f) return
    try { setBandera(await pixelarImagen(f)) } catch (e) { setMsgBandera({ t: mensajeError(e), ok: false }) }
  }
  const guardarBandera = async (b: string | null) => {
    if (!repo.guardarBanderaClub) return
    setMsgBandera(null); setOcupado(true)
    try {
      await repo.guardarBanderaClub(b)
      setPerfil({ ...perfil, club: { ...perfil.club, bandera: b } })
      setBandera(null)
      setMsgBandera({ t: b ? 'Bandera guardada: ya flamea en el campamento de tu club.' : 'Bandera del club quitada.', ok: true })
    } catch (e) { setMsgBandera({ t: mensajeError(e), ok: false }) } finally { setOcupado(false) }
  }
  const enHorario = (s: SesionProgramada) => {
    const t0 = new Date(s.inicia).getTime(), ahora = Date.now()
    return ahora >= t0 - 30 * 60000 && ahora <= t0 + (s.minutos + 30) * 60000
  }

  return (
    <div className="pantalla director">
      <Cielo />
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir(hub)} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><small>{director ? 'Panel del director' : 'Panel del líder'}</small><strong>{perfil.club.nombre}</strong></div>
        <span />
      </header>
      <div className="director-cuerpo">
        {codigo && (
          <section className="tarjeta codigo-club">
            <small>Código del club</small>
            <div className="codigo">{codigo}</div>
            <Boton tipo="azul" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar código'}</Boton>
            <p className="ayuda">Entrega este código solo a los Conquistadores cuyos padres firmaron la <a onClick={() => verLegal('padres')}>autorización</a>. Ellos entran con el código, un apodo y un PIN; no se pide correo ni nombre real.</p>
          </section>
        )}

        <section className="tarjeta">
          <h3>Programar una práctica en vivo</h3>
          <p className="ayuda">Elige día, hora y cuántos van a jugar. El administrador revisa la solicitud y, cuando la aprueba, aquí te aparece el botón para abrir la sala.</p>
          <form className="form form-sesion" onSubmit={e => { e.preventDefault(); solicitar() }}>
            <label>Título<input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü .,:¡!¿?'-]/g, '') })} maxLength={60} required /></label>
            <div className="dos">
              <label>Día<input type="date" value={form.dia} min={new Date().toISOString().slice(0, 10)} onChange={e => setForm({ ...form, dia: e.target.value })} required /></label>
              <label>Hora<input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} required /></label>
            </div>
            <div className="tres">
              <label>Duración<select value={form.minutos} onChange={e => setForm({ ...form, minutos: Number(e.target.value) })}>{[30, 45, 60, 90, 120, 180].map(m => <option key={m} value={m}>{m} min</option>)}</select></label>
              <label>Conquistadores<input type="number" min={0} max={300} value={form.ninos} onChange={e => setForm({ ...form, ninos: Math.max(0, Math.min(300, Number(e.target.value) || 0)) })} /></label>
              <label>Líderes<input type="number" min={0} max={100} value={form.lideres} onChange={e => setForm({ ...form, lideres: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></label>
            </div>
            <label>Nota (opcional)<input value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value.slice(0, 300) })} maxLength={300} placeholder="Ej. Capacitación de unidad, distrito Ate" /></label>
            {msg && <p className={msg.ok ? 'aviso-ok' : 'error'} role="status">{msg.t}</p>}
            <Boton type="submit" disabled={ocupado}>Enviar solicitud</Boton>
          </form>
        </section>

        <section className="tarjeta">
          <h3>Mis sesiones</h3>
          <ul className="sesiones">
            {sesiones.map(s => (
              <li key={s.id} className={`sesion ${s.estado}`}>
                <div><b>{s.titulo}</b><small>{fecha(s.inicia)} · {s.minutos} min · {s.cupo_ninos} conquis, {s.cupo_lideres} líderes</small>
                  {s.respuesta && <small className="respuesta">Respuesta: {s.respuesta}</small>}</div>
                <span className={`estado ${s.estado}`}>{ESTADO[s.estado]}</span>
                {s.estado === 'aprobada' && (enHorario(s)
                  ? <Boton onClick={() => hacer(() => abrirSala(null, s.id))} disabled={ocupado}>Abrir sala</Boton>
                  : <small className="ayuda">Podrás abrirla 30 minutos antes.</small>)}
                {(s.estado === 'pendiente' || s.estado === 'aprobada') && new Date(s.inicia).getTime() > Date.now() &&
                  <button className="borrar" onClick={() => hacer(async () => { await repo.lider!.cancelarSesion(s.id); cargar() })}>Cancelar</button>}
              </li>
            ))}
            {sesiones.length === 0 && <li className="vacio">Aún no has programado sesiones.</li>}
          </ul>
          <Boton tipo="azul" onClick={() => hacer(() => abrirSala(null))} disabled={ocupado}>Abrir sala rápida ahora</Boton>
          <p className="ayuda">La sala rápida funciona si el administrador permite salas sin aprobación.</p>
        </section>

        {director && repo.guardarBanderaClub && (
          <section className="tarjeta bandera-club">
            <h3>Bandera del club</h3>
            <p className="ayuda">En la portada de tu campamento flamean la bandera de tu país y la de Conquistadores. Sube la de tu club y se convierte en pixel art para ser la tercera.</p>
            <div className="banderas-vista" aria-label="Así se verán las banderas en la portada">
              <Bandera tipo="pais" pais={perfil.club.pais} alto={44} />
              <Bandera tipo="conquis" alto={44} />
              {(bandera ?? perfil.club.bandera) ? <Bandera tipo="club" bandera={bandera ?? perfil.club.bandera} alto={44} /> : <span className="bandera-vacia">Tu bandera</span>}
            </div>
            <label className="subir-bandera">
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => { elegirBandera(e.target.files?.[0]); e.target.value = '' }} disabled={ocupado} />
              <span>{perfil.club.bandera ? 'Cambiar imagen' : 'Elegir imagen'}</span>
            </label>
            {bandera && (
              <div className="fila-botones">
                <Boton tipo="fantasma" onClick={() => setBandera(null)} disabled={ocupado}>Descartar</Boton>
                <Boton onClick={() => guardarBandera(bandera)} disabled={ocupado}>Guardar bandera</Boton>
              </div>
            )}
            {!bandera && perfil.club.bandera && <button className="borrar" onClick={() => guardarBandera(null)} disabled={ocupado}>Quitar la bandera del club</button>}
            {msgBandera && <p className={msgBandera.ok ? 'aviso-ok' : 'error'} role="status">{msgBandera.t}</p>}
          </section>
        )}

        {director && <RetosClub />}

        {director && (
          <section className="tarjeta">
            <h3>Miembros ({miembros.length})</h3>
            <ul className="miembros">
              {miembros.map(m => (
                <li key={m.apodo}>
                  <span><b>{m.apodo}</b><small>{m.grupo_edad === 'menor' ? 'Conquistador' : m.rango.replace(/_/g, ' ')}</small></span>
                  <span className="pts">{m.puntos}</span>
                  {personajes[m.apodo] && <button className="personaje" onClick={() => setEditando(personajes[m.apodo])} aria-label={`Cambiar el personaje de ${m.apodo}`}>Personaje</button>}
                  {m.apodo !== perfil.apodo && <button className="borrar" onClick={() => setBorrar(m.apodo)} aria-label={`Eliminar ${m.apodo}`}>Eliminar</button>}
                </li>
              ))}
              {miembros.length === 0 && <li className="vacio">Todavía no hay miembros.</li>}
            </ul>
            <p className="ayuda">Cada conquistador configura su personaje una sola vez; después solo tú puedes cambiarlo (por ejemplo, cuando recibe una nueva clase).</p>
            <p className="ayuda">Si un padre o madre pide borrar los datos de su hijo, elimínalo aquí: se borra al instante junto con sus puntajes.</p>
          </section>
        )}
        <Boton onClick={() => ir(hub)}>Volver</Boton>
      </div>
      {editando && (
        <div className="director-editor">
          <Editor miembro={editando} onListo={() => { setEditando(null); cargar() }} />
        </div>
      )}
      {borrar && (
        <div className="velo">
          <div className="resultado pop">
            <h2>¿Eliminar a {borrar}?</h2>
            <p>Se borrarán su cuenta y todos sus puntajes. No se puede deshacer.</p>
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => setBorrar(null)}>Cancelar</Boton>
              <Boton tipo="rojo" onClick={async () => { await repo.borrarMiembro(borrar); setBorrar(null); cargar() }}>Eliminar</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
