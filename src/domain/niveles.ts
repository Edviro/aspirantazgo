import { bandaCorrecta, banderaCorrecta, banderinCorrecto, perfilAleatorio, perfilDemo, pieza, uniformeCorrecto } from './uniformes'
import type { Colocacion, PanelId, PerfilUniforme, Pieza, Rango } from './tipos'
import type { Afirmacion, Pregunta } from './quiz'
import { BANCO_CLUB, BANCO_EMBLEMA, BANCO_MARANATA, BANCO_PALABRA, PAREJAS_IDEALES, RONDAS_LEY, RONDAS_VOTO, VF_IDEALES, type RondaFrase } from './aspirantazgo'

export type TipoNivel = 'taller' | 'inspector' | 'quiz' | 'vf' | 'lluvia' | 'ordenar' | 'frase' | 'parejas' | 'ceremonia' | 'memoria'
export type Npc = 'trompeta' | 'lectora' | 'nudo'

export interface Nivel {
  id: string
  num: number
  titulo: string
  subtitulo: string
  tipo: TipoNivel
  rango: Rango
  paneles: PanelId[]
  parSeg: number
  npc: Npc
  intro: string
  /** Colocaciones objetivo (taller) o uniforme base (inspector). */
  objetivo: (nombre: string, club: string, unidad?: string) => Colocacion[]
  /** Si existe, cada partida trae un caso distinto (siempre fiel al manual) y el objetivo sale de él. */
  caso?: (rnd: () => number) => PerfilUniforme
  filtroCaso?: (c: Colocacion) => boolean
  distractores?: Pieza[]
  /** Trampas que se suman solo en dificultad Leyenda. */
  trampasLeyenda?: Pieza[]
  errores?: number
  /** Contenido propio del nivel (si no, usa el banco del uniforme). */
  banco?: Pregunta[]
  vf?: Afirmacion[]
  rondas?: RondaFrase[]
  parejas?: { a: string; b: string }[]
  imagen?: string
}

const filtrar = (paneles: PanelId[]) => (u: Colocacion[]) => u.filter(c => paneles.includes(c.panel))
const sinAccesorios = (u: Colocacion[]) => u.filter(c => c.pieza.tipo !== 'correa')

