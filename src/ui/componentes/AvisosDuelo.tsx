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
  const { invitacion, retoEnviado, pantalla, perfil, responderInvitacion, cancelarReto, empezarReto, sala } = useJuego()
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
    // Al acabarse el tiempo: si alguien ya entró, se juega con ellos; si no, se cancela
    const t = setInterval(() => setEspera(s => {
      if (s > 1) return s - 1
      clearInterval(t)
      const dentro = useJuego.getState().sala?.jugadores.some(j => j.id !== perfil?.id)
      if (dentro) empezarReto(); else cancelarReto()
      return 0
    }), 1000)
    return () => clearInterval(t)
  }, [retoEnviado?.estado, retoEnviado?.codigo, cancelarReto, empezarReto, perfil?.id])

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
          {invitacion.otros && invitacion.otros.length > 0 && (
            <p className="reto-grupo-nota">Reto de {invitacion.otros.length + 2} jugadores: también invitó a <b>{invitacion.otros.join(', ')}</b>.</p>
          )}
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
    const dentro = new Set(sala?.jugadores.map(j => j.id) ?? [])
    const listos = retoEnviado.rivales.filter(r => dentro.has(r.id)).length
    const estado = (id: string) => dentro.has(id) ? { t: '¡Listo!', c: 'listo' } : retoEnviado.respuestas[id] === false ? { t: 'No puede', c: 'no' } : retoEnviado.respuestas[id] ? { t: 'Entrando…', c: 'acepto' } : { t: 'Pensando…', c: 'espera' }
    const grupo = retoEnviado.rivales.length > 1
    return (
      <div className="velo velo-duelo">
        <div className="resultado pop reto-form" role="status">
          {retoEnviado.estado === 'esperando' ? (
            <>
              <h2>{grupo ? `Reto de ${retoEnviado.rivales.length + 1} jugadores` : `Esperando a ${retoEnviado.rivales[0].apodo}…`}</h2>
              <div className={`reto-vs ${grupo ? 'grupo' : ''}`}>
                <div className="reto-quien"><PixelAvatar a={perfil.avatar} rango={perfil.rango} alto={grupo ? 76 : 96} /><b>Tú</b><span className="estado-reto listo">¡Listo!</span></div>
                {!grupo && <b>VS</b>}
                {retoEnviado.rivales.map(r => {
                  const e = estado(r.id)
                  return (
                    <div key={r.id} className={`reto-quien ${e.c}`}>
                      <PixelAvatar a={r.avatar ?? {}} rango={r.rango} animo={e.c === 'listo' ? 'saluda' : 'idle'} alto={grupo ? 76 : 96} />
                      <b>{r.apodo}</b><span className={`estado-reto ${e.c}`}>{e.t}</span>
                    </div>
                  )
                })}
              </div>
              <p>{grupo ? `Empieza cuando entren todos. En ${espera} s se juega con los que estén listos.` : `Le enviamos tu reto. Si no responde en ${espera} s, se cancela solo.`}</p>
              <div className="fila-botones">
                <Boton tipo="fantasma" onClick={cancelarReto}>Cancelar reto</Boton>
                {grupo && listos > 0 && <Boton tipo="rojo" onClick={empezarReto}>¡Empezar ya! ({listos + 1})</Boton>}
              </div>
            </>
          ) : (
            <>
              <h2>{grupo ? 'Nadie pudo aceptar' : `${retoEnviado.rivales[0].apodo} no aceptó`}</h2>
              <p>Puede que estén ocupados. Prueba con otras personas o más tarde.</p>
              <Boton onClick={cancelarReto}>Entendido</Boton>
            </>
          )}
        </div>
      </div>
    )
  }
  return null
}
