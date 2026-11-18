import type { ReactElement, ReactNode } from 'react'
import * as THREE from 'three'

let gradiente: THREE.DataTexture | null = null
export function gradMap() {
  if (gradiente) return gradiente
  const d = new Uint8Array([95, 95, 95, 255, 180, 180, 180, 255, 255, 255, 255, 255])
  gradiente = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat)
  gradiente.minFilter = gradiente.magFilter = THREE.NearestFilter
  gradiente.needsUpdate = true
  return gradiente
}

export function ToonMat({ color, side }: { color: string; side?: THREE.Side }) {
  return <meshToonMaterial color={color} gradientMap={gradMap()} side={side} />
}

const LINEA = '#141414'

/**
 * Malla con sombreado "toon" y contorno de casco invertido (una copia apenas más grande, con las caras de atrás en negro).
 * Da el mismo trazo grueso de las ilustraciones del juego y funciona en cualquier GPU.
 */
export function Malla({ geo, color, t = 0.06, position, rotation, scale, children }: {
  geo: ReactElement; color: string; t?: number
  position?: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number]
  children?: ReactNode
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh>{geo}<ToonMat color={color} /></mesh>
      {t > 0 && <mesh scale={1 + t}>{geo}<meshBasicMaterial color={LINEA} side={THREE.BackSide} /></mesh>}
      {children}
    </group>
  )
}