export const MUNDO_UNIFORMES = {
  id: 'uniformes',
  nombre: 'Isla del Uniforme',
  // El número de cada nivel sale de su orden en esta lista
  niveles: ([
    {
      id: 'u12-lluvia', num: 1, titulo: 'Lluvia de insignias', subtitulo: 'Atrapa solo las que te piden',
      tipo: 'lluvia', rango: 'conquistador', paneles: [], parSeg: 50, npc: 'nudo',
      intro: '¡Están cayendo insignias del cielo! Toca solo las que van donde te pido. Si tocas una equivocada, pierdes puntos.',
      objetivo: () => [],
    },
    {
      id: 'u01-arma-conquistador', num: 2, titulo: 'Viste al Conquistador', subtitulo: 'El uniforme completo de 10 a 15 años',
      tipo: 'taller', rango: 'conquistador', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 70, npc: 'nudo',
      intro: '¡Hoy es la ceremonia! Arrastra cada pieza a su lugar. Ojo: hay piezas que NO van en el uniforme de un Conquistador.',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('conquistador', n, c))),
      caso: rnd => perfilAleatorio('conquistador', rnd), filtroCaso: c => c.pieza.tipo !== 'correa',
      distractores: [pieza.estrella(1), pieza.tiraCargo('DIRECTOR')],
      trampasLeyenda: [pieza.divisa('guia_mayor', 2), pieza.liderazgo('gm')],
    },
    {
      id: 'u02-manga-derecha', num: 3, titulo: 'Manga derecha al centímetro', subtitulo: 'Tira del club y C1',
      tipo: 'taller', rango: 'conquistador', paneles: ['manga_der'], parSeg: 25, npc: 'trompeta',
      intro: 'Aquí se mide en centímetros. Suelta cada pieza a la altura exacta desde la costura del hombro.',
      objetivo: (n, c) => filtrar(['manga_der'])(uniformeCorrecto(perfilDemo('conquistador', n, c))),
      trampasLeyenda: [pieza.c2('caqui')],
    },
    {
      id: 'u03-manga-izquierda', num: 4, titulo: 'Manga izquierda al centímetro', subtitulo: 'Campo, C2 y divisa',
      tipo: 'taller', rango: 'conquistador', paneles: ['manga_izq'], parSeg: 30, npc: 'trompeta',
      intro: 'Campo, C2 y divisa: cada uno a su medida. Recuerda: 1,5 cm, luego 1 cm, luego 1 cm.',
      objetivo: (n, c) => filtrar(['manga_izq'])(uniformeCorrecto(perfilDemo('conquistador', n, c))),
      caso: rnd => perfilAleatorio('conquistador', rnd), filtroCaso: c => c.panel === 'manga_izq',
      trampasLeyenda: [pieza.c1()],
    },
    {
      id: 'u13-ordena-clases', num: 5, titulo: 'Ordena la investidura', subtitulo: 'Colores y orden de las seis clases',
      tipo: 'ordenar', rango: 'conquistador', paneles: [], parSeg: 40, npc: 'lectora',
      intro: 'Tres rondas: pon las clases en orden, reconoce sus colores y elige la divisa correcta.',
      objetivo: () => [],
    },
    {
      id: 'u04-bolsillos', num: 6, titulo: 'Los bolsillos', subtitulo: 'Clases en orden, avanzadas y excelencia',
      tipo: 'taller', rango: 'conquistador', paneles: ['pecho'], parSeg: 55, npc: 'lectora',
      intro: 'Eres capitán de unidad, investido hasta Pionero, con dos avanzadas y la insignia de excelencia. ¡Ordénalo todo!',
      objetivo: (n, c) => uniformeCorrecto({
        rango: 'conquistador', clasesRegulares: ['amigo', 'companero', 'explorador', 'pionero'],
        clasesAvanzadas: ['amigo', 'companero'], excelencia: true, bautismo: true, funcion: 'CAPITÁN', nombre: n, club: c,
      }).filter(x => x.panel === 'pecho' && x.pieza.tipo !== 'panoleta' && x.pieza.tipo !== 'correa'),
      caso: rnd => { const p = perfilAleatorio('conquistador', rnd); return { ...p, clasesRegulares: p.clasesRegulares.length < 2 ? ['amigo', 'companero'] : p.clasesRegulares } },
      filtroCaso: x => x.panel === 'pecho' && x.pieza.tipo !== 'panoleta' && x.pieza.tipo !== 'correa',
      distractores: [pieza.boton('guia')],
      trampasLeyenda: [pieza.avanzada('explorador')],
    },
    {
      id: 'u05-banda', num: 7, titulo: 'La banda de especialidades', subtitulo: 'Bandera a 6 cm y especialidades',
      tipo: 'taller', rango: 'conquistador', paneles: ['banda'], parSeg: 35, npc: 'nudo',
      intro: 'La banda va del hombro derecho a la cadera izquierda. Pon la bandera a 6 cm de la costura y luego tus especialidades.',
      objetivo: () => bandaCorrecta(4),
      distractores: [pieza.estrella(1)],
      trampasLeyenda: [pieza.c1()],
    },
    {
      id: 'u06-inspector', num: 8, titulo: 'Inspector de uniformes', subtitulo: 'Encuentra los errores antes de la revista',
      tipo: 'inspector', rango: 'conquistador', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 40, npc: 'lectora', errores: 4,
      intro: 'Este Conquistador se vistió con prisa. Toca cada pieza mal puesta antes de la revista.',
      objetivo: (n, c) => uniformeCorrecto({ ...perfilDemo('conquistador', n, c), clasesRegulares: ['amigo', 'companero', 'explorador'], clasesAvanzadas: ['amigo'] }),
      caso: rnd => { const p = perfilAleatorio('conquistador', rnd); return p.clasesRegulares.length < 3 ? { ...p, clasesRegulares: ['amigo', 'companero', 'explorador'] } : p },
    },
    {
      id: 'u14-verdadero-falso', num: 9, titulo: '¿Verdadero o falso?', subtitulo: 'Responde lo más rápido que puedas',
      tipo: 'vf', rango: 'conquistador', paneles: [], parSeg: 45, npc: 'lectora',
      intro: 'Te leo una frase del manual. Tú decides: ¿verdadero o falso? La racha de aciertos suma más.',
      objetivo: () => [],
    },
    {
      id: 'u17-memoria', num: 0, titulo: 'Memoria del uniforme', subtitulo: 'Une cada pieza con su lugar',
      tipo: 'memoria', rango: 'conquistador', paneles: [], parSeg: 70, npc: 'lectora',
      intro: 'Las cartas están boca abajo. Voltea dos: si la pieza y su lugar coinciden, se quedan. ¡Recuerda dónde vio cada una!',
      objetivo: () => [],
    },
    {
      id: 'u15-bandera', num: 10, titulo: 'La bandera del club', subtitulo: 'Cuatro partes, C1 al centro y el nombre',
      tipo: 'taller', rango: 'conquistador', paneles: ['bandera'], parSeg: 35, npc: 'trompeta',
      intro: 'Arma la bandera oficial de 128 × 90 cm: pinta las cuatro partes, pon el C1 al centro y el nombre del club donde va.',
      objetivo: (_n, c) => banderaCorrecta(c),
      trampasLeyenda: [pieza.c2('blanco')],
    },
    {
      id: 'u16-banderin', num: 11, titulo: 'El banderín de unidad', subtitulo: 'Franja azul, C1 y el diseño de tu unidad',
      tipo: 'taller', rango: 'conquistador', paneles: ['banderin'], parSeg: 35, npc: 'nudo',
      intro: 'Cada unidad lleva su banderín. Arma el tuyo con las medidas del manual.',
      objetivo: (_n, c, u) => banderinCorrecto(c, u || 'HALCONES'),
      trampasLeyenda: [pieza.estrella(1)],
    },
    {
      id: 'u08-lider', num: 12, titulo: 'Uniforme de líder', subtitulo: 'Directivo que todavía no es Guía Mayor',
      tipo: 'taller', rango: 'lider', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 90, npc: 'trompeta',
      intro: 'Consejero con dos años de servicio y sus seis clases regulares, pero aún no es Guía Mayor. ¿Qué divisa le toca?',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('lider', n, c))),
      caso: rnd => perfilAleatorio('lider', rnd), filtroCaso: c => c.pieza.tipo !== 'correa',
      distractores: [pieza.divisa('guia_mayor', 6), pieza.divisa('conquistador', 6), pieza.panoleta(true)],
      trampasLeyenda: [pieza.liderazgo('gm')],
    },
    {
      id: 'u09-guia-mayor', num: 13, titulo: 'Guía Mayor investido', subtitulo: 'Divisa con estrella y botón LC1',
      tipo: 'taller', rango: 'guia_mayor', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 110, npc: 'trompeta',
      intro: 'Director, Guía Mayor investido, con 5 años de servicio, avanzadas y excelencia. El uniforme más completo hasta ahora.',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('guia_mayor', n, c))),
      caso: rnd => perfilAleatorio('guia_mayor', rnd), filtroCaso: c => c.pieza.tipo !== 'correa',
      distractores: [pieza.divisa('lider', 6), pieza.panoleta(false)],
      trampasLeyenda: [pieza.lcManga('master')],
    },
    {
      id: 'u10-master', num: 14, titulo: 'Máster y Máster Avanzado', subtitulo: 'LC3 en la manga y los tres botones',
      tipo: 'taller', rango: 'gm_master_avanzado', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 120, npc: 'nudo',
      intro: 'Un Máster Avanzado usa todo lo del Guía Mayor, pero el C2 de la manga se cambia por el emblema LC3, y suma los botones de liderazgo: el de mayor grado, a la derecha.',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('gm_master_avanzado', n, c))),
      caso: rnd => perfilAleatorio(rnd() < 0.5 ? 'gm_master' : 'gm_master_avanzado', rnd), filtroCaso: c => c.pieza.tipo !== 'correa',
      distractores: [pieza.c2('blanco'), pieza.divisa('lider', 6)],
      trampasLeyenda: [pieza.lcManga('master')],
    },
    {
      id: 'u07-quiz', num: 15, titulo: 'Gran trivia', subtitulo: 'Preguntas del manual contra reloj',
      tipo: 'quiz', rango: 'conquistador', paneles: [], parSeg: 80, npc: 'lectora',
      intro: 'Preguntas del manual. Responde rápido: el tiempo también suma.',
      objetivo: () => [],
    },
    {
      id: 'u11-inspector-lideres', num: 16, titulo: 'Revista de líderes', subtitulo: 'Jefe final con cinco errores',
      tipo: 'inspector', rango: 'gm_master', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 50, npc: 'trompeta', errores: 5,
      intro: 'La revista de la Asociación. Un Guía Mayor Máster con varios errores. ¡Que no se te escape ninguno!',
      objetivo: (n, c) => uniformeCorrecto(perfilDemo('gm_master', n, c)),
      caso: rnd => perfilAleatorio((['guia_mayor', 'gm_master', 'gm_master_avanzado'] as Rango[])[Math.floor(rnd() * 3)], rnd),
    },
  ] as Nivel[]).map((n, i) => ({ ...n, num: i + 1 })),
}

