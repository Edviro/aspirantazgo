import { useEffect, useState } from 'react'
import type { AmbitoTorneo, PuertoAdmin, TorneoAdmin } from '../../../application/puertos'
import { TODOS_LOS_NIVELES } from '../../../domain/niveles'
import { useJuego } from '../../estado'
import { Boton } from '../Comunes'

export const AMBITO_TXT: Record<AmbitoTorneo, string> = { clubes: 'Clubes', campos: 'Asociaciones y misiones', uniones: 'Uniones', paises: 'Países' }
const hoy = (dias = 0) => { const d = new Date(Date.now() + dias * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const fecha = (iso: string) => new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const nombreReto = (id: string) => TODOS_LOS_NIVELES.find(n => n.id === id)?.titulo ?? id
const limpiar = (s: string) => s.replace(/[<>\u0000-\u001f\u007f]/g, '').slice(0, 60)

/** Superadmin: torneos abiertos entre clubes, asociaciones, uniones o países. */
export function AdminTorneos({ admin, hacer }: { admin: PuertoAdmin; hacer: (fn: () => Promise<void>, ok?: string) => Promise<void> }) {
  const { repo } = useJuego()
  const [lista, setLista] = useState<TorneoAdmin[]>([])
  const [paises, setPaises] = useState<{ codigo: string; nombre: string }[]>([])
  const [f, setF] = useState({ titulo: 'Gran torneo de uniformes', ambito: 'clubes' as AmbitoTorneo, reto: TODOS_LOS_NIVELES[0]?.id ?? '', desde: hoy(), hasta: hoy(7), pais: '' })
  const cargar = () => hacer(async () => { if (admin.torneos) setLista(await admin.torneos()) })
  useEffect(() => {
    cargar()
    repo.cuentas?.catalogo().then(c => setPaises(c.paises)).catch(() => undefined)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const crear = () => hacer(async () => {
    if (!admin.crearTorneo) return
    const inicia = new Date(`${f.desde}T00:00:00`), termina = new Date(`${f.hasta}T23:59:00`)
    if (Number.isNaN(inicia.getTime()) || Number.isNaN(termina.getTime()) || termina <= inicia) throw new Error('FECHA_INVALIDA')
    await admin.crearTorneo({ titulo: f.titulo.trim(), ambito: f.ambito, reto: f.reto, inicia: inicia.toISOString(), termina: termina.toISOString(), pais: f.pais || null })
    await cargar()
  }, 'Torneo creado: ya aparece en el tablero de retos del Gran Campamento.')

  return (
    <>
      <section className="tarjeta">
        <h3>Nuevo torneo</h3>
        <p className="ayuda">Cuenta el mejor puntaje de cada conquistador en ese desafío entre las fechas (no las salas). Cada grupo suma sus 5 mejores (clubes) o sus 10 mejores (asociaciones, uniones y países), así no gana solo el más numeroso.</p>
        <form className="form form-sesion" onSubmit={e => { e.preventDefault(); crear() }}>
          <label>Título<input value={f.titulo} onChange={e => setF({ ...f, titulo: limpiar(e.target.value) })} maxLength={60} required /></label>
          <div className="dos">
            <label>Compiten<select value={f.ambito} onChange={e => setF({ ...f, ambito: e.target.value as AmbitoTorneo })}>
              {(Object.keys(AMBITO_TXT) as AmbitoTorneo[]).map(a => <option key={a} value={a}>{AMBITO_TXT[a]}</option>)}
            </select></label>
            <label>Solo de<select value={f.pais} onChange={e => setF({ ...f, pais: e.target.value })}>
              <option value="">Todos los países</option>
              {paises.map(p => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
            </select></label>
          </div>
          <label>Desafío<select value={f.reto} onChange={e => setF({ ...f, reto: e.target.value })}>
            {TODOS_LOS_NIVELES.map(n => <option key={n.id} value={n.id}>{n.titulo}</option>)}
          </select></label>
          <div className="dos">
            <label>Desde<input type="date" value={f.desde} onChange={e => setF({ ...f, desde: e.target.value })} required /></label>
            <label>Hasta<input type="date" value={f.hasta} min={f.desde} onChange={e => setF({ ...f, hasta: e.target.value })} required /></label>
          </div>
          <Boton type="submit">Crear torneo</Boton>
        </form>
      </section>
      <ul className="admin-lista">
        {lista.map(t => (
          <li key={t.id} className={`sesion ${t.estado === 'activo' ? 'aprobada' : t.estado === 'cancelado' ? 'rechazada' : 'pendiente'}`}>
            <div className="admin-fila"><b>{t.titulo}</b><span className={`estado ${t.estado}`}>{t.tipo === 'clubes' ? 'reto de club' : AMBITO_TXT[t.ambito]}</span></div>
            <small>{nombreReto(t.reto)} · {fecha(t.inicia)} a {fecha(t.termina)}{t.pais ? ` · solo ${t.pais}` : ''}{t.tipo === 'clubes' ? ` · ${t.clubes} clubes` : ''}</small>
            {!!t.top?.length && <small>Van ganando: {t.top.map((x, i) => `${i + 1}. ${x.nombre} (${x.puntos})`).join(' · ')}</small>}
            {t.estado !== 'cancelado' && new Date(t.termina) > new Date() &&
              <div className="admin-acciones"><button className="borrar" onClick={() => hacer(async () => { await admin.cancelarTorneo?.(t.id); await cargar() }, 'Torneo cancelado.')}>Cancelar</button></div>}
          </li>
        ))}
        {lista.length === 0 && <li className="vacio">Aún no hay torneos.</li>}
      </ul>
    </>
  )
}
