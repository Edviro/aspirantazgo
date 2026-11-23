import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ALTO, ANCHO, OBJETOS, PARCELAS, Suelo, suelo } from '../../../domain/plaza'

/** Lo que el radar necesita saber en cada cuadro (sin re-renderizar React). */
export interface DatosRadar {
  yo: { x: number; y: number }
  /** Ángulo de la cámara 3D (0 en 2D): el radar gira para que "arriba" sea hacia donde miras, como en GTA. */
  giro: number
  otros: { x: number; y: number; mio: boolean }[]
}
export interface RadarRef { pintar(d: DatosRadar): void }

const ESC = 3 // pixeles por baldosa en el plano base
const COLOR: Record<number, string> = {
  [Suelo.AGUA]: '#1d6fa8', [Suelo.ORO]: '#d9b24a', [Suelo.ROJO]: '#b8473b', [Suelo.PASTO]: '#3f8f4a', [Suelo.PIEDRA]: '#a8a29a',
  [Suelo.CAMINO]: '#d8c08f', [Suelo.MUELLE]: '#8a5a2e', [Suelo.CERCA]: '#6b4a2a', [Suelo.PUERTA]: '#c98d55',
}
const ICONO: Partial<Record<string, { c: string; t: string }>> = {
  escenario: { c: '#F2B90F', t: 'Escenario' }, tienda: { c: '#E8771E', t: 'Tienda' }, reto: { c: '#D7242F', t: 'Reto del día' },
  tablero: { c: '#9b59d0', t: 'Torneos' }, barco: { c: '#ffffff', t: 'Barco a los desafíos' }, consejo: { c: '#ff7a2a', t: 'Fuego del Consejo' },
}

/** Plano base del campamento (se dibuja una vez). Las parcelas se pintan con el color de su club. */
function plano(clubes: Map<number, { nombre: string; color: string }>) {
  const c = document.createElement('canvas')
  c.width = ANCHO * ESC; c.height = ALTO * ESC
  const g = c.getContext('2d')!
  for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO; x++) { g.fillStyle = COLOR[suelo(x, y)] ?? '#3f8f4a'; g.fillRect(x * ESC, y * ESC, ESC, ESC) }
  for (const p of PARCELAS) {
    const club = clubes.get(p.i)
    g.fillStyle = club ? club.color : 'rgba(255,255,255,.18)'
    g.globalAlpha = club ? 0.55 : 1
    g.fillRect(p.x * ESC, p.y * ESC, p.w * ESC, p.h * ESC)
    g.globalAlpha = 1
    g.strokeStyle = 'rgba(30,20,12,.7)'; g.lineWidth = 1; g.strokeRect(p.x * ESC + 0.5, p.y * ESC + 0.5, p.w * ESC - 1, p.h * ESC - 1)
  }
  for (const o of OBJETOS) {
    const ic = ICONO[o.tipo]
    if (!ic) continue
    g.fillStyle = '#1E140C'; g.fillRect((o.x + o.w / 2) * ESC - 4, (o.y + o.h / 2) * ESC - 4, 8, 8)
    g.fillStyle = ic.c; g.fillRect((o.x + o.w / 2) * ESC - 3, (o.y + o.h / 2) * ESC - 3, 6, 6)
  }
  return c
}

/**
 * Radar circular estilo GTA Vice City (abajo a la izquierda): tu flecha al centro, los demás como puntos
 * (verde = tu club) y los campamentos con el color de cada club. Tocarlo abre el mapa grande con nombres.
 */
