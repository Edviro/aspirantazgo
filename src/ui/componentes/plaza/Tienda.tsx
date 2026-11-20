import { useEffect, useState } from 'react'
import type { Bolsa, ItemTienda } from '../../../application/puertos'
import { mensajeError } from '../../../application/errores'
import { useJuego } from '../../estado'
import { sfx } from '../../sonido'
import { Boton } from '../Comunes'
import { IconoItem } from './Iconos'

/** Moneda del juego (en portugués será DesbravaCoins). */
export const MONEDA = 'ConquisCoins'

export function Moneda({ n, className = '' }: { n: number; className?: string }) {
  return <span className={`moneda ${className}`}><i aria-hidden />{n.toLocaleString('es-PE')}<span className="sr-only"> {MONEDA}</span></span>
}

/**
 * Tienda de parches y pines: se compra con ConquisCoins, que se ganan superando desafíos (con un tope por día).
 * Todo lo valida el servidor: el saldo, el precio y que no compres dos veces lo mismo.
 */
export function Tienda({ bolsa, onBolsa, onCerrar }: { bolsa: Bolsa | null; onBolsa: (b: Bolsa) => void; onCerrar: () => void }) {
  const { repo } = useJuego()
  const [items, setItems] = useState<ItemTienda[] | null>(null)
  const [error, setError] = useState('')
  const [comprando, setComprando] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  useEffect(() => {
    if (!repo.catalogoTienda) { setItems([]); return }
    repo.catalogoTienda().then(setItems).catch(e => { setItems([]); setError(mensajeError(e)) })
  }, [repo])

  const comprar = async (it: ItemTienda) => {
    if (!repo.comprar) return
    setError(''); setComprando(it.id)
    try { const b = await repo.comprar(it.id); onBolsa(b); setHecho(it.id); sfx.desbloqueo() } catch (e) { setError(mensajeError(e)); sfx.mal() } finally { setComprando(null) }
  }
  const tengo = new Set(bolsa?.items ?? [])
  const enLinea = !!repo.comprar

  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop tienda" role="dialog" aria-modal="true" aria-label="Tienda de parches y pines" onClick={e => e.stopPropagation()}>
        <h2>Tienda del campamento</h2>
        <p className="tienda-saludo">«¡Bienvenido, conquistador! Aquí hay parches y pines para tu carpa y tu uniforme.»</p>
        {enLinea && bolsa && (
          <div className="tienda-saldo">
            <Moneda n={bolsa.saldo} className="grande" />
            <small>Ganas {MONEDA} al superar desafíos: hoy llevas {bolsa.ganadas_hoy} de {bolsa.tope}.</small>
          </div>
        )}
        {!enLinea && <p className="nota">La tienda funciona con tu cuenta en línea.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {items === null ? <p>Cargando…</p> : (
          <ul className="tienda-lista">
            {items.map(it => {
              const mio = tengo.has(it.id), alcanza = (bolsa?.saldo ?? 0) >= it.precio
              return (
                <li key={it.id} className={`${mio ? 'mio' : ''} ${hecho === it.id ? 'recien' : ''}`}>
                  <IconoItem id={it.id} alto={40} />
                  <span className="tienda-nombre"><b>{it.nombre}</b><small>{it.tipo === 'pin' ? 'Pin' : it.tipo === 'parche' ? 'Parche' : 'Para tu carpa'}</small></span>
                  {mio ? <span className="tienda-tengo">✓ Tuyo</span>
                    : <Boton tipo={alcanza ? 'verde' : 'fantasma'} disabled={!enLinea || !alcanza || comprando !== null} onClick={() => comprar(it)}>
                      {comprando === it.id ? '…' : <Moneda n={it.precio} />}
                    </Boton>}
                </li>
              )
            })}
          </ul>
        )}
        <div className="fila-botones"><Boton tipo="fantasma" onClick={onCerrar}>Cerrar</Boton></div>
      </div>
    </div>
  )
}
