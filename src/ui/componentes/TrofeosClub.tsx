import { useCallback, useEffect, useState } from 'react'
import type { ColorTrofeo, IconoTrofeo, MiembroConAvatar, Trofeo, TrofeosClub as Datos } from '../../application/puertos'
import { mensajeError } from '../../application/errores'
import { useJuego } from '../estado'
import { Boton } from './Comunes'

const ICONOS: Record<IconoTrofeo, string> = { copa: 'Copa', medalla: 'Medalla', estrella: 'Estrella', escudo: 'Escudo', corona: 'Corona', llama: 'Llama' }
const COLORES: Record<ColorTrofeo, [string, string]> = {
  oro: ['#F2B90F', '#C98F00'], plata: ['#D6DCE4', '#8A939F'], bronce: ['#D9894A', '#9A5A2A'], rojo: ['#E8444F', '#A81E28'], azul: ['#4A8BEA', '#1F4FB8'], verde: ['#3FBF6A', '#1E7A3C'],
}
const limpiar = (t: string, max: number) => t.replace(/[<>\u0000-\u001f\u007f]/g, '').slice(0, max)

/** Dibujo del trofeo (SVG propio): forma según el ícono y color del metal. */
export function DibujoTrofeo({ t, alto = 56 }: { t: Pick<Trofeo, 'icono' | 'color'>; alto?: number }) {
  const [c, s] = COLORES[t.color]
  const forma: Record<IconoTrofeo, React.ReactNode> = {
    copa: <><path d="M18 10h28v10a14 14 0 0 1-28 0z" fill={c} stroke="#1E140C" strokeWidth="3" /><path d="M18 14h-6a6 6 0 0 0 8 10M46 14h6a6 6 0 0 1-8 10" fill="none" stroke="#1E140C" strokeWidth="3" /><rect x="28" y="34" width="8" height="10" fill={s} stroke="#1E140C" strokeWidth="3" /><rect x="20" y="44" width="24" height="8" rx="2" fill={c} stroke="#1E140C" strokeWidth="3" /></>,
    medalla: <><path d="M22 6l10 16 10-16" fill="#D7242F" stroke="#1E140C" strokeWidth="3" /><circle cx="32" cy="38" r="15" fill={c} stroke="#1E140C" strokeWidth="3" /><circle cx="32" cy="38" r="8" fill={s} /></>,
    estrella: <path d="M32 6l7.6 15.6 17.2 2.4-12.4 12 3 17L32 45l-15.4 8 3-17-12.4-12 17.2-2.4z" fill={c} stroke="#1E140C" strokeWidth="3" strokeLinejoin="round" />,
    escudo: <><path d="M32 6l20 7v14c0 13-9 22-20 27C21 49 12 40 12 27V13z" fill={c} stroke="#1E140C" strokeWidth="3" strokeLinejoin="round" /><path d="M32 16v30M22 26h20" stroke={s} strokeWidth="5" /></>,
    corona: <><path d="M10 46l4-26 10 12 8-18 8 18 10-12 4 26z" fill={c} stroke="#1E140C" strokeWidth="3" strokeLinejoin="round" /><rect x="10" y="46" width="44" height="8" fill={s} stroke="#1E140C" strokeWidth="3" /></>,
    llama: <path d="M32 6c4 10 16 16 16 30a16 16 0 0 1-32 0c0-8 5-12 8-16 1 6 4 8 6 8-2-8 0-15 2-22z" fill={c} stroke="#1E140C" strokeWidth="3" strokeLinejoin="round" />,
  }
  return <svg viewBox="0 0 64 60" width={alto} height={alto * 60 / 64} aria-hidden>{forma[t.icono]}</svg>
}

