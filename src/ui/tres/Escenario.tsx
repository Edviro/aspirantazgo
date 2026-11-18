import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { Malla, ToonMat } from './Toon'
import { Panoleta3D } from './Avatar3D'

/** Escenario de investidura: tarima de madera, arco rojo con borde dorado, faroles y la pañoleta gigante. */
export function Escenario({ p = [0, 0, 0], r = 0, monumento = true }: { p?: [number, number, number]; r?: number; monumento?: boolean }) {
  const pano = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (pano.current) { pano.current.rotation.y = t * 0.6; pano.current.position.y = 2.35 + Math.sin(t * 1.6) * 0.08 }
  })
  return (
    <group position={p} rotation={[0, r, 0]}>
      {/* Tarima y escalones */}
      <Malla position={[0, 0.16, 0]} geo={<boxGeometry args={[2.2, 0.32, 1.5]} />} color="#8A5A2B" t={0.02} />
      {[-0.75, -0.25, 0.25, 0.75].map(x => <mesh key={x} position={[x, 0.33, 0]}><boxGeometry args={[0.02, 0.005, 1.48]} /><meshBasicMaterial color="#5E3B1A" /></mesh>)}
      <Malla position={[0, 0.08, 0.92]} geo={<boxGeometry args={[0.9, 0.16, 0.34]} />} color="#9C6A35" t={0.03} />
      {/* Arco */}
      {[-0.95, 0.95].map(x => <Malla key={x} position={[x, 1.12, -0.55]} geo={<cylinderGeometry args={[0.07, 0.08, 1.6, 10]} />} color="#6B4423" t={0.05} />)}
      <Malla position={[0, 1.86, -0.55]} geo={<boxGeometry args={[2.25, 0.34, 0.12]} />} color="#D7242F" t={0.03} />
      <mesh position={[0, 1.86, -0.48]}><boxGeometry args={[2.05, 0.2, 0.01]} /><meshBasicMaterial color="#FFC20E" /></mesh>
      {/* Faroles */}
      {[-1.05, 1.05].map(x => (
        <group key={x} position={[x, 0.32, 0.55]}>
          <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.025, 0.025, 0.5, 6]} /><ToonMat color="#2B2B2B" /></mesh>
          <mesh position={[0, 0.56, 0]}><sphereGeometry args={[0.09, 12, 10]} /><meshBasicMaterial color="#FFE7A0" /></mesh>
          <pointLight position={[0, 0.56, 0]} color="#FFB347" intensity={2.2} distance={2.6} />
        </group>
      ))}
      {monumento && (
        <group ref={pano} position={[0, 2.35, 0]}>
          <Panoleta3D escala={2.2} />
          <Sparkles count={24} scale={[1.4, 1.2, 1.4]} size={4} speed={0.5} color="#FFE07A" />
        </group>
      )}
    </group>
  )
}
