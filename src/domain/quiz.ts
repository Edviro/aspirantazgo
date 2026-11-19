import type { Pieza } from './tipos'
import { pieza } from './uniformes'

export interface Pregunta {
  q: string
  opciones: string[]
  correcta: number
  porque: string
  /** Imagen de apoyo: una pieza o varias en fila. */
  img?: Pieza | Pieza[]
  /** Ilustración cuando no hay una pieza que mostrar. */
  ilus?: Ilustracion
  /** De qué uniforme habla la pregunta. */
  para?: 'conquis' | 'lider'
}

export type Ilustracion = 'camisa' | 'banda' | 'saludo' | 'pantalon'

// Banco de preguntas basado en el Manual de Uniformes (DSA).
export const BANCO_UNIFORMES: Pregunta[] = [
  { q: '¿En qué manga va este emblema (C1)?', opciones: ['Derecha', 'Izquierda', 'En ninguna', 'En el bolsillo'], correcta: 0, porque: 'El C1 va en la manga derecha.', img: pieza.c1() },
  { q: '¿A cuántos centímetros de la costura del hombro va la tira con el nombre del club?', opciones: ['1,5 cm', '3 cm', '5 cm', '0,5 cm'], correcta: 0, porque: 'La tira del club va a 1,5 cm de la costura.', img: pieza.tiraClub('TU CLUB') },
  { q: '¿Qué emblema va en la manga izquierda, debajo del emblema del Campo?', opciones: ['C2', 'C1', 'C4', 'LC1'], correcta: 0, porque: 'El C2 va 1 cm debajo del emblema del Campo.', img: pieza.c2('caqui') },
  { q: '¿De qué color es el distintivo de esta clase (Pionero)?', opciones: ['Gris', 'Verde', 'Bordó', 'Amarillo'], correcta: 0, porque: 'Amigo azul, Compañero rojo, Explorador verde, Pionero gris, Excursionista bordó y Guía amarillo.', img: pieza.boton('pionero') },
  { q: '¿De qué color es el distintivo de la clase Excursionista?', opciones: ['Bordó', 'Rojo', 'Azul', 'Gris'], correcta: 0, porque: 'Excursionista es bordó.', img: pieza.boton('excursionista') },
  { q: '¿Dónde van estos distintivos de clases regulares?', opciones: ['Solapa del bolsillo izquierdo', 'Solapa del bolsillo derecho', 'Manga derecha', 'En la pañoleta'], correcta: 0, porque: 'Van en la solapa del bolsillo izquierdo, de izquierda a derecha.', img: [pieza.boton('amigo'), pieza.boton('companero'), pieza.boton('explorador')] },
  { q: '¿En qué orden se colocan los distintivos de clases regulares?', opciones: ['En el orden en que se recibieron, de izquierda a derecha', 'Por color favorito', 'De derecha a izquierda', 'El más reciente al centro'], correcta: 0, porque: 'Siempre de izquierda a derecha, en el orden de investidura.', img: [pieza.boton('amigo'), pieza.boton('companero'), pieza.boton('explorador'), pieza.boton('pionero')] },
  { q: '¿A qué distancia de la tapa del bolsillo izquierdo va esta clase avanzada?', opciones: ['0,5 cm encima', '2 cm encima', 'Dentro del bolsillo', '1 cm debajo'], correcta: 0, porque: 'Van a 0,5 cm encima de la tapa del bolsillo izquierdo.', img: pieza.avanzada('explorador') },
  { q: '¿Dónde va la tira con tu nombre?', opciones: ['Encima de la solapa del bolsillo derecho', 'En la manga izquierda', 'Debajo del bolsillo izquierdo', 'En la gorra'], correcta: 0, porque: 'Encima de la solapa del bolsillo derecho.', img: pieza.nombre('TU NOMBRE', 'caqui') },
  { q: '¿Dónde se coloca este distintivo de bautismo?', opciones: ['Centrado en la solapa del bolsillo derecho', 'En la manga derecha', 'Encima de las avanzadas', 'En la correa'], correcta: 0, porque: 'Centrado en la solapa del bolsillo derecho.', img: pieza.bautismo() },
  { q: '¿Cómo es la divisa de un Guía Mayor?', opciones: ['Fondo blanco con estrella', 'Fondo caqui sin estrella', 'Fondo blanco sin estrella', 'Fondo rojo'], correcta: 0, porque: 'La divisa de Guía Mayor es blanca, con una estrella amarilla arriba.', img: pieza.divisa('guia_mayor', 6), para: 'lider' },
  { q: '¿Cómo es la divisa de un líder que tiene las clases regulares pero NO es Guía Mayor?', opciones: ['Fondo blanco sin estrella', 'Fondo blanco con estrella', 'Fondo caqui con estrella', 'No lleva divisa'], correcta: 0, porque: 'Fondo blanco, sin estrella: la estrella es solo para Guías Mayores.', img: pieza.divisa('lider', 6), para: 'lider' },
  { q: '¿En qué manga va esta estrella de tiempo de servicio?', opciones: ['Derecha, 1 cm debajo del C1', 'Izquierda, debajo de la divisa', 'Derecha, encima del club', 'En el bolsillo'], correcta: 0, porque: 'Manga derecha, 1 cm debajo del emblema C1.', img: pieza.estrella(5), para: 'lider' },
  { q: '¿Desde cuándo se puede usar la estrella de tiempo de servicio?', opciones: ['Desde el final del primer año de actividad en la directiva', 'Desde el primer día', 'Al ser investido Amigo', 'Solo el director'], correcta: 0, porque: 'Se permite al terminar el primer año de actividad en la directiva.', img: pieza.estrella(1), para: 'lider' },
  { q: '¿Dónde va esta insignia de excelencia?', opciones: ['Centrada encima de la tapa del bolsillo izquierdo', 'En la manga derecha', 'En la pañoleta', 'Debajo del bolsillo derecho'], correcta: 0, porque: 'Centrada encima de la tapa del bolsillo izquierdo (encima de las avanzadas si las hay).', img: pieza.excelencia() },
  { q: '¿Cómo se colocan los distintivos de liderazgo (GM, Máster, Máster Avanzado)?', opciones: ['Centrados sobre las regulares, el de mayor grado a la derecha', 'El de mayor grado a la izquierda', 'En la manga derecha', 'En la banda únicamente'], correcta: 0, porque: 'El de mayor grado siempre a la derecha de los demás.', img: [pieza.liderazgo('gm'), pieza.liderazgo('master'), pieza.liderazgo('master_avanzado')], para: 'lider' },
  { q: '¿Cómo se lleva la banda de especialidades?', opciones: ['Del hombro derecho a la cadera izquierda', 'Del hombro izquierdo a la cadera derecha', 'En la cintura', 'Colgada del cuello'], correcta: 0, porque: 'Apoyada en el hombro derecho y a la altura de la cadera izquierda.', ilus: 'banda' },
  { q: '¿A cuántos cm debajo de la costura del hombro va la bandera en la banda?', opciones: ['6 cm', '1,5 cm', '10 cm', '3 cm'], correcta: 0, porque: 'La bandera del país va centrada a 6 cm de la costura del hombro.', img: pieza.bandera() },
  { q: '¿Cuántas bandas se pueden usar al mismo tiempo?', opciones: ['Solo una', 'Dos', 'Tres', 'Las que quieras'], correcta: 0, porque: 'No se deben usar dos bandas al mismo tiempo.', ilus: 'banda' },
  { q: '¿Desde cuándo se puede usar el uniforme de gala (Uniforme A)?', opciones: ['Desde la ceremonia de admisión de la pañoleta', 'Desde el primer sábado', 'Al cumplir 12 años', 'Al ser Guía Mayor'], correcta: 0, porque: 'Solo a partir de la ceremonia de admisión de la pañoleta.', img: pieza.panoleta(false) },
  { q: '¿De qué color es la camisa de los Conquistadores de 10 a 15 años?', opciones: ['Caqui', 'Blanca', 'Verde', 'Azul'], correcta: 0, porque: 'Caqui. Los directivos y Guías Mayores (más de 16) usan blanca.', ilus: 'camisa' },
  { q: '¿Qué significan los cuatro dedos del saludo Maranata?', opciones: ['Amar, anunciar, apresurar y aguardar el regreso de Cristo', 'Los cuatro puntos cardinales', 'Las cuatro clases', 'Los cuatro evangelios'], correcta: 0, porque: 'Son las cuatro "a" de Maranata.', ilus: 'saludo' },
  { q: '¿Qué color tiene el pantalón o falda del uniforme de gala?', opciones: ['Verde petróleo', 'Negro', 'Caqui', 'Azul marino'], correcta: 0, porque: 'Verde petróleo.', ilus: 'pantalon' },
  { q: '¿Qué va 1 cm debajo del emblema C2?', opciones: ['La divisa de clase', 'La estrella', 'La tira de cargo', 'El C1'], correcta: 0, porque: 'La divisa de clase va 1 cm debajo del C2.', img: pieza.divisa('conquistador', 6) },
]

