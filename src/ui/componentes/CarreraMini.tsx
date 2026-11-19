import { useJuego } from '../estado'

/**
 * Mientras juegas en una sala o reto: una franja fina con cómo van los demás (en vivo).
 * En salas grandes muestra los 3 primeros y tu puesto.
 */
export function CarreraMini() {
  const sala = useJuego(s => s.sala)
  const perfil = useJuego(s => s.perfil)
  if (!sala?.ronda || !perfil) return null
  const lista = sala.jugadores.filter(j => !j.anfitrion).map(j => {
    const p = sala.progresos[j.id]
    return { id: j.id, apodo: j.id === perfil.id ? 'Tú' : j.apodo, avance: j.id === perfil.id ? Math.max(p?.avance ?? 0, 0) : p?.avance ?? 0, puntaje: p?.puntaje }
  }).sort((a, b) => (b.puntaje ?? -1) - (a.puntaje ?? -1) || b.avance - a.avance)
  if (lista.length < 2) return null
  const mio = lista.findIndex(j => j.id === perfil.id)
  const ver = lista.length <= 4 ? lista : [...lista.slice(0, 3), ...(mio >= 3 ? [lista[mio]] : [lista[3]])]
  return (
    <div className="carrera-mini" aria-label="Cómo van los demás">
      {ver.map(j => {
        const pos = lista.indexOf(j) + 1
        return (
          <div key={j.id} className={`cm-jugador ${j.id === perfil.id ? 'yo' : ''} ${j.puntaje !== undefined ? 'listo' : ''}`}>
            <span className="cm-pos">{pos}</span>
            <span className="cm-nombre">{j.apodo}</span>
            <span className="cm-pista"><i style={{ width: `${Math.round(j.avance * 100)}%` }} /></span>
            <span className="cm-dato">{j.puntaje !== undefined ? `${j.puntaje}` : `${Math.round(j.avance * 100)}%`}</span>
          </div>
        )
      })}
      {lista.length > 4 && <span className="cm-total">de {lista.length}</span>}
    </div>
  )
}