/** Trofeos del club: el director los crea y los entrega a miembros o unidades; cada uno ve los suyos. */
export function TrofeosClub() {
  const { repo } = useJuego()
  const api = repo.clubPerfil
  const [d, setD] = useState<Datos | null>(null)
  const [miembros, setMiembros] = useState<MiembroConAvatar[]>([])
  const [unidades, setUnidades] = useState<{ id: string; nombre: string }[]>([])
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [nuevo, setNuevo] = useState({ nombre: '', descripcion: '', icono: 'copa' as IconoTrofeo, color: 'oro' as ColorTrofeo })
  const [entrega, setEntrega] = useState<{ trofeo: string; a: string; motivo: string }>({ trofeo: '', a: '', motivo: '' })

  const cargar = useCallback(async () => {
    if (!api) return
    try {
      const x = await api.trofeos(); setD(x)
      if (x.soy_director) {
        repo.directorMiembros?.().then(setMiembros).catch(() => undefined)
        repo.unidades?.estado().then(e => setUnidades(e.unidades)).catch(() => undefined)
      }
    } catch (e) { setMsg({ t: mensajeError(e), ok: false }) }
  }, [api, repo])
  useEffect(() => { void cargar() }, [cargar])
  const hacer = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null); setOcupado(true)
    try { await fn(); await cargar(); setMsg({ t: ok, ok: true }) } catch (e) { setMsg({ t: mensajeError(e), ok: false }) } finally { setOcupado(false) }
  }
  if (!api || !d) return null

  return (
    <section className="tarjeta trofeos">
      <h3>Trofeos del club</h3>
      {msg && <p className={msg.ok ? 'aviso-ok' : 'error'} role="status">{msg.t}</p>}
      {d.mios.length > 0 && (
        <>
          <h4>Mis trofeos</h4>
          <ul className="trofeos-grilla">
            {d.mios.map((t, i) => (
              <li key={t.id + i}><DibujoTrofeo t={t} /><b>{t.nombre}</b><small>{t.unidad ? 'De tu unidad · ' : ''}{new Date(t.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</small>{t.motivo && <p>{t.motivo}</p>}</li>
            ))}
          </ul>
        </>
      )}
      {d.trofeos.length === 0 ? <p className="nota">{d.soy_director ? 'Crea los trofeos de tu club (mejor unidad del mes, campeón de marchas…) y entrégalos.' : 'Tu club aún no tiene trofeos.'}</p> : (
        <ul className="trofeos-lista">
          {d.trofeos.map(t => (
            <li key={t.id}>
              <DibujoTrofeo t={t} alto={48} />
              <div>
                <b>{t.nombre}</b>{t.descripcion && <small>{t.descripcion}</small>}
                <small>{t.entregas.length ? `Entregado a: ${t.entregas.slice(0, 6).map(e => e.a).join(', ')}${t.entregas.length > 6 ? '…' : ''}` : 'Aún sin entregar'}</small>
              </div>
              {d.soy_director && <button className="museo-borrar" disabled={ocupado} onClick={() => void hacer(() => api.borrarTrofeo(t.id), 'Trofeo eliminado.')} aria-label={`Eliminar ${t.nombre}`}>✕</button>}
            </li>
          ))}
        </ul>
      )}
      {d.soy_director && (
        <div className="trofeos-director">
          <form className="form" onSubmit={e => { e.preventDefault(); void hacer(async () => { if (nuevo.nombre.trim().length < 2) throw new Error('TEXTO_INVALIDO'); await api.crearTrofeo(nuevo); setNuevo({ ...nuevo, nombre: '', descripcion: '' }) }, 'Trofeo creado.') }}>
            <h4>Crear trofeo</h4>
            <div className="trofeo-vista"><DibujoTrofeo t={nuevo} alto={64} /></div>
            <label>Nombre<input value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: limpiar(e.target.value, 40) })} placeholder="Ej. Mejor unidad del mes" required /></label>
            <div className="dos">
              <label>Forma<select value={nuevo.icono} onChange={e => setNuevo({ ...nuevo, icono: e.target.value as IconoTrofeo })}>{(Object.keys(ICONOS) as IconoTrofeo[]).map(i => <option key={i} value={i}>{ICONOS[i]}</option>)}</select></label>
              <label>Color<select value={nuevo.color} onChange={e => setNuevo({ ...nuevo, color: e.target.value as ColorTrofeo })}>{(Object.keys(COLORES) as ColorTrofeo[]).map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select></label>
            </div>
            <label>Descripción<input value={nuevo.descripcion} onChange={e => setNuevo({ ...nuevo, descripcion: limpiar(e.target.value, 200) })} /></label>
            <Boton type="submit" disabled={ocupado}>Crear trofeo</Boton>
          </form>
          {d.trofeos.length > 0 && (
            <form className="form" onSubmit={e => {
              e.preventDefault()
              const [tipo, id] = entrega.a.split(':')
              void hacer(async () => { await api.entregarTrofeo(entrega.trofeo, tipo === 'u' ? { unidad: id } : { jugador: id }, entrega.motivo); setEntrega({ ...entrega, a: '', motivo: '' }) }, '¡Trofeo entregado!')
            }}>
              <h4>Entregar trofeo</h4>
              <label>Trofeo<select value={entrega.trofeo} onChange={e => setEntrega({ ...entrega, trofeo: e.target.value })} required>
                <option value="">Elige…</option>{d.trofeos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select></label>
              <label>A quién<select value={entrega.a} onChange={e => setEntrega({ ...entrega, a: e.target.value })} required>
                <option value="">Elige…</option>
                {unidades.length > 0 && <optgroup label="Unidades">{unidades.map(u => <option key={u.id} value={`u:${u.id}`}>Unidad {u.nombre}</option>)}</optgroup>}
                <optgroup label="Miembros">{miembros.map(m => <option key={m.id} value={`j:${m.id}`}>{m.apodo}</option>)}</optgroup>
              </select></label>
              <label>Motivo (opcional)<input value={entrega.motivo} onChange={e => setEntrega({ ...entrega, motivo: limpiar(e.target.value, 120) })} placeholder="Ej. Ganó la marcha del campori 2025" /></label>
              <Boton type="submit" disabled={ocupado || !entrega.trofeo || !entrega.a}>Entregar</Boton>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
