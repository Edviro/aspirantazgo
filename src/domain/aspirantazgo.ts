import type { Afirmacion, Pregunta } from './quiz'

/**
 * Contenido de la Isla del Aspirantazgo.
 * IMPORTANTE: los textos de los ideales siguen la versión en español de la DSA más difundida.
 * Verifícalos con la versión oficial vigente de tu División antes de publicar y corrígelos aquí.
 */
export const IDEALES = {
  voto: 'Por la gracia de Dios, seré puro, bondadoso y leal; guardaré la Ley del Conquistador, seré siervo de Dios y amigo de la humanidad.',
  ley: [
    'Observar la devoción matutina.',
    'Cumplir fielmente la parte que me corresponde.',
    'Cuidar mi cuerpo.',
    'Tener una mirada franca.',
    'Ser cortés y obediente.',
    'Andar con reverencia en la casa de Dios.',
    'Tener siempre una canción en el corazón.',
    'Trabajar para Dios.',
  ],
  lema: 'El amor de Cristo me motiva.',
  blanco: 'El mensaje del advenimiento a todo el mundo en mi generación.',
  objetivo: 'Salvar del pecado y guiar en el servicio.',
}

/** Rondas para armar frases: cada ronda se arma tocando las piezas en orden. */
export interface RondaFrase { titulo: string; piezas: string[]; trampas?: string[] }

export const RONDAS_VOTO: RondaFrase[] = [
  { titulo: 'Arma el voto (1 de 2)', piezas: ['Por la gracia', 'de Dios,', 'seré puro,', 'bondadoso', 'y leal;'], trampas: ['valiente,', 'por mi fuerza'] },
  { titulo: 'Arma el voto (2 de 2)', piezas: ['guardaré la Ley', 'del Conquistador,', 'seré siervo de Dios', 'y amigo', 'de la humanidad.'], trampas: ['del club,', 'de mi unidad.'] },
]

export const RONDAS_LEY: RondaFrase[] = [
  { titulo: 'Ordena la Ley: puntos 1 al 4', piezas: IDEALES.ley.slice(0, 4) },
  { titulo: 'Ordena la Ley: puntos 5 al 8', piezas: IDEALES.ley.slice(4) },
  { titulo: 'La Ley completa', piezas: IDEALES.ley.map(l => l.split(' ').slice(0, 2).join(' ') + '…') },
]

export const PAREJAS_IDEALES: { a: string; b: string }[] = [
  { a: 'Lema', b: IDEALES.lema },
  { a: 'Blanco', b: IDEALES.blanco },
  { a: 'Objetivo', b: IDEALES.objetivo },
  { a: 'Saludo', b: 'Maranata' },
  { a: 'Respuesta al saludo', b: 'Cristo viene' },
  { a: 'Emblema del club', b: 'C1' },
]

export const BANCO_CLUB: Pregunta[] = [
  { q: '¿De qué edad son los Conquistadores?', opciones: ['De 10 a 15 años', 'De 4 a 9 años', 'De 16 a 21 años', 'Cualquier edad'], correcta: 0, porque: 'El Club de Conquistadores es para chicos y chicas de 10 a 15 años.' },
  { q: '¿Qué recibe el aspirante cuando cumple los requisitos de admisión?', opciones: ['La pañoleta', 'La banda', 'La estrella de servicio', 'El torzal'], correcta: 0, porque: 'En la ceremonia de admisión recibe su pañoleta.' },
  { q: '¿Desde cuándo puedes usar el uniforme de gala?', opciones: ['Desde la ceremonia de la pañoleta', 'Desde el primer sábado', 'Al cumplir 15 años', 'Al ser Guía'], correcta: 0, porque: 'El uniforme A se usa a partir de la ceremonia de admisión de la pañoleta.' },
  { q: '¿De qué color es la pañoleta del Conquistador?', opciones: ['Amarillo oro', 'Roja', 'Verde', 'Azul'], correcta: 0, porque: 'Es de tela amarillo oro con el emblema C2.' },
  { q: '¿Cómo se llama el saludo de los Conquistadores?', opciones: ['Maranata', 'Aleluya', 'Shalom', 'Hosanna'], correcta: 0, porque: 'Saludo: Maranata. Respuesta: Cristo viene.' },
  { q: '¿Cuál es la respuesta al saludo Maranata?', opciones: ['Cristo viene', 'Dios es amor', 'Siempre listos', 'Amén'], correcta: 0, porque: 'Maranata significa "el Señor viene".' },
  { q: '¿Qué emblema lleva la palabra CONQUISTADORES?', opciones: ['C1', 'C2', 'C3', 'C5'], correcta: 0, porque: 'El C1 lleva CONQUISTADORES arriba y CLUB abajo.' },
  { q: '¿De qué color es el pantalón o falda del uniforme?', opciones: ['Verde petróleo', 'Negro', 'Caqui', 'Azul'], correcta: 0, porque: 'Verde petróleo, con camisa caqui para los Conquistadores.' },
]

