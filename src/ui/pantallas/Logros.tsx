import { useJuego } from '../estado'
import { musica } from '../musica'
import { useProgreso } from '../progreso'
import { Boton, Cielo } from '../componentes/Comunes'
import { Parche } from '../componentes/Parche'
import { LOGROS } from '../../domain/logros'
import { rachaVigente, retoDelDia } from '../../domain/diario'
import { MUNDO_UNIFORMES } from '../../domain/niveles'
import { APROBADO } from '../../domain/puntuacion'
import { useState, useEffect } from 'react'
import { descargarCertificado, dibujarCertificado } from '../certificado'
import { mensajeError } from '../../application/errores'

/** Mis parches: la colección de logros, el reto del día y la racha. */
export default function Logros() {
  const { ir, jugar, puntajes, perfil } = useJuego()
  useEffect(() => { musica('himno_emotivo') }, [])
  const faltan = MUNDO_UNIFORMES.niveles.filter(n => (puntajes[n.id] ?? 0) < APROBADO).length
  const [nombre, setNombre] = useState(() => { try { return localStorage.getItem('asp_nombre_certificado') ?? '' } catch { return '' } })
  const [vista, setVista] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const datos = () => ({
    nombre: nombre.trim(), club: perfil?.club.nombre ?? '', campo: perfil?.club.campo,
    fecha: new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }),
  })
  const preparar = async (descargar: boolean) => {
    setMsg('')
    if (nombre.trim().length < 3) { setMsg('Escribe el nombre completo para el certificado.'); return }
    try { localStorage.setItem('asp_nombre_certificado', nombre.trim()) } catch { /* */ }
    try {
      if (descargar) await descargarCertificado(datos())
      else setVista((await dibujarCertificado(datos())).toDataURL('image/png'))
    } catch (e) { setMsg(mensajeError(e)) }
  }
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
        <section className="tarjeta certificado">
          <h3>Certificado de la Isla del Uniforme</h3>
          {faltan > 0 ? (
            <>
              <p>Aprueba todos los niveles de la isla para ganar tu certificado. Te {faltan === 1 ? 'falta 1 nivel' : `faltan ${faltan} niveles`}.</p>
              <div className="taller-progreso"><div style={{ width: `${(1 - faltan / MUNDO_UNIFORMES.niveles.length) * 100}%` }} /></div>
            </>
          ) : (
            <form className="form" onSubmit={e => { e.preventDefault(); preparar(true) }}>
              <p>¡Lo lograste! Escribe a nombre de quién va el certificado. Este nombre solo se usa en tu celular para la imagen: no se envía a ningún servidor.</p>
              <label>Nombre completo<input value={nombre} onChange={e => setNombre(e.target.value.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü '-]/g, '').slice(0, 60))} placeholder="Ej. María López Quispe" autoComplete="name" /></label>
              <p className="ayuda">Club: <b>{perfil?.club.nombre}</b>{perfil?.club.campo && perfil.club.campo !== '-' ? ` · ${perfil.club.campo}` : ''}</p>
              {msg && <p className="error" role="alert">{msg}</p>}
              <div className="fila-botones">
                <Boton tipo="azul" onClick={() => preparar(false)}>Ver</Boton>
                <Boton type="submit">Descargar certificado</Boton>
              </div>
              {vista && <img className="certificado-vista" src={vista} alt={`Certificado de ${nombre}`} />}
            </form>
          )}
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
