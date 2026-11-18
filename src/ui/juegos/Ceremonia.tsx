import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { IDEALES } from '../../domain/aspirantazgo'
import { useJuego } from '../estado'
import { Avatar3D, Panoleta3D } from '../tres/Avatar3D'
import { Escenario } from '../tres/Escenario'
import { Boton, Confeti } from '../componentes/Comunes'
import { sfx } from '../sonido'

type Fase = 'posicion' | 'voto' | 'panoleta' | 'final'

const LINEAS = [
  'Por la gracia de Dios,',
  'seré puro, bondadoso y leal;',
  'guardaré la Ley del Conquistador,',
  'seré siervo de Dios',
  'y amigo de la humanidad.',
]

function PanoletaQueBaja({ activa, onLlego }: { activa: boolean; onLlego: () => void }) {
  const ref = useRef<THREE.Group>(null)
  const llego = useRef(false)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g || !activa) return
    g.position.y = THREE.MathUtils.lerp(g.position.y, 1.43 + 0.32, Math.min(1, dt * 1.6))
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, Math.min(1, dt * 2))
    if (!llego.current && g.position.y < 1.43 + 0.36) { llego.current = true; onLlego() }
  })
  return (
    <group ref={ref} position={[0, 4.2, 0.05]} rotation={[0, Math.PI * 3, 0]}>
      <Panoleta3D />
      <Sparkles count={30} scale={[0.8, 0.8, 0.8]} size={5} speed={0.8} color="#FFE07A" />
    </group>
  )
}

function Encuadre() {
  const { camera } = useThree()
  useEffect(() => { camera.lookAt(0, 1.25, 0) }, [camera])
  return null
}

/** La ceremonia: posición para el voto, el voto línea por línea y la pañoleta que baja hasta tu cuello. */
export function Ceremonia({ onFin }: { onFin: (f: number[], e: number) => void }) {
  const { perfil, repo, setPerfil } = useJuego()
  const [fase, setFase] = useState<Fase>('posicion')
  const [linea, setLinea] = useState(0)
  const [puesta, setPuesta] = useState(false)

  useEffect(() => {
    if (fase !== 'final') return
    sfx.victoria()
    const nuevo = { ...(perfil?.avatar ?? {}), panoleta: true }
    if (perfil) setPerfil({ ...perfil, avatar: nuevo })
    repo.guardarAvatar(nuevo).catch(() => undefined)
  }, [fase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!perfil) return null
  const decir = () => {
    sfx.bien()
    if (linea + 1 >= LINEAS.length) { setFase('panoleta'); sfx.trompeta() } else setLinea(linea + 1)
  }

  return (
    <div className="ceremonia">
      <div className="ceremonia-escena">
        <Canvas dpr={[1, 1.75]} camera={{ position: [0, 2.1, 6.4], fov: 38 }}>
          <Encuadre />
          <color attach="background" args={['#0B1430']} />
          <fog attach="fog" args={['#0B1430', 8, 18]} />
          <ambientLight intensity={0.8} />
          <spotLight position={[0, 6, 3]} angle={0.45} penumbra={0.6} intensity={60} color="#FFF1C9" />
          <directionalLight position={[-3, 4, 2]} intensity={1.2} />
          <Suspense fallback={null}>
            <Escenario p={[0, 0, -0.3]} monumento={false} />
            <group position={[0, 0.32, 0.1]} scale={0.78}>
              <Avatar3D a={perfil.avatar} rango={perfil.rango} sinPanoleta={!puesta}
                animo={fase === 'final' ? 'celebra' : fase === 'voto' || fase === 'panoleta' ? 'voto' : 'idle'} />
              {!puesta && <PanoletaQueBaja activa={fase === 'panoleta'} onLlego={() => { setPuesta(true); setTimeout(() => setFase('final'), 600) }} />}
            </group>
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><circleGeometry args={[9, 48]} /><meshStandardMaterial color="#1F5A2E" /></mesh>
        </Canvas>
      </div>

      {fase === 'final' && <Confeti cantidad={120} />}

      <div className="ceremonia-panel pop" key={fase}>
        {fase === 'posicion' && (
          <>
            <p className="voz-mando">"Para el voto, posición"</p>
            <p>Levanta el antebrazo derecho, palma al frente, dedos juntos y el pulgar doblado.</p>
            <Boton onClick={() => { setFase('voto'); sfx.click() }}>Tomar posición</Boton>
          </>
        )}
        {fase === 'voto' && (
          <>
            <p className="voto-lineas">
              {LINEAS.slice(0, linea + 1).map((l, i) => <span key={i} className={i === linea ? 'actual' : ''}>{l} </span>)}
            </p>
            <Boton onClick={decir}>{linea + 1 >= LINEAS.length ? 'Terminar el voto' : 'Decir'}</Boton>
          </>
        )}
        {fase === 'panoleta' && <p className="voz-mando">Tu director coloca tu pañoleta…</p>}
        {fase === 'final' && (
          <>
            <h2>¡Ya eres Conquistador!</h2>
            <p>Recibiste tu pañoleta. Ahora tu personaje la lleva en todo el juego.</p>
            <p className="ayuda">{IDEALES.lema}</p>
            <Boton onClick={() => onFin([1, 1, 1], 0)}>Continuar</Boton>
          </>
        )}
      </div>
    </div>
  )
}