// Significados del emblema según la enseñanza tradicional del club. Verifícalos con tu material oficial.
export const BANCO_EMBLEMA: Pregunta[] = [
  { q: '¿Qué representa la espada del emblema?', opciones: ['La Palabra de Dios', 'La fuerza del club', 'Una batalla', 'El valor'], correcta: 0, porque: 'La espada es la Palabra de Dios (Efesios 6:17).' },
  { q: '¿Qué representa el escudo?', opciones: ['La protección de Dios', 'El país', 'La unidad', 'El campamento'], correcta: 0, porque: 'El escudo recuerda la protección de Dios.' },
  { q: '¿Qué recuerdan los tres lados del triángulo?', opciones: ['Desarrollo mental, físico y espiritual', 'Tres años en el club', 'Tres clases', 'Tres unidades'], correcta: 0, porque: 'Se enseña como la Trinidad y el desarrollo mental, físico y espiritual.' },
  { q: '¿Qué significa el color rojo?', opciones: ['El sacrificio de Cristo', 'El peligro', 'La alegría', 'El fuego del campamento'], correcta: 0, porque: 'El rojo recuerda el sacrificio de Cristo.' },
  { q: '¿Qué significa el color dorado?', opciones: ['La excelencia', 'La riqueza', 'El sol', 'La victoria'], correcta: 0, porque: 'El dorado representa la excelencia.' },
  { q: '¿Qué significa el blanco?', opciones: ['La pureza', 'La paz', 'La nieve', 'La luz del día'], correcta: 0, porque: 'El blanco representa la pureza.' },
  { q: '¿Qué significa el azul?', opciones: ['La lealtad', 'El cielo', 'El mar', 'La tranquilidad'], correcta: 0, porque: 'El azul representa la lealtad.' },
]

// Del Manual de Uniformes (DSA): saludo Maranata y posición para el voto.
export const BANCO_MARANATA: Pregunta[] = [
  { q: 'En el saludo Maranata, ¿qué brazo se levanta?', opciones: ['El derecho', 'El izquierdo', 'Los dos', 'Ninguno'], correcta: 0, porque: 'Se levanta el antebrazo derecho, mostrando la palma.' },
  { q: '¿Cómo van los dedos en el saludo?', opciones: ['Juntos, con el pulgar doblado hacia la palma', 'Abiertos', 'En puño', 'Dos dedos en V'], correcta: 0, porque: 'Cuatro dedos juntos y el pulgar doblado hacia la palma.' },
  { q: '¿Qué representan los cuatro dedos?', opciones: ['Amar, anunciar, apresurar y aguardar el regreso de Cristo', 'Las cuatro clases', 'Los cuatro evangelios', 'Los puntos cardinales'], correcta: 0, porque: 'Son las cuatro "a" de Maranata.' },
  { q: '¿Qué representa el pulgar doblado?', opciones: ['Nuestra reverencia ante la presencia de Dios', 'La humildad del líder', 'El número uno', 'La unidad del club'], correcta: 0, porque: 'Representa nuestra reverencia delante de la presencia de Dios.' },
  { q: 'Para el voto, ¿qué ángulo forman el brazo y el antebrazo?', opciones: ['45 grados', '90 grados', '180 grados', '30 grados'], correcta: 0, porque: 'El ángulo entre el brazo y el antebrazo es de 45°, con la mano a la altura del rostro.' },
  { q: '¿Cuál es la voz de mando para repetir el voto?', opciones: ['"Para el voto, posición"', '"¡Atención, club!"', '"Firmes"', '"Saludo"'], correcta: 0, porque: 'Primero "Para el voto, posición" y al terminar "Descansar posición".' },
  { q: 'En el voto de fidelidad a la Biblia, ¿con qué mano se sostiene la Biblia?', opciones: ['Con la izquierda', 'Con la derecha', 'Con las dos', 'Se deja en la mesa'], correcta: 0, porque: 'La izquierda sostiene la Biblia abierta y la derecha se pone sobre ella.' },
]

