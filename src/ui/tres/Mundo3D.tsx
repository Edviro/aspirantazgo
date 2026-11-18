import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitImpl } from 'three-stdlib'
import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import type { Nivel } from '../../domain/niveles'
import { MUNDOS } from '../../domain/niveles'
import { Avatar3D } from './Avatar3D'
import { Malla, ToonMat } from './Toon'

export type EstadoNodo = 'bloqueado' | 'abierto' | 'hecho'

function Arbol({ p, s = 1 }: { p: [number, number, number]; s?: number }) {
  return (
    <group position={p} scale={s}>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.08, 0.12, 0.6, 6]} /><ToonMat color="#6B4423" /></mesh>
      <Malla position={[0, 0.85, 0]} geo={<coneGeometry args={[0.5, 0.9, 7]} />} color="#1E7A3C" t={0.07} />
      <Malla position={[0, 1.3, 0]} geo={<coneGeometry args={[0.36, 0.7, 7]} />} color="#2A9A4E" t={0.08} />
    </group>
  )
}

function Carpa({ p, r = 0, c = '#D7242F' }: { p: [number, number, number]; r?: number; c?: string }) {
  return (
    <group position={p} rotation={[0, r, 0]}>
      <Malla position={[0, 0.42, 0]} rotation={[0, Math.PI / 4, 0]} geo={<coneGeometry args={[0.75, 0.85, 4]} />} color={c} t={0.05} />
      <mesh position={[0, 0.25, 0.43]}><planeGeometry args={[0.28, 0.4]} /><meshBasicMaterial color="#2a1a10" /></mesh>
    </group>
  )
}

function Fogata({ p }: { p: [number, number, number] }) {
  const luz = useRef<THREE.PointLight>(null)
  const llama = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (luz.current) luz.current.intensity = 6 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7)
    if (llama.current) { llama.current.scale.y = 1 + Math.sin(t * 11) * 0.15; llama.current.rotation.y = t * 2 }
  })
  return (
    <group position={p}>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[0, 0.06, 0]} rotation={[0, (i * Math.PI) / 4, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 0.55, 6]} /><ToonMat color="#5a3a1e" /></mesh>
      ))}
      <mesh ref={llama} position={[0, 0.3, 0]}><coneGeometry args={[0.16, 0.45, 6]} /><meshBasicMaterial color="#FFB000" /></mesh>
      <mesh position={[0, 0.25, 0]}><coneGeometry args={[0.09, 0.3, 6]} /><meshBasicMaterial color="#FFF2A8" /></mesh>
      <pointLight ref={luz} position={[0, 0.6, 0]} color="#FF9A3C" distance={5} />
      <Sparkles count={14} scale={[0.6, 1.4, 0.6]} position={[0, 0.8, 0]} size={3} speed={0.6} color="#FFC56B" />
    </group>
  )
}

