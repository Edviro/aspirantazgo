import type { Figura, Logro } from '../../domain/logros'

const TINTA = '#1E140C'

function Glifo({ f }: { f: Figura }) {
  const p = { fill: '#fff', stroke: TINTA, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  switch (f) {
    case 'estrella': return <polygon {...p} points="50,22 58,42 80,43 63,56 69,78 50,65 31,78 37,56 20,43 42,42" />
    case 'corona': return <path {...p} d="M24 66 L28 34 L40 48 L50 28 L60 48 L72 34 L76 66 Z" />
    case 'escudo': return <path {...p} d="M50 22 L74 30 L72 52 Q68 70 50 78 Q32 70 28 52 L26 30 Z" />
    case 'llama': return <path {...p} d="M50 22 Q66 40 64 56 Q62 74 50 78 Q36 76 34 60 Q33 48 44 40 Q44 52 50 54 Q46 38 50 22 Z" />
    case 'espadas': return <g {...p}><path d="M28 72 L66 30 M72 72 L34 30" strokeWidth={7} stroke={TINTA} /><path d="M28 72 L66 30 M72 72 L34 30" strokeWidth={3.5} stroke="#fff" /><path d="M58 30 L70 30 L70 42 M42 30 L30 30 L30 42" fill="none" /></g>
    case 'manga': return <path {...p} d="M30 30 Q50 20 70 30 L74 74 L26 74 Z M30 62 L70 62" />
    case 'carta': return <g {...p}><rect x="30" y="26" width="30" height="40" rx="4" transform="rotate(-10 45 46)" /><rect x="42" y="32" width="30" height="40" rx="4" transform="rotate(8 57 52)" /></g>
    case 'brujula': return <g {...p}><circle cx="50" cy="50" r="24" /><polygon points="50,30 56,50 50,70 44,50" fill="#D7242F" /></g>
    case 'tienda': return <path {...p} d="M22 74 L50 26 L78 74 Z M50 26 L50 74 M42 74 L50 56 L58 74" />
    case 'trofeo': return <path {...p} d="M36 26 L64 26 L62 46 Q50 58 38 46 Z M36 30 Q24 30 28 42 Q30 48 38 46 M64 30 Q76 30 72 42 Q70 48 62 46 M50 54 L50 64 M38 72 L62 72 L60 64 L40 64 Z" />
    case 'panoleta': return <path {...p} d="M24 30 L76 30 L50 74 Z M44 44 L56 44 L50 58 Z" />
    case 'medalla': return <g {...p}><path d="M38 22 L46 44 M62 22 L54 44" strokeWidth={7} stroke={TINTA} /><path d="M38 22 L46 44 M62 22 L54 44" strokeWidth={3.5} stroke="#D7242F" /><circle cx="50" cy="58" r="18" /><polygon points="50,47 53,55 61,55 55,60 57,68 50,63 43,68 45,60 39,55 47,55" fill="#FFC20E" strokeWidth={1.5} /></g>
    case 'rayo': return <polygon {...p} points="56,20 32,54 48,54 42,80 70,42 54,42" />
  }
}

/** Parche bordado de logro: redondo, con puntada y la figura al centro. */
export function Parche({ l, ganado = true, size = 96 }: { l: Logro; ganado?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`parche-logro ${ganado ? '' : 'bloqueado'}`} aria-hidden>
      <circle cx="50" cy="50" r="46" fill={ganado ? l.color : '#8C8579'} stroke={TINTA} strokeWidth="4" />
      <circle cx="50" cy="50" r="39" fill="none" stroke={ganado ? '#FFE58A' : '#C9C2B4'} strokeWidth="2.2" strokeDasharray="4 3" />
      {ganado ? <Glifo f={l.figura} /> : <text x="50" y="64" textAnchor="middle" fontFamily="Bangers, Impact, sans-serif" fontSize="40" fill="#E8E2D4" stroke={TINTA} strokeWidth="2" paintOrder="stroke">?</text>}
    </svg>
  )
}
