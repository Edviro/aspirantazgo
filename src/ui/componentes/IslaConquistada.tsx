import { useEffect } from 'react'
import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { LOGROS } from '../../domain/logros'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { Boton, Confeti } from './Comunes'
import { Parche } from './Parche'
import { sfx } from '../sonido'
import { useProgreso } from '../progreso'

const ISLA = LOGROS.find(l => l.id === 'isla')!

/** Al llegar a Mis parches con esta marca, la pantalla baja directo al certificado. */
export const IR_AL_CERTIFICADO = 'asp_ir_certificado'

/**
 * Celebración grande cuando apruebas el último nivel que te faltaba de la Isla del Uniforme:
 * rayos, parche de la isla que cae, tu avatar festejando, el himno épico y el acceso al certificado.
 */
export function IslaConquistada({ avatar, rango, niveles, onCertificado, onSeguir }: {
  avatar: AvatarConfig; rango: Rango; niveles: number; onCertificado: () => void; onSeguir: () => void
}) {
  useEffect(() => {
    sfx.trompeta()
    const t = setTimeout(() => sfx.victoria(), 900)
    return () => clearTimeout(t)
  }, [])
  // El parche de la isla ya se mostró aquí: no repetir el aviso de "¡Nuevo parche!"
  const listo = () => useProgreso.getState().descartarNuevo('isla')
  const certificado = () => { listo(); try { sessionStorage.setItem(IR_AL_CERTIFICADO, '1') } catch { /* */ } onCertificado() }
  const seguir = () => { listo(); onSeguir() }
  return (
    <div className="velo isla-ganada">
      <div className="isla-rayos" aria-hidden />
      <Confeti cantidad={140} />
      <div className="isla-ganada-caja" role="dialog" aria-modal="true" aria-label="¡Campamento del Uniforme conquistado!">
        <div className="isla-ganada-titular"><span>¡Campamento conquistado!</span></div>
        <div className="isla-ganada-escena">
          <div className="isla-ganada-parche"><Parche l={ISLA} size={150} /></div>
          <PixelAvatar a={avatar} rango={rango} animo="celebra" alto={170} className="isla-ganada-avatar" />
        </div>
        <h2>Campamento del Uniforme</h2>
        <p>Aprobaste los {niveles} niveles. Ya conoces el uniforme oficial como un verdadero inspector.</p>
        <p className="isla-ganada-premio">Ganaste el parche del campamento y tu certificado.</p>
        <div className="fila-botones">
          <Boton onClick={certificado}>Ver mi certificado</Boton>
          <Boton tipo="fantasma" onClick={seguir}>Ver mi puntaje</Boton>
        </div>
      </div>
    </div>
  )
}
