import { bandaCorrecta, banderaCorrecta, banderinCorrecto, perfilDemo, pieza, uniformeCorrecto } from './uniformes'
import type { Colocacion, PanelId, Pieza, Rango } from './tipos'

export type TipoNivel = 'taller' | 'inspector' | 'quiz' | 'vf' | 'lluvia' | 'ordenar'
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
  objetivo: (nombre: string, club: string) => Colocacion[]
  distractores?: Pieza[]
  /** Trampas que se suman solo en dificultad Leyenda. */
  trampasLeyenda?: Pieza[]
  errores?: number
}

const filtrar = (paneles: PanelId[]) => (u: Colocacion[]) => u.filter(c => paneles.includes(c.panel))
const sinAccesorios = (u: Colocacion[]) => u.filter(c => c.pieza.tipo !== 'correa')

export const MUNDO_UNIFORMES = {
  id: 'uniformes',
  nombre: 'Isla del Uniforme',
  niveles: [
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
    },
    {
      id: 'u14-verdadero-falso', num: 9, titulo: '¿Verdadero o falso?', subtitulo: 'Responde lo más rápido que puedas',
      tipo: 'vf', rango: 'conquistador', paneles: [], parSeg: 45, npc: 'lectora',
      intro: 'Te leo una frase del manual. Tú decides: ¿verdadero o falso? La racha de aciertos suma más.',
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
      objetivo: (_n, c) => banderinCorrecto(c, 'HALCONES'),
      trampasLeyenda: [pieza.estrella(1)],
    },
    {
      id: 'u08-lider', num: 12, titulo: 'Uniforme de líder', subtitulo: 'Directivo que todavía no es Guía Mayor',
      tipo: 'taller', rango: 'lider', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 90, npc: 'trompeta',
      intro: 'Consejero con dos años de servicio y sus seis clases regulares, pero aún no es Guía Mayor. ¿Qué divisa le toca?',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('lider', n, c))),
      distractores: [pieza.divisa('guia_mayor', 6), pieza.divisa('conquistador', 6), pieza.panoleta(true)],
      trampasLeyenda: [pieza.liderazgo('gm')],
    },
    {
      id: 'u09-guia-mayor', num: 13, titulo: 'Guía Mayor investido', subtitulo: 'Divisa con estrella y botón LC1',
      tipo: 'taller', rango: 'guia_mayor', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 110, npc: 'trompeta',
      intro: 'Director, Guía Mayor investido, con 5 años de servicio, avanzadas y excelencia. El uniforme más completo hasta ahora.',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('guia_mayor', n, c))),
      distractores: [pieza.divisa('lider', 6), pieza.panoleta(false)],
      trampasLeyenda: [pieza.lcManga('master')],
    },
    {
      id: 'u10-master', num: 14, titulo: 'Máster y Máster Avanzado', subtitulo: 'LC3 en la manga y los tres botones',
      tipo: 'taller', rango: 'gm_master_avanzado', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 120, npc: 'nudo',
      intro: 'Un Máster Avanzado usa todo lo del Guía Mayor, pero el C2 de la manga se cambia por el emblema LC3, y suma los botones de liderazgo: el de mayor grado, a la derecha.',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('gm_master_avanzado', n, c))),
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
    },
  ] as Nivel[],
}

/** Mundos del mapa general. Solo Uniformes está abierto por ahora. */
export const MUNDOS = [
  { id: 'uniformes', nombre: 'Isla del Uniforme', abierto: true, color: '#F6C21C' },
  { id: 'aspirantazgo', nombre: 'Aventura del Aspirantazgo', abierto: false, color: '#D7242F' },
  { id: 'regulares', nombre: 'Clases Regulares', abierto: false, color: '#1F5FD1' },
  { id: 'especialidades', nombre: 'Especialidades', abierto: false, color: '#1E9A4B' },
  { id: 'avanzadas', nombre: 'Clases Avanzadas', abierto: false, color: '#7A1F3D' },
]
