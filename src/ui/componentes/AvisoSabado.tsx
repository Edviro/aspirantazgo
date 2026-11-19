import { useJuego } from '../estado'
import { Boton } from './Comunes'

/** Sábado: día de culto y descanso. Los desafíos vuelven el sábado a las 6 p. m. */
export function AvisoSabado() {
  const { avisoSabado, cerrarAvisoSabado } = useJuego()
  if (!avisoSabado) return null
  return (
    <div className="velo" onClick={cerrarAvisoSabado}>
      <div className="resultado pop aviso-sabado" role="dialog" aria-modal="true" aria-label="Feliz sábado" onClick={e => e.stopPropagation()}>
        <div className="aviso-sabado-icono" aria-hidden>🕊️</div>
        <h2>¡Feliz sábado!</h2>
        <p>«Acuérdate del día de reposo para santificarlo» (Éxodo 20:8). Hoy los desafíos descansan: vuelven el sábado a las 6 p. m.</p>
        <p className="nota">Mientras tanto, acompaña a tu club en el culto. Tu líder sí puede abrir una sala para actividades del sábado.</p>
        <div className="fila-botones"><Boton onClick={cerrarAvisoSabado}>Amén</Boton></div>
      </div>
    </div>
  )
}
