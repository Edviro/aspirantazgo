import { useCallback, useEffect, useState } from 'react'
import type { PerfilClub, PiezaMuseo, RedesClub, TipoPieza } from '../../application/puertos'
import { mensajeError } from '../../application/errores'
import { useJuego } from '../estado'
import { Boton, Cielo } from '../componentes/Comunes'

const TIPO_TXT: Record<TipoPieza, string> = { polo: 'Polos', trofeo: 'Trofeos', parche: 'Parches', pin: 'Pines', foto: 'Fotos', otro: 'Recuerdos' }
const TIPO_ICONO: Record<TipoPieza, string> = { polo: '👕', trofeo: '🏆', parche: '🧵', pin: '📍', foto: '📷', otro: '🎒' }
const REDES: { k: keyof RedesClub; n: string; url: (u: string) => string }[] = [
  { k: 'facebook', n: 'Facebook', url: u => `https://www.facebook.com/${encodeURIComponent(u)}` },
  { k: 'instagram', n: 'Instagram', url: u => `https://www.instagram.com/${encodeURIComponent(u)}` },
  { k: 'tiktok', n: 'TikTok', url: u => `https://www.tiktok.com/@${encodeURIComponent(u)}` },
  { k: 'youtube', n: 'YouTube', url: u => `https://www.youtube.com/@${encodeURIComponent(u)}` },
]
const limpiar = (t: string, max: number) => t.replace(/[<>\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, max)
const ANIO = new Date().getFullYear()

/** Foto del museo: se pide una URL temporal (el almacén es privado; solo se ve si está aprobada o si eres su director). */
function Foto({ ruta, alt }: { ruta: string; alt: string }) {
  const { repo } = useJuego()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { let vivo = true; repo.clubPerfil?.urlFoto(ruta).then(u => { if (vivo) setUrl(u) }).catch(() => undefined); return () => { vivo = false } }, [ruta, repo])
  return url ? <img src={url} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className="museo-foto-cargando" aria-hidden />
}

/**
 * Mi club: su historia, año de fundación, redes sociales y el museo (polos de cada año, trofeos, parches, pines
 * y fotos de cada campamento). El director edita; las fotos se ven cuando el administrador las aprueba.
 */
