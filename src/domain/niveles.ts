import { bandaCorrecta, perfilDemo, pieza, uniformeCorrecto } from './uniformes'
import type { Colocacion, PanelId, Pieza, Rango } from './tipos'

export type TipoNivel = 'taller' | 'inspector' | 'quiz'
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
  errores?: number
}

const filtrar = (paneles: PanelId[]) => (u: Colocacion[]) => u.filter(c => paneles.includes(c.panel))
const sinAccesorios = (u: Colocacion[]) => u.filter(c => c.pieza.tipo !== 'correa')

export const MUNDO_UNIFORMES = {
  id: 'uniformes',
  nombre: 'Isla del Uniforme',
  niveles: [
    {
      id: 'u01-arma-conquistador', num: 1, titulo: 'Viste al Conquistador', subtitulo: 'Uniforme completo · 10 a 15 años',
      tipo: 'taller', rango: 'conquistador', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 70, npc: 'nudo',
      intro: '¡Hoy es la ceremonia! Arrastra cada pieza a su lugar. Ojo: hay piezas que NO van en el uniforme de un Conquistador.',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('conquistador', n, c))),
      distractores: [pieza.estrella(1), pieza.tiraCargo('DIRECTOR'), pieza.divisa('guia_mayor', 2)],
    },
    {
      id: 'u02-manga-derecha', num: 2, titulo: 'Manga derecha al centímetro', subtitulo: 'Precisión · tira del club y C1',
      tipo: 'taller', rango: 'conquistador', paneles: ['manga_der'], parSeg: 25, npc: 'trompeta',
      intro: 'Aquí se mide en centímetros. Suelta cada pieza a la altura exacta desde la costura del hombro.',
      objetivo: (n, c) => filtrar(['manga_der'])(uniformeCorrecto(perfilDemo('conquistador', n, c))),
    },
    {
      id: 'u03-manga-izquierda', num: 3, titulo: 'Manga izquierda al centímetro', subtitulo: 'Precisión · Campo, C2 y divisa',
      tipo: 'taller', rango: 'conquistador', paneles: ['manga_izq'], parSeg: 30, npc: 'trompeta',
      intro: 'Campo, C2 y divisa: cada uno a su medida. Recuerda: 1,5 cm, luego 1 cm, luego 1 cm.',
      objetivo: (n, c) => filtrar(['manga_izq'])(uniformeCorrecto(perfilDemo('conquistador', n, c))),
    },
    {
      id: 'u04-bolsillos', num: 4, titulo: 'Los bolsillos', subtitulo: 'Clases en orden, avanzadas y excelencia',
      tipo: 'taller', rango: 'conquistador', paneles: ['pecho'], parSeg: 55, npc: 'lectora',
      intro: 'Eres capitán de unidad, investido hasta Pionero, con dos avanzadas y la insignia de excelencia. ¡Ordénalo todo!',
      objetivo: (n, c) => uniformeCorrecto({
        rango: 'conquistador', clasesRegulares: ['amigo', 'companero', 'explorador', 'pionero'],
        clasesAvanzadas: ['amigo', 'companero'], excelencia: true, bautismo: true, funcion: 'CAPITÁN', nombre: n, club: c,
      }).filter(x => x.panel === 'pecho' && x.pieza.tipo !== 'panoleta' && x.pieza.tipo !== 'correa'),
      distractores: [pieza.boton('guia')],
    },
    {
      id: 'u05-banda', num: 5, titulo: 'La banda de especialidades', subtitulo: 'Bandera a 6 cm y especialidades',
      tipo: 'taller', rango: 'conquistador', paneles: ['banda'], parSeg: 35, npc: 'nudo',
      intro: 'La banda va del hombro derecho a la cadera izquierda. Pon la bandera a 6 cm de la costura y luego tus especialidades.',
      objetivo: () => bandaCorrecta(4),
      distractores: [pieza.estrella(1)],
    },
    {
      id: 'u06-inspector', num: 6, titulo: 'Inspector de uniformes', subtitulo: 'Encuentra los 4 errores',
      tipo: 'inspector', rango: 'conquistador', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 40, npc: 'lectora', errores: 4,
      intro: 'Este Conquistador se vistió con prisa. Toca cada pieza mal puesta antes de la revista.',
      objetivo: (n, c) => uniformeCorrecto({ ...perfilDemo('conquistador', n, c), clasesRegulares: ['amigo', 'companero', 'explorador'], clasesAvanzadas: ['amigo'] }),
    },
    {
      id: 'u07-quiz', num: 7, titulo: 'Quiz relámpago', subtitulo: '10 preguntas · contra reloj',
      tipo: 'quiz', rango: 'conquistador', paneles: [], parSeg: 80, npc: 'lectora',
      intro: '10 preguntas del manual. Responde rápido: el tiempo también suma.',
      objetivo: () => [],
    },
    {
      id: 'u08-lider', num: 8, titulo: 'Uniforme de líder', subtitulo: 'Directivo que no es Guía Mayor',
      tipo: 'taller', rango: 'lider', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 90, npc: 'trompeta',
      intro: 'Consejero con dos años de servicio y sus seis clases regulares, pero aún no es Guía Mayor. ¿Qué divisa le toca?',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('lider', n, c))),
      distractores: [pieza.divisa('guia_mayor', 6), pieza.divisa('conquistador', 6), pieza.panoleta(true)],
    },
    {
      id: 'u09-guia-mayor', num: 9, titulo: 'Guía Mayor investido', subtitulo: 'Divisa con estrella y botón LC1',
      tipo: 'taller', rango: 'guia_mayor', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 110, npc: 'trompeta',
      intro: 'Director, Guía Mayor investido, con 5 años de servicio, avanzadas y excelencia. El uniforme más completo hasta ahora.',
      objetivo: (n, c) => sinAccesorios(uniformeCorrecto(perfilDemo('guia_mayor', n, c))),
      distractores: [pieza.divisa('lider', 6), pieza.panoleta(false)],
    },
    {
      id: 'u10-master', num: 10, titulo: 'Máster y Máster Avanzado', subtitulo: 'Solo se agrega el botón',
      tipo: 'taller', rango: 'gm_master_avanzado', paneles: ['pecho'], parSeg: 30, npc: 'nudo',
      intro: 'Al avanzar a Máster y Máster Avanzado solo se suma el botón de liderazgo. El de mayor grado, siempre a la derecha.',
      objetivo: (n, c) => uniformeCorrecto(perfilDemo('gm_master_avanzado', n, c))
        .filter(x => x.pieza.tipo === 'boton_liderazgo' || x.pieza.tipo === 'boton_clase'),
    },
    {
      id: 'u11-inspector-lideres', num: 11, titulo: 'Revista de líderes', subtitulo: 'Jefe final · 5 errores',
      tipo: 'inspector', rango: 'guia_mayor', paneles: ['manga_der', 'pecho', 'manga_izq'], parSeg: 50, npc: 'trompeta', errores: 5,
      intro: 'La revista de la Asociación. Un Guía Mayor con varios errores. ¡Que no se te escape ninguno!',
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