/** La Palabra: cada lectura se busca en la Biblia y luego se responde. */
export const BANCO_PALABRA: Pregunta[] = [
  { q: 'Lee Efesios 6:17. ¿Qué es la espada del Espíritu?', opciones: ['La Palabra de Dios', 'La fe', 'La oración', 'La verdad'], correcta: 0, porque: 'Por eso la espada del emblema representa la Biblia.' },
  { q: 'Lee 2 Corintios 5:14. ¿Qué nos impulsa, según Pablo?', opciones: ['El amor de Cristo', 'El miedo', 'La ley', 'El premio'], correcta: 0, porque: 'De aquí viene el lema: "El amor de Cristo me motiva".' },
  { q: 'Lee Daniel 1:8. ¿Qué decidió Daniel?', opciones: ['No contaminarse con la comida del rey', 'Huir de Babilonia', 'Hacerse soldado', 'No hablar con el rey'], correcta: 0, porque: 'Daniel propuso en su corazón ser fiel a Dios.' },
  { q: 'Lee Salmo 119:105. ¿Qué es la Palabra de Dios para mis pies?', opciones: ['Una lámpara', 'Un camino', 'Una roca', 'Un escudo'], correcta: 0, porque: '"Lámpara es a mis pies tu palabra, y lumbrera a mi camino".' },
  { q: 'Lee Juan 14:3. ¿Qué promete Jesús?', opciones: ['Que vendrá otra vez', 'Que nunca se irá', 'Que enviará ángeles', 'Que construirá un templo'], correcta: 0, porque: 'Por eso decimos: Maranata, Cristo viene.' },
  { q: 'Lee 1 Timoteo 4:12. ¿Qué pide Pablo a los jóvenes?', opciones: ['Ser ejemplo', 'Esperar a crecer', 'Callar', 'Viajar'], correcta: 0, porque: 'Ser ejemplo en palabra, conducta, amor, fe y pureza.' },
  { q: 'Lee 1 Samuel 17:45. ¿En nombre de quién enfrentó David a Goliat?', opciones: ['En el nombre del Señor', 'En nombre del rey Saúl', 'En nombre de su padre', 'En nombre de Israel'], correcta: 0, porque: 'David confió en Dios, no en la espada.' },
  { q: 'Lee Eclesiastés 12:1. ¿Cuándo debo acordarme de mi Creador?', opciones: ['En los días de mi juventud', 'Cuando sea anciano', 'Solo el sábado', 'Cuando tenga problemas'], correcta: 0, porque: 'Dios quiere ser tu amigo desde ahora.' },
  { q: 'Lee Mateo 28:19. ¿Qué nos manda Jesús?', opciones: ['Ir y hacer discípulos', 'Quedarnos en casa', 'Construir iglesias', 'Esperar en silencio'], correcta: 0, porque: 'Se relaciona con el Blanco: llevar el mensaje a todo el mundo.' },
  { q: 'Lee Proverbios 3:5. ¿En quién debo confiar de todo corazón?', opciones: ['En el Señor', 'En mí mismo', 'En mis amigos', 'En mi líder'], correcta: 0, porque: '"Fíate de Jehová de todo tu corazón".' },
]

export const VF_IDEALES: Afirmacion[] = [
  { t: 'El lema es "El amor de Cristo me motiva".', v: true, porque: 'Basado en 2 Corintios 5:14.' },
  { t: 'El objetivo es "Salvar del pecado y guiar en el servicio".', v: true, porque: 'Así es.' },
  { t: 'El voto empieza diciendo "Por mi esfuerzo seré puro".', v: false, porque: 'Empieza: "Por la gracia de Dios".' },
  { t: 'La Ley del Conquistador tiene 8 puntos.', v: true, porque: 'Son ocho.' },
  { t: 'El primer punto de la Ley es "Trabajar para Dios".', v: false, porque: 'El primero es observar la devoción matutina; "Trabajar para Dios" es el último.' },
  { t: 'El Blanco habla de llevar el mensaje del advenimiento a todo el mundo.', v: true, porque: '"…a todo el mundo en mi generación".' },
  { t: 'En el voto prometo ser "siervo de Dios y amigo de la humanidad".', v: true, porque: 'Así termina el voto.' },
  { t: 'La Ley pide "tener siempre una canción en el corazón".', v: true, porque: 'Es el punto 7.' },
  { t: 'Maranata significa "Cristo viene".', v: true, porque: 'Por eso respondemos "Cristo viene".' },
  { t: 'Para el voto se levanta el brazo izquierdo.', v: false, porque: 'Se levanta el antebrazo derecho.' },
  { t: 'La espada del emblema representa la Palabra de Dios.', v: true, porque: 'Efesios 6:17.' },
  { t: 'La Ley dice "andar con reverencia en la casa de Dios".', v: true, porque: 'Es el punto 6.' },
]
