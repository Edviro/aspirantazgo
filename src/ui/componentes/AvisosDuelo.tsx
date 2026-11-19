import { useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { Boton } from './Comunes'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { TODOS_LOS_NIVELES } from '../../domain/niveles'
import { DIFICULTADES } from '../../domain/dificultad'
import { mensajeError } from '../../application/errores'
import { sfx } from '../sonido'

/** Invitaciones a duelo que llegan y el "esperando respuesta" del que retó. Se muestran en cualquier pantalla menos en medio de un nivel. */
export function AvisosDuelo() {
  const { invitacion, retoEnviado, pantalla, perfil, responderInvitacion, cancelarReto } = useJuego()
  const [error, setError] = useState('')
  const [espera, setEspera] = useState(0)

  useEffect(() => { if (invitacion) sfx.aviso() }, [invitacion])
  // La invitación caduca sola a los 30 s
  useEffect(() => {
    if (!invitacion) return
    const t = setTimeout(() => responderInvitacion(false), 30000)
    return () => clearTimeout(t)
  }, [invitacion, responderInvitacion])
  useEffect(() => {
    if (retoEnviado?.estado !== 'esperando') return
    setEspera(30)
    const t = setInterval(() => setEspera(s => { if (s <= 1) { clearInterval(t); cancelarReto(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(t)
  }, [retoEnviado?.estado, retoEnviado?.codigo, cancelarReto])

  if (!perfil || pantalla === 'juego') return null

  if (invitacion) {
    const nivel = TODOS_LOS_NIVELES.find(n => n.id === invitacion.nivelId)
    return (
      <div className="velo velo-duelo">
        <div className="resultado pop reto-form" role="alertdialog" aria-modal="true" aria-label="Te retaron a un duelo">
          <div className="fin-titular"><span>¡Te retan!</span></div>
          <div className="reto-vs">
            <PixelAvatar a={invitacion.de.avatar ?? {}} rango={invitacion.de.rango} animo="saluda" alto={96} />
            <b>VS</b>
            <PixelAvatar a={perfil.avatar} rango={perfil.rango} alto={96} />
          </div>
          <p><b>{invitacion.de.apodo}</b> ({invitacion.de.club}) te reta a <b>{nivel?.titulo ?? 'un nivel'}</b> en dificultad {DIFICULTADES[invitacion.dificultad].nombre.toLowerCase()}.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="fila-botones">
            <Boton tipo="fantasma" onClick={() => responderInvitacion(false)}>Ahora no</Boton>
            <Boton tipo="rojo" onClick={() => { setError(''); responderInvitacion(true).catch(e => setError(mensajeError(e))) }}>¡Acepto!</Boton>
          </div>
        </div>
      </div>
    )
  }

  if (retoEnviado) {
    return (
      <div className="velo velo-duelo">
        <div className="resultado pop reto-form" role="status">
          {retoEnviado.estado === 'esperando' ? (
            <>
              <h2>Esperando a {retoEnviado.rival.apodo}…</h2>
              <div className="reto-vs">
                <PixelAvatar a={perfil.avatar} rango={perfil.rango} alto={96} />
                <b>VS</b>
                <PixelAvatar a={retoEnviado.rival.avatar ?? {}} rango={retoEnviado.rival.rango} alto={96} />
              </div>
              <p>Le enviamos tu reto. Si no responde en {espera} s, se cancela solo.</p>
              <Boton tipo="fantasma" onClick={cancelarReto}>Cancelar reto</Boton>
            </>
          ) : (
            <>
              <h2>{retoEnviado.rival.apodo} no aceptó</h2>
              <p>Puede que esté ocupado. Prueba con otra persona o más tarde.</p>
              <Boton onClick={cancelarReto}>Entendido</Boton>
            </>
          )}
        </div>
      </div>
    )
  }
  return null
}
