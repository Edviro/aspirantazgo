import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { esAdulto, esGuiaMayor } from '../../domain/tipos'
import { Malla, ToonMat } from './Toon'

export const PIELES = ['#F3D1B5', '#E8B793', '#D39A73', '#B87A55', '#8A5A3C', '#5E3B26']
export const PELOS = ['#1B1410', '#3B2414', '#6B4423', '#A8743F', '#D9B26A', '#7A2E1F']

const S = THREE.DoubleSide

/** Personaje chibi en estilo "toon" con contorno, inspirado en las ilustraciones del juego. */
export function Avatar3D({ a, rango = 'conquistador', animo = 'idle', escala = 1 }: {
  a: AvatarConfig; rango?: Rango; animo?: 'idle' | 'saluda' | 'celebra'; escala?: number
}) {
  const raiz = useRef<THREE.Group>(null)
  const cabeza = useRef<THREE.Group>(null)
  const brazoD = useRef<THREE.Group>(null)
  const brazoI = useRef<THREE.Group>(null)
  const ojos = useRef<THREE.Group>(null)
  const f = a.genero === 'f'
  const piel = PIELES[a.piel ?? 2] ?? PIELES[2]
  const pelo = PELOS[a.colorPelo ?? 0] ?? PELOS[0]
  const estilo = a.pelo ?? 0
  const adulto = esAdulto(rango)
  const gm = esGuiaMayor(rango)
  const camisa = adulto ? '#F4F2EC' : '#D9C49A'
  const verde = '#0E4B45'
  const fase = useMemo(() => Math.random() * 10, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + fase
    if (raiz.current) raiz.current.position.y = animo === 'celebra' ? Math.abs(Math.sin(t * 5)) * 0.25 : Math.sin(t * 2) * 0.015
    if (cabeza.current) cabeza.current.rotation.z = Math.sin(t * 1.3) * 0.05
    if (brazoD.current) brazoD.current.rotation.z = animo === 'idle' ? -0.12 + Math.sin(t * 2) * 0.03 : -2.5 + Math.sin(t * (animo === 'celebra' ? 10 : 7)) * 0.35
    if (brazoI.current) brazoI.current.rotation.z = animo === 'celebra' ? 2.5 + Math.sin(t * 10 + 1) * 0.35 : 0.12 - Math.sin(t * 2) * 0.03
    if (ojos.current) ojos.current.scale.y = (t % 4.2) < 0.12 ? 0.1 : 1
  })

  return (
    <group scale={escala}>
      <group ref={raiz}>
        {[-0.17, 0.17].map(x => (
          <Malla key={x} position={[x, 0.07, 0.05]} scale={[1, 0.7, 1.4]} geo={<sphereGeometry args={[0.12, 16, 12]} />} color="#2B2B2B" t={0.12} />
        ))}
        {f ? (
          <>
            {[-0.15, 0.15].map(x => (
              <group key={x}>
                <Malla position={[x, 0.34, 0]} geo={<cylinderGeometry args={[0.075, 0.07, 0.42, 12]} />} color={piel} t={0.1} />
                <Malla position={[x, 0.2, 0]} geo={<cylinderGeometry args={[0.082, 0.082, 0.18, 12]} />} color="#FFFFFF" t={0.1} />
              </group>
            ))}
            <Malla position={[0, 0.68, 0]} geo={<cylinderGeometry args={[0.3, 0.43, 0.42, 22]} />} color={verde} t={0.05} />
          </>
        ) : (
          [-0.15, 0.15].map(x => (
            <Malla key={x} position={[x, 0.43, 0]} geo={<cylinderGeometry args={[0.115, 0.1, 0.68, 14]} />} color={verde} t={0.07} />
          ))
        )}
        <mesh position={[0, 0.87, 0]}><cylinderGeometry args={[0.305, 0.305, 0.07, 22]} /><ToonMat color="#0A2F2B" /></mesh>
        <mesh position={[0, 0.87, 0.3]}><boxGeometry args={[0.12, 0.08, 0.03]} /><ToonMat color="#C9A227" /></mesh>
        <group position={[0, 1.18, 0]}>
          <RoundedBox args={[0.62, 0.62, 0.44]} radius={0.14}><ToonMat color={camisa} /></RoundedBox>
          <RoundedBox args={[0.62, 0.62, 0.44]} radius={0.14} scale={1.06}><meshBasicMaterial color="#141414" side={THREE.BackSide} /></RoundedBox>
        </group>
        {[-0.15, 0.15].map(x => (
          <mesh key={x} position={[x, 1.2, 0.223]}><boxGeometry args={[0.15, 0.13, 0.01]} /><ToonMat color={adulto ? '#E6E3DA' : '#CDB685'} /></mesh>
        ))}
        {['#1F5FD1', '#D7242F', '#1E9A4B'].map((c, i) => (
          <mesh key={c} position={[0.1 + i * 0.05, 1.255, 0.232]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.01, 10]} /><meshBasicMaterial color={c} /></mesh>
        ))}
        <mesh position={[-0.15, 1.3, 0.228]}><boxGeometry args={[0.15, 0.03, 0.005]} /><meshBasicMaterial color="#0E4B45" /></mesh>
        {/* Pañoleta */}
        <group position={[0, 1.43, 0.05]}>
          <Malla rotation={[Math.PI / 2.2, 0, 0]} geo={<torusGeometry args={[0.2, 0.05, 8, 24]} />} color="#FFC20E" t={0.05} />
          {gm && <mesh rotation={[Math.PI / 2.2, 0, 0]} position={[0, 0.02, 0]}><torusGeometry args={[0.2, 0.054, 6, 24, Math.PI]} /><meshBasicMaterial color="#D7242F" /></mesh>}
          <Malla position={[0, -0.21, 0.21]} rotation={[0.25, 0, Math.PI]} geo={<coneGeometry args={[0.09, 0.32, 3]} />} color="#F6B800" t={0.08} />
          <mesh position={[0, -0.05, 0.225]}><boxGeometry args={[0.07, 0.07, 0.04]} /><ToonMat color="#C9A227" /></mesh>
        </group>
        {/* Brazos: el derecho del personaje queda en -x */}
        {[{ r: brazoD, x: -0.37, lado: -1 }, { r: brazoI, x: 0.37, lado: 1 }].map(({ r, x, lado }) => (
          <group key={x} ref={r} position={[x, 1.39, 0]}>
            <Malla position={[0, -0.12, 0]} geo={<cylinderGeometry args={[0.11, 0.1, 0.26, 12]} />} color={camisa} t={0.08} />
            <Malla position={[0, -0.33, 0]} geo={<cylinderGeometry args={[0.065, 0.06, 0.24, 10]} />} color={piel} t={0.12} />
            <Malla position={[0, -0.47, 0]} geo={<sphereGeometry args={[0.075, 12, 10]} />} color={piel} t={0.12} />
            {lado < 0 ? (
              <mesh position={[-0.112, -0.12, 0]} rotation={[0, -Math.PI / 2, Math.PI]}><circleGeometry args={[0.06, 3]} /><meshBasicMaterial color="#D7242F" side={S} /></mesh>
            ) : (
              <group>
                <mesh position={[0.112, -0.07, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.3, 1, 1]}><circleGeometry args={[0.035, 16]} /><meshBasicMaterial color="#1E6B3A" side={S} /></mesh>
                <mesh position={[0.112, -0.165, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.05, 0.065]} /><meshBasicMaterial color={adulto ? '#FFFFFF' : '#BFA676'} side={S} /></mesh>
                {gm && <mesh position={[0.114, -0.15, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.016, 5]} /><meshBasicMaterial color="#FFC20E" side={S} /></mesh>}
              </group>
            )}
          </group>
        ))}
        {/* Cabeza */}
        <group ref={cabeza} position={[0, 1.79, 0]}>
          <Malla geo={<sphereGeometry args={[0.38, 32, 24]} />} color={piel} t={0.045} />
          {[-0.37, 0.37].map(x => <Malla key={x} position={[x, -0.02, 0]} geo={<sphereGeometry args={[0.07, 12, 10]} />} color={piel} t={0.15} />)}
          <group ref={ojos} position={[0, 0.02, 0.33]}>
            {[-0.13, 0.13].map(x => (
              <group key={x} position={[x, 0, 0]}>
                <mesh scale={[1, 1.25, 0.6]}><sphereGeometry args={[0.055, 14, 12]} /><meshBasicMaterial color="#1B1410" /></mesh>
                <mesh position={[0.018, 0.028, 0.03]}><sphereGeometry args={[0.016, 8, 8]} /><meshBasicMaterial color="#fff" /></mesh>
              </group>
            ))}
          </group>
          {[-0.13, 0.13].map(x => (
            <mesh key={x} position={[x, 0.15, 0.335]} rotation={[0, 0, x < 0 ? 0.12 : -0.12]}><boxGeometry args={[0.11, 0.026, 0.02]} /><meshBasicMaterial color={pelo} /></mesh>
          ))}
          <mesh position={[0, -0.13, 0.345]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.06, 0.013, 6, 16, Math.PI]} /><meshBasicMaterial color="#5A2A1A" /></mesh>
          {[-0.2, 0.2].map(x => <mesh key={x} position={[x, -0.07, 0.31]}><circleGeometry args={[0.045, 12]} /><meshBasicMaterial color="#F08A7E" transparent opacity={0.45} /></mesh>)}
          {/* Pelo */}
          <Malla position={[0, 0.07, -0.02]} scale={[1.06, 1.0, 1.06]} geo={<sphereGeometry args={[0.39, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} />} color={pelo} t={0.04} />
          <mesh position={[0, 0.22, 0.28]} rotation={[0.9, 0, 0]} scale={[1.6, 0.6, 0.5]}><sphereGeometry args={[0.13, 12, 10]} /><ToonMat color={pelo} /></mesh>
          {estilo === 0 && [-0.18, 0, 0.18].map((x, i) => (
            <Malla key={x} position={[x, 0.42, -0.02]} rotation={[0, 0, -x * 1.6]} geo={<coneGeometry args={[0.08, 0.18 + (i === 1 ? 0.05 : 0), 8]} />} color={pelo} t={0.1} />
          ))}
          {estilo === 1 && [-1, 1].map(s => (
            <group key={s} position={[s * 0.3, -0.12, -0.08]}>
              {[0, 1, 2, 3].map(k => <Malla key={k} position={[s * 0.02, -k * 0.13, 0]} geo={<sphereGeometry args={[0.075 - k * 0.006, 10, 8]} />} color={pelo} t={0.12} />)}
            </group>
          ))}
          {estilo === 2 && (
            <group position={[0, 0.12, -0.38]}>
              <Malla geo={<sphereGeometry args={[0.14, 14, 12]} />} color={pelo} t={0.1} />
              <Malla position={[0, -0.22, -0.04]} rotation={[0.3, 0, 0]} geo={<coneGeometry args={[0.1, 0.36, 10]} />} color={pelo} t={0.1} />
            </group>
          )}
          {estilo === 3 && (
            <mesh position={[0, 0.04, -0.03]} scale={[1.12, 1.15, 1.1]}>
              <sphereGeometry args={[0.39, 24, 16, Math.PI, Math.PI, 0, Math.PI / 1.35]} />
              <ToonMat color={pelo} side={S} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  )
}
