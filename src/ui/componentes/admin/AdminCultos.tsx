import { useEffect, useState } from 'react'
import type { JugadorAdmin, ProgramaAdmin, PuertoAdmin, RolPrograma, TipoParte } from '../../../application/puertos'
import { TIPO_PARTE } from '../../../domain/programa'
import { Boton } from '../Comunes'

const PLANTILLA: ProgramaAdmin['partes'] = [
  { titulo: 'Bienvenida', tipo: 'bienvenida', responsable: null, diapositivas: ['¡Feliz sábado, Conquistadores!'] },
  { titulo: 'Himno de alabanza', tipo: 'himno', responsable: null, diapositivas: [] },
  { titulo: 'Oración', tipo: 'oracion', responsable: null, diapositivas: [] },
  { titulo: 'Lectura bíblica', tipo: 'lectura', responsable: null, diapositivas: [] },
  { titulo: 'Mensaje', tipo: 'mensaje', responsable: null, diapositivas: [] },
  { titulo: 'Oración final', tipo: 'oracion', responsable: null, diapositivas: [] },
  { titulo: 'Despedida', tipo: 'despedida', responsable: null, diapositivas: ['¡Hasta el próximo sábado!'] },
]
const limpiar = (s: string, n: number) => s.replace(/[<>\u0000-\u0009\u000b-\u001f\u007f]/g, '').slice(0, n)
/** Saca el código del video de un enlace de YouTube (watch, youtu.be, live, embed o shorts). */
export function idYoutube(url: string): string | null {
  const t = url.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t
  const m = t.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/)
  return m ? m[1] : null
}
const proximoSabado = () => {
  const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const local = (iso: string) => { const d = new Date(iso); const z = (n: number) => String(n).padStart(2, '0'); return { dia: `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`, hora: `${z(d.getHours())}:${z(d.getMinutes())}` } }
const fecha = (iso: string) => new Date(iso).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
/** Las diapositivas se escriben separadas por una línea en blanco. */
const aTexto = (d: string[]) => d.join('\n\n')
const aDiapositivas = (t: string) => t.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).slice(0, 30).map(x => x.slice(0, 400))

interface Borrador { id?: string; titulo: string; dia: string; hora: string; minutos: number; youtube: string; partes: (ProgramaAdmin['partes'][number] & { texto: string })[]; equipo: ProgramaAdmin['equipo'] }

