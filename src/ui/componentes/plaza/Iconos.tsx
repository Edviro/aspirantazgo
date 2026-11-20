import { useEffect, useRef } from 'react'
import { BANDERA_H, BANDERA_W, pintarBanderaClub, pintarBanderaConquis, pintarBanderaPais } from '../../pixel/banderas'

/** Una bandera en pixel art: del país, de Conquistadores o del club. */
export function Bandera({ tipo, pais, bandera, alto = 22, className = '' }: {
  tipo: 'pais' | 'conquis' | 'club'; pais?: string | null; bandera?: string | null; alto?: number; className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const club = tipo === 'club'
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = club ? BANDERA_W : 16; cv.height = club ? BANDERA_H : 11
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, cv.width, cv.height)
    if (tipo === 'pais') pintarBanderaPais(ctx, pais)
    else if (tipo === 'conquis') pintarBanderaConquis(ctx)
    else pintarBanderaClub(ctx, bandera)
  }, [tipo, pais, bandera, club])
  const ancho = Math.round(alto * (club ? 1.5 : 16 / 11))
  return <canvas ref={ref} className={`bandera-px ${className}`} style={{ width: ancho, height: alto }} aria-hidden />
}

/** Dibujos (12×12) de los pines y parches de la tienda. */
const ICONOS: Record<string, string[]> = {
  'pin-c1': ['....oooo....', '..oorrrroo..', '.orrrrrrrro.', 'orrrryyrrrro', 'orrrywwyrrro', 'orrrywwyrrro', '.orrryyrrro.', '..orrrrrro..', '...orrrro...', '....orro....', '.....oo.....', '............'],
  'pin-biblia': ['............', '.kkkkkkkkkk.', '.kbbbbwbbbk.', '.kbbbbwbbbk.', '.kbbwwwwwbk.', '.kbbbbwbbbk.', '.kbbbbwbbbk.', '.kbbbbwbbbk.', '.kbbbbbbbbk.', '.kyyyyyyyyk.', '.kkkkkkkkkk.', '............'],
  'pin-brujula': ['....kkkk....', '..kkwwwwkk..', '.kwwwrrwwwk.', '.kwwwrrwwwk.', 'kwwwrrrrwwwk', 'kwwwwkkwwwwk', 'kwwwwkkwwwwk', 'kwwwbbbbwwwk', '.kwwwbbwwwk.', '.kwwwbbwwwk.', '..kkwwwwkk..', '....kkkk....'],
  'pin-carpa': ['............', '.....kk.....', '....kggk....', '...kggggk...', '..kggggggk..', '..kgggkggk..', '.kgggkkgggk.', '.kggkkkkggk.', 'kgggkkkkgggk', 'kkkkkkkkkkkk', '............', '............'],
  'pin-fogata': ['.....y......', '....yyy.....', '...yoooy....', '...oorro....', '..oorrroo...', '..orrrrro...', '...orrro....', '.mmmmmmmmm..', '..mm.mm.mm..', '.kkkkkkkkk..', '............', '............'],
  'pin-estrella': ['.....yy.....', '.....yy.....', '....yyyy....', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '...yyyyyy...', '..yyyyyyyy..', '..yyy..yyy..', '.yyy....yyy.', '.yy......yy.', '............'],
  'parche-amistad': ['..kkkkkkkk..', '.kbbbbbbbbk.', 'kbbrrbbrrbbk', 'kbrrrrrrrrbk', 'kbrrrrrrrrbk', 'kbbrrrrrrbbk', 'kbbbrrrrbbbk', 'kbbbbrrbbbbk', 'kbbbbbbbbbbk', '.kbbbbbbbbk.', '..kkkkkkkk..', '............'],
  'parche-naturaleza': ['..kkkkkkkk..', '.kcccccccck.', 'kcccccgcccck', 'kccccgggccck', 'kcccgggggcck', 'kccgggggggck', 'kcccccmmccck', 'kcccccmmccck', 'kggggggggggk', '.kggggggggk.', '..kkkkkkkk..', '............'],
  'parche-servicio': ['..kkkkkkkk..', '.kwwwwwwwwk.', 'kwwwwrrwwwwk', 'kwwwwrrwwwwk', 'kwrrrrrrrrwk', 'kwrrrrrrrrwk', 'kwwwwrrwwwwk', 'kwwwwrrwwwwk', 'kwwwwwwwwwwk', '.kwwwwwwwwk.', '..kkkkkkkk..', '............'],
  'obj-guitarra': ['.........kk.', '........kmk.', '.......kmk..', '......kmk...', '.....kmk....', '..kkkmk.....', '.kooook.....', 'kookkook....', 'kokkkoo.....', 'kookkok.....', '.kooook.....', '..kkkk......'],
  'obj-brujula': ['....kkkk....', '..kkwwwwkk..', '.kwwwrrwwwk.', '.kwwwrrwwwk.', 'kwwwwrrwwwwk', 'kwwwwkkwwwwk', 'kwwwwkkwwwwk', 'kwwwwbbwwwwk', '.kwwwbbwwwk.', '.kwwwbbwwwk.', '..kkwwwwkk..', '....kkkk....'],
  'obj-linterna': ['.....kk.....', '....k..k....', '...kkkkkk...', '...kyyyyk...', '...kyyyyk...', '...kywwyk...', '...kywwyk...', '...kyyyyk...', '...kyyyyk...', '...kkkkkk...', '....kkkk....', '............'],
  'obj-cantimplora': ['....kkk.....', '....kmk.....', '..kkkkkkk...', '.kcccccccck.', '.kcccccccck.', '.kmmmmmmmmk.', '.kcccccccck.', '.kcccccccck.', '.kcccccccck.', '..kkkkkkkk..', '............', '............'],
  'obj-hamaca': ['k..........k', 'kk........kk', 'kok......oyk', '.koy....yok.', '.koyoyoyoyk.', '..kyoyoyok..', '...kkkkkk...', '............', '............', '............', '............', '............'],
  'parche-campori': ['..kkkkkkkk..', '.kyyyyyyyyk.', 'kyyybbbbyyyk', 'kyybbbbbbyyk', 'kybbgkkgbbyk', 'kybggkkggbyk', 'kyggggggggyk', 'kyggggggggyk', 'kyyyyyyyyyyk', '.kyyyyyyyyk.', '..kkkkkkkk..', '............'],
}
const COLOR: Record<string, string> = { k: '#1E140C', r: '#D7242F', y: '#F2B90F', w: '#ffffff', b: '#1F4FB8', g: '#1E9A4B', o: '#C98F00', m: '#8a5a2e', c: '#7cc7f0' }

/** Icono de un pin o parche de la tienda (o una estrella si no se conoce). */
export function IconoItem({ id, alto = 28 }: { id: string; alto?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = 12; cv.height = 12
    const ctx = cv.getContext('2d')!
    const filas = ICONOS[id] ?? ICONOS['pin-estrella']
    filas.forEach((f, y) => [...f].forEach((ch, x) => { const c = COLOR[ch]; if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1) } }))
  }, [id])
  return <canvas ref={ref} className="icono-item" style={{ width: alto, height: alto }} aria-hidden />
}

/** Etiquetas de los parches de campeón. */
export const CAMPEON_TXT: Record<string, string> = {
  mundo: '🌎 Mejor del mundo', pais: '🏅 Mejor de su país', union: '🏅 Mejor de su unión', campo: '🏅 Mejor de su asociación o misión', club: '⭐ Mejor de su club',
}
