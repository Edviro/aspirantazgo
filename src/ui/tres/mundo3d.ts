/**
 * El Gran Campamento en 3D, con estilo de consola de los 90 (como los juegos de fútbol de PlayStation):
 * se dibuja a baja resolución y se agranda con pixeles nítidos, sombreado plano, niebla y personajes de pixel art
 * que siempre miran a la cámara (de frente o de espaldas según desde dónde los mires).
 *
 * Coordenadas: 1 unidad = 1 baldosa. x = este, z = sur (igual que el mapa), y = altura.
 * La lógica del juego (rutas, ceremonias, quién está dónde) sigue en el dominio; aquí solo se dibuja.
 */
import * as THREE from 'three'
import type { AvatarConfig } from '../../application/puertos'
import { ALTO, ANCHO, CONSEJO, OBJETOS, PARCELAS, SANTUARIO, Suelo, suelo, type Objeto, type Parcela } from '../../domain/plaza'
import type { Rango } from '../../domain/tipos'
import { BANDERA_H, BANDERA_W, pintarBanderaClub, pintarBanderaPais } from '../pixel/banderas'
import { dibujarAvatar, dibujarAvatarEspalda, opcionesDe, PX_H, PX_W } from '../pixel/dibujo'
import { dibujarSuelo, pintarBanderaConquis } from '../pixel/plazaPixel'

export type Vista = 'tv' | 'cerca' | 'aerea' | 'primera'
export interface Ente3D { id: string; x: number; y: number; avatar?: AvatarConfig; rango: Rango; camina: boolean; saluda: boolean; visible?: boolean; mira?: { x: number; y: number }; alto?: number }
export interface ClubParcela { nombre: string; color: string; pais?: string | null; bandera?: string | null }
export interface Pantalla3D { arriba?: string; texto: string; abajo?: string; encendida: boolean }
export type Eleccion = { tipo: 'ente'; id: string } | { tipo: 'punto'; x: number; y: number } | null

const MADERA = 0x8a5a2e, MADERA_C = 0xc98d55
const PRESETS: Record<Exclude<Vista, 'primera'>, { pitch: number; dist: number; fov: number }> = {
  tv: { pitch: 0.6, dist: 15, fov: 38 },
  cerca: { pitch: 0.3, dist: 6.5, fov: 50 },
  aerea: { pitch: 1.2, dist: 40, fov: 40 },
}
const ALTO_PJ = 1.35, ANCHO_PJ = ALTO_PJ * PX_W / PX_H

const lienzo = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
function texPixel(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
const mezclar = (a: THREE.Color, b: THREE.Color, k: number) => a.clone().lerp(b, Math.max(0, Math.min(1, k)))

/** Prisma de carpa (ancho 1, fondo 1, alto 1), con la puerta mirando a +z. */
function geometriaCarpa() {
  const v = [
    // techo izquierdo y derecho
    -0.5, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, -0.5, -0.5, 0, -0.5,
    0.5, 0, 0.5, 0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, 0.5, 0, 1, -0.5, 0, 1, 0.5,
    // frente (+z) y fondo
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5,
    -0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, -0.5,
  ]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  g.computeVertexNormals()
  return g
}

/** Muchas piezas iguales (cajas, cilindros, conos) en una sola llamada de dibujo. */
class Piezas {
  readonly malla: THREE.InstancedMesh
  private n = 0
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private c = new THREE.Color()
  constructor(geo: THREE.BufferGeometry, max: number, mat?: THREE.Material) {
    this.malla = new THREE.InstancedMesh(geo, mat ?? new THREE.MeshLambertMaterial({ flatShading: true }), max)
    this.malla.count = 0
  }
  /** Pieza en (x, y, z), escalada y girada (ángulos de Euler). */
  poner(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number | string, rx = 0, ry = 0, rz = 0) {
    if (this.n >= this.malla.instanceMatrix.count) return
    this.q.setFromEuler(new THREE.Euler(rx, ry, rz))
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz))
    this.malla.setMatrixAt(this.n, this.m)
    this.malla.setColorAt(this.n, this.c.set(color as THREE.ColorRepresentation))
    this.n++
    this.malla.count = this.n
  }
  /** Palo (cilindro) entre dos puntos. */
  palo(a: THREE.Vector3, b: THREE.Vector3, r: number, color: number) {
    const d = b.clone().sub(a), largo = d.length(), medio = a.clone().add(b).multiplyScalar(0.5)
    this.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
    this.m.compose(medio, this.q, new THREE.Vector3(r, largo, r))
    if (this.n >= this.malla.instanceMatrix.count) return
    this.malla.setMatrixAt(this.n, this.m)
    this.malla.setColorAt(this.n, this.c.set(color))
    this.n++
    this.malla.count = this.n
  }
  vaciar() { this.n = 0; this.malla.count = 0 }
  listo() { this.malla.instanceMatrix.needsUpdate = true; if (this.malla.instanceColor) this.malla.instanceColor.needsUpdate = true; this.malla.computeBoundingSphere() }
}

interface Bandera3D { malla: THREE.Mesh; base: number; rango: number; fase: number; poste: THREE.Vector3 }
interface Pj { sprite: THREE.Sprite; sombra: THREE.Mesh; frente: THREE.Texture; espalda: THREE.Texture; saluda: THREE.Texture; clave: string; x: number; z: number; dirX: number; dirZ: number; t: number }

