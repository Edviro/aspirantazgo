import { useId } from 'react'
import type { ClaseId, Pieza } from '../../domain/tipos'
import { COLOR_CLASE, ORDEN_CLASES } from '../../domain/tipos'

/**
 * Dibujo vectorial de cada pieza del uniforme, en CENTÍMETROS y centrado en (0,0).
 * Así una misma pieza se ve igual en la bandeja, en el tablero y en el inspector.
 */
const ROJO = '#D7242F', AMARILLO = '#FFC20E', NAVY = '#1F2A54', VERDE = '#0E4B45', CAQUI = '#D9C49A', BLANCO = '#FAF8F2'
const FUENTE = "'Archivo Black', 'Arial Black', sans-serif"

export function C3({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <path d="M-1.6,-1.25 L1.6,-1.25 L0,1.55 Z" fill={ROJO} stroke={AMARILLO} strokeWidth={0.16} strokeLinejoin="round" />
      <path d="M-0.75,-0.85 Q0,-1.05 0.75,-0.85 Q0.7,0.05 0,0.45 Q-0.7,0.05 -0.75,-0.85 Z" fill="#fff" stroke={AMARILLO} strokeWidth={0.06} />
      <path d="M-0.55,-0.05 L0.95,-0.75" stroke={NAVY} strokeWidth={0.13} strokeLinecap="round" />
      <path d="M-0.5,-0.32 L-0.36,0.18" stroke={NAVY} strokeWidth={0.12} />
    </g>
  )
}

function C5({ s = 1, color = AMARILLO }: { s?: number; color?: string }) {
  return (
    <g transform={`scale(${s})`}>
      <path d="M-0.55,-0.45 L0.55,-0.45 L0,0.55 Z" fill="none" stroke={color} strokeWidth={0.1} strokeLinejoin="round" />
      <path d="M-0.18,-0.05 L0.3,-0.3" stroke={color} strokeWidth={0.07} />
    </g>
  )
}

function Estrella({ r, fill, stroke, sw }: { r: number; fill: string; stroke?: string; sw?: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    return `${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)}`
  }).join(' ')
  return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
}

const texto = (t: string, size: number, fill: string, y = 0, extra: Record<string, unknown> = {}) => (
  <text x={0} y={y} fontSize={size} fill={fill} fontFamily={FUENTE} textAnchor="middle" dominantBaseline="central" {...extra}>{t}</text>
)