function Mastil({ p }: { p: [number, number, number] }) {
  const tex = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}assets/bandera.webp`)
  tex.colorSpace = THREE.SRGBColorSpace
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 1.5) * 0.12 })
  return (
    <group position={p}>
      <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.04, 0.05, 2.8, 8]} /><ToonMat color="#CFCFCF" /></mesh>
      <mesh ref={ref} position={[0.62, 2.35, 0]}><planeGeometry args={[1.25, 1.0]} /><meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

function Agua() {
  const geo = useMemo(() => new THREE.CircleGeometry(70, 64), [])
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
      <meshStandardMaterial color="#2E7FB0" roughness={0.35} metalness={0.1} />
    </mesh>
  )
}

function Isla({ r, p = [0, 0, 0] }: { r: number; p?: [number, number, number] }) {
  return (
    <group position={p}>
      <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[r * 1.08, r * 0.92, 0.5, 48]} /><ToonMat color="#E6CF8E" /></mesh>
      <Malla position={[0, 0.02, 0]} geo={<cylinderGeometry args={[r, r * 1.02, 0.22, 48]} />} color="#58B055" t={0.012} />
    </group>
  )
}

/** Posiciones de los niveles: un camino en espiral sobre la isla. */
export function posicionNodo(i: number, n: number): [number, number, number] {
  const t = i / Math.max(1, n - 1)
  const ang = Math.PI * 0.25 + t * Math.PI * 2.6
  const rad = 5.3 - t * 3.6
  return [Math.cos(ang) * rad, 0.15, Math.sin(ang) * rad]
}

function Nodo({ estado, pos, actual, onElegir }: {
  estado: EstadoNodo; pos: [number, number, number]; actual: boolean; onElegir: () => void
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current && actual) ref.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.05 })
  const color = estado === 'bloqueado' ? '#7C8696' : estado === 'hecho' ? '#1E9A4B' : '#FFC20E'
  return (
    <group position={pos} onClick={e => { e.stopPropagation(); onElegir() }}>
      <group ref={ref}>
        <Malla position={[0, 0.12, 0]} geo={<cylinderGeometry args={[0.48, 0.55, 0.24, 28]} />} color={color} t={0.05} />
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.36, 0.36, 0.04, 28]} /><meshBasicMaterial color={estado === 'bloqueado' ? '#5d6675' : '#fff7d6'} /></mesh>
      </group>
    </group>
  )
}

function Camino({ n }: { n: number }) {
  const piedras = useMemo(() => {
    const out: [number, number, number][] = []
    for (let i = 0; i < n - 1; i++) {
      const a = posicionNodo(i, n), b = posicionNodo(i + 1, n)
      for (let k = 1; k < 4; k++) {
        const t = k / 4
        out.push([a[0] + (b[0] - a[0]) * t, 0.14, a[2] + (b[2] - a[2]) * t])
      }
    }
    return out
  }, [n])
  return <>{piedras.map((p, i) => <mesh key={i} position={p} rotation={[-Math.PI / 2, 0, i]}><circleGeometry args={[0.13, 6]} /><meshBasicMaterial color="#F3E3B5" /></mesh>)}</>
}

function IslaLejana({ mundo, p }: { mundo: typeof MUNDOS[number]; p: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime + p[0]) * 0.08 })
  return (
    <group ref={ref} position={p}>
      <Isla r={2.2} />
      <Arbol p={[0.6, 0.1, 0.3]} s={0.9} />
      <Arbol p={[-0.7, 0.1, -0.4]} s={0.7} />
      <Malla position={[0, 0.95, 0]} geo={<octahedronGeometry args={[0.45, 0]} />} color={mundo.color} t={0.08} />
    </group>
  )
}

/** Proyecta puntos 3D a la pantalla y mueve etiquetas HTML normales (sin portales). */
function Proyector({ puntos, refs }: { puntos: [number, number, number][]; refs: MutableRefObject<(HTMLElement | null)[]> }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    puntos.forEach((p, i) => {
      const el = refs.current[i]
      if (!el) return
      v.set(p[0], p[1], p[2]).project(camera)
      const x = ((v.x + 1) / 2) * size.width, y = ((1 - v.y) / 2) * size.height
      // No tapar el HUD superior ni los botones de abajo.
      const visible = v.z < 1 && x > -40 && x < size.width + 40 && y > 130 && y < size.height - 70
      el.style.display = visible ? '' : 'none'
      if (visible) el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      el.style.zIndex = String(Math.round((1 - v.z) * 1000))
    })
  })
  return null
}

/** Encuadre: en pantallas verticales la cámara se aleja y sigue al nivel elegido. */
function Camara({ foco }: { foco: [number, number, number] }) {
  const { camera, size, controls } = useThree()
  const objetivo = useRef(new THREE.Vector3(...foco))
  const t = useRef(0)
  useEffect(() => {
    const vertical = size.width / size.height < 1
    const dist = vertical ? 15 + (1 - size.width / size.height) * 10 : 15
    const dir = new THREE.Vector3(0, 0.78, 0.9).normalize().multiplyScalar(dist)
    camera.position.set(foco[0] * 0.5 + dir.x, dir.y, foco[2] * 0.5 + dir.z)
    ;(camera as THREE.PerspectiveCamera).fov = vertical ? 48 : 40
    camera.updateProjectionMatrix()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height])
  useEffect(() => { objetivo.current.set(foco[0] * 0.5, 0, foco[2] * 0.5); t.current = 0 }, [foco])
  useFrame((_, dt) => {
    const c = controls as unknown as OrbitImpl | null
    if (!c || t.current > 1.2) return
    t.current += dt
    c.target.lerp(objetivo.current, 0.08)
    c.update()
  })
  return null
}

export function Mundo3D({ niveles, estados, estrellas, actual, foco, avatar, rango, onElegir }: {
  niveles: Nivel[]; estados: EstadoNodo[]; estrellas: number[]; actual: number; foco: number
  avatar: AvatarConfig; rango: Rango; onElegir: (i: number) => void
}) {
  const n = niveles.length
  const posAvatar = posicionNodo(actual, n)
  const posFoco = useMemo(() => posicionNodo(foco, n), [foco, n])
  const lejanas = MUNDOS.filter(m => !m.abierto)
  const posLejanas = lejanas.map((_, i) => {
    const a = Math.PI * 1.5 + (i - (lejanas.length - 1) / 2) * 0.55
    return [Math.cos(a) * 15, 0, Math.sin(a) * 15] as [number, number, number]
  })
  const puntos = useMemo(() => [
    ...niveles.map((_, i) => { const p = posicionNodo(i, n); return [p[0], 1.05, p[2]] as [number, number, number] }),
    ...posLejanas.map(p => [p[0], 2.2, p[2]] as [number, number, number]),
  ], [niveles, n]) // eslint-disable-line react-hooks/exhaustive-deps
  const refs = useRef<(HTMLElement | null)[]>([])
  return (
    <div className="mundo">
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 11, 14], fov: 42 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <fog attach="fog" args={['#0E1A3A', 26, 60]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#BFE3FF', '#3B5B2B', 0.9]} />
      <directionalLight position={[6, 12, 6]} intensity={2.2} />
      <Agua />
      <Isla r={6.6} />
      <Camino n={n} />
      {niveles.map((nv, i) => (
        <Nodo key={nv.id} estado={estados[i]} pos={posicionNodo(i, n)} actual={i === actual} onElegir={() => onElegir(i)} />
      ))}
      <group position={[posAvatar[0] + 0.6, 0.15, posAvatar[2] + 0.25]}>
        <Avatar3D a={avatar} rango={rango} escala={0.62} animo="saluda" />
      </group>
      <Fogata p={[0, 0.12, 0]} />
      <Suspense fallback={null}><Mastil p={[1.4, 0.12, -1.2]} /></Suspense>
      <Carpa p={[-1.6, 0.12, -1.4]} r={0.4} />
      <Carpa p={[-0.3, 0.12, -2.4]} r={-0.2} c="#1F5FD1" />
      <Carpa p={[4.6, 0.12, 2.3]} r={1.2} c="#1E9A4B" />
      {[[-5.8, 1.8], [-4.9, -3.4], [4.6, -4.2], [5.9, 1.2], [3.2, 5.2], [-2.6, 5.6], [-6.1, -0.9], [1.2, -5.9], [5.2, -2]].map(([x, z], i) => (
        <Arbol key={i} p={[x, 0.12, z]} s={0.85 + (i % 3) * 0.15} />
      ))}
      {lejanas.map((m, i) => <IslaLejana key={m.id} mundo={m} p={posLejanas[i]} />)}
      <Sparkles count={40} scale={[18, 4, 18]} position={[0, 3, 0]} size={2} speed={0.2} color="#FFF6C8" />
      <OrbitControls makeDefault enablePan={false} minDistance={7} maxDistance={30} maxPolarAngle={1.2} minPolarAngle={0.3} enableDamping />
      <Camara foco={posFoco} />
      <Proyector puntos={puntos} refs={refs} />
    </Canvas>
    <div className="etiquetas">
      {niveles.map((nv, i) => (
        <button key={nv.id} ref={el => { refs.current[i] = el }} className={`nodo-etiqueta ${estados[i]} ${i === actual ? 'actual' : ''}`}
          onClick={() => onElegir(i)} aria-label={`Nivel ${nv.num}: ${nv.titulo}`}>
          <span className="nodo-num">{estados[i] === 'bloqueado' ? '🔒' : nv.num}</span>
          {estados[i] !== 'bloqueado' && <span className="nodo-est">{'★'.repeat(estrellas[i])}{'☆'.repeat(3 - estrellas[i])}</span>}
        </button>
      ))}
      {lejanas.map((m, i) => (
        <div key={m.id} ref={el => { refs.current[n + i] = el }} className="isla-etiqueta">🔒 {m.nombre}<small>Próximamente</small></div>
      ))}
    </div>
    </div>
  )
}
