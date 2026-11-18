import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { esAdulto, esGuiaMayor } from '../../domain/tipos'
import { uniformeCorrecto } from '../../domain/uniformes'
import { llevaTorzal, uniformeDeJugador } from '../../application/uniformeJugador'
import { gradMap } from './Toon'
import { texturaAsset, texturaGalon, texturaPanel } from './texturas'
import { Avatar3D } from './Avatar3D'

export const URL_AVATAR = (globalThis as unknown as { __MODELOS?: Record<string,string> }).__MODELOS?.avatar ?? `${import.meta.env.BASE_URL}modelos/avatar.glb`
export { PIELES, PELOS } from './Avatar3D'
import { PIELES, PELOS } from './Avatar3D'
/** El modelo mide 1,65 m; las escenas se armaron para 2,2 unidades. */
const AJUSTE = 1.33
const PEINADO = ['Corto', 'Puntas', 'Rapado', 'Trenzas', 'Cola', 'Suelto', 'Mono']

/** Contorno de "casco invertido" empujado por la normal: el trazo negro de las ilustraciones, en 3D. */
function materialContorno(grosor: number) {
  const m = new THREE.MeshBasicMaterial({ color: '#141414', side: THREE.BackSide })
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize(normal) * ${grosor.toFixed(4)};`)
  }
  return m
}

const SIN_CONTORNO = /^(Parche|Brillo|Mejilla|Boca|Ojo|Ceja|Boton|Torzal|Silbato|Nariz)/

/**
 * Personaje modelado en Blender (avatar.glb): rígido, liviano y animado por piezas.
 * Lleva el uniforme real de su rango: el dibujo de las mangas y del pecho se genera con los mismos
 * assets oficiales del juego 2D; pañoleta de GM, torzal y galones aparecen solo cuando corresponden.
 */
export function Personaje({ a, rango = 'conquistador', apodo = '', club = '', animo = 'idle', escala = 1 }: {
  a: AvatarConfig; rango?: Rango; apodo?: string; club?: string; animo?: 'idle' | 'saluda' | 'celebra' | 'voto'; escala?: number
}) {
  const { scene } = useGLTF(URL_AVATAR, false, true)
  const raiz = useMemo(() => {
    const r = scene.clone(true)
    const contornos: [THREE.Mesh, THREE.Mesh][] = []
    r.traverse(o => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const original = m.material as THREE.MeshStandardMaterial
      const nombre = original.name
      if (o.name.startsWith('Parche')) {
        m.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        m.renderOrder = 2
      } else {
        // DoubleSide: las mangas y la falda son tubos abiertos; sin esto el interior se ve NEGRO al mover el brazo.
        const mat = new THREE.MeshToonMaterial({ color: original.color.clone(), gradientMap: gradMap(), side: THREE.DoubleSide })
        mat.name = nombre
        if (nombre === 'Oro' || nombre === 'Plata') mat.emissive = original.color.clone().multiplyScalar(0.15)
        m.material = mat
      }
      m.castShadow = false
      if (!SIN_CONTORNO.test(o.name)) {
        m.geometry.computeBoundingSphere()
        const r0 = m.geometry.boundingSphere?.radius ?? 0.1
        if (r0 > 0.015) contornos.push([m, new THREE.Mesh(m.geometry, materialContorno(Math.min(0.006, r0 * 0.05)))])
      }
    })
    for (const [m, c] of contornos) { c.name = m.name + '_contorno'; m.add(c) }
    return r
  }, [scene])

  const perfilU = useMemo(() => uniformeDeJugador(rango, a, apodo, club), [rango, a, apodo, club])
  const piel = PIELES[a.piel ?? 2] ?? PIELES[2]
  const pelo = PELOS[a.colorPelo ?? 0] ?? PELOS[0]
  const chica = a.genero === 'f'
  const adulto = esAdulto(rango), gm = esGuiaMayor(rango)
  const conPanoleta = rango !== 'conquistador' || a.panoleta !== false

  // Visibilidad y colores
  useEffect(() => {
    const ver = (n: string, v: boolean) => { const o = raiz.getObjectByName(n); if (o) o.visible = v }
    const estilo = a.pelo ?? (chica ? 3 : 0)
    PEINADO.forEach((p, i) => ver('Peinado_' + p, i === estilo))
    ver('Var_Falda', chica); ver('Var_Pantalon', !chica)
    ver('Panoleta_Conquis', conPanoleta && !gm); ver('Panoleta_GM', conPanoleta && gm)
    ver('Torzal', !!llevaTorzal(perfilU))
    const galon = perfilU.galon && perfilU.galon !== 'ninguno'
    for (const l of ['D', 'I']) { ver('Galon_' + l, !!galon); ver('Parche_Galon_' + l, !!galon); ver('BotonGalon_' + l, !!galon) }
    raiz.traverse(o => {
      const m = (o as THREE.Mesh).material as THREE.MeshToonMaterial | undefined
      if (!m || !(o as THREE.Mesh).isMesh || !m.name) return
      if (m.name === 'Piel') m.color.set(piel)
      if (m.name === 'Pelo') m.color.set(pelo)
      if (m.name === 'Camisa') m.color.set(adulto ? '#F3F1EA' : '#D9C49A')
    })
  }, [raiz, a.pelo, chica, conPanoleta, gm, adulto, piel, pelo, perfilU])

  // Insignias: texturas generadas desde el uniforme correcto
  useEffect(() => {
    let vivo = true
    const piezas = uniformeCorrecto(perfilU).filter(c => c.pieza.tipo !== 'panoleta' && c.pieza.tipo !== 'correa')
    const poner = (nombre: string, t: THREE.Texture) => {
      const m = raiz.getObjectByName(nombre) as THREE.Mesh | undefined
      if (!m || !vivo) return
      m.material = new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.02 })
    }
    texturaPanel('pecho', piezas, 24).then(t => poner('Parche_Pecho', t))
    texturaPanel('manga_der', piezas, 24).then(t => poner('Parche_Manga_D', t))
    texturaPanel('manga_izq', piezas, 24).then(t => poner('Parche_Manga_I', t))
    texturaAsset('hebilla', 256).then(t => poner('Parche_Hebilla', t))
    // Sujetador (canuto de la pañoleta): Conquistador lleva C3, Guía Mayor lleva LC1. Va volteado (UV al revés).
    texturaAsset('c3', 128, true).then(t => poner('Parche_Sujetador', t))
    texturaAsset(esGuiaMayor(perfilU.rango) ? 'pin-gm' : 'c3', 128, true).then(t => poner('Parche_SujetadorGM', t))
    if (perfilU.galon && perfilU.galon !== 'ninguno') texturaGalon(perfilU.galon).then(t => { poner('Parche_Galon_D', t); poner('Parche_Galon_I', t) })
    return () => { vivo = false }
  }, [raiz, perfilU])

  // Animación por piezas (sin esqueleto: más liviano)
  const fase = useMemo(() => Math.random() * 10, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + fase
    const cuerpo = raiz.getObjectByName('Cuerpo'), cab = raiz.getObjectByName('Cabeza')
    const bd = raiz.getObjectByName('Brazo_D'), bi = raiz.getObjectByName('Brazo_I')
    if (cuerpo) cuerpo.position.y = animo === 'celebra' ? Math.abs(Math.sin(t * 5)) * 0.12 : Math.sin(t * 2) * 0.006
    if (cab) { cab.rotation.z = Math.sin(t * 1.3) * 0.04; cab.rotation.y = Math.sin(t * 0.7) * 0.08 }
    if (bd) {
      if (animo === 'voto') { bd.rotation.z = -2.3; bd.rotation.x = 0.2 }
      else if (animo === 'idle') { bd.rotation.z = -0.05 + Math.sin(t * 2) * 0.02; bd.rotation.x = 0 }
      else { bd.rotation.z = -2.55 + Math.sin(t * (animo === 'celebra' ? 10 : 7)) * 0.3; bd.rotation.x = 0 }
    }
    if (bi) bi.rotation.z = animo === 'celebra' ? 2.55 + Math.sin(t * 10 + 1) * 0.3 : 0.05 - Math.sin(t * 2) * 0.02
  })

  const ref = useRef<THREE.Group>(null)
  return <group ref={ref} scale={escala * AJUSTE}><primitive object={raiz} /></group>
}

type Props = Parameters<typeof Personaje>[0]

/** Personaje 3D con respaldo: mientras carga el modelo se muestra el personaje procedural. */
export function Jugador3D(p: Props) {
  return <Suspense fallback={<Avatar3D a={p.a} rango={p.rango} animo={p.animo} escala={p.escala} />}><Personaje {...p} /></Suspense>
}

useGLTF.preload(URL_AVATAR, false, true)
