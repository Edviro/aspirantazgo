import { useJuego } from '../estado'
import { useProgreso } from '../progreso'
import { Boton, Cielo } from '../componentes/Comunes'
import { Parche } from '../componentes/Parche'
import { LOGROS } from '../../domain/logros'
import { rachaVigente, retoDelDia } from '../../domain/diario'

/** Mis parches: la colección de logros, el reto del día y la racha. */
export default function Logros() {
  const { ir, jugar } = useJuego()
  const { logros, racha } = useProgreso()
  const reto = retoDelDia()
  const vigente = rachaVigente(racha)
  const hecho = racha.ultimo === reto.fecha
  return (
    <div className="pantalla logros">
      <Cielo />
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir('mapa')} aria-label="Volver al mapa">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><small>Tu colección</small><strong>Mis parches</strong></div>
        <span className="en-vivo">{logros.length} de {LOGROS.length}</span>
      </header>
      <div className="logros-cuerpo">
        <section className="tarjeta reto-dia-tarjeta">
          <div>
            <h3>Reto del día</h3>
            <p><b>{reto.nivel.titulo}</b>: el mismo nivel y las mismas piezas para todos los Conquistadores hoy.</p>
            <p className="ayuda">Racha actual: <b>{vigente} {vigente === 1 ? 'día' : 'días'}</b> · Mejor racha: {racha.mejor}</p>
          </div>
          {hecho ? <span className="estado aprobada">Cumplido hoy</span>
            : <Boton onClick={() => jugar(reto.nivel, true, 'medio', reto.semilla)}>Jugar el reto</Boton>}
        </section>
        <ul className="parches">
          {LOGROS.map(l => {
            const ganado = logros.includes(l.id)
            return (
              <li key={l.id} className={ganado ? 'ganado' : ''}>
                <Parche l={l} ganado={ganado} />
                <b>{ganado ? l.nombre : '???'}</b>
                <small>{l.como}</small>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