export default function MiClub() {
  const { repo, ir, hub, perfil } = useJuego()
  const api = repo.clubPerfil
  const [c, setC] = useState<PerfilClub | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [editar, setEditar] = useState(false)
  const [f, setF] = useState({ fundacion: '', historia: '', redes: {} as RedesClub })
  const [nueva, setNueva] = useState({ tipo: 'trofeo' as TipoPieza, titulo: '', anio: String(ANIO), campamento: '', descripcion: '' })
  const [foto, setFoto] = useState<File | null>(null)
  const [filtro, setFiltro] = useState<TipoPieza | 'todo'>('todo')

  const cargar = useCallback(async () => {
    if (!api) { setError('El museo del club funciona con tu cuenta en línea.'); return }
    try { setC(await api.perfil()) } catch (e) { setError(mensajeError(e)) }
  }, [api])
  useEffect(() => { void cargar() }, [cargar])
  const hacer = async (fn: () => Promise<unknown>, msg: string) => {
    setError(''); setOk(''); setOcupado(true)
    try { await fn(); await cargar(); setOk(msg) } catch (e) { setError(mensajeError(e)) } finally { setOcupado(false) }
  }
  const piezas = (c?.piezas ?? []).filter(p => filtro === 'todo' || p.tipo === filtro)
  const anios = c?.fundacion ? ANIO - c.fundacion : null

  return (
    <div className="pantalla miclub">
      <Cielo />
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir(hub)} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><small>Historia y museo</small><strong>{c?.nombre ?? perfil?.club.nombre ?? 'Mi club'}</strong></div>
        <span />
      </header>
      <div className="miclub-cuerpo">
        {error && <p className="error" role="alert">{error}</p>}
        {ok && <p className="aviso-ok" role="status">{ok}</p>}
        {!c && !error && <p>Cargando…</p>}
        {c && !editar && (
          <section className="tarjeta miclub-ficha">
            <h2>{c.nombre}</h2>
            <p className="miclub-datos">
              {[c.ciudad, c.campo, c.union].filter(Boolean).join(' · ')}
            </p>
            <ul className="miclub-cifras">
              {c.fundacion && <li><b>{c.fundacion}</b><small>fundación{anios !== null && anios > 0 ? ` · ${anios} ${anios === 1 ? 'año' : 'años'}` : ''}</small></li>}
              <li><b>{c.miembros}</b><small>miembros en el juego</small></li>
              <li><b>{c.unidades}</b><small>unidades</small></li>
            </ul>
            {c.historia ? <p className="miclub-historia">{c.historia}</p> : <p className="nota">{c.soy_director ? 'Cuenta la historia de tu club: cómo nació, sus campamentos, sus logros.' : 'El director aún no escribe la historia del club.'}</p>}
            {REDES.some(r => c.redes[r.k]) && (
              <p className="miclub-redes">
                {REDES.filter(r => c.redes[r.k]).map(r => <a key={r.k} href={r.url(c.redes[r.k]!)} target="_blank" rel="noopener noreferrer nofollow">{r.n}</a>)}
              </p>
            )}
            {c.soy_director && <Boton onClick={() => { setF({ fundacion: c.fundacion ? String(c.fundacion) : '', historia: c.historia ?? '', redes: { ...c.redes } }); setEditar(true) }}>Editar historia y redes</Boton>}
          </section>
        )}
        {c && editar && (
          <form className="tarjeta form miclub-form" onSubmit={e => {
            e.preventDefault()
            const fu = f.fundacion ? Number(f.fundacion) : null
            void hacer(async () => {
              if (fu !== null && (!Number.isInteger(fu) || fu < 1900 || fu > ANIO)) throw new Error('DATOS_INVALIDOS')
              await api!.editar(fu, f.historia, f.redes); setEditar(false)
            }, 'Historia del club guardada.')
          }}>
            <label>Año de fundación<input inputMode="numeric" value={f.fundacion} onChange={e => setF({ ...f, fundacion: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="Ej. 2015" /></label>
            <label>Historia del club<textarea rows={8} value={f.historia} onChange={e => setF({ ...f, historia: limpiar(e.target.value, 6000) })} placeholder="Cómo nació el club, quiénes lo fundaron, sus campamentos y logros…" /></label>
            <div className="dos">
              {REDES.map(r => (
                <label key={r.k}>{r.n} (solo el usuario)<input value={f.redes[r.k] ?? ''} onChange={e => setF({ ...f, redes: { ...f.redes, [r.k]: e.target.value.replace(/[^A-Za-z0-9._@-]/g, '').slice(0, 60) } })} placeholder="clubaggelos" autoComplete="off" /></label>
              ))}
            </div>
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => setEditar(false)}>Cancelar</Boton>
              <Boton type="submit" disabled={ocupado}>Guardar</Boton>
            </div>
          </form>
        )}

        {c && (
          <section className="tarjeta museo">
            <h3>Museo del club</h3>
            <div className="chips museo-filtros">
              <button className={filtro === 'todo' ? 'on' : ''} onClick={() => setFiltro('todo')}>Todo</button>
              {(Object.keys(TIPO_TXT) as TipoPieza[]).map(t => <button key={t} className={filtro === t ? 'on' : ''} onClick={() => setFiltro(t)}>{TIPO_ICONO[t]} {TIPO_TXT[t]}</button>)}
            </div>
            {piezas.length === 0 && <p className="nota">{c.soy_director ? 'Agrega el polo de cada año, los trofeos, parches y pines de cada campamento.' : 'Todavía no hay piezas en el museo.'}</p>}
            <ul className="museo-grilla">
              {piezas.map((p: PiezaMuseo) => (
                <li key={p.id} className={`museo-pieza ${p.estado}`}>
                  <div className="museo-img">{p.ruta ? <Foto ruta={p.ruta} alt={p.titulo} /> : <span className="museo-icono" aria-hidden>{TIPO_ICONO[p.tipo]}</span>}</div>
                  <b>{p.titulo}</b>
                  <small>{[p.anio, p.campamento].filter(Boolean).join(' · ')}</small>
                  {p.descripcion && <p>{p.descripcion}</p>}
                  {p.estado !== 'aprobada' && <em className="museo-estado">{p.estado === 'pendiente' ? 'Foto por aprobar' : 'Foto rechazada'}</em>}
                  {c.soy_director && <button className="museo-borrar" disabled={ocupado} onClick={() => void hacer(() => api!.borrar(p.id), 'Pieza quitada del museo.')} aria-label={`Quitar ${p.titulo}`}>✕</button>}
                </li>
              ))}
            </ul>
            {c.soy_director && (
              <form className="form museo-form" onSubmit={e => {
                e.preventDefault()
                void hacer(async () => {
                  if (nueva.titulo.trim().length < 2) throw new Error('TEXTO_INVALIDO')
                  const anio = nueva.anio ? Number(nueva.anio) : null
                  const ruta = foto ? await api!.subirFoto(c.id, foto) : null
                  await api!.agregar({ tipo: nueva.tipo, titulo: nueva.titulo.trim(), anio, campamento: nueva.campamento, descripcion: nueva.descripcion, ruta })
                  setNueva({ ...nueva, titulo: '', campamento: '', descripcion: '' }); setFoto(null)
                }, foto ? 'Pieza agregada. La foto se verá cuando el administrador la apruebe.' : 'Pieza agregada al museo.')
              }}>
                <h4>Agregar al museo</h4>
                <div className="dos">
                  <label>Tipo<select value={nueva.tipo} onChange={e => setNueva({ ...nueva, tipo: e.target.value as TipoPieza })}>
                    {(Object.keys(TIPO_TXT) as TipoPieza[]).map(t => <option key={t} value={t}>{TIPO_TXT[t]}</option>)}
                  </select></label>
                  <label>Año<input inputMode="numeric" value={nueva.anio} onChange={e => setNueva({ ...nueva, anio: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
                </div>
                <label>Nombre<input value={nueva.titulo} onChange={e => setNueva({ ...nueva, titulo: limpiar(e.target.value, 60) })} placeholder="Ej. 1.er lugar en marchas" required /></label>
                <label>Campamento o evento<input value={nueva.campamento} onChange={e => setNueva({ ...nueva, campamento: limpiar(e.target.value, 60) })} placeholder="Ej. Campori APCE 2025" /></label>
                <label>Descripción<input value={nueva.descripcion} onChange={e => setNueva({ ...nueva, descripcion: limpiar(e.target.value, 300) })} maxLength={300} /></label>
                <label>Foto (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFoto(e.target.files?.[0] ?? null)} /></label>
                <p className="nota">Las fotos las revisa el administrador antes de que se vean. Evita fotos con caras de niños en primer plano, nombres completos o datos personales.</p>
                <Boton type="submit" disabled={ocupado}>{ocupado ? 'Subiendo…' : 'Agregar'}</Boton>
              </form>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
