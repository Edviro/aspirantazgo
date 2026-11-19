import { useEffect, useState } from 'react'
import type { ClubRetable, RetoClub } from '../../application/puertos'
import { mensajeError } from '../../application/errores'
import { TODOS_LOS_NIVELES } from '../../domain/niveles'
import { useJuego } from '../estado'
import { Boton } from './Comunes'
import { nombreReto } from './admin/AdminTorneos'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const fecha = (iso: string) => new Date(iso).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })

/** Director: retar a otros clubes (con su director) y responder a los retos que le llegan. */
export function RetosClub() {
  const { perfil, repo } = useJuego()
  const [retos, setRetos] = useState<RetoClub[]>([])
  const [buscar, setBuscar] = useState('')
  const [hallados, setHallados] = useState<ClubRetable[]>([])
  const [rivales, setRivales] = useState<ClubRetable[]>([])
  const [f, setF] = useState({ reto: TODOS_LOS_NIVELES[0]?.id ?? '', dia: hoy(), dias: 7 })
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const cargar = () => { repo.directorRetos?.().then(setRetos).catch(() => setRetos([])) }
  useEffect(cargar, [repo]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!repo.directorRetar || !perfil) return null

  const hacer = async (fn: () => Promise<void>, ok?: string) => {
    setMsg(null); setOcupado(true)
    try { await fn(); if (ok) setMsg({ t: ok, ok: true }) } catch (e) { setMsg({ t: mensajeError(e), ok: false }) } finally { setOcupado(false) }
  }
  const buscarClubes = () => hacer(async () => setHallados(buscar.trim().length >= 2 ? await repo.clubesParaRetar!(buscar.trim()) : []))
  const titulo = `${perfil.club.nombre} vs ${rivales.map(r => r.nombre).join(', ')}`.slice(0, 60)
  const retar = () => hacer(async () => {
    const inicia = new Date(`${f.dia}T00:00:00`)
    const ini = inicia.getTime() < Date.now() ? new Date() : inicia
    await repo.directorRetar!({ rivales: rivales.map(r => r.id), reto: f.reto, inicia: ini.toISOString(), dias: f.dias, titulo: titulo.length >= 3 ? titulo : 'Reto entre clubes' })
    setRivales([]); setHallados([]); setBuscar(''); cargar()
  }, 'Reto enviado. Empieza cuando al menos un club lo acepte.')

  return (
    <section className="tarjeta retos-club">
      <h3>Retos entre clubes</h3>
      <p className="ayuda">Reta a uno o varios clubes en un desafío. Cuenta el mejor puntaje de cada conquistador en esos días y gana el club cuyos 5 mejores sumen más. Lo ven todos en el tablero de retos del Gran Campamento.</p>
      <div className="admin-buscar">
        <input value={buscar} onChange={e => setBuscar(e.target.value.slice(0, 40))} placeholder="Buscar club o asociación" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarClubes() } }} aria-label="Buscar club" />
        <Boton tipo="azul" onClick={buscarClubes} disabled={ocupado}>Buscar</Boton>
      </div>
      {!!hallados.length && (
        <div className="chips hallados">
          {hallados.map(c => <button key={c.id} disabled={rivales.length >= 7 || rivales.some(r => r.id === c.id)} onClick={() => setRivales([...rivales, c])}>+ {c.nombre} <small>{c.campo ?? c.ciudad}</small></button>)}
        </div>
      )}
      {buscar.trim().length >= 2 && !hallados.length && !ocupado && <small className="ayuda">Solo aparecen clubes que tienen director registrado.</small>}
      {!!rivales.length && (
        <form className="form form-sesion" onSubmit={e => { e.preventDefault(); retar() }}>
          <div className="chips">{rivales.map(r => <button type="button" key={r.id} className="on" onClick={() => setRivales(rivales.filter(x => x.id !== r.id))} aria-label={`Quitar ${r.nombre}`}>{r.nombre} ✕</button>)}</div>
          <label>Desafío<select value={f.reto} onChange={e => setF({ ...f, reto: e.target.value })}>{TODOS_LOS_NIVELES.map(n => <option key={n.id} value={n.id}>{n.titulo}</option>)}</select></label>
          <div className="dos">
            <label>Empieza<input type="date" value={f.dia} min={hoy()} onChange={e => setF({ ...f, dia: e.target.value })} required /></label>
            <label>Dura<select value={f.dias} onChange={e => setF({ ...f, dias: Number(e.target.value) })}>{[1, 2, 3, 5, 7, 10, 14].map(d => <option key={d} value={d}>{d} {d === 1 ? 'día' : 'días'}</option>)}</select></label>
          </div>
          <Boton type="submit" disabled={ocupado}>Enviar reto</Boton>
        </form>
      )}
      {msg && <p className={msg.ok ? 'aviso-ok' : 'error'} role="status">{msg.t}</p>}
      <ul className="sesiones">
        {retos.map(r => (
          <li key={r.id} className={`sesion ${r.estado === 'activo' ? 'aprobada' : 'pendiente'}`}>
            <div><b>{r.titulo}</b>
              <small>{nombreReto(r.reto)} · {fecha(r.inicia)} a {fecha(r.termina)}{r.mio ? '' : ` · te retó ${r.retador}`}</small>
              <small>{r.clubes.map(c => `${c.nombre} ${c.acepto === true ? '✓' : c.acepto === false ? '✗' : '…'}`).join(' · ')}</small></div>
            <span className={`estado ${r.estado}`}>{r.estado === 'activo' ? (new Date(r.termina) < new Date() ? 'Terminado' : 'Activo') : 'Esperando'}</span>
            {!r.mio && r.mi_respuesta === null && new Date(r.termina) > new Date() && (
              <div className="fila-botones">
                <Boton tipo="fantasma" disabled={ocupado} onClick={() => hacer(async () => { await repo.directorResponderReto!(r.id, false); cargar() }, 'Reto rechazado.')}>Rechazar</Boton>
                <Boton tipo="verde" disabled={ocupado} onClick={() => hacer(async () => { await repo.directorResponderReto!(r.id, true); cargar() }, '¡Reto aceptado! Avisa a tu club.')}>Aceptar</Boton>
              </div>
            )}
            {r.mio && new Date(r.inicia) > new Date() && <button className="borrar" disabled={ocupado} onClick={() => hacer(async () => { await repo.directorCancelarReto!(r.id); cargar() }, 'Reto cancelado.')}>Cancelar</button>}
          </li>
        ))}
        {retos.length === 0 && <li className="vacio">Aún no hay retos con otros clubes.</li>}
      </ul>
    </section>
  )
}