function ajustar(t: string, max: number) {
  const s = (t || '').toUpperCase()
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export function PiezaSVG({ p }: { p: Pieza }) {
  const uid = useId().replace(/:/g, '')
  switch (p.tipo) {
    case 'tira_club': {
      const t = ajustar(p.texto || 'NOMBRE DEL CLUB', 22)
      return (
        <g>
          <path d="M-5,2.45 Q0,-3.35 5,2.45 L3.75,2.5 Q0,-1.15 -3.75,2.5 Z" fill={ROJO} stroke={AMARILLO} strokeWidth={0.18} strokeLinejoin="round" />
          <path id={'arc' + uid} d="M-4.55,2.25 Q0,-2.15 4.55,2.25" fill="none" />
          <text fontSize={t.length > 14 ? 0.58 : 0.72} fill={AMARILLO} fontFamily={FUENTE} dominantBaseline="central">
            <textPath href={'#arc' + uid} startOffset="50%" textAnchor="middle">{t}</textPath>
          </text>
        </g>
      )
    }
    case 'tira_cargo':
      return (
        <g>
          <rect x={-3.75} y={-1} width={7.5} height={2} rx={0.25} fill={ROJO} stroke={AMARILLO} strokeWidth={0.16} />
          {texto(ajustar(p.texto || 'CARGO', 12), 0.95, AMARILLO)}
        </g>
      )
    case 'c1':
      return <image href={`${import.meta.env.BASE_URL}assets/emblema-c1.webp`} x={-3.6} y={-3.75} width={7.2} height={7.5} />
    case 'estrella':
      return (
        <g>
          <Estrella r={1.55} fill={ROJO} stroke={AMARILLO} sw={0.16} />
          {texto(String(p.nivel ?? 1), 0.75, AMARILLO, 0.15)}
        </g>
      )
    case 'campo':
      return (
        <g>
          <clipPath id={'cp' + uid}><path d="M-3.75,2.75 L-3.75,-0.6 Q-3.75,-2.75 0,-2.75 Q3.75,-2.75 3.75,-0.6 L3.75,2.75 Z" /></clipPath>
          <g clipPath={`url(#cp${uid})`}>
            <rect x={-3.75} y={-2.75} width={7.5} height={5.5} fill="#B9BEC4" />
            <rect x={-3.75} y={-2.75} width={3.75} height={2.75} fill="#5E646B" />
            <rect x={0} y={0} width={3.75} height={2.75} fill="#5E646B" />
            <rect x={0} y={-2.75} width={3.75} height={2.75} fill="#F2F3F4" />
          </g>
          <path d="M-3.75,2.75 L-3.75,-0.6 Q-3.75,-2.75 0,-2.75 Q3.75,-2.75 3.75,-0.6 L3.75,2.75 Z" fill="none" stroke={VERDE} strokeWidth={0.35} />
        </g>
      )
    case 'c2':
    case 'c2_banda': {
      const sx = p.w / 6.4, sy = p.h / 5
      return (
        <g transform={`scale(${sx},${sy})`}>
          <ellipse rx={3.05} ry={2.35} fill={p.fondo === 'blanco' ? BLANCO : CAQUI} stroke={VERDE} strokeWidth={0.42} />
          <ellipse rx={2.55} ry={1.85} fill="none" stroke={AMARILLO} strokeWidth={0.08} />
          <path d="M-2.5,0 L2.5,0 M0,-1.8 L0,1.8" stroke={AMARILLO} strokeWidth={0.05} opacity={0.6} />
          <C3 s={0.82} />
        </g>
      )
    }
    case 'divisa': {
      const h = p.h, w = 4
      const fondo = p.divisa === 'conquistador' ? CAQUI : BLANCO
      const n = Math.min(6, Math.max(1, p.nivel ?? 1))
      const base = h / 2 - 0.55
      return (
        <g>
          <path d={`M${-w / 2},${-h / 2} L${w / 2},${-h / 2} L${w / 2},${h / 2 - 1.3} L0,${h / 2} L${-w / 2},${h / 2 - 1.3} Z`}
            fill={fondo} stroke={VERDE} strokeWidth={0.2} strokeLinejoin="round" />
          {ORDEN_CLASES.slice(0, n).map((c, i) => {
            const yb = base - i * 0.48
            return <path key={c} d={`M-1.62,${yb - 1.05} L0,${yb} L1.62,${yb - 1.05}`} fill="none" stroke={COLOR_CLASE[c]} strokeWidth={0.34} strokeLinejoin="miter" />
          })}
          {p.divisa === 'guia_mayor' && <g transform={`translate(0,${-h / 2 + 1.55})`}><Estrella r={1.15} fill={AMARILLO} stroke="#C99A00" sw={0.06} /></g>}
        </g>
      )
    }
    case 'boton_clase':
      return (
        <g>
          <circle r={0.8} fill={COLOR_CLASE[p.clase as ClaseId]} stroke="#E8B10C" strokeWidth={0.13} />
          <circle r={0.62} fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={0.05} />
          <C5 s={1} />
        </g>
      )
    case 'barra_avanzada': {
      const c = COLOR_CLASE[p.clase as ClaseId]
      return (
        <g>
          <rect x={-1.2} y={-0.4} width={0.8} height={0.8} fill={c} />
          <rect x={-0.4} y={-0.4} width={0.8} height={0.8} fill={AMARILLO} />
          <rect x={0.4} y={-0.4} width={0.8} height={0.8} fill={c} />
          <rect x={-1.2} y={-0.4} width={2.4} height={0.8} fill="none" stroke="#B8860B" strokeWidth={0.07} />
        </g>
      )
    }
    case 'boton_liderazgo': {
      const l = p.liderazgo
      const fondo = l === 'gm' ? '#1B2A6B' : l === 'master' ? '#E9EDF2' : '#F2C230'
      const borde = l === 'master' ? '#9DA6B1' : '#C99A00'
      return (
        <g>
          <circle r={0.85} fill={fondo} stroke={borde} strokeWidth={0.14} />
          {l === 'gm' ? (
            <g>
              <circle r={0.45} fill="#2E8B57" stroke={AMARILLO} strokeWidth={0.05} />
              {[-0.55, -0.25, 0.25, 0.55].map(x => <circle key={x} cx={x} cy={-0.62} r={0.06} fill={AMARILLO} />)}
            </g>
          ) : (
            <g>
              <path d="M-0.55,-0.4 L0.55,-0.4 L0,0.55 Z" fill={l === 'master' ? ROJO : NAVY} stroke={AMARILLO} strokeWidth={0.05} />
              <g transform="translate(0,-0.05)"><Estrella r={0.32} fill={l === 'master' ? '#C9D1DB' : AMARILLO} stroke="#555" sw={0.02} /></g>
            </g>
          )}
        </g>
      )
    }
    case 'excelencia':
      return (
        <g>
          {['#1F4FBF', '#fff', ROJO].map((c, i) => <rect key={'l' + i} x={-1.8 + i * 0.42} y={-0.45} width={0.42} height={0.9} fill={c} />)}
          <rect x={-0.54} y={-0.45} width={1.08} height={0.9} fill={AMARILLO} />
          {[ROJO, '#fff', '#1F4FBF'].map((c, i) => <rect key={'r' + i} x={0.54 + i * 0.42} y={-0.45} width={0.42} height={0.9} fill={c} />)}
          <rect x={-1.8} y={-0.45} width={3.6} height={0.9} fill="none" stroke="#B8860B" strokeWidth={0.07} />
        </g>
      )
    case 'tira_nombre':
      return (
        <g>
          <rect x={-4} y={-0.8} width={8} height={1.6} rx={0.15} fill={p.fondo === 'blanco' ? '#fff' : CAQUI} stroke={VERDE} strokeWidth={0.2} />
          {texto(ajustar(p.texto || 'NOMBRE', 14), 0.82, '#111')}
        </g>
      )
    case 'funcion':
      return (
        <g>
          <rect x={-3.25} y={-0.7} width={6.5} height={1.4} rx={0.12} fill={ROJO} />
          <g transform="translate(-2.5,0) scale(0.9)"><C5 color="#fff" /></g>
          <g transform="translate(0.5,0)">{texto(ajustar(p.texto || 'FUNCIÓN', 10), 0.72, '#fff')}</g>
        </g>
      )
    case 'bautismo':
      return (
        <g>
          <path d="M-0.95,-0.85 L0.95,-0.85 Q1.15,-0.85 1.02,-0.62 L0.13,0.92 Q0,1.12 -0.13,0.92 L-1.02,-0.62 Q-1.15,-0.85 -0.95,-0.85 Z"
            fill="#111" stroke={AMARILLO} strokeWidth={0.1} />
          <path d="M-0.42,-0.42 Q0,-0.62 0.42,-0.42 M-0.32,-0.12 Q0,-0.3 0.32,-0.12 M-0.2,0.18 Q0,0.04 0.2,0.18" fill="none" stroke={AMARILLO} strokeWidth={0.08} strokeLinecap="round" />
        </g>
      )
    case 'panoleta': {
      const gm = p.liderazgo === 'gm'
      const borde = gm ? ROJO : '#D99A00'
      return (
        <g>
          <path d="M-7,-5 Q-4.5,-1.5 -0.9,0.6 L0.9,0.6 Q4.5,-1.5 7,-5 L5.4,-5 Q3.3,-2.6 0,-1.1 Q-3.3,-2.6 -5.4,-5 Z" fill={AMARILLO} stroke={borde} strokeWidth={gm ? 0.3 : 0.12} strokeLinejoin="round" />
          <path d="M-0.95,0.9 L-2.1,4.9 L-0.2,4.3 Z" fill={AMARILLO} stroke={borde} strokeWidth={gm ? 0.25 : 0.1} strokeLinejoin="round" />
          <path d="M0.95,0.9 L2.1,4.9 L0.2,4.3 Z" fill="#F0B400" stroke={borde} strokeWidth={gm ? 0.25 : 0.1} strokeLinejoin="round" />
          <rect x={-1.05} y={-0.25} width={2.1} height={1.55} rx={0.3} fill="#C9A227" stroke="#7A5C00" strokeWidth={0.08} />
          <g transform="translate(0,0.5) scale(0.42)"><C3 /></g>
        </g>
      )
    }
    case 'correa':
      return (
        <g>
          <rect x={-17} y={-1.3} width={34} height={2.6} rx={0.2} fill="#0B3B36" />
          <rect x={-17} y={-1.1} width={34} height={2.2} fill="none" stroke="#1C5C55" strokeWidth={0.06} strokeDasharray="0.3 0.25" />
          <rect x={-2.1} y={-1.55} width={4.2} height={3.1} rx={0.3} fill="#C9A227" stroke="#7A5C00" strokeWidth={0.1} />
          <g transform="scale(0.55)"><C3 /></g>
        </g>
      )
    case 'bandera_pais':
      return (
        <g>
          <rect x={-1.8} y={-1.2} width={1.2} height={2.4} fill={ROJO} />
          <rect x={-0.6} y={-1.2} width={1.2} height={2.4} fill="#fff" />
          <rect x={0.6} y={-1.2} width={1.2} height={2.4} fill={ROJO} />
          <rect x={-1.8} y={-1.2} width={3.6} height={2.4} fill="none" stroke="#222" strokeWidth={0.06} />
        </g>
      )
    case 'especialidad': {
      const n = p.nivel ?? 0
      if (n === 0) return <image href={`${import.meta.env.BASE_URL}assets/esp-orientacion.webp`} x={-1.7} y={-1.6} width={3.4} height={3.2} />
      const colores = ['#1E9A4B', '#1F5FD1', '#E07B00', '#7A1F3D', '#D7242F']
      const c = colores[n % colores.length]
      return (
        <g>
          <circle r={1.6} fill="#fff" stroke={c} strokeWidth={0.32} />
          <circle r={1.25} fill={c} opacity={0.12} />
          {n % 3 === 1 && <path d="M0,-0.9 Q0.9,-0.2 0,0.9 Q-0.9,-0.2 0,-0.9 Z M0,-0.6 L0,0.7" fill={c} stroke="#fff" strokeWidth={0.06} />}
          {n % 3 === 2 && <path d="M-0.9,0.6 L0,-0.8 L0.9,0.6 Z M-0.4,0.6 L0,-0.1 L0.4,0.6" fill={c} stroke="#fff" strokeWidth={0.06} />}
          {n % 3 === 0 && <g><circle r={0.75} fill="none" stroke={c} strokeWidth={0.22} /><path d="M-0.3,0.35 Q0,-0.6 0.35,0.2" fill="none" stroke={c} strokeWidth={0.18} /></g>}
        </g>
      )
    }
  }
}

/** Mini SVG autónomo para la bandeja (escala para que todo se lea bien). */
export function PiezaIcono({ p, size = 64 }: { p: Pieza; size?: number }) {
  const m = Math.max(p.w, p.h) * 0.08 + 0.2
  return (
    <svg viewBox={`${-p.w / 2 - m} ${-p.h / 2 - m} ${p.w + 2 * m} ${p.h + 2 * m}`} width={size} height={size} style={{ overflow: 'visible' }}>
      <PiezaSVG p={p} />
    </svg>
  )
}

export function nombrePieza(p: Pieza): string {
  const clase: Record<ClaseId, string> = { amigo: 'Amigo', companero: 'Compañero', explorador: 'Explorador', pionero: 'Pionero', excursionista: 'Excursionista', guia: 'Guía' }
  switch (p.tipo) {
    case 'tira_club': return 'Tira del club'
    case 'tira_cargo': return 'Tira de cargo'
    case 'c1': return 'Emblema C1'
    case 'estrella': return 'Estrella de servicio'
    case 'campo': return 'Emblema del Campo'
    case 'c2': return 'Emblema C2'
    case 'c2_banda': return 'Emblema C2'
    case 'divisa': return p.divisa === 'guia_mayor' ? 'Divisa de Guía Mayor' : p.divisa === 'lider' ? 'Divisa blanca sin estrella' : 'Divisa de clases'
    case 'boton_clase': return 'Distintivo ' + clase[p.clase as ClaseId]
    case 'barra_avanzada': return 'Avanzada ' + clase[p.clase as ClaseId]
    case 'boton_liderazgo': return p.liderazgo === 'gm' ? 'Botón Guía Mayor' : p.liderazgo === 'master' ? 'Botón GM Máster' : 'Botón Máster Avanzado'
    case 'excelencia': return 'Insignia de excelencia'
    case 'tira_nombre': return 'Tira con el nombre'
    case 'funcion': return 'Distintivo de función'
    case 'bautismo': return 'Distintivo de bautismo'
    case 'panoleta': return p.liderazgo === 'gm' ? 'Pañoleta de Guía Mayor' : 'Pañoleta'
    case 'correa': return 'Correa'
    case 'bandera_pais': return 'Bandera del país'
    case 'especialidad': return 'Especialidad'
  }
}