export const MUNDO_ASPIRANTAZGO = {
  id: 'aspirantazgo',
  nombre: 'Isla del Aspirantazgo',
  niveles: [
    {
      id: 'a01-bienvenida', num: 1, titulo: 'Bienvenido al club', subtitulo: 'Lo primero que debe saber un aspirante',
      tipo: 'quiz', rango: 'conquistador', paneles: [], parSeg: 60, npc: 'nudo', banco: BANCO_CLUB,
      intro: '¡Bienvenido a la Isla del Aspirantazgo! Al final del camino te espera tu pañoleta. Empecemos por lo básico del club.',
      objetivo: () => [],
    },
    {
      id: 'a02-emblema', num: 2, titulo: 'El emblema', subtitulo: 'Qué significa cada parte y cada color',
      tipo: 'quiz', rango: 'conquistador', paneles: [], parSeg: 60, npc: 'lectora', banco: BANCO_EMBLEMA, imagen: 'emblema-c1',
      intro: 'Nuestro emblema cuenta una historia: el escudo, la espada y cada color tienen un significado. ¿Los conoces?',
      objetivo: () => [],
    },
    {
      id: 'a03-maranata', num: 3, titulo: 'Maranata', subtitulo: 'El saludo y la posición para el voto',
      tipo: 'quiz', rango: 'conquistador', paneles: [], parSeg: 60, npc: 'trompeta', banco: BANCO_MARANATA,
      intro: 'Antes de decir el voto hay que saber pararse y saludar bien. Todo viene del manual.',
      objetivo: () => [],
    },
    {
      id: 'a04-voto', num: 4, titulo: 'Arma el voto', subtitulo: 'Toca las partes en el orden correcto',
      tipo: 'frase', rango: 'conquistador', paneles: [], parSeg: 40, npc: 'lectora', rondas: RONDAS_VOTO,
      intro: 'El voto es una promesa. Ármalo pieza por pieza y cuidado con las piezas que no son del voto.',
      objetivo: () => [],
    },
    {
      id: 'a05-ley', num: 5, titulo: 'La Ley del Conquistador', subtitulo: 'Los ocho puntos en orden',
      tipo: 'frase', rango: 'conquistador', paneles: [], parSeg: 60, npc: 'nudo', rondas: RONDAS_LEY,
      intro: 'La Ley tiene ocho puntos. Ordénalos del primero al último, y al final, todos juntos.',
      objetivo: () => [],
    },
    {
      id: 'a06-ideales', num: 6, titulo: 'Lema, blanco y objetivo', subtitulo: 'Une cada ideal con su frase',
      tipo: 'parejas', rango: 'conquistador', paneles: [], parSeg: 45, npc: 'lectora', parejas: PAREJAS_IDEALES,
      intro: 'Toca un ideal y luego la frase que le corresponde. Si te equivocas, se separan.',
      objetivo: () => [],
    },
    {
      id: 'a07-ideales-vf', num: 7, titulo: 'Ideales relámpago', subtitulo: 'Verdadero o falso a toda velocidad',
      tipo: 'vf', rango: 'conquistador', paneles: [], parSeg: 45, npc: 'trompeta', vf: VF_IDEALES,
      intro: 'Frases sobre el voto, la ley y los ideales. ¿Verdadero o falso? Haz una racha.',
      objetivo: () => [],
    },
    {
      id: 'a08-palabra', num: 8, titulo: 'La Palabra', subtitulo: 'Busca el texto en tu Biblia y responde',
      tipo: 'quiz', rango: 'conquistador', paneles: [], parSeg: 120, npc: 'lectora', banco: BANCO_PALABRA,
      intro: 'Un Conquistador conoce su Biblia. Busca cada texto, léelo y responde. Puedes pausar para leer con calma en Práctica.',
      objetivo: () => [],
    },
    {
      id: 'a09-examen', num: 9, titulo: 'Examen del aspirante', subtitulo: 'Todo lo aprendido en una sola prueba',
      tipo: 'quiz', rango: 'conquistador', paneles: [], parSeg: 90, npc: 'trompeta',
      banco: [...BANCO_CLUB, ...BANCO_EMBLEMA, ...BANCO_MARANATA, ...BANCO_PALABRA],
      intro: 'La última prueba antes de la ceremonia. Mezcla de todo. ¡Tú puedes!',
      objetivo: () => [],
    },
    {
      id: 'a10-ceremonia', num: 10, titulo: 'Ceremonia de la pañoleta', subtitulo: 'Recibe tu pañoleta de Conquistador',
      tipo: 'ceremonia', rango: 'conquistador', paneles: [], parSeg: 60, npc: 'trompeta',
      intro: 'Llegó el momento. Ponte de pie, levanta la mano para el voto y recibe tu pañoleta.',
      objetivo: () => [],
    },
  ] as Nivel[],
}

