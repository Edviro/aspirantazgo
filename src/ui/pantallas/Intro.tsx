import { BotonInstalar } from '../componentes/BotonInstalar'
import { useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { asset, Boton, Cielo } from '../componentes/Comunes'
import { modoGuardado, repoPara } from '../../adapters/contenedor'
import { sfx } from '../sonido'
import { musica } from '../musica'
import { leerSalaPendiente } from '../componentes/CodigoQR'
import { entrarSalaPendiente } from '../salaPendiente'

const PRECARGA = ['logo-alas', 'emblema-c1', 'npc-trompeta', 'npc-lectora', 'npc-nudo', 'bandera', 'esp-orientacion']

export default function Intro() {
  const { ir, setSesion } = useJuego()
  const [avance, setAvance] = useState(0)
  const [listo, setListo] = useState(false)
  // Llegó con el QR o el enlace de una sala: el botón dice a qué sala entra
  const [salaPend, setSalaPend] = useState(leerSalaPendiente)
  const [errorSala, setErrorSala] = useState('')
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    let hechos = 0
    const tareas: Promise<unknown>[] = PRECARGA.map(n => new Promise<void>(res => {
      const im = new Image(); im.onload = im.onerror = () => { hechos++; setAvance(hechos / (PRECARGA.length + 2)); res() }; im.src = asset(n)
    }))
    tareas.push(import('./Mapa').then(() => { hechos++; setAvance(hechos / (PRECARGA.length + 2)) }))
    tareas.push(document.fonts?.ready.then(() => { hechos++; setAvance(hechos / (PRECARGA.length + 2)) }) ?? Promise.resolve())
    Promise.all(tareas).then(() => { setAvance(1); setTimeout(() => setListo(true), 250) })
  }, [])

  const entrar = async () => {
    sfx.trompeta()
    musica('mapa')
    setEntrando(true)
    const modo = modoGuardado()
    if (modo) {
      try {
        const repo = repoPara(modo)
        const p = await repo.sesionActual()
        if (p) {
          await setSesion(modo, p)
          if (salaPend && modo === 'en_linea') {
            const r = await entrarSalaPendiente()
            if (r === 'ok') return
            // Invitado de otra sala: su acceso viejo no sirve; entra de nuevo como invitado
            if (r === 'otra') { await useJuego.getState().salir(); ir('acceso'); return }
            // La sala ya no existe o está llena: se avisa aquí y el botón lleva al juego normal
            if (r !== 'sin') { setErrorSala(r); setSalaPend(null); setEntrando(false); return }
          }
          ir('plaza'); return
        }
      } catch { /* sin sesión */ }
    }
    ir('acceso')
  }

  return (
    <div className="pantalla intro">
      <Cielo />
      <div className="intro-rayos" aria-hidden />
      <div className="intro-centro">
        <img className="intro-logo" src={asset('logo-alas')} alt="Emblema de Conquistadores con alas" />
        <h1 className="titulo-juego">ASPIRANTAZGO</h1>
        <p className="intro-lema">Aprende el uniforme jugando y compite con tu club</p>
        <div className="intro-carga">
          {listo ? (
            <>
              <Boton className="intro-boton" onClick={entrar} disabled={entrando}>{salaPend ? (entrando ? 'Entrando…' : `¡Entrar a la sala ${salaPend}!`) : '¡Comenzar aventura!'}</Boton>
              {errorSala && <p className="error intro-error" role="alert">{errorSala}</p>}
              <BotonInstalar />
            </>
          ) : (
            <div className="barra-carga" aria-label="Cargando"><div style={{ width: `${Math.round(avance * 100)}%` }} /></div>
          )}
        </div>
      </div>
      <footer className="intro-pie">Desarrollado por <b>Eduardo Villanueva</b></footer>
    </div>
  )
}
