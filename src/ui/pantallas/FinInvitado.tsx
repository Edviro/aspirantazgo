import { useState } from 'react'
import { useJuego } from '../estado'
import { mensajeError } from '../../application/errores'
import { Boton, Cielo } from '../componentes/Comunes'

/** Un invitado de sala solo ve su sala. Al salir de ella llega aquí: volver a la sala o terminar. */
export default function FinInvitado() {
  const { perfil, abrirSala, salir } = useJuego()
  const [error, setError] = useState('')
  const codigo = (() => { try { return sessionStorage.getItem('asp_sala_invitado') } catch { return null } })()
  const volver = async () => { setError(''); try { if (codigo) await abrirSala(codigo) } catch (e) { setError(mensajeError(e)) } }
  const terminar = async () => { try { sessionStorage.removeItem('asp_sala_invitado') } catch { /* */ } await salir() }
  return (
    <div className="pantalla acceso"><Cielo />
      <div className="acceso-caja pop fin-invitado">
        <h2>¡Gracias por jugar, {perfil?.apodo.replace(/ \d{3}$/, '')}!</h2>
        <p>Entraste como <b>invitado</b>: tu acceso sirve solo para la sala{codigo ? <> <b>{codigo}</b></> : ''} y se borra solo en 2 días.</p>
        <p className="ayuda">¿Quieres guardar tus puntajes, medallas y jugar todos los niveles? Pídele a tu líder el código de tu club y crea tu cuenta.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="fila-botones">
          {codigo && <Boton onClick={volver}>Volver a la sala</Boton>}
          <Boton tipo="fantasma" onClick={terminar}>Terminar</Boton>
        </div>
      </div>
    </div>
  )
}
