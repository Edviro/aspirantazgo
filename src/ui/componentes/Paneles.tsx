import { BOLSILLO, PANEL } from '../../domain/uniformes'
import type { PanelId } from '../../domain/tipos'

const VERDE = '#0E4B45'

export const NOMBRE_PANEL: Record<PanelId, string> = {
  manga_der: 'Manga derecha',
  manga_izq: 'Manga izquierda',
  pecho: 'Pecho',
  banda: 'Banda',
}

export const MARGEN = { izq: 3.2, der: 1.2, arriba: 1.5, abajo: 1.2 }

export function viewBoxPanel(panel: PanelId) {
  const { w, h } = PANEL[panel]
  return `${-MARGEN.izq} ${-MARGEN.arriba} ${w + MARGEN.izq + MARGEN.der} ${h + MARGEN.arriba + MARGEN.abajo}`
}

function Tela({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <pattern id={id} width={0.6} height={0.6} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect width={0.6} height={0.6} fill={color} />
        <rect width={0.6} height={0.12} fill="#000" opacity={0.035} />
      </pattern>
      <linearGradient id={id + 'g'} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={0.18} />
        <stop offset="0.6" stopColor="#fff" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.12} />
      </linearGradient>
    </defs>
  )
}

const costura = { fill: 'none', stroke: '#000', strokeOpacity: 0.22, strokeWidth: 0.07, strokeDasharray: '0.35 0.25' }

/** Regla en cm a la izquierda del panel: así se aprende a medir de verdad. */
export function Regla({ alto }: { alto: number }) {
  const marcas = []
  for (let i = 0; i <= alto * 2; i++) {
    const y = i / 2
    const entero = i % 2 === 0
    marcas.push(<line key={i} x1={-0.6 - (entero ? 0.7 : 0.35)} x2={-0.6} y1={y} y2={y} stroke="#F8E7B0" strokeWidth={entero ? 0.07 : 0.04} />)
    if (entero && y % 2 === 0) marcas.push(<text key={'t' + i} x={-1.55} y={y} fontSize={0.62} fill="#F8E7B0" textAnchor="end" dominantBaseline="central" fontFamily="Nunito, sans-serif" fontWeight={800}>{y}</text>)
  }
  return (
    <g>
      <rect x={-3.05} y={-0.4} width={2.5} height={alto + 0.8} rx={0.3} fill="#1B2440" opacity={0.75} />
      {marcas}
    </g>
  )
}

