import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { PixelAvatar } from '../pixel/PixelAvatar'

/** Rectángulo en pixeles lógicos del barco (32 × 27). */
type R = [number, number, number, number, string]

const TINTA = '#1E140C', MADERA = '#8a5a2e', MADERA_O = '#5e3a1a', MADERA_C = '#a8733d', VELA = '#FFF7E3', VELA_S = '#E7DCC0'
const AZUL = '#1F4FB8', ORO = '#F2B90F'

/** Mástil, vela mayor y foque (capa de atrás: el avatar queda delante de las velas). */
function velas(): R[] {
  const r: R[] = [[15, 0, 1, 21, '#4a3020']]
  // Vela mayor: crece hacia abajo, con una franja azul royal y borde de tinta
  for (let i = 0; i < 13; i++) {
    const y = 6 + i, w = 1 + Math.floor(i * 0.85)
    r.push([16, y, w + 1, 1, TINTA])
    r.push([16, y, w, 1, i === 6 || i === 7 ? AZUL : i > 9 ? VELA_S : VELA])
  }
  r.push([16, 19, 12, 1, TINTA])
  // Foque
  for (let i = 0; i < 11; i++) {
    const y = 8 + i, w = 1 + Math.floor(i * 0.75)
    r.push([14 - w, y, w + 1, 1, TINTA])
    r.push([15 - w, y, w, 1, i > 7 ? VELA_S : VELA])
  }
  r.push([6, 19, 9, 1, TINTA])
  return r
}

/** Casco (capa de adelante). */
function casco(): R[] {
  return [
    [1, 20, 30, 1, TINTA],
    [1, 21, 30, 1, MADERA_C], [0, 21, 1, 1, TINTA], [31, 21, 1, 1, TINTA],
    [1, 22, 30, 1, ORO], [0, 22, 1, 1, TINTA], [31, 22, 1, 1, TINTA],
    [2, 23, 28, 1, MADERA], [1, 23, 1, 1, TINTA], [30, 23, 1, 1, TINTA],
    [3, 24, 26, 1, MADERA_O], [2, 24, 1, 1, TINTA], [29, 24, 1, 1, TINTA],
    [5, 25, 22, 1, MADERA], [3, 25, 2, 1, TINTA], [27, 25, 2, 1, TINTA],
    [5, 26, 22, 1, TINTA],
    // ojo de buey
    [22, 23, 2, 2, '#9fd3ff'], [21, 23, 1, 2, TINTA], [24, 23, 1, 2, TINTA],
  ]
}

const VELAS = velas(), CASCO = casco()
const svg = (rs: R[], alto: number) => (
  <svg viewBox={`0 0 32 ${alto}`} width="100%" height="100%" shapeRendering="crispEdges" aria-hidden>
    {rs.map(([x, y, w, h, c], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={c} />)}
  </svg>
)

/** Bandera de Conquistadores: azul royal arriba a la izquierda y abajo a la derecha, blanco en las otras dos, C1 al centro. */
export function BanderaConquis({ className = '' }: { className?: string }) {
  return (
    <span className={`bandera-conquis ${className}`} aria-hidden>
      <img src={`${import.meta.env.BASE_URL}assets/emblema-c1.webp`} alt="" draggable={false} />
    </span>
  )
}

/**
 * Velero visto de lado, con la bandera de Conquistadores en el mástil y tu avatar a bordo.
 * `px` es el tamaño de cada pixel del dibujo (el barco mide 32 × 27 pixeles).
 */
export function VeleroLado({ avatar, rango, px = 6 }: { avatar?: AvatarConfig | null; rango?: Rango; px?: number }) {
  return (
    <div className="velero" style={{ width: 32 * px, height: 27 * px, ['--px' as string]: `${px}px` }}>
      <div className="velero-capa">{svg(VELAS, 27)}</div>
      <BanderaConquis className="velero-bandera" />
      {avatar && <div className="velero-avatar"><PixelAvatar a={avatar} rango={rango} animo="saluda" alto={Math.round(px * 13)} /></div>}
      <div className="velero-capa">{svg(CASCO, 27)}</div>
    </div>
  )
}

/** Barquito visto desde arriba para el mapa de campamentos (mira a la derecha; se rota con CSS). */
const ARRIBA = [
  '..kkkkkkkkk....',
  '.kmmmmmmmmmkk..',
  'kmmwwwwwwwmmmkk',
  'kmmmmmmbwwwwmmk',
  'kmmwwwwwwwmmmkk',
  '.kmmmmmmmmmkk..',
  '..kkkkkkkkk....',
]
const COL_ARRIBA: Record<string, string> = { k: TINTA, m: MADERA, w: VELA, b: AZUL }
export function BarcoArriba() {
  return (
    <svg viewBox="0 0 15 7" width="100%" height="100%" shapeRendering="crispEdges" aria-hidden>
      {ARRIBA.flatMap((f, y) => [...f].map((ch, x) => ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COL_ARRIBA[ch]} />))}
    </svg>
  )
}
