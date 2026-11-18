import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { useJuego } from '../estado'
import { Boton, Cielo } from '../componentes/Comunes'
import { Avatar3D, PELOS, PIELES } from '../tres/Avatar3D'
import type { AvatarConfig } from '../../application/puertos'

const ESTILOS = ['Corto', 'Trenzas', 'Cola', 'Largo']

export default function Editor() {
  const { perfil, repo, setPerfil, ir } = useJuego()
  const [a, setA] = useState<AvatarConfig>({ genero: 'm', piel: 2, pelo: 0, colorPelo: 0, ...(perfil?.avatar ?? {}) })
  const [guardando, setGuardando] = useState(false)
  if (!perfil) return null

  const guardar = async () => {
    setGuardando(true)
    try { await repo.guardarAvatar(a) } catch { /* se reintenta luego */ }
    setPerfil({ ...perfil, avatar: a })
    setGuardando(false)
    ir('mapa')
  }

  return (
    <div className="pantalla editor">
      <Cielo />
      <div className="editor-escena">
        <Canvas dpr={[1, 2]} camera={{ position: [0, 1.2, 4.6], fov: 34 }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 5, 4]} intensity={2.4} />
          <hemisphereLight args={['#DDEEFF', '#334', 0.6]} />
          <group position={[0, -0.05, 0]}><Avatar3D a={a} rango={perfil.rango} animo="saluda" /></group>
          <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={4} blur={2.4} far={2} />
          <OrbitControls enablePan={false} enableZoom={false} target={[0, 1.0, 0]} minPolarAngle={1.1} maxPolarAngle={1.7} />
        </Canvas>
        <div className="editor-nombre"><b>{perfil.apodo}</b><small>{perfil.club.nombre}</small></div>
      </div>
      <div className="editor-panel pop">
        <h2>Crea tu Conquistador</h2>
        <div className="opcion">
          <span>Personaje</span>
          <div className="chips">
            <button className={a.genero !== 'f' ? 'on' : ''} onClick={() => setA({ ...a, genero: 'm' })}>Chico</button>
            <button className={a.genero === 'f' ? 'on' : ''} onClick={() => setA({ ...a, genero: 'f', pelo: a.pelo === 0 ? 1 : a.pelo })}>Chica</button>
          </div>
        </div>
        <div className="opcion">
          <span>Tono de piel</span>
          <div className="colores">{PIELES.map((c, i) => <button key={c} aria-label={`Tono ${i + 1}`} className={a.piel === i ? 'on' : ''} style={{ background: c }} onClick={() => setA({ ...a, piel: i })} />)}</div>
        </div>
        <div className="opcion">
          <span>Peinado</span>
          <div className="chips">{ESTILOS.map((n, i) => <button key={n} className={a.pelo === i ? 'on' : ''} onClick={() => setA({ ...a, pelo: i })}>{n}</button>)}</div>
        </div>
        <div className="opcion">
          <span>Color de pelo</span>
          <div className="colores">{PELOS.map((c, i) => <button key={c} aria-label={`Color ${i + 1}`} className={a.colorPelo === i ? 'on' : ''} style={{ background: c }} onClick={() => setA({ ...a, colorPelo: i })} />)}</div>
        </div>
        <p className="ayuda">Tu uniforme se completa a medida que avanzas: la pañoleta, las clases y las especialidades se ganan jugando.</p>
        <Boton onClick={guardar} disabled={guardando}>¡Listo, al mapa!</Boton>
      </div>
    </div>
  )
}
