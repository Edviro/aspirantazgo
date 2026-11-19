import { useEffect } from 'react'
import { useJuego } from '../estado'
import { useProgreso } from '../progreso'
import { LOGROS } from '../../domain/logros'
import { Parche } from './Parche'
import { Boton, Confeti } from './Comunes'
import { sfx } from '../sonido'

/** "¡Nuevo parche!": aparece al ganar un logro (fuera de un nivel en curso). */
export function AvisoLogro() {
  const pantalla = useJuego(s => s.pantalla)
  const { nuevos, verNuevo } = useProgreso()
  const l = LOGROS.find(x => x.id === nuevos[0])
  const visible = !!l && pantalla !== 'juego' && pantalla !== 'intro' && pantalla !== 'acceso'
  useEffect(() => { if (visible) sfx.desbloqueo() }, [visible, l?.id])
  if (!visible || !l) return null
  return (
    <div className="velo velo-logro">
      <Confeti cantidad={50} />
      <div className="resultado pop aviso-logro" role="alertdialog" aria-modal="true" aria-label={`Nuevo parche: ${l.nombre}`}>
        <div className="fin-titular"><span>¡Nuevo parche!</span></div>
        <div className="parche-gira"><Parche l={l} size={150} /></div>
        <h2>{l.nombre}</h2>
        <p>{l.como}</p>
        <div className="fila-botones">
          <Boton tipo="fantasma" onClick={() => { verNuevo(); useJuego.getState().ir('logros') }}>Ver mis parches</Boton>
          <Boton onClick={verNuevo}>¡Genial!</Boton>
        </div>
      </div>
    </div>
  )
}