export class Mundo3D {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private cam = new THREE.PerspectiveCamera(38, 1, 0.1, 400)
  private ray = new THREE.Raycaster()
  private reloj = 0
  private k = 2 // cuántos pixeles de pantalla mide cada pixel del juego
  private ancho = 1; private alto = 1
  // cámara
  private yawV = 0; private pitchV = PRESETS.tv.pitch; private distV = PRESETS.tv.dist
  private yawO = 0; private pitchO = PRESETS.tv.pitch; private distO = PRESETS.tv.dist
  private vistaV: Vista = 'tv'
  private foco = new THREE.Vector3(48.5, 0, 26)
  private ojos: { x: number; z: number; mira: THREE.Vector3 } | null = null
  private vuelo: { t: number; dur: number; dePos: THREE.Vector3; deMira: THREE.Vector3; aPos: THREE.Vector3; aMira: THREE.Vector3; fin?: () => void } | null = null
  private miraActual = new THREE.Vector3()
  // mundo
  private suelo: [THREE.CanvasTexture, THREE.CanvasTexture]
  private sueloMat: THREE.MeshLambertMaterial
  private estatico = new THREE.Group()
  private hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5a7a3a, 2.2)
  private sol = new THREE.DirectionalLight(0xfff2d6, 2.2)
  private fuegos: { s: THREE.Sprite; base: number; fase: number }[] = []
  private luzFuego: THREE.PointLight[] = []
  private brillos: THREE.Sprite[] = []
  private faroles: THREE.Mesh[] = []
  private estrellas: THREE.Points
  private texFuego: [THREE.CanvasTexture, THREE.CanvasTexture]
  private puerta: THREE.Mesh | null = null
  private carpas: Piezas; private puertasCarpa: Piezas; private estacas: Piezas
  private dinamico = new THREE.Group() // pórticos con letrero y banderas (cambian con los clubes)
  private banderas: Bandera3D[] = []
  private altura = 1
  private pantallaCv = lienzo(256, 144)
  private pantallaTex: THREE.CanvasTexture
  private pantallaMat: THREE.MeshBasicMaterial
  private fondoEsc: THREE.CanvasTexture
  private fondoMat: THREE.MeshLambertMaterial | null = null
  private luzEscenario: THREE.PointLight | null = null
  private emblema: HTMLImageElement | null = null
  private ultimaPantalla: Pantalla3D = { texto: '', encendida: false }
  private barco: THREE.Group | null = null
  private pjs = new Map<string, Pj>()
  private texCache = new Map<string, THREE.CanvasTexture>()
  private escena = new Map<string, Pj>()
  private yoId: string | null = null
  /** Dónde queda (de 0 arriba a 1 abajo) el punto al que se mira; sirve cuando hay paneles abajo. */
  private centro = 0.5
  private sombraGeo = new THREE.CircleGeometry(0.32, 10)
  private sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })

  constructor(canvas: HTMLCanvasElement, abierto: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene.fog = new THREE.Fog(0x9fd6f2, 30, 90)
    this.scene.add(this.hemi, this.sol, this.sol.target, this.estatico, this.dinamico)

    // Suelo (el mismo pixel art del mapa) y el mar alrededor
    const s0 = lienzo(ANCHO * 16, ALTO * 16), s1 = lienzo(ANCHO * 16, ALTO * 16)
    dibujarSuelo(s0.getContext('2d')!, 0, abierto); dibujarSuelo(s1.getContext('2d')!, 1, abierto)
    this.suelo = [texPixel(s0), texPixel(s1)]
    this.sueloMat = new THREE.MeshLambertMaterial({ map: this.suelo[0] })
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, ALTO), this.sueloMat)
    piso.rotation.x = -Math.PI / 2; piso.position.set(ANCHO / 2, 0, ALTO / 2); piso.name = 'suelo'
    const mar = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0x2f7fc4 }))
    mar.rotation.x = -Math.PI / 2; mar.position.set(ANCHO / 2, -0.03, ALTO / 2)
    this.estatico.add(piso, mar)

    // Estrellas (solo de noche)
    const pts: number[] = []
    for (let i = 0; i < 500; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.45 + 0.08; pts.push(Math.cos(a) * Math.cos(b) * 180 + 48, Math.sin(b) * 180, Math.sin(a) * Math.cos(b) * 180 + 43) }
    const gEst = new THREE.BufferGeometry(); gEst.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    this.estrellas = new THREE.Points(gEst, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 }))
    this.scene.add(this.estrellas)

    this.texFuego = [texPixel(this.dibujarLlama(0)), texPixel(this.dibujarLlama(1))]
    this.pantallaTex = texPixel(this.pantallaCv)
    this.pantallaTex.magFilter = THREE.LinearFilter
    this.pantallaMat = new THREE.MeshBasicMaterial({ map: this.pantallaTex, fog: false })
    this.fondoEsc = texPixel(this.dibujarFondoEscenario())
    this.carpas = new Piezas(geometriaCarpa(), 260)
    this.puertasCarpa = new Piezas(new THREE.PlaneGeometry(1, 1), 260, new THREE.MeshLambertMaterial({ color: 0x241a12, side: THREE.DoubleSide }))
    this.estacas = new Piezas(new THREE.BoxGeometry(1, 1, 1), 600)
    this.dinamico.add(this.carpas.malla, this.puertasCarpa.malla, this.estacas.malla)
    this.construir(abierto)
    this.setPantalla({ texto: '', encendida: false })
  }

  // ------------------------------------------------------------------ construcción del mundo fijo
  private construir(abierto: boolean) {
    const caja = new Piezas(new THREE.BoxGeometry(1, 1, 1), 4000)
    const cil = new Piezas(new THREE.CylinderGeometry(1, 1, 1, 7), 2600)
    const cono = new Piezas(new THREE.ConeGeometry(1, 1, 7), 600)
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

    // Cercos (de las parcelas y del santuario): postes y dos travesaños
    for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO; x++) {
      if (suelo(x, y) !== Suelo.CERCA) continue
      const cx = x + 0.5, cz = y + 0.5
      cil.poner(cx, 0.45, cz, 0.07, 0.9, 0.07, MADERA)
      if (suelo(x + 1, y) === Suelo.CERCA) for (const h of [0.35, 0.72]) caja.poner(cx + 0.5, h, cz, 1, 0.07, 0.07, MADERA_C)
      if (suelo(x, y + 1) === Suelo.CERCA) for (const h of [0.35, 0.72]) caja.poner(cx, h, cz + 0.5, 0.07, 0.07, 1, MADERA_C)
    }
    // Puerta del santuario (se abre al completar los campamentos)
    this.puerta = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.1), new THREE.MeshLambertMaterial({ color: 0x6b4423 }))
    this.puerta.position.set(48.5, 0.4, SANTUARIO.y + SANTUARIO.h - 0.5)
    this.puerta.visible = !abierto
    this.estatico.add(this.puerta)

    for (const ob of OBJETOS) this.objeto(ob, caja, cil, cono, V)
    for (const p of [caja, cil, cono]) { p.listo(); this.estatico.add(p.malla) }
  }

  private objeto(ob: Objeto, caja: Piezas, cil: Piezas, cono: Piezas, V: (x: number, y: number, z: number) => THREE.Vector3) {
    const cx = ob.x + ob.w / 2, cz = ob.y + ob.h / 2
    switch (ob.tipo) {
      case 'pino': {
        const h = 0.85 + ((ob.x * 7 + ob.y * 13) % 5) * 0.08
        cil.poner(cx, 0.35 * h, cz, 0.12, 0.7 * h, 0.12, 0x6b4423)
        cono.poner(cx, 1.05 * h, cz, 0.85 * h, 1.3 * h, 0.85 * h, 0x1d5e3a)
        cono.poner(cx, 1.75 * h, cz, 0.62 * h, 1.1 * h, 0.62 * h, 0x2a7a4a)
        cono.poner(cx, 2.3 * h, cz, 0.36 * h, 0.8 * h, 0.36 * h, 0x3a9a5a)
        break
      }
      case 'carpa': {
        this.carpas.poner(cx, 0, cz, 1.7, 1.15, 1.8, ob.color ?? '#D7242F')
        this.puertasCarpa.poner(cx, 0.32, cz + 0.91, 0.5, 0.62, 1, '#241a12')
        break
      }
      case 'farol': {
        cil.poner(cx, 0.9, cz, 0.05, 1.8, 0.05, 0x2e323b)
        caja.poner(cx, 1.85, cz, 0.24, 0.26, 0.24, 0x2e323b)
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.16), new THREE.MeshBasicMaterial({ color: 0x8d8670 }))
        lamp.position.set(cx, 1.85, cz)
        this.faroles.push(lamp); this.estatico.add(lamp)
        this.brillo(cx, 1.85, cz, 2.2)
        break
      }
      case 'banca': {
        caja.poner(cx, 0.42, cz, ob.w * 0.95, 0.08, 0.42, MADERA_C)
        caja.poner(cx, 0.68, cz - 0.18, ob.w * 0.95, 0.32, 0.06, MADERA)
        for (const dx of [-0.38, 0.38]) caja.poner(cx + dx * ob.w, 0.2, cz, 0.08, 0.4, 0.38, MADERA)
        break
      }
      case 'tronco': {
        const a = Math.atan2(cz - CONSEJO.y, cx - CONSEJO.x), tx = -Math.sin(a) * 0.55, tz = Math.cos(a) * 0.55
        cil.palo(V(cx - tx, 0.22, cz - tz), V(cx + tx, 0.22, cz + tz), 0.22, 0x7a4b22)
        break
      }
      case 'fogata': {
        const g = ob.fogata === 'gran' ? 1.8 : ob.fogata === 'consejo' ? 1.5 : 0.8
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI, dx = Math.cos(a) * 0.55 * g, dz = Math.sin(a) * 0.55 * g; cil.palo(V(cx - dx, 0.12 * g, cz - dz), V(cx + dx, 0.12 * g, cz + dz), 0.09 * g, 0x5e3a1a) }
        if (ob.fogata === 'tipi' || ob.fogata === 'gran') for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cil.palo(V(cx + Math.cos(a) * 0.4 * g, 0, cz + Math.sin(a) * 0.4 * g), V(cx, 0.9 * g, cz), 0.05 * g, 0x7a4b22) }
        if (ob.fogata === 'reflector') caja.poner(cx, 0.35 * g, cz - 0.45 * g, 1.1 * g, 0.7 * g, 0.12, 0x6b4423)
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; caja.poner(cx + Math.cos(a) * 0.62 * g, 0.08, cz + Math.sin(a) * 0.62 * g, 0.22, 0.16, 0.22, 0x8d8d86) }
        this.fuego(cx, 0.1, cz, g)
        if (ob.fogata === 'gran' || ob.fogata === 'consejo') {
          const l = new THREE.PointLight(0xff9a3a, 0, 14, 1.6); l.position.set(cx, 1.4, cz)
          this.luzFuego.push(l); this.estatico.add(l)
        }
        break
      }
      case 'bandera': case 'banderin': {
        cil.poner(cx, 2.4, cz, 0.06, 4.8, 0.06, 0xd9d7ce)
        caja.poner(cx, 4.85, cz, 0.16, 0.12, 0.16, 0xf2b90f)
        const c = lienzo(16, 11)
        if (ob.tipo === 'bandera') pintarBanderaConquis(c.getContext('2d')!)
        else { const x = c.getContext('2d')!; x.fillStyle = '#1E140C'; x.fillRect(0, 0, 16, 11); x.fillStyle = '#1F4FB8'; x.fillRect(1, 1, 14, 4); x.fillStyle = '#fff'; x.fillRect(1, 5, 14, 5) }
        this.banderas.push({ malla: this.mallaBandera(c, 1.5, 1.0, 0), base: 3.6, rango: 0, fase: cx, poste: V(cx, 4.6, cz) })
        break
      }
      case 'santuario': {
        // piedras del círculo sagrado alrededor de la gran fogata
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; caja.poner(48.5 + Math.cos(a) * 1.9, 0.12, 23 + Math.sin(a) * 1.4, 0.35, 0.24, 0.3, 0x9a9a92, 0, a, 0) }
        break
      }
      case 'tienda': {
        caja.poner(cx, 0.5, cz + 0.3, ob.w * 0.95, 1, 0.6, MADERA)
        caja.poner(cx, 0.98, cz + 0.3, ob.w, 0.06, 0.7, MADERA_C)
        for (const dx of [-0.48, 0.48]) for (const dz of [-0.4, 0.55]) cil.poner(cx + dx * ob.w, 1.2, cz + dz, 0.05, 2.4, 0.05, MADERA)
        const techo = new THREE.Mesh(new THREE.BoxGeometry(ob.w + 0.4, 0.12, 1.6), new THREE.MeshLambertMaterial({ map: texPixel(this.rayas('#D7242F', '#ffffff')) }))
        techo.position.set(cx, 2.4, cz + 0.05); techo.rotation.x = -0.18
        this.estatico.add(techo, this.letrero('TIENDA', cx, 2.75, cz + 0.85, 2.4, 0.42, '#F2B90F', '#1E140C'))
        break
      }
      case 'tablero': case 'reto': {
        for (const dx of [-0.42, 0.42]) cil.poner(cx + dx * ob.w, 0.9, cz + 0.3, 0.06, 1.8, 0.06, MADERA)
        caja.poner(cx, 1.3, cz + 0.3, ob.w * 0.9, 1.0, 0.1, MADERA)
        this.estatico.add(this.letrero(ob.tipo === 'reto' ? 'RETO DEL DÍA' : 'TORNEOS', cx, 1.3, cz + 0.36, ob.w * 0.82, 0.86, ob.tipo === 'reto' ? '#1F4FB8' : '#1E9A4B', '#ffffff'))
        break
      }
      case 'letrero': {
        cil.poner(cx, 0.7, cz, 0.05, 1.4, 0.05, MADERA)
        this.estatico.add(this.letrero('⛵ CAMPAMENTOS', cx, 1.35, cz + 0.05, 1.6, 0.4, '#F3F1EA', '#1E140C'))
        break
      }
      case 'escenario': this.escenario(ob, caja, cil); break
      case 'barco': this.hacerBarco(cx, cz); break
      case 'consejo': break
      default: break
    }
  }

  private escenario(ob: Objeto, caja: Piezas, cil: Piezas) {
    const x0 = ob.x - 0.3, x1 = ob.x + ob.w + 0.3, cx = (x0 + x1) / 2, z0 = ob.y, z1 = ob.y + ob.h + 0.2
    // Tarima y escalones
    caja.poner(cx, 0.3, (z0 + z1) / 2, x1 - x0, 0.6, z1 - z0, MADERA)
    caja.poner(cx, 0.61, (z0 + z1) / 2, x1 - x0, 0.03, z1 - z0, MADERA_C)
    caja.poner(cx, 0.2, z1 + 0.3, 1.6, 0.4, 0.6, MADERA_C)
    // Torres y viga (estructura de escenario)
    for (const x of [x0 + 0.15, x1 - 0.15]) { caja.poner(x, 2.6, z0 + 0.2, 0.3, 5.2, 0.3, 0x2e323b); caja.poner(x, 1.1, z0 + 0.7, 0.55, 1.0, 0.5, 0x16181d) }
    caja.poner(cx, 5.1, z0 + 0.2, x1 - x0, 0.3, 0.3, 0x2e323b)
    for (const dx of [-2.6, -1, 1, 2.6]) caja.poner(cx + dx, 4.85, z0 + 0.35, 0.3, 0.22, 0.3, 0x1e140c)
    // Fondo full Conquistadores (dos emblemas C1) y la pantalla LED al centro
    // El fondo brilla un poco por sí mismo (como un telón iluminado): de noche no queda negro
    this.fondoMat = new THREE.MeshLambertMaterial({ map: this.fondoEsc, emissive: 0xffffff, emissiveMap: this.fondoEsc, emissiveIntensity: 0.15 })
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.6, 4.3), this.fondoMat)
    // Luz del escenario: ilumina el piso, el atril y al público de las primeras filas
    this.luzEscenario = new THREE.PointLight(0xfff0d0, 0, 16, 1.4)
    this.luzEscenario.position.set(cx, 4.2, z1 + 2.2)
    this.estatico.add(this.luzEscenario)
    fondo.position.set(cx, 0.6 + 2.15, z0 + 0.05)
    const marco = new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.15, 0.08), new THREE.MeshLambertMaterial({ color: 0x16181d }))
    marco.position.set(cx, 3.0, z0 + 0.1)
    const led = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.97), this.pantallaMat)
    led.position.set(cx, 3.0, z0 + 0.15); led.name = 'led'
    // Atril
    caja.poner(cx, 0.95, z1 - 0.55, 0.42, 0.7, 0.3, MADERA)
    caja.poner(cx, 1.31, z1 - 0.6, 0.5, 0.04, 0.36, MADERA_C)
    cil.poner(cx + 0.16, 1.5, z1 - 0.6, 0.015, 0.36, 0.015, 0x333333)
    this.estatico.add(fondo, marco, led)
    // Luces de la viga
    for (const dx of [-2.6, 2.6]) this.brillo(cx + dx, 4.75, z0 + 0.45, 3)
  }

  private hacerBarco(cx: number, cz: number) {
    const g = new THREE.Group()
    const casco = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.7, 6, 8, 1, false), new THREE.MeshLambertMaterial({ color: 0x6b4423, flatShading: true }))
    casco.rotation.z = Math.PI / 2; casco.scale.set(1, 1, 0.75); casco.position.y = 0.35
    const cubierta = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.1, 1.5), new THREE.MeshLambertMaterial({ color: 0xc98d55 }))
    cubierta.position.y = 0.95
    const franja = new THREE.Mesh(new THREE.BoxGeometry(6.05, 0.16, 1.62), new THREE.MeshLambertMaterial({ color: 0xf2b90f }))
    franja.position.y = 0.8
    const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 4.4, 6), new THREE.MeshLambertMaterial({ color: 0x5e3a1a }))
    mastil.position.set(0, 3.1, 0)
    const vela = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), new THREE.MeshLambertMaterial({ color: 0xfff7e3, side: THREE.DoubleSide }))
    vela.position.set(0, 3, 0.05)
    g.add(casco, cubierta, franja, mastil, vela)
    const c = lienzo(16, 11); pintarBanderaConquis(c.getContext('2d')!)
    const b = this.mallaBandera(c, 0.9, 0.6, 0); b.position.set(0, 4.75, 0); g.add(b)
    g.position.set(cx, 0, cz + 0.3)
    this.barco = g
    this.estatico.add(g)
  }

  // ------------------------------------------------------------------ pórticos, banderas y carpas de los clubes
  /** Pórtico de troncos amarrados (como en los camporees) con el nombre del club y sus banderas. */
  setParcelas(clubes: Map<number, ClubParcela>, ocupadas: Set<string>) {
    for (const h of [...this.dinamico.children]) if (h !== this.carpas.malla && h !== this.puertasCarpa.malla && h !== this.estacas.malla) { this.dinamico.remove(h); this.liberar(h) }
    this.banderas = this.banderas.filter(b => b.rango === 0)
    this.carpas.vaciar(); this.puertasCarpa.vaciar(); this.estacas.vaciar()
    const palos = new Piezas(new THREE.CylinderGeometry(1, 1, 1, 6), 40 * PARCELAS.length)
    for (const p of PARCELAS) {
      const club = clubes.get(p.i)
      this.portico(p, club, palos)
      // carpas: armadas si alguien duerme ahí; si no, solo las estacas
      for (const ob of OBJETOS) {
        if (ob.tipo !== 'carpa-p' || ob.parcela !== p.i) continue
        const cx = ob.x + 1, cz = ob.y + 1, arriba = ob.slot! >= 3
        if (club && ocupadas.has(`${p.i}-${ob.sexo}-${ob.slot}`)) {
          this.carpas.poner(cx, 0, cz, 1.7, 1.15, 1.8, club.color, 0, arriba ? 0 : Math.PI, 0)
          this.puertasCarpa.poner(cx, 0.32, cz + (arriba ? 0.91 : -0.91), 0.5, 0.62, 1, '#241a12')
        } else for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) this.estacas.poner(cx + dx, 0.06, cz + dz, 0.05, 0.12, 0.05, 0x8a5a2e)
      }
    }
    palos.listo(); this.dinamico.add(palos.malla)
    this.carpas.listo(); this.puertasCarpa.listo(); this.estacas.listo()
  }

  private portico(p: Parcela, club: ClubParcela | undefined, palos: Piezas) {
    const este = p.puerta === 'este', x = (este ? p.x + p.w - 1 : p.x) + 0.5
    const z0 = p.y + 3, z1 = p.y + 6, zm = (z0 + z1) / 2, V = (a: number, b: number, c: number) => new THREE.Vector3(a, b, c)
    const col = club ? MADERA : 0x9a8a72
    for (const z of [z0 + 0.08, z1 - 0.08]) for (const dx of [-0.16, 0.16]) palos.palo(V(x + dx, 0, z), V(x + dx, 3.4, z), 0.07, col)
    for (const dx of [-0.16, 0.16]) for (const h of [1.1, 2.25, 3.05]) palos.palo(V(x + dx, h, z0 - 0.2), V(x + dx, h, z1 + 0.2), 0.055, col)
    // A del techo: dos troncos que se cruzan arriba
    for (const dx of [-0.16, 0.16]) {
      palos.palo(V(x + dx, 2.7, z0 - 0.35), V(x + dx, 4.75, zm + 0.45), 0.055, col)
      palos.palo(V(x + dx, 2.7, z1 + 0.35), V(x + dx, 4.75, zm - 0.45), 0.055, col)
    }
    palos.palo(V(x - 0.2, 3.6, zm), V(x + 0.2, 3.6, zm), 0.05, col)
    if (!club) return
    // Letrero con el nombre del club (a los dos lados)
    for (const lado of [1, -1]) {
      const l = this.letrero(club.nombre.toUpperCase(), x + lado * 0.24, 2.55, zm, 2.6, 0.48, '#1F4FB8', '#ffffff', true)
      l.rotation.y = lado * Math.PI / 2
      this.dinamico.add(l)
    }
    // Banderas amarradas: país a la izquierda de quien mira desde afuera, Conquistadores a la derecha, la del club arriba
    const fuera = este ? 1 : -1
    const izq = este ? z1 - 0.1 : z0 + 0.1, der = este ? z0 + 0.1 : z1 - 0.1
    palos.palo(V(x, 3.0, zm), V(x, 5.6, zm), 0.04, 0xd9d7ce)
    const pais = lienzo(16, 11); pintarBanderaPais(pais.getContext('2d')!, club.pais)
    const conq = lienzo(16, 11); pintarBanderaConquis(conq.getContext('2d')!)
    const add = (c: HTMLCanvasElement, poste: THREE.Vector3, hacia: number, base: number, rango: number, w: number) => {
      const m = this.mallaBandera(c, w, w * 0.66, hacia)
      this.dinamico.add(m)
      this.banderas.push({ malla: m, base, rango, fase: poste.z * 1.7 + poste.x, poste })
    }
    add(pais, V(x + fuera * 0.26, 0, izq), Math.sign(zm - izq), 1.1, 2.3, 0.95)
    add(conq, V(x + fuera * 0.26, 0, der), Math.sign(zm - der), 1.1, 2.3, 0.95)
    if (club.bandera) { const b = lienzo(BANDERA_W, BANDERA_H); if (pintarBanderaClub(b.getContext('2d')!, club.bandera)) add(b, V(x, 0, zm), 1, 3.2, 1.75, 1.05) }
  }

  /** Bandera: plano que ondea, sujeto por un borde. `hacia`: 0 = hacia +x, ±1 = hacia ±z. */
  private mallaBandera(c: HTMLCanvasElement, w: number, h: number, hacia: number) {
    const g = new THREE.PlaneGeometry(w, h, 8, 1)
    g.translate(w / 2, -h / 2, 0)
    g.userData.base = Float32Array.from(g.attributes.position.array as Float32Array)
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: texPixel(c), side: THREE.DoubleSide }))
    if (hacia !== 0) m.rotation.y = hacia > 0 ? -Math.PI / 2 : Math.PI / 2
    return m
  }

  setAlturaBanderas(a: number) { this.altura = a }

  // ------------------------------------------------------------------ texturas dibujadas
  private letrero(txt: string, x: number, y: number, z: number, w: number, h: number, fondo: string, tinta: string, doble = false) {
    const c = lienzo(256, Math.round(256 * h / w)), ctx = c.getContext('2d')!
    ctx.fillStyle = '#1E140C'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.fillStyle = fondo; ctx.fillRect(4, 4, c.width - 8, c.height - 8)
    ctx.fillStyle = tinta; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    let t = Math.min(c.height * 0.5, 40)
    ctx.font = `900 ${t}px Nunito, system-ui, sans-serif`
    while (ctx.measureText(txt).width > c.width - 24 && t > 8) { t -= 1; ctx.font = `900 ${t}px Nunito, system-ui, sans-serif` }
    ctx.fillText(txt, c.width / 2, c.height / 2 + 1)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, side: doble ? THREE.FrontSide : THREE.FrontSide }))
    m.position.set(x, y, z)
    return m
  }
  private rayas(a: string, b: string) {
    const c = lienzo(16, 8), x = c.getContext('2d')!
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * 2, 0, 2, 8) }
    return c
  }
  private dibujarLlama(f: 0 | 1) {
    const c = lienzo(16, 24), x = c.getContext('2d')!
    const capas: [string, number][] = [['#D7242F', 8], ['#F28C1E', 6], ['#F2C230', 4], ['#FFF4C2', 2]]
    capas.forEach(([col, r], i) => {
      x.fillStyle = col
      for (let y = 0; y < 24; y++) {
        const ancho = Math.max(0, Math.round(r * Math.sin(Math.min(1, (24 - y) / 20) * Math.PI / 2) * (y < 6 ? (f ? 0.6 : 0.8) : 1)))
        const off = Math.round(Math.sin(y * 0.6 + f * 2 + i) * (y < 12 ? 1 : 0))
        if (ancho > 0) x.fillRect(8 - ancho + off, y + i * 2, ancho * 2, 1)
      }
    })
    return c
  }
  private dibujarFondoEscenario() {
    const c = lienzo(320, 172), x = c.getContext('2d')!
    x.fillStyle = '#0d1636'; x.fillRect(0, 0, 320, 172)
    for (let i = 0; i < 320; i += 8) { x.fillStyle = i % 16 ? '#101c44' : '#0b1430'; x.fillRect(i, 0, 4, 172) }
    x.fillStyle = '#F2B90F'; x.fillRect(0, 0, 320, 5); x.fillRect(0, 167, 320, 5)
    x.fillStyle = '#D7242F'; x.fillRect(0, 5, 320, 3)
    x.fillStyle = '#F2C230'; x.font = '900 13px Nunito, system-ui, sans-serif'; x.textAlign = 'center'
    x.fillText('CONQUISTADORES', 160, 160)
    const img = new Image()
    img.onload = () => {
      for (const cx of [48, 272]) x.drawImage(img, cx - 38, 40, 76, 76)
      this.fondoEsc.needsUpdate = true
      this.emblema = img
      this.setPantalla(this.ultimaPantalla)
    }
    img.src = `${import.meta.env.BASE_URL}assets/emblema-c1.webp`
    return c
  }

  /** Lo que se proyecta en la pantalla LED del escenario. */
  setPantalla(p: Pantalla3D) {
    this.ultimaPantalla = p
    const c = this.pantallaCv, x = c.getContext('2d')!
    x.fillStyle = '#10245c'; x.fillRect(0, 0, 256, 144)
    const g = x.createRadialGradient(128, 0, 10, 128, 0, 220); g.addColorStop(0, 'rgba(70,120,255,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 144)
    // Sin programa: la pantalla muestra el emblema (nunca queda negra)
    if (!p.encendida || !p.texto) {
      if (this.emblema) x.drawImage(this.emblema, 128 - 40, 16, 80, 80)
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#F2C230'; x.font = '900 13px Nunito, system-ui, sans-serif'
      x.fillText(p.texto || 'GRAN CAMPAMENTO', 128, 112)
      x.fillStyle = '#a9c1ff'; x.font = '800 10px Nunito, system-ui, sans-serif'
      x.fillText(p.arriba ?? 'Escenario de cultos y programas', 128, 130)
      this.pantallaTex.needsUpdate = true
      return
    }
    x.textAlign = 'center'; x.textBaseline = 'middle'
    if (p.arriba) { x.fillStyle = '#a9c1ff'; x.font = '800 11px Nunito, system-ui, sans-serif'; x.fillText(p.arriba.slice(0, 40), 128, 14) }
    if (p.abajo) { x.fillStyle = '#a9c1ff'; x.font = '800 10px Nunito, system-ui, sans-serif'; x.fillText(p.abajo.slice(0, 40), 128, 132) }
    if (p.texto) {
      x.fillStyle = '#f4f1e8'
      let t = p.texto.length > 140 ? 12 : p.texto.length > 60 ? 15 : 20
      const lineas = (tam: number) => {
        x.font = `900 ${tam}px Nunito, system-ui, sans-serif`
        const out: string[] = []
        for (const parr of p.texto.split('\n')) {
          let l = ''
          for (const w of parr.split(' ')) { const pr = l ? `${l} ${w}` : w; if (x.measureText(pr).width > 236 && l) { out.push(l); l = w } else l = pr }
          out.push(l)
        }
        return out
      }
      let ls = lineas(t)
      while (ls.length * t * 1.2 > 100 && t > 9) ls = lineas(--t)
      ls.slice(0, 9).forEach((l, i) => x.fillText(l, 128, 72 + (i - (Math.min(ls.length, 9) - 1) / 2) * t * 1.2))
    }
    this.pantallaTex.needsUpdate = true
  }

  // ------------------------------------------------------------------ fuego, brillos y luz del día
  private fuego(x: number, y: number, z: number, g: number) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texFuego[0], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }))
    s.center.set(0.5, 0); s.position.set(x, y, z); s.scale.set(0.8 * g, 1.2 * g, 1)
    this.fuegos.push({ s, base: g, fase: x * 3 + z })
    this.estatico.add(s)
    this.brillo(x, 0.5 * g, z, 3.2 * g, 0xff9a3a, true)
  }
  private texBrillo: THREE.CanvasTexture | null = null
  private brillo(x: number, y: number, z: number, tam: number, color = 0xffe6a0, siempre = false) {
    if (!this.texBrillo) {
      const c = lienzo(64, 64), cx = c.getContext('2d')!, gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32)
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
      cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64)
      this.texBrillo = new THREE.CanvasTexture(c)
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texBrillo, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: siempre ? 0.55 : 0, fog: false }))
    s.position.set(x, y, z); s.scale.set(tam, tam, 1); s.userData.siempre = siempre
    this.brillos.push(s); this.estatico.add(s)
  }

  setLuz(l: { oscuridad: number; dorado: number; faroles: boolean }) {
    const dia = new THREE.Color(0x9fd6f2), tarde = new THREE.Color(0xf0a070), noche = new THREE.Color(0x0b1430)
    const cielo = mezclar(mezclar(dia, tarde, l.dorado), noche, l.oscuridad / 0.78)
    this.scene.background = cielo
    ;(this.scene.fog as THREE.Fog).color = cielo
    const k = 1 - (l.oscuridad / 0.78) * 0.82
    this.hemi.intensity = 2.2 * k + 0.42
    if (this.fondoMat) this.fondoMat.emissiveIntensity = 0.12 + (1 - k) * 0.55
    if (this.luzEscenario) this.luzEscenario.intensity = (1 - k) * 22 + 2
    this.hemi.color = mezclar(new THREE.Color(0xcfe8ff), new THREE.Color(0x6a7ab8), 1 - k)
    this.sol.intensity = 2.0 * k
    this.sol.color = mezclar(new THREE.Color(0xfff2d6), new THREE.Color(0xff9a5a), l.dorado)
    ;(this.estrellas.material as THREE.PointsMaterial).opacity = Math.max(0, (l.oscuridad / 0.78 - 0.5) * 2)
    for (const f of this.faroles) (f.material as THREE.MeshBasicMaterial).color.set(l.faroles ? 0xffe680 : 0x8d8670)
    for (const b of this.brillos) if (!b.userData.siempre) b.material.opacity = l.faroles ? 0.75 : 0
    for (const lf of this.luzFuego) lf.userData.base = 6 + (1 - k) * 18
  }

  setAbierto(abierto: boolean) {
    if (this.puerta) this.puerta.visible = !abierto
    const s0 = this.suelo[0].image as HTMLCanvasElement, s1 = this.suelo[1].image as HTMLCanvasElement
    dibujarSuelo(s0.getContext('2d')!, 0, abierto); dibujarSuelo(s1.getContext('2d')!, 1, abierto)
    this.suelo[0].needsUpdate = true; this.suelo[1].needsUpdate = true
  }

  // ------------------------------------------------------------------ personajes
  private textura(a: AvatarConfig | undefined, rango: Rango, modo: 'frente' | 'espalda' | 'saluda') {
    const clave = `${modo}|${rango}|${JSON.stringify(a ?? {})}`
    let t = this.texCache.get(clave)
    if (!t) {
      const c = lienzo(PX_W, PX_H), ctx = c.getContext('2d')!, o = opcionesDe(a ?? {}, rango)
      if (modo === 'espalda') dibujarAvatarEspalda(ctx, o)
      else dibujarAvatar(ctx, { ...o, brazoArriba: modo === 'saluda' })
      t = texPixel(c)
      if (this.texCache.size > 600) { for (const v of this.texCache.values()) v.dispose(); this.texCache.clear() }
      this.texCache.set(clave, t)
    }
    return t
  }
  private nuevoPj(e: { avatar?: AvatarConfig; rango: Rango }, x: number, z: number): Pj {
    const clave = `${e.rango}|${JSON.stringify(e.avatar ?? {})}`
    const frente = this.textura(e.avatar, e.rango, 'frente')
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: frente, transparent: true, alphaTest: 0.5 }))
    sprite.center.set(0.5, 0.06); sprite.scale.set(ANCHO_PJ, ALTO_PJ, 1)
    const sombra = new THREE.Mesh(this.sombraGeo, this.sombraMat); sombra.rotation.x = -Math.PI / 2
    this.scene.add(sprite, sombra)
    return { sprite, sombra, frente, espalda: this.textura(e.avatar, e.rango, 'espalda'), saluda: this.textura(e.avatar, e.rango, 'saluda'), clave, x, z, dirX: 0, dirZ: 1, t: Math.random() * 10 }
  }
  private quitarPj(p: Pj) { this.scene.remove(p.sprite, p.sombra); p.sprite.material.dispose() }

  /** Pone a los jugadores donde están (se llama en cada cuadro). */
  entes(lista: Ente3D[], yo: string | null) {
    this.yoId = yo
    const vistos = new Set<string>()
    for (const e of lista) {
      vistos.add(e.id)
      let p = this.pjs.get(e.id)
      const clave = `${e.rango}|${JSON.stringify(e.avatar ?? {})}`
      if (p && p.clave !== clave) { this.quitarPj(p); p = undefined }
      if (!p) { p = this.nuevoPj(e, e.x, e.y); p.sprite.userData.id = e.id; this.pjs.set(e.id, p) }
      const dx = e.x - p.x, dz = e.y - p.z
      if (e.mira) { const n = Math.hypot(e.mira.x, e.mira.y) || 1; p.dirX = e.mira.x / n; p.dirZ = e.mira.y / n }
      else if (Math.abs(dx) + Math.abs(dz) > 0.002) { const n = Math.hypot(dx, dz); p.dirX = dx / n; p.dirZ = dz / n }
      p.x = e.x; p.z = e.y
      const visible = e.visible !== false && !(this.vistaV === 'primera' && e.id === yo && !this.vuelo)
      p.sprite.visible = visible; p.sombra.visible = visible
      const bote = (e.camina ? Math.abs(Math.sin(this.reloj * 11 + p.t)) * 0.07 : 0) + (e.alto ?? 0)
      p.sprite.position.set(e.x, bote, e.y)
      p.sombra.position.set(e.x, 0.015, e.y)
      p.sombra.scale.setScalar(1 - Math.min(0.5, (e.alto ?? 0) * 0.5))
      // ¿la cámara lo ve de frente o de espaldas?
      const vx = this.cam.position.x - e.x, vz = this.cam.position.z - e.y
      const deFrente = vx * p.dirX + vz * p.dirZ >= -0.15 * Math.hypot(vx, vz)
      p.sprite.material.map = e.saluda && deFrente ? p.saluda : deFrente ? p.frente : p.espalda
    }
    for (const [id, p] of this.pjs) if (!vistos.has(id)) { this.quitarPj(p); this.pjs.delete(id) }
  }

  /** Equipo del programa sobre el escenario: quien habla al centro detrás del atril, los demás atrás. */
  setEscenario(gente: { id: string; avatar?: AvatarConfig; rango: Rango }[], orador: string | null) {
    const esc = OBJETOS.find(o => o.tipo === 'escenario')!
    const cx = esc.x + esc.w / 2, zf = esc.y + esc.h + 0.2
    const vistos = new Set<string>()
    const otros = gente.filter(g => g.id !== orador)
    const lugares = [-1.7, 1.7, -2.6, 2.6, -0.9, 0.9]
    gente.forEach(g => {
      vistos.add(g.id)
      let p = this.escena.get(g.id)
      if (!p) { p = this.nuevoPj(g, cx, zf); p.sprite.userData.id = g.id; this.escena.set(g.id, p) }
      const k = otros.indexOf(g)
      const x = g.id === orador ? cx : cx + (lugares[k] ?? 0), z = g.id === orador ? zf - 0.95 : esc.y + 0.75
      p.x = x; p.z = z; p.dirX = 0; p.dirZ = 1
      p.sprite.position.set(x, 0.62, z); p.sombra.position.set(x, 0.635, z)
      p.sprite.visible = k < lugares.length || g.id === orador; p.sombra.visible = p.sprite.visible
    })
    for (const [id, p] of this.escena) if (!vistos.has(id)) { this.quitarPj(p); this.escena.delete(id) }
  }
  /** Quien habla saluda (levanta la mano) mientras dice algo. */
  saludaEnEscenario(ids: Set<string>) { for (const [id, p] of this.escena) p.sprite.material.map = ids.has(id) ? p.saluda : p.frente }

  // ------------------------------------------------------------------ cámara
  get vista() { return this.vistaV }
  get yaw() { return this.yawV }
  setVista(v: Vista) {
    this.vistaV = v
    if (v !== 'primera') { this.pitchO = PRESETS[v].pitch; this.distO = PRESETS[v].dist }
    else this.pitchO = -0.05
    this.aplicarLente()
  }
  /** Arrastrar: gira alrededor (o mira alrededor en primera persona / desde tu asiento). */
  rotar(dx: number, dy: number) {
    this.yawO -= dx * 0.008
    const enOjos = this.vistaV === 'primera' || this.ojos
    this.pitchO = enOjos ? Math.max(-0.7, Math.min(0.6, this.pitchO + dy * 0.005)) : Math.max(0.12, Math.min(1.45, this.pitchO + dy * 0.005))
  }
  girar(paso: number) { this.yawO += paso }
  zoom(f: number) { if (this.vistaV !== 'primera' && !this.ojos) this.distO = Math.max(3.5, Math.min(55, this.distO * f)) }

  /** Mirar desde un punto (tu asiento en el culto) hacia otro (el escenario), con un vuelo de cámara. */
  mirarDesde(ojo: { x: number; y: number } | null, hacia?: { x: number; y: number; alto: number }, fin?: () => void) {
    const dePos = this.cam.position.clone(), deMira = this.miraActual.clone()
    if (ojo && hacia) {
      const mira = new THREE.Vector3(hacia.x, hacia.alto, hacia.y)
      this.ojos = { x: ojo.x, z: ojo.y, mira }
      const d = mira.clone().sub(new THREE.Vector3(ojo.x, 1.15, ojo.y))
      this.yawO = this.yawV = Math.atan2(-d.x, -d.z)
      this.pitchO = this.pitchV = Math.atan2(d.y, Math.hypot(d.x, d.z))
      this.aplicarLente()
      this.vuelo = { t: 0, dur: 1.25, dePos, deMira, aPos: new THREE.Vector3(ojo.x, 1.15, ojo.y), aMira: mira, fin }
    } else {
      this.ojos = null
      this.setVista(this.vistaV)
      const aMira = this.foco.clone().setY(0.8)
      this.vuelo = { t: 0, dur: 0.9, dePos, deMira, aPos: this.posOrbita(aMira), aMira, fin }
    }
  }
  /** Con paneles abajo (el culto en el celular), lo que miras sube en la pantalla. */
  setCentro(c: number) { this.centro = Math.max(0.2, Math.min(0.5, c)); this.aplicarLente() }
  private aplicarLente() {
    const fovBase = this.ojos ? 58 : this.vistaV === 'primera' ? 62 : PRESETS[this.vistaV].fov
    // En pantallas angostas (celular vertical) se abre el ángulo para ver todo el escenario
    const minHoriz = this.ojos || this.vistaV === 'primera' ? 62 : 0
    const asp = this.ancho / Math.max(1, this.alto)
    const vNecesario = minHoriz ? 2 * Math.atan(Math.tan((minHoriz * Math.PI) / 360) / asp) * 180 / Math.PI : 0
    this.cam.fov = Math.min(84, Math.max(fovBase, vNecesario))
    const F = this.alto * 2 * (1 - this.centro)
    if (this.centro < 0.5) this.cam.setViewOffset(this.ancho, F, 0, F - this.alto, this.ancho, this.alto)
    else this.cam.clearViewOffset()
    this.cam.aspect = this.ancho / Math.max(1, this.centro < 0.5 ? F : this.alto)
    this.cam.updateProjectionMatrix()
  }

  /** Acercarse a un punto (por ejemplo, la puerta de tu carpa) antes de entrar. */
  acercarA(x: number, y: number, fin: () => void) {
    const mira = new THREE.Vector3(x, 0.5, y)
    const pos = new THREE.Vector3(x - Math.sin(this.yawV) * -1.6, 1.0, y + Math.cos(this.yawV) * 1.6)
    this.vuelo = { t: 0, dur: 0.75, dePos: this.cam.position.clone(), deMira: this.miraActual.clone(), aPos: pos, aMira: mira, fin }
  }
  private posOrbita(f: THREE.Vector3) {
    return new THREE.Vector3(f.x + Math.sin(this.yawV) * Math.cos(this.pitchV) * this.distV, f.y + Math.sin(this.pitchV) * this.distV, f.z + Math.cos(this.yawV) * Math.cos(this.pitchV) * this.distV)
  }

  // ------------------------------------------------------------------ tamaño, cuadro y selección
  redimensionar(w: number, h: number, nitido = false) {
    this.ancho = w; this.alto = h
    this.k = nitido ? 1 : Math.max(1, Math.round(h / 400))
    this.renderer.setPixelRatio(nitido ? Math.min(2, window.devicePixelRatio || 1) : 1 / this.k)
    this.renderer.setSize(w, h, false)
    this.aplicarLente()
  }

  /** Un cuadro: sigue a `foco`, anima banderas, fuego y agua, y dibuja. */
  cuadro(dt: number, foco: { x: number; y: number }) {
    this.reloj += dt
    const t = this.reloj
    // agua y fuego (dos cuadros, como en el mapa)
    const f = Math.floor(t / 0.65) % 2
    if (this.sueloMat.map !== this.suelo[f]) { this.sueloMat.map = this.suelo[f]; this.sueloMat.needsUpdate = true }
    for (const fu of this.fuegos) {
      fu.s.material.map = this.texFuego[Math.floor(t * 6 + fu.fase) % 2]
      fu.s.scale.y = fu.base * (1.15 + Math.sin(t * 9 + fu.fase) * 0.08)
    }
    for (const l of this.luzFuego) l.intensity = (l.userData.base ?? 6) * (0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07)
    if (this.barco) { this.barco.position.y = Math.sin(t * 1.4) * 0.06; this.barco.rotation.z = Math.sin(t * 1.1) * 0.025 }
    // banderas: ondean y suben o bajan con la ceremonia
    for (const b of this.banderas) {
      const g = b.malla.geometry as THREE.PlaneGeometry, pos = g.attributes.position as THREE.BufferAttribute, base = g.userData.base as Float32Array
      for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.setZ(i, Math.sin(t * 5 + x * 4 + b.fase) * 0.09 * x) }
      pos.needsUpdate = true
      const y = b.rango ? b.base + b.rango * this.altura : b.base + 1
      b.malla.position.set(b.poste.x, b.rango ? y : b.poste.y, b.poste.z)
    }
    // cámara
    const s = 1 - Math.pow(0.0015, dt)
    this.foco.lerp(new THREE.Vector3(foco.x, 0, foco.y), 1 - Math.pow(0.002, dt))
    let ang = this.yawO - this.yawV; ang = Math.atan2(Math.sin(ang), Math.cos(ang))
    this.yawV += ang * s; this.pitchV += (this.pitchO - this.pitchV) * s; this.distV += (this.distO - this.distV) * s
    let pos: THREE.Vector3, mira: THREE.Vector3
    const dir = (yaw: number, pitch: number) => new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
    if (this.ojos) { pos = new THREE.Vector3(this.ojos.x, 1.15, this.ojos.z); mira = pos.clone().add(dir(this.yawV, this.pitchV)) }
    else if (this.vistaV === 'primera') { pos = new THREE.Vector3(this.foco.x, 1.12, this.foco.z); mira = pos.clone().add(dir(this.yawV, this.pitchV)) }
    else { mira = this.foco.clone().setY(0.8); pos = this.posOrbita(mira) }
    if (this.vuelo) {
      const v = this.vuelo
      v.t += dt
      const k = Math.min(1, v.t / v.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      pos = v.dePos.clone().lerp(v.aPos, e).add(new THREE.Vector3(0, Math.sin(k * Math.PI) * (v.dePos.distanceTo(v.aPos) * 0.12), 0))
      mira = v.deMira.clone().lerp(v.aMira, e)
      if (k >= 1) { this.vuelo = null; v.fin?.() }
    }
    this.cam.position.copy(pos); this.cam.lookAt(mira); this.miraActual.copy(mira)
    const fog = this.scene.fog as THREE.Fog
    const lejos = this.ojos || this.vistaV === 'primera' ? 26 : this.distV
    fog.near = lejos * 1.3 + 8; fog.far = lejos * 3.2 + 30
    this.sol.position.set(this.foco.x - 25, 45, this.foco.z + 18); this.sol.target.position.copy(this.foco)
    this.renderer.render(this.scene, this.cam)
  }

  /** Qué hay bajo el dedo: un personaje o un punto del suelo (en baldosas). */
  elegir(cx: number, cy: number, rect: DOMRect): Eleccion {
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1)
    this.ray.setFromCamera(ndc, this.cam)
    const sprites = [...this.pjs.values(), ...this.escena.values()].map(p => p.sprite).filter(s => s.visible && s.userData.id !== this.yoId)
    const h = this.ray.intersectObjects(sprites, false)[0]
    if (h) return { tipo: 'ente', id: h.object.userData.id }
    const g = this.ray.intersectObjects([this.estatico, this.dinamico], true).find(i => i.object.type !== 'Sprite' && i.object.type !== 'Points')
    if (!g) return null
    return { tipo: 'punto', x: g.point.x, y: g.point.z }
  }

  /** Dónde cae en pantalla (pixeles CSS) un punto del mundo; null si está detrás de la cámara o fuera. */
  proyectar(x: number, y: number, alto: number) {
    const v = new THREE.Vector3(x, alto, y).project(this.cam)
    if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) return null
    const d = this.cam.position.distanceTo(new THREE.Vector3(x, alto, y))
    return { x: (v.x + 1) / 2 * this.ancho, y: (1 - v.y) / 2 * this.alto, d }
  }
  posicionEscena(id: string) { const p = this.escena.get(id); return p ? { x: p.x, y: p.z } : null }

  private liberar(o: THREE.Object3D) {
    o.traverse(n => {
      const m = n as THREE.Mesh
      m.geometry?.dispose?.()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) { (x as THREE.MeshLambertMaterial).map?.dispose(); x.dispose() }
    })
  }
  dispose() {
    for (const p of this.pjs.values()) this.quitarPj(p)
    for (const p of this.escena.values()) this.quitarPj(p)
    this.liberar(this.scene)
    for (const t of this.texCache.values()) t.dispose()
    this.renderer.dispose()
  }
}
