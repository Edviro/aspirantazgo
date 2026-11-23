import { useCallback, useEffect, useState } from 'react'
import type { EstadoUnidad, RolUnidad, Unidad as UnidadT } from '../../application/puertos'
import { mensajeError } from '../../application/errores'
import { useJuego } from '../estado'
import { Boton, Cielo } from '../componentes/Comunes'
import { PixelAvatar } from '../pixel/PixelAvatar'

const ROL_TXT: Record<RolUnidad, string> = { consejero: 'Consejero', capitan: 'Capitán', secretario: 'Secretario', tesorero: 'Tesorero', capellan: 'Capellán', miembro: 'Miembro' }
const CARGOS: Exclude<RolUnidad, 'consejero'>[] = ['capitan', 'secretario', 'tesorero', 'capellan', 'miembro']
const rolTxt = (r: RolUnidad, sexo: 'm' | 'f') => (sexo === 'f' ? { consejero: 'Consejera', capitan: 'Capitana', secretario: 'Secretaria', tesorero: 'Tesorera', capellan: 'Capellana', miembro: 'Miembro' }[r] : ROL_TXT[r])
const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0)
const limpiarNombre = (t: string) => t.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü .'-]/g, '').slice(0, 30)
const limpiarTexto = (t: string, max: number) => t.replace(/[<>\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, max)

/**
 * Mi unidad: de 4 a 8 Conquistadores del mismo sexo con uno o más consejeros. El consejero la crea (nombre, grito
 * de guerra e historia de hasta 500 palabras), agrega a sus Conquistadores con su cargo y los rota cuando quiere.
 * Todo lo valida el servidor; aquí solo se muestra.
 */
export default function Unidad() {
  const { repo, ir, hub } = useJuego()
  const api = repo.unidades
  const [e, setE] = useState<EstadoUnidad | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [editando, setEditando] = useState(false)
  const [f, setF] = useState({ nombre: '', grito: '', historia: '' })
  const [nuevo, setNuevo] = useState<{ id: string; rol: Exclude<RolUnidad, 'consejero'> }>({ id: '', rol: 'miembro' })
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(async () => {
    if (!api) { setError('Las unidades funcionan con tu cuenta en línea.'); return }
    try { setE(await api.estado()) } catch (x) { setError(mensajeError(x)) }
  }, [api])
  useEffect(() => { void cargar() }, [cargar])

  const hacer = async (fn: () => Promise<unknown>, msg?: string) => {
    setError(''); setOk(''); setOcupado(true)
    try { await fn(); await cargar(); if (msg) setOk(msg) } catch (x) { setError(mensajeError(x)) } finally { setOcupado(false) }
  }
  const mia = e?.mia ?? null
  const conquis = mia?.miembros.filter(m => m.rol !== 'consejero') ?? []
  const libres = (e?.libres ?? []).filter(l => !mia || l.sexo === mia.sexo)
  const validar = () => {
    if (f.nombre.trim().length < 2) throw new Error('TEXTO_INVALIDO')
    if (palabras(f.historia) > 500) throw new Error('HISTORIA_LARGA')
  }

  const formulario = (u: UnidadT | null) => (
    <form className="form unidad-form" onSubmit={ev => {
      ev.preventDefault()
      void hacer(async () => { validar(); if (u) await api!.editar(u.id, f.nombre.trim(), f.grito, f.historia); else await api!.crear(f.nombre.trim(), f.grito, f.historia); setEditando(false) },
        u ? 'Unidad actualizada.' : '¡Unidad creada! Ahora agrega a tus Conquistadores.')
    }}>
      <label>Nombre de la unidad<input value={f.nombre} onChange={x => setF({ ...f, nombre: limpiarNombre(x.target.value) })} maxLength={30} placeholder="Ej. Halcones" required /></label>
      <label>Grito de guerra<input value={f.grito} onChange={x => setF({ ...f, grito: limpiarTexto(x.target.value, 240) })} maxLength={240} placeholder="Ej. ¡Halcones, halcones, siempre listos!" /></label>
      <label>Historia <small className={palabras(f.historia) > 500 ? 'error' : ''}>({palabras(f.historia)} / 500 palabras)</small>
        <textarea value={f.historia} onChange={x => setF({ ...f, historia: limpiarTexto(x.target.value, 4000) })} rows={6} placeholder="Cómo nació la unidad, qué significa su nombre, sus mejores recuerdos…" />
      </label>
      <div className="fila-botones">
        {u && <Boton tipo="fantasma" onClick={() => setEditando(false)}>Cancelar</Boton>}
        <Boton type="submit" disabled={ocupado}>{u ? 'Guardar' : 'Crear mi unidad'}</Boton>
      </div>
    </form>
  )

  return (
    <div className="pantalla unidad">
      <Cielo />
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir(hub)} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><small>Tu equipo</small><strong>Mi unidad</strong></div>
        {mia && <span className="en-vivo">{conquis.length} de 8</span>}
      </header>
      <div className="unidad-cuerpo">
        {error && <p className="error" role="alert">{error}</p>}
        {ok && <p className="aviso-ok" role="status">{ok}</p>}
        {!e && !error && <p>Cargando…</p>}

        {mia && !editando && (
          <section className="tarjeta unidad-ficha">
            <h2>{mia.nombre}</h2>
            {mia.grito && <p className="unidad-grito">“{mia.grito}”</p>}
            {mia.historia && <p className="unidad-historia">{mia.historia}</p>}
            {conquis.length < 4 && <p className="nota">Una unidad tiene de 4 a 8 Conquistadores{mia.sexo === 'f' ? ' (solo damas)' : ' (solo varones)'}. Faltan {4 - conquis.length}.</p>}
            <ul className="unidad-miembros">
              {mia.miembros.map(m => (
                <li key={m.id}>
                  <PixelAvatar a={m.avatar ?? {}} rango={m.rango} alto={64} />
                  <span><b>{m.apodo}</b><em className={`rol rol-${m.rol}`}>{rolTxt(m.rol, mia.sexo)}</em></span>
                  {e?.puedo_admin && m.rol !== 'consejero' && (
                    <span className="unidad-acciones">
                      <select value={m.rol} onChange={x => void hacer(() => api!.asignar(mia.id, m.id, x.target.value as Exclude<RolUnidad, 'consejero'>), 'Cargo actualizado.')} aria-label={`Cargo de ${m.apodo}`} disabled={ocupado}>
                        {CARGOS.map(c => <option key={c} value={c}>{rolTxt(c, mia.sexo)}</option>)}
                      </select>
                      <button className="quitar" onClick={() => void hacer(() => api!.asignar(mia.id, m.id, null), `${m.apodo} salió de la unidad.`)} aria-label={`Quitar a ${m.apodo}`} disabled={ocupado}>✕</button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {e?.puedo_admin && (
              <>
                {conquis.length < 8 && (
                  <div className="form unidad-agregar">
                    <label>Agregar Conquistador<select value={nuevo.id} onChange={x => setNuevo({ ...nuevo, id: x.target.value })}>
                      <option value="">{libres.length ? 'Elige…' : 'No hay Conquistadores sin unidad'}</option>
                      {libres.map(l => <option key={l.id} value={l.id}>{l.apodo}</option>)}
                    </select></label>
                    <label>Cargo<select value={nuevo.rol} onChange={x => setNuevo({ ...nuevo, rol: x.target.value as Exclude<RolUnidad, 'consejero'> })}>
                      {CARGOS.map(c => <option key={c} value={c}>{rolTxt(c, mia.sexo)}</option>)}
                    </select></label>
                    <Boton disabled={!nuevo.id || ocupado} onClick={() => void hacer(async () => { await api!.asignar(mia.id, nuevo.id, nuevo.rol); setNuevo({ id: '', rol: 'miembro' }) }, '¡Agregado a la unidad!')}>Agregar</Boton>
                  </div>
                )}
                <p className="nota">Para rotar cargos, cambia el cargo de cada uno: si el cargo ya lo tenía otro, ese pasa a Miembro. El cargo aparece en su uniforme.</p>
                <div className="fila-botones">
                  <Boton tipo="fantasma" onClick={() => void hacer(() => api!.salir(), 'Saliste de la unidad.')}>Salir de la unidad</Boton>
                  <Boton onClick={() => { setF({ nombre: mia.nombre, grito: mia.grito ?? '', historia: mia.historia ?? '' }); setEditando(true) }}>Editar nombre, grito e historia</Boton>
                </div>
              </>
            )}
          </section>
        )}
        {mia && editando && formulario(mia)}

        {e && !mia && e.adulto && (
          <section className="tarjeta">
            <h2>Crea tu unidad</h2>
            <p>Como consejero{e.sexo === 'f' ? 'a' : ''}, tu unidad será de {e.sexo === 'f' ? 'damas' : 'varones'} (no son mixtas). Luego agregas a tus Conquistadores con su cargo.</p>
            {formulario(null)}
          </section>
        )}
        {e && !mia && !e.adulto && <section className="tarjeta"><h2>Aún no estás en una unidad</h2><p>Tu consejero te agrega a su unidad desde el juego.</p></section>}

        {e && !mia && e.unidades.length > 0 && (
          <section className="tarjeta">
            <h3>Unidades de tu club</h3>
            <ul className="unidad-lista">
              {e.unidades.map(u => (
                <li key={u.id}>
                  <span><b>{u.nombre}</b><small>{u.sexo === 'f' ? 'Damas' : 'Varones'} · {u.conquis} {u.conquis === 1 ? 'conquistador' : 'conquistadores'} · {u.consejeros} {u.consejeros === 1 ? 'consejero' : 'consejeros'}</small></span>
                  {e.adulto && u.sexo === e.sexo && <Boton tipo="fantasma" disabled={ocupado} onClick={() => void hacer(() => api!.serConsejero(u.id), `Ahora eres consejero${e.sexo === 'f' ? 'a' : ''} de ${u.nombre}.`)}>Ser consejero</Boton>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