// La Isla del Aspirantazgo queda lista en el código, pero se activará más adelante.
export const MUNDOS_JUGABLES = [MUNDO_UNIFORMES]
export const TODOS_LOS_NIVELES: Nivel[] = MUNDOS_JUGABLES.flatMap(m => m.niveles)
export const mundoDeNivel = (id: string) => MUNDOS_JUGABLES.find(m => m.niveles.some(n => n.id === id)) ?? MUNDO_UNIFORMES

/** Mundos del mapa general. Solo Uniformes está abierto por ahora. */
export const MUNDOS = [
  { id: 'aspirantazgo', nombre: 'Isla del Aspirantazgo', abierto: false, color: '#D7242F' },
  { id: 'uniformes', nombre: 'Isla del Uniforme', abierto: true, color: '#F6C21C' },
  { id: 'regulares', nombre: 'Clases Regulares', abierto: false, color: '#1F5FD1' },
  { id: 'especialidades', nombre: 'Especialidades', abierto: false, color: '#1E9A4B' },
  { id: 'avanzadas', nombre: 'Clases Avanzadas', abierto: false, color: '#7A1F3D' },
  { id: 'historia', nombre: 'Historia', abierto: false, color: '#9AA0A6' },
  { id: 'ideales', nombre: 'Ideales', abierto: false, color: '#F6C21C' },
]

/** Prepara una partida: el caso (si el nivel lo usa) y las piezas objetivo. */
export function prepararNivel(n: Nivel, nombre: string, club: string, unidad: string, rnd: () => number): { slots: Colocacion[]; caso: PerfilUniforme | null } {
  if (!n.caso) return { slots: n.objetivo(nombre, club, unidad), caso: null }
  const caso = { ...n.caso(rnd), nombre, club }
  const todo = uniformeCorrecto(caso)
  return { slots: n.filtroCaso ? todo.filter(n.filtroCaso) : todo, caso }
}