export function mezclarPreguntas(n: number, rnd = Math.random, banco: Pregunta[] = BANCO_UNIFORMES): Pregunta[] {
  return [...banco].sort(() => rnd() - 0.5).slice(0, n).map(p => {
    const orden = p.opciones.map((_, i) => i).sort(() => rnd() - 0.5)
    return { ...p, opciones: orden.map(i => p.opciones[i]), correcta: orden.indexOf(p.correcta) }
  })
}

export interface Afirmacion { t: string; v: boolean; porque: string; img?: Pieza | Pieza[]; ilus?: Ilustracion }

// Verdadero o falso: frases cortas para responder rápido.
export const BANCO_VF: Afirmacion[] = [
  { t: 'El emblema C1 va en la manga derecha.', v: true, porque: 'Correcto: manga derecha, debajo de la tira del club.', img: pieza.c1() },
  { t: 'El C2 va en la manga derecha.', v: false, porque: 'El C2 va en la manga izquierda, debajo del emblema del Campo.', img: pieza.c2('caqui') },
  { t: 'La clase Explorador es de color verde.', v: true, porque: 'Amigo azul, Compañero rojo, Explorador verde.', img: pieza.boton('explorador') },
  { t: 'La clase Guía es de color gris.', v: false, porque: 'Guía es amarilla. La gris es Pionero.', img: pieza.boton('guia') },
  { t: 'Los distintivos de clase se ordenan de izquierda a derecha según cuándo los recibiste.', v: true, porque: 'Siempre en orden de investidura.', img: [pieza.boton('amigo'), pieza.boton('companero'), pieza.boton('explorador')] },
  { t: 'Un Conquistador de 12 años puede llevar la estrella de tiempo de servicio.', v: false, porque: 'La estrella es para la directiva, desde su primer año de actividad.', img: pieza.estrella(1) },
  { t: 'La divisa de Guía Mayor tiene una estrella.', v: true, porque: 'Fondo blanco con estrella amarilla arriba.', img: pieza.divisa('guia_mayor', 6) },
  { t: 'Un líder que no es Guía Mayor usa divisa con estrella.', v: false, porque: 'Usa la divisa blanca SIN estrella.', img: pieza.divisa('lider', 6) },
  { t: 'La banda se lleva del hombro derecho a la cadera izquierda.', v: true, porque: 'Apoyada en el hombro derecho, a la altura de la cadera izquierda.', ilus: 'banda' },
  { t: 'Puedes usar dos bandas al mismo tiempo.', v: false, porque: 'Solo una banda a la vez.', ilus: 'banda' },
  { t: 'La bandera del país en la banda va a 6 cm de la costura del hombro.', v: true, porque: 'Centrada y a 6 cm.', img: pieza.bandera() },
  { t: 'La tira con tu nombre va en el bolsillo izquierdo.', v: false, porque: 'Va encima de la solapa del bolsillo derecho.', img: pieza.nombre('TU NOMBRE', 'caqui') },
  { t: 'El distintivo de bautismo va centrado en la solapa del bolsillo derecho.', v: true, porque: 'Así lo indica el manual.', img: pieza.bautismo() },
  { t: 'Las clases avanzadas van 0,5 cm encima de la tapa del bolsillo izquierdo.', v: true, porque: 'Exacto: 0,5 cm.', img: pieza.avanzada('amigo') },
  { t: 'El Guía Mayor Máster sigue usando el C2 en la manga izquierda.', v: false, porque: 'El emblema LC2 de Máster reemplaza al C2.', img: pieza.lcManga('master') },
  { t: 'En los botones de liderazgo, el de mayor grado va a la derecha.', v: true, porque: 'Siempre a la derecha de los demás.', img: [pieza.liderazgo('gm'), pieza.liderazgo('master'), pieza.liderazgo('master_avanzado')] },
  { t: 'La bandera oficial mide 128 × 90 cm.', v: true, porque: 'Y lleva el C1 de 30 × 30 cm al centro.', img: pieza.c1() },
  { t: 'En la bandera, la parte superior izquierda es blanca.', v: false, porque: 'Superior izquierda e inferior derecha son azul royal.' },
  { t: 'El banderín de unidad tiene una franja azul a la izquierda.', v: true, porque: 'Franja vertical de 36 × 10 cm en azul royal.' },
  { t: 'La camisa de los Conquistadores de 10 a 15 años es blanca.', v: false, porque: 'Es caqui. La blanca es para directivos y Guías Mayores.', ilus: 'camisa' },
  { t: 'El uniforme de gala se usa desde la ceremonia de la pañoleta.', v: true, porque: 'Solo después de la admisión de la pañoleta.', img: pieza.panoleta(false) },
  { t: 'Puedes tener la clase de Amigo sin haber recibido tu pañoleta.', v: false, porque: 'La pañoleta es el primer paso: la recibes en la ceremonia de admisión, antes de cualquier clase o especialidad.', img: pieza.panoleta(false) },
  { t: 'La correa lleva una hebilla con el emblema C3.', v: true, porque: 'Correa verde petróleo con hebilla C3.', img: pieza.correa() },
]

export function mezclarVF(n: number, rnd = Math.random, banco: Afirmacion[] = BANCO_VF): Afirmacion[] {
  return [...banco].sort(() => rnd() - 0.5).slice(0, n)
}