export function PanelFondo({ panel, blanca, regla }: { panel: PanelId; blanca: boolean; regla: boolean }) {
  const tela = blanca ? '#F3F1EA' : '#D9C49A'
  const id = 'tela-' + panel + (blanca ? 'b' : 'c')
  const { w, h } = PANEL[panel]

  if (panel === 'manga_der' || panel === 'manga_izq') {
    const forma = `M0,${h} L0,5.2 C0,-1.6 ${w},-1.6 ${w},5.2 L${w},${h} Z`
    return (
      <g>
        <Tela id={id} color={tela} />
        <path d={forma} fill={`url(#${id})`} stroke="#00000033" strokeWidth={0.12} />
        <path d={forma} fill={`url(#${id}g)`} />
        <path d={`M0.35,${h - 2.6} L${w - 0.35},${h - 2.6}`} {...costura} />
        <path d={`M0.35,${h - 0.35} L${w - 0.35},${h - 0.35}`} {...costura} />
        <line x1={w / 2 - 3} x2={w / 2 + 3} y1={0} y2={0} stroke="#C2410C" strokeWidth={0.1} strokeDasharray="0.4 0.25" />
        <text x={w / 2} y={-0.65} fontSize={0.6} textAnchor="middle" fill="#F8E7B0" fontFamily="Nunito, sans-serif" fontWeight={800}>costura del hombro</text>
        {regla && <Regla alto={h} />}
      </g>
    )
  }

  if (panel === 'banda') {
    return (
      <g>
        <defs>
          <linearGradient id="bandaG" x1="0" x2="1">
            <stop offset="0" stopColor="#0A3F3A" /><stop offset="0.5" stopColor="#11564F" /><stop offset="1" stopColor="#0A3F3A" />
          </linearGradient>
        </defs>
        <path d={`M0,0 L${w},0 L${w},${h} L0,${h} Z`} fill="url(#bandaG)" />
        <path d={`M0.4,0.2 L0.4,${h - 0.2} M${w - 0.4},0.2 L${w - 0.4},${h - 0.2}`} stroke="#ffffff" strokeOpacity={0.25} strokeWidth={0.07} strokeDasharray="0.35 0.25" />
        <line x1={0} x2={w} y1={0} y2={0} stroke="#C2410C" strokeWidth={0.12} strokeDasharray="0.4 0.25" />
        <text x={w / 2} y={-0.6} fontSize={0.6} textAnchor="middle" fill="#F8E7B0" fontFamily="Nunito, sans-serif" fontWeight={800}>costura del hombro derecho</text>
        {regla && <Regla alto={h} />}
      </g>
    )
  }

  // Pecho de la camisa (vista de frente)
  const bol = (x: number) => (
    <g>
      <rect x={x} y={BOLSILLO.top} width={BOLSILLO.der.w} height={BOLSILLO.alto} rx={0.5} fill="#000" opacity={0.05} />
      <rect x={x} y={BOLSILLO.top} width={BOLSILLO.der.w} height={BOLSILLO.alto} rx={0.5} fill="none" stroke="#00000030" strokeWidth={0.1} />
      <line x1={x + BOLSILLO.der.w / 2} x2={x + BOLSILLO.der.w / 2} y1={BOLSILLO.top + BOLSILLO.solapa} y2={BOLSILLO.top + BOLSILLO.alto - 0.4} stroke="#00000026" strokeWidth={0.08} />
      <path d={`M${x - 0.2},${BOLSILLO.top} L${x + BOLSILLO.der.w + 0.2},${BOLSILLO.top} L${x + BOLSILLO.der.w + 0.2},${BOLSILLO.top + BOLSILLO.solapa} L${x - 0.2},${BOLSILLO.top + BOLSILLO.solapa} Z`}
        fill={tela} stroke="#00000038" strokeWidth={0.1} />
      <path d={`M${x + 0.2},${BOLSILLO.top + BOLSILLO.solapa - 0.3} L${x + BOLSILLO.der.w - 0.2},${BOLSILLO.top + BOLSILLO.solapa - 0.3}`} {...costura} />
    </g>
  )
  return (
    <g>
      <Tela id={id} color={tela} />
      <path d={`M2,42 L2,6 Q2,2.5 6,1.6 L18,0 Q25,4.5 32,0 L44,1.6 Q48,2.5 48,6 L48,42 Z`} fill={`url(#${id})`} stroke="#00000030" strokeWidth={0.12} />
      <path d={`M2,42 L2,6 Q2,2.5 6,1.6 L18,0 Q25,4.5 32,0 L44,1.6 Q48,2.5 48,6 L48,42 Z`} fill={`url(#${id}g)`} />
      <path d="M18,0 L22,6.5 L25,4.2 L28,6.5 L32,0" fill={tela} stroke="#00000038" strokeWidth={0.12} strokeLinejoin="round" />
      <line x1={25} x2={25} y1={4.4} y2={42} stroke="#00000028" strokeWidth={0.1} />
      {[10, 17, 24, 31].map(y => <circle key={y} cx={25.7} cy={y + 2} r={0.32} fill="#ffffffaa" stroke="#00000030" strokeWidth={0.05} />)}
      {bol(BOLSILLO.der.x)}
      {bol(BOLSILLO.izq.x)}
      <text x={BOLSILLO.der.x + 6} y={BOLSILLO.top + BOLSILLO.alto + 1.4} fontSize={0.7} textAnchor="middle" fill="#00000055" fontFamily="Nunito, sans-serif" fontWeight={800}>bolsillo derecho</text>
      <text x={BOLSILLO.izq.x + 6} y={BOLSILLO.top + BOLSILLO.alto + 1.4} fontSize={0.7} textAnchor="middle" fill="#00000055" fontFamily="Nunito, sans-serif" fontWeight={800}>bolsillo izquierdo</text>
      <rect x={2} y={38.2} width={46} height={2.8} fill={VERDE} opacity={0.12} />
    </g>
  )
}