/** Superadmin: arma los cultos y programas del escenario (quién conduce, quién participa y qué se proyecta). */
export function AdminCultos({ admin, hacer }: { admin: PuertoAdmin; hacer: (fn: () => Promise<void>, ok?: string) => Promise<void> }) {
  const [lista, setLista] = useState<ProgramaAdmin[]>([])
  const [b, setB] = useState<Borrador | null>(null)
  const [buscar, setBuscar] = useState('')
  const [hallados, setHallados] = useState<JugadorAdmin[]>([])
  const cargar = () => hacer(async () => { if (admin.programas) setLista(await admin.programas()) })
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const nuevo = () => setB({ titulo: 'Culto de sábado', dia: proximoSabado(), hora: '10:00', minutos: 60, youtube: '', equipo: [], partes: PLANTILLA.map(p => ({ ...p, texto: aTexto(p.diapositivas) })) })
  const editar = (p: ProgramaAdmin) => setB({ id: p.id, titulo: p.titulo, ...local(p.inicia), minutos: p.minutos, youtube: p.youtube ?? '', equipo: p.equipo, partes: p.partes.map(x => ({ ...x, texto: aTexto(x.diapositivas) })) })
  const guardar = () => hacer(async () => {
    if (!b || !admin.guardarPrograma) return
    const inicia = new Date(`${b.dia}T${b.hora}:00`)
    if (Number.isNaN(inicia.getTime())) throw new Error('FECHA_INVALIDA')
    const yt = b.youtube.trim() ? idYoutube(b.youtube) : null
    if (b.youtube.trim() && !yt) throw new Error('YOUTUBE_INVALIDO')
    await admin.guardarPrograma({
      id: b.id, titulo: b.titulo.trim(), inicia: inicia.toISOString(), minutos: b.minutos, youtube: yt,
      equipo: b.equipo.map(e => ({ id: e.id, rol: e.rol })),
      partes: b.partes.map(p => ({ titulo: p.titulo.trim(), tipo: p.tipo, responsable: p.responsable, diapositivas: aDiapositivas(p.texto) })),
    })
    setB(null); await cargar()
  }, 'Programa guardado.')
  const estado = (p: ProgramaAdmin, e: 'en_vivo' | 'terminado' | 'cancelado') => hacer(async () => { await admin.estadoPrograma?.(p.id!, e); await cargar() },
    e === 'en_vivo' ? '¡En vivo! Todos lo ven en el escenario del Gran Campamento.' : e === 'terminado' ? 'Programa terminado.' : 'Programa cancelado.')
  const parte = (i: number, c: Partial<Borrador['partes'][number]>) => b && setB({ ...b, partes: b.partes.map((p, k) => (k === i ? { ...p, ...c } : p)) })
  const mover = (i: number, d: -1 | 1) => { if (!b) return; const l = [...b.partes]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setB({ ...b, partes: l }) }
  const buscarGente = () => hacer(async () => setHallados((await admin.jugadores(buscar)).filter(j => !j.bloqueado).slice(0, 12)))
  const sumar = (j: JugadorAdmin) => b && !b.equipo.some(e => e.id === j.id) && setB({ ...b, equipo: [...b.equipo, { id: j.id, rol: 'participante', apodo: j.apodo, club: j.club }] })

  if (b) return (
    <section className="tarjeta programa-editor">
      <h3>{b.id ? 'Editar programa' : 'Nuevo programa'}</h3>
      <form className="form form-sesion" onSubmit={e => { e.preventDefault(); guardar() }}>
        <label>Título<input value={b.titulo} onChange={e => setB({ ...b, titulo: limpiar(e.target.value, 60) })} maxLength={60} required /></label>
        <div className="tres">
          <label>Día<input type="date" value={b.dia} onChange={e => setB({ ...b, dia: e.target.value })} required /></label>
          <label>Hora<input type="time" value={b.hora} onChange={e => setB({ ...b, hora: e.target.value })} required /></label>
          <label>Duración<select value={b.minutos} onChange={e => setB({ ...b, minutos: Number(e.target.value) })}>{[30, 45, 60, 90, 120, 180].map(m => <option key={m} value={m}>{m} min</option>)}</select></label>
        </div>
        <label>Transmisión de YouTube (opcional)<input value={b.youtube} onChange={e => setB({ ...b, youtube: e.target.value.slice(0, 200) })} placeholder="https://youtube.com/live/…" inputMode="url" /></label>
        <small className="ayuda">Si pegas el enlace de una transmisión, el audio y el video salen en la pantalla del escenario. Sin enlace, el equipo habla con mensajes en el escenario.</small>

        <h4>Equipo del programa</h4>
        <p className="ayuda">Solo ellos pueden hablar en el escenario y cambiar lo que se proyecta. El conductor maneja todo el programa; cada participante, su parte.</p>
        <ul className="equipo-lista">
          {b.equipo.map(e => (
            <li key={e.id}>
              <span><b>{e.apodo ?? 'Jugador'}</b><small>{e.club}</small></span>
              <select value={e.rol} onChange={ev => setB({ ...b, equipo: b.equipo.map(x => (x.id === e.id ? { ...x, rol: ev.target.value as RolPrograma } : x)) })} aria-label={`Rol de ${e.apodo}`}>
                <option value="conductor">Conductor</option><option value="participante">Participante</option>
              </select>
              <button type="button" className="borrar" onClick={() => setB({ ...b, equipo: b.equipo.filter(x => x.id !== e.id), partes: b.partes.map(p => (p.responsable === e.id ? { ...p, responsable: null } : p)) })}>Quitar</button>
            </li>
          ))}
          {b.equipo.length === 0 && <li className="vacio">Agrega al menos un conductor.</li>}
        </ul>
        <div className="admin-buscar">
          <input value={buscar} onChange={e => setBuscar(e.target.value.slice(0, 60))} placeholder="Buscar por nombre o club" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarGente() } }} />
          <Boton type="button" tipo="azul" onClick={buscarGente}>Buscar</Boton>
        </div>
        {!!hallados.length && <div className="chips hallados">{hallados.map(j => <button type="button" key={j.id} onClick={() => sumar(j)} disabled={b.equipo.some(e => e.id === j.id)}>+ {j.apodo} <small>{j.club}</small></button>)}</div>}

        <h4>Partes del programa</h4>
        <ol className="partes-lista">
          {b.partes.map((p, i) => (
            <li key={i}>
              <div className="dos">
                <input value={p.titulo} onChange={e => parte(i, { titulo: limpiar(e.target.value, 50) })} aria-label="Título de la parte" maxLength={50} />
                <select value={p.tipo} onChange={e => parte(i, { tipo: e.target.value as TipoParte })} aria-label="Tipo">{(Object.keys(TIPO_PARTE) as TipoParte[]).map(t => <option key={t} value={t}>{TIPO_PARTE[t]}</option>)}</select>
              </div>
              <select value={p.responsable ?? ''} onChange={e => parte(i, { responsable: e.target.value || null })} aria-label="Responsable">
                <option value="">Sin responsable (la maneja el conductor)</option>
                {b.equipo.map(e => <option key={e.id} value={e.id}>{e.apodo}</option>)}
              </select>
              <textarea rows={3} value={p.texto} onChange={e => parte(i, { texto: limpiar(e.target.value, 6000) })} placeholder="Lo que se proyecta (separa cada diapositiva con una línea en blanco). El responsable también puede subirlo." />
              <div className="admin-acciones">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === b.partes.length - 1} aria-label="Bajar">↓</button>
                <button type="button" className="borrar" onClick={() => setB({ ...b, partes: b.partes.filter((_, k) => k !== i) })} disabled={b.partes.length === 1}>Quitar</button>
              </div>
            </li>
          ))}
        </ol>
        <Boton type="button" tipo="fantasma" onClick={() => b.partes.length < 30 && setB({ ...b, partes: [...b.partes, { titulo: 'Nueva parte', tipo: 'especial', responsable: null, diapositivas: [], texto: '' }] })}>Agregar parte</Boton>
        <div className="fila-botones">
          <Boton type="button" tipo="fantasma" onClick={() => setB(null)}>Cancelar</Boton>
          <Boton type="submit">Guardar programa</Boton>
        </div>
      </form>
    </section>
  )

  return (
    <>
      <section className="tarjeta">
        <h3>Cultos y programas en vivo</h3>
        <p className="ayuda">Se presentan en el escenario del Gran Campamento. Todos los conquistadores conectados pueden mirar; solo el equipo que elijas habla y maneja lo que se proyecta.</p>
        <Boton onClick={nuevo}>Nuevo programa</Boton>
      </section>
      <ul className="admin-lista">
        {lista.map(p => (
          <li key={p.id} className={`sesion ${p.estado === 'en_vivo' ? 'aprobada' : p.estado === 'terminado' ? 'cancelada' : 'pendiente'}`}>
            <div className="admin-fila"><b>{p.titulo}</b><span className={`estado ${p.estado}`}>{p.estado === 'en_vivo' ? '● En vivo' : p.estado === 'terminado' ? 'Terminado' : 'Programado'}</span></div>
            <small>{fecha(p.inicia)} · {p.minutos} min · {p.partes.length} partes{p.youtube ? ' · con transmisión' : ''}</small>
            <small>Conduce: {p.equipo.filter(e => e.rol === 'conductor').map(e => e.apodo).join(', ') || 'nadie (solo tú desde aquí)'} · {p.equipo.length} en el equipo</small>
            <div className="admin-acciones">
              <button onClick={() => editar(p)}>Editar</button>
              {p.estado !== 'en_vivo' ? <button className="dar-vidas" onClick={() => estado(p, 'en_vivo')}>Empezar en vivo</button>
                : <button className="borrar" onClick={() => estado(p, 'terminado')}>Terminar</button>}
              {p.estado === 'programado' && <button className="borrar" onClick={() => estado(p, 'cancelado')}>Cancelar</button>}
            </div>
          </li>
        ))}
        {lista.length === 0 && <li className="vacio">Aún no hay programas.</li>}
      </ul>
    </>
  )
}
