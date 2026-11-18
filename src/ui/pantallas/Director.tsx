import { useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { Boton, Cielo } from '../componentes/Comunes'

type Miembro = { apodo: string; rango: string; grupo_edad: string; puntos: number }

export default function Director() {
  const { perfil, repo, ir, verLegal } = useJuego()
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [copiado, setCopiado] = useState(false)
  const [borrar, setBorrar] = useState<string | null>(null)

  const cargar = () => repo.miembrosClub().then(setMiembros).catch(() => setMiembros([]))
  useEffect(() => { cargar() }, [repo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!perfil) return null
  const copiar = async () => {
    try { await navigator.clipboard.writeText(perfil.club.codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1500) } catch { /* */ }
  }

  return (
    <div className="pantalla director">
      <Cielo />
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir('mapa')} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><small>Panel del director</small><strong>{perfil.club.nombre}</strong></div>
        <span />
      </header>
      <div className="director-cuerpo">
        <section className="tarjeta codigo-club">
          <small>Código del club</small>
          <div className="codigo">{perfil.club.codigo}</div>
          <Boton tipo="azul" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar código'}</Boton>
          <p className="ayuda">Entrega este código solo a los Conquistadores cuyos padres firmaron la <a onClick={() => verLegal('padres')}>autorización</a>. Ellos entran con el código, un apodo y un PIN; no se pide correo ni nombre real.</p>
        </section>
        <section className="tarjeta">
          <h3>Miembros ({miembros.length})</h3>
          <ul className="miembros">
            {miembros.map(m => (
              <li key={m.apodo}>
                <span><b>{m.apodo}</b><small>{m.grupo_edad === 'menor' ? 'Conquistador' : m.rango.replace(/_/g, ' ')}</small></span>
                <span className="pts">{m.puntos}</span>
                {m.apodo !== perfil.apodo && <button className="borrar" onClick={() => setBorrar(m.apodo)} aria-label={`Eliminar ${m.apodo}`}>Eliminar</button>}
              </li>
            ))}
            {miembros.length === 0 && <li className="vacio">Todavía no hay miembros.</li>}
          </ul>
          <p className="ayuda">Si un padre o madre pide borrar los datos de su hijo, elimínalo aquí: se borra al instante junto con sus puntajes.</p>
        </section>
        <Boton onClick={() => ir('mapa')}>Ir al mapa</Boton>
      </div>
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
