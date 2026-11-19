import type { ReactElement } from 'react'
import type { Pieza } from '../../domain/tipos'
import type { Ilustracion } from '../../domain/quiz'
import { PiezaIcono, PiezaSVG } from './Insignias'
import { asset } from './Comunes'

const TINTA = '#1E140C'

function Camisa({ blanca = false }: { blanca?: boolean }) {
  const tela = blanca ? '#F4F2EC' : '#C9AE78'
  return (
    <svg viewBox="0 0 120 110" width="100%" height="100%" aria-hidden>
      <path d="M38 8 L20 16 L4 44 L20 54 L28 42 L28 104 L92 104 L92 42 L100 54 L116 44 L100 16 L82 8 Q60 20 38 8 Z" fill={tela} stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 8 L52 30 L60 20 L68 30 L82 8" fill={tela} stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 22 L60 104" stroke={TINTA} strokeWidth="2" />
      {[44, 62, 80].map(y => <circle key={y} cx="60" cy={y} r="2.2" fill={TINTA} />)}
      <rect x="34" y="46" width="18" height="16" rx="2" fill="none" stroke={TINTA} strokeWidth="2" />
      <rect x="68" y="46" width="18" height="16" rx="2" fill="none" stroke={TINTA} strokeWidth="2" />
      <path d="M44 22 L60 46 L76 22" fill="#F2B90F" stroke={TINTA} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

function Banda() {
  return (
    <svg viewBox="0 0 120 110" width="100%" height="100%" aria-hidden>
      <g opacity=".95"><Camisa /></g>
      <path d="M30 12 L48 6 L96 96 L78 104 Z" fill="#0E4B45" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      {[[52, 32], [64, 54], [76, 76]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill="#FFC20E" stroke={TINTA} strokeWidth="1.5" />)}
      <path d="M96 84 L112 100" stroke="#D7242F" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function Saludo() {
  return (
    <svg viewBox="0 0 120 110" width="100%" height="100%" aria-hidden>
      <path d="M40 104 L40 60 Q40 50 48 50 L84 50 Q92 50 92 60 L92 104 Z" fill="#E6B48C" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      {[44, 56, 68, 80].map((x, i) => (
        <rect key={x} x={x} y={i === 0 || i === 3 ? 18 : 10} width="10" height={i === 0 || i === 3 ? 38 : 46} rx="5" fill="#E6B48C" stroke={TINTA} strokeWidth="3" />
      ))}
      <path d="M40 74 Q24 68 28 56 Q34 50 44 60" fill="#E6B48C" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      <text x="66" y="92" textAnchor="middle" fontFamily="Bangers, Impact, sans-serif" fontSize="16" fill={TINTA}>4</text>
    </svg>
  )
}

function Pantalon() {
  return (
    <svg viewBox="0 0 120 110" width="100%" height="100%" aria-hidden>
      <path d="M32 8 L88 8 L96 104 L70 104 L60 40 L50 104 L24 104 Z" fill="#0E4B45" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      <rect x="32" y="8" width="56" height="10" fill="#0A3833" stroke={TINTA} strokeWidth="3" />
      <rect x="54" y="8" width="12" height="10" fill="#C9A227" stroke={TINTA} strokeWidth="2" />
    </svg>
  )
}

const ILUS: Record<Ilustracion, () => ReactElement> = { camisa: () => <Camisa />, banda: Banda, saludo: Saludo, pantalon: Pantalon }

/** La pieza llena el recuadro SIN deformarse ni cortarse (se escala según su propia forma). */
function Ajustada({ p }: { p: Pieza }) {
  const m = Math.max(p.w, p.h) * 0.06 + 0.15
  return (
    <svg className="figura-svg" viewBox={`${-p.w / 2 - m} ${-p.h / 2 - m} ${p.w + 2 * m} ${p.h + 2 * m}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <PiezaSVG p={p} />
    </svg>
  )
}

/**
 * Recuadro de imagen con tamaño FIJO: la pregunta nunca cambia de forma por tener o no imagen.
 * La pieza se escala para llenar el recuadro (antes salía del tamaño real en cm y quedaba diminuta).
 */
export function Figura({ img, ilus, imagen, alto = 150 }: { img?: Pieza | Pieza[]; ilus?: Ilustracion; imagen?: string; alto?: number }) {
  let contenido: ReactElement
  if (Array.isArray(img)) {
    contenido = <div className="figura-fila">{img.map((p, i) => <Ajustada key={p.key + i} p={p} />)}</div>
  } else if (img) {
    contenido = <Ajustada p={img} />
  } else if (ilus) {
    const Ilus = ILUS[ilus]
    contenido = <div className="figura-ilus"><Ilus /></div>
  } else if (imagen) {
    contenido = <img src={asset(imagen)} alt="" className="figura-img" />
  } else {
    contenido = <PiezaIcono p={{ key: 'c1', tipo: 'c1', w: 7.2, h: 7.5 }} size={Math.round(alto * 0.8)} />
  }
  return <figure className="figura" style={{ height: alto }} aria-hidden>{contenido}</figure>
}
