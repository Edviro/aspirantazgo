import { useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { asset, Boton, Cielo } from '../componentes/Comunes'
import { modoGuardado, repoPara } from '../../adapters/contenedor'
import { sfx } from '../sonido'

const PRECARGA = ['logo-alas', 'emblema-c1', 'npc-trompeta', 'npc-lectora', 'npc-nudo', 'bandera', 'esp-orientacion']

export default function Intro() {
  const { ir, setSesion } = useJuego()
  const [avance, setAvance] = useState(0)
  const [listo, setListo] = useState(false)

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
    const modo = modoGuardado()
    if (modo) {
      try {
        const p = await repoPara(modo).sesionActual()
        if (p) { await setSesion(modo, p); ir('mapa'); return }
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
        <p className="intro-lema">Aprende · Compite · Conquista</p>
        <div className="intro-carga">
          {listo ? (
            <Boton className="intro-boton" onClick={entrar}>¡Comenzar aventura!</Boton>
          ) : (
            <div className="barra-carga" aria-label="Cargando"><div style={{ width: `${Math.round(avance * 100)}%` }} /></div>
          )}
        </div>
      </div>
      <footer className="intro-pie">Desarrollado por <b>Eduardo Villanueva</b></footer>
    </div>
  )
}
