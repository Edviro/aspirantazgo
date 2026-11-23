import { useEffect, useState } from 'react'
import type { Intercambio, ItemCambio, PuertoIntercambios } from '../../../application/puertos'
import { mensajeError } from '../../../application/errores'
import { Boton } from '../Comunes'
import { IconoItem } from './Iconos'

const ESTADO_TXT: Record<Intercambio['estado'], string> = { pendiente: 'Esperando', aceptado: '¡Hecho!', rechazado: 'No aceptó', cancelado: 'Cancelado', vencido: 'Venció' }

function Lista({ items, elegidos, onToggle, vacio }: { items: ItemCambio[]; elegidos: string[]; onToggle: (id: string) => void; vacio: string }) {
  if (!items.length) return <p className="nota">{vacio}</p>
  return (
    <ul className="cambio-items">
      {items.map(i => (
        <li key={i.id}>
          <button type="button" className={elegidos.includes(i.id) ? 'on' : ''} aria-pressed={elegidos.includes(i.id)} onClick={() => onToggle(i.id)}>
            <IconoItem id={i.id} alto={26} /><span>{i.nombre}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
const nombres = (l: ItemCambio[]) => (l.length ? l.map(i => i.nombre).join(', ') : 'nada')

/** Proponer un intercambio a otro jugador: hasta 3 pines o parches de cada lado. */
export function ProponerIntercambio({ api, con, onCerrar }: { api: PuertoIntercambios; con: { id: string; apodo: string }; onCerrar: () => void }) {
  const [mios, setMios] = useState<ItemCambio[] | null>(null)
  const [suyos, setSuyos] = useState<ItemCambio[] | null>(null)
  const [doy, setDoy] = useState<string[]>([])
  const [pido, setPido] = useState<string[]>([])
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    api.intercambiables().then(setMios).catch(e => { setMios([]); setMsg({ t: mensajeError(e), ok: false }) })
    api.intercambiables(con.id).then(setSuyos).catch(() => setSuyos([]))
  }, [api, con.id])
  const alternar = (l: string[], set: (x: string[]) => void, id: string) => set(l.includes(id) ? l.filter(x => x !== id) : l.length >= 3 ? l : [...l, id])
  // Sin repetidos: no se ofrece lo que ya tiene el otro ni se pide lo que ya tienes
  const misUtiles = (mios ?? []).filter(i => !(suyos ?? []).some(s => s.id === i.id))
  const susUtiles = (suyos ?? []).filter(i => !(mios ?? []).some(s => s.id === i.id))
  const enviar = async () => {
    setOcupado(true); setMsg(null)
    try { await api.proponer(con.id, doy, pido); setMsg({ t: `Propuesta enviada a ${con.apodo}. Tiene 2 días para responder.`, ok: true }); setDoy([]); setPido([]) }
    catch (e) { setMsg({ t: mensajeError(e), ok: false }) } finally { setOcupado(false) }
  }
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop intercambio" role="dialog" aria-modal="true" aria-label={`Intercambiar con ${con.apodo}`} onClick={e => e.stopPropagation()}>
        <h2>Intercambiar con {con.apodo}</h2>
        <p className="nota">Solo pines y parches comprados o de recuerdo. Lo que ganaste jugando es tuyo para siempre y no se intercambia.</p>
        <h3>Tú das (hasta 3)</h3>
        {mios === null ? <p>Cargando…</p> : <Lista items={misUtiles} elegidos={doy} onToggle={id => alternar(doy, setDoy, id)} vacio="No tienes pines ni parches que le falten." />}
        <h3>Pides (hasta 3)</h3>
        {suyos === null ? <p>Cargando…</p> : <Lista items={susUtiles} elegidos={pido} onToggle={id => alternar(pido, setPido, id)} vacio={`${con.apodo} no tiene pines ni parches que te falten.`} />}
        {msg && <p className={msg.ok ? 'aviso-ok' : 'error'} role="status">{msg.t}</p>}
        <div className="fila-botones">
          <Boton tipo="fantasma" onClick={onCerrar}>Cerrar</Boton>
          <Boton disabled={ocupado || doy.length + pido.length === 0} onClick={() => void enviar()}>Proponer</Boton>
        </div>
      </div>
    </div>
  )
}

/** Mis intercambios: los que me propusieron (aceptar o rechazar) y los que propuse (cancelar). */
export function MisIntercambios({ api, onCerrar, onCambio }: { api: PuertoIntercambios; onCerrar: () => void; onCambio?: () => void }) {
  const [lista, setLista] = useState<Intercambio[] | null>(null)
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const cargar = () => api.lista().then(setLista).catch(e => { setLista([]); setMsg({ t: mensajeError(e), ok: false }) })
  useEffect(() => { void cargar() }, [api]) // eslint-disable-line react-hooks/exhaustive-deps
  const responder = async (i: Intercambio, ok: boolean) => {
    setOcupado(true); setMsg(null)
    try {
      await api.responder(i.id, ok)
      setMsg({ t: !i.recibido ? 'Propuesta cancelada.' : ok ? '¡Intercambio hecho! Ya está en tu mochila.' : 'Propuesta rechazada.', ok: true })
      onCambio?.()
    } catch (e) { setMsg({ t: mensajeError(e), ok: false }) } finally { setOcupado(false); void cargar() }
  }
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop intercambio" role="dialog" aria-modal="true" aria-label="Mis intercambios" onClick={e => e.stopPropagation()}>
        <h2>Intercambios</h2>
        <p className="nota">Para proponer uno, toca a otro Conquistador en el campamento y elige «Intercambiar».</p>
        {msg && <p className={msg.ok ? 'aviso-ok' : 'error'} role="status">{msg.t}</p>}
        {lista === null ? <p>Cargando…</p> : lista.length === 0 ? <p className="nota">Todavía no tienes intercambios.</p> : (
          <ul className="cambio-lista">
            {lista.map(i => (
              <li key={i.id} className={i.estado}>
                <div>
                  <b>{i.recibido ? `${i.otro?.apodo ?? 'Alguien'} te propone` : `Propusiste a ${i.otro?.apodo ?? 'alguien'}`}</b>
                  <small>{i.otro?.club}</small>
                  <span>{i.recibido ? <>Te da: <b>{nombres(i.doy)}</b> · Te pide: <b>{nombres(i.pido)}</b></> : <>Das: <b>{nombres(i.doy)}</b> · Pides: <b>{nombres(i.pido)}</b></>}</span>
                  <em>{ESTADO_TXT[i.estado]}</em>
                </div>
                {i.estado === 'pendiente' && (i.recibido ? (
                  <div className="fila-botones">
                    <Boton tipo="fantasma" disabled={ocupado} onClick={() => void responder(i, false)}>No, gracias</Boton>
                    <Boton disabled={ocupado} onClick={() => void responder(i, true)}>Aceptar</Boton>
                  </div>
                ) : <Boton tipo="fantasma" disabled={ocupado} onClick={() => void responder(i, false)}>Cancelar</Boton>)}
              </li>
            ))}
          </ul>
        )}
        <Boton tipo="fantasma" onClick={onCerrar}>Cerrar</Boton>
      </div>
    </div>
  )
}
