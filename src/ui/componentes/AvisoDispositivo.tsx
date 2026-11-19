import { useState } from 'react'
import { useJuego } from '../estado'
import { Boton } from './Comunes'

const clave = (id: string) => `asp_acepta_local_${id}`
const yaAcepto = (id: string) => { try { return localStorage.getItem(clave(id)) === '1' } catch { return true } }

/**
 * Aviso que se acepta una vez en cada celular: qué se guarda solo en el dispositivo
 * (medallas, parches, racha) y qué se guarda en la cuenta (puntajes, niveles, vidas).
 */
export function AvisoDispositivo() {
  const perfil = useJuego(s => s.perfil)
  const pantalla = useJuego(s => s.pantalla)
  const [marcado, setMarcado] = useState(false)
  const [listo, setListo] = useState(false)
  if (!perfil || perfil.invitado || listo || pantalla === 'intro' || pantalla === 'acceso' || pantalla === 'legal' || yaAcepto(perfil.id)) return null
  const local = perfil.club.nombre === 'Modo práctica'
  const aceptar = () => { try { localStorage.setItem(clave(perfil.id), '1') } catch { /* */ } setListo(true) }
  return (
    <div className="velo">
      <div className="resultado pop aviso-dispositivo" role="dialog" aria-modal="true" aria-label="Dónde se guardan tus avances">
        <h2>Antes de seguir</h2>
        <p>Tus <b>medallas</b>, <b>parches</b> y la <b>racha del reto del día</b> se guardan <b>en este celular</b>.
          Si cambias de celular o borras los datos del navegador, <b>se pierden</b>.</p>
        {local
          ? <p>En modo práctica <b>todo</b> se guarda solo en este celular.</p>
          : <p>Tus <b>puntajes</b>, <b>niveles superados</b> y <b>vidas</b> sí quedan guardados en tu cuenta.</p>}
        <label className="check"><input type="checkbox" checked={marcado} onChange={e => setMarcado(e.target.checked)} />
          <span>Entiendo y acepto los <a onClick={() => useJuego.getState().verLegal('terminos')}>Términos</a>.</span></label>
        <Boton onClick={aceptar} disabled={!marcado}>Aceptar</Boton>
      </div>
    </div>
  )
}