export const Radar = forwardRef<RadarRef, {
  clubes: Map<number, { nombre: string; color: string }>
  miParcela?: number
  onIr: (x: number, y: number) => void
  compacto: boolean
}>(function Radar({ clubes, miParcela, onIr, compacto }, ref) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const base = useMemo(() => plano(clubes), [clubes])
  const [grande, setGrande] = useState(false)
  const ultimo = useRef<DatosRadar | null>(null)
  const tam = compacto ? 104 : 140

  const pintar = (d: DatosRadar) => {
      ultimo.current = d
      const cv = lienzo.current
      if (!cv) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (cv.width !== tam * dpr) { cv.width = tam * dpr; cv.height = tam * dpr }
      const g = cv.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, tam, tam)
      g.save()
      g.beginPath(); g.arc(tam / 2, tam / 2, tam / 2 - 3, 0, Math.PI * 2); g.clip()
      g.fillStyle = '#1d6fa8'; g.fillRect(0, 0, tam, tam)
      const zoom = 1.25 // ~37 baldosas de ancho visibles
      g.translate(tam / 2, tam / 2); g.rotate(d.giro); g.scale(zoom, zoom)
      g.imageSmoothingEnabled = false
      g.drawImage(base, -d.yo.x * ESC, -d.yo.y * ESC)
      for (const o of d.otros) {
        g.fillStyle = '#1E140C'; g.fillRect((o.x - d.yo.x) * ESC - 2.5, (o.y - d.yo.y) * ESC - 2.5, 5, 5)
        g.fillStyle = o.mio ? '#5CFF7A' : '#7FC8FF'; g.fillRect((o.x - d.yo.x) * ESC - 1.5, (o.y - d.yo.y) * ESC - 1.5, 3, 3)
      }
      g.restore()
      // Tu flecha (siempre apunta arriba: el mapa gira contigo)
      g.save(); g.translate(tam / 2, tam / 2)
      g.fillStyle = '#ffffff'; g.strokeStyle = '#1E140C'; g.lineWidth = 2
      g.beginPath(); g.moveTo(0, -7); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath(); g.stroke(); g.fill()
      g.restore()
      // Norte
      const nx = tam / 2 + Math.sin(-d.giro) * (tam / 2 - 10), ny = tam / 2 - Math.cos(-d.giro) * (tam / 2 - 10)
      g.fillStyle = '#1E140C'; g.beginPath(); g.arc(nx, ny, 7, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#fff'; g.font = 'bold 9px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', nx, ny + 0.5)
  }
  useImperativeHandle(ref, () => ({ pintar }))
  // Si cambian los clubes (o el tamaño), se repinta con lo último
  useEffect(() => { if (ultimo.current) pintar(ultimo.current) }, [base, tam]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button className={`radar ${compacto ? 'compacto' : ''}`} style={{ width: tam, height: tam }} onClick={() => setGrande(true)} aria-label="Mapa del campamento (abrir)">
        <canvas ref={lienzo} style={{ width: tam, height: tam }} aria-hidden />
      </button>
      {grande && <MapaGrande base={base} clubes={clubes} miParcela={miParcela} yo={ultimo.current?.yo} onCerrar={() => setGrande(false)} onIr={(x, y) => { setGrande(false); onIr(x, y) }} />}
    </>
  )
})

/** Mapa completo del campamento con los nombres de cada club y los lugares; tocar un punto te lleva caminando. */
function MapaGrande({ base, clubes, miParcela, yo, onCerrar, onIr }: {
  base: HTMLCanvasElement; clubes: Map<number, { nombre: string; color: string }>; miParcela?: number
  yo?: { x: number; y: number }; onCerrar: () => void; onIr: (x: number, y: number) => void
}) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = lienzo.current
    if (!cv) return
    cv.width = base.width; cv.height = base.height
    const g = cv.getContext('2d')!
    g.imageSmoothingEnabled = false
    g.drawImage(base, 0, 0)
    if (yo) {
      g.fillStyle = '#1E140C'; g.beginPath(); g.arc(yo.x * ESC, yo.y * ESC, 5, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#fff'; g.beginPath(); g.arc(yo.x * ESC, yo.y * ESC, 3.2, 0, Math.PI * 2); g.fill()
    }
  }, [base, yo])
  const tocar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onIr(((e.clientX - r.left) / r.width) * ANCHO, ((e.clientY - r.top) / r.height) * ALTO)
  }
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop mapa-grande" role="dialog" aria-modal="true" aria-label="Mapa del campamento" onClick={e => e.stopPropagation()}>
        <h2>Mapa del campamento</h2>
        <div className="mapa-grande-lienzo">
          <canvas ref={lienzo} onPointerDown={tocar} aria-label="Toca un lugar para ir caminando" />
          {PARCELAS.map(p => {
            const c = clubes.get(p.i)
            return (
              <span key={p.i} className={`mapa-etq ${p.i === miParcela ? 'mio' : ''}`} style={{ left: `${((p.x + p.w / 2) / ANCHO) * 100}%`, top: `${((p.y + p.h / 2) / ALTO) * 100}%` }}>
                {c ? c.nombre : 'Libre'}
              </span>
            )
          })}
        </div>
        <ul className="mapa-leyenda">
          {Object.entries(ICONO).map(([k, v]) => <li key={k}><i style={{ background: v!.c }} />{v!.t}</li>)}
          <li><i className="punto" style={{ background: '#5CFF7A' }} />Tu club</li>
          <li><i className="punto" style={{ background: '#7FC8FF' }} />Otros</li>
        </ul>
        <p className="nota">Toca un lugar del mapa para ir caminando.</p>
      </div>
    </div>
  )
}
