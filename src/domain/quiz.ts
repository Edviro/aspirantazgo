export interface Pregunta {
  q: string
  opciones: string[]
  correcta: number
  porque: string
}

// Banco de preguntas basado en el Manual de Uniformes (DSA).
export const BANCO_UNIFORMES: Pregunta[] = [
  { q: '¿En qué manga va el emblema C1?', opciones: ['Derecha', 'Izquierda', 'En ninguna', 'En el bolsillo'], correcta: 0, porque: 'El C1 va en la manga derecha.' },
  { q: '¿A cuántos centímetros de la costura del hombro va la tira con el nombre del club?', opciones: ['1,5 cm', '3 cm', '5 cm', '0,5 cm'], correcta: 0, porque: 'La tira del club va a 1,5 cm de la costura.' },
  { q: '¿Qué emblema va en la manga izquierda, debajo del emblema del Campo?', opciones: ['C2', 'C1', 'C4', 'LC1'], correcta: 0, porque: 'El C2 va 1 cm debajo del emblema del Campo.' },
  { q: '¿De qué color es el distintivo de la clase Pionero?', opciones: ['Gris', 'Verde', 'Bordó', 'Amarillo'], correcta: 0, porque: 'Amigo azul, Compañero rojo, Explorador verde, Pionero gris, Excursionista bordó y Guía amarillo.' },
  { q: '¿De qué color es el distintivo de la clase Excursionista?', opciones: ['Bordó', 'Rojo', 'Azul', 'Gris'], correcta: 0, porque: 'Excursionista es bordó.' },
  { q: '¿Dónde van los distintivos de clases regulares?', opciones: ['Solapa del bolsillo izquierdo', 'Solapa del bolsillo derecho', 'Manga derecha', 'En la pañoleta'], correcta: 0, porque: 'Van en la solapa del bolsillo izquierdo, de izquierda a derecha.' },
  { q: '¿En qué orden se colocan los distintivos de clases regulares?', opciones: ['En el orden en que se recibieron, de izquierda a derecha', 'Por color favorito', 'De derecha a izquierda', 'El más reciente al centro'], correcta: 0, porque: 'Siempre de izquierda a derecha, en el orden de investidura.' },
  { q: '¿A qué distancia de la tapa del bolsillo izquierdo van las clases avanzadas?', opciones: ['0,5 cm encima', '2 cm encima', 'Dentro del bolsillo', '1 cm debajo'], correcta: 0, porque: 'Van a 0,5 cm encima de la tapa del bolsillo izquierdo.' },
  { q: '¿Dónde va la tira con tu nombre?', opciones: ['Encima de la solapa del bolsillo derecho', 'En la manga izquierda', 'Debajo del bolsillo izquierdo', 'En la gorra'], correcta: 0, porque: 'Encima de la solapa del bolsillo derecho.' },
  { q: '¿Dónde se coloca el distintivo de bautismo?', opciones: ['Centrado en la solapa del bolsillo derecho', 'En la manga derecha', 'Encima de las avanzadas', 'En la correa'], correcta: 0, porque: 'Centrado en la solapa del bolsillo derecho.' },
  { q: '¿Cómo es la divisa de un Guía Mayor?', opciones: ['Fondo blanco con estrella', 'Fondo caqui sin estrella', 'Fondo blanco sin estrella', 'Fondo rojo'], correcta: 0, porque: 'La divisa de Guía Mayor es blanca, con una estrella amarilla arriba.' },
  { q: '¿Cómo es la divisa de un líder que tiene las clases regulares pero NO es Guía Mayor?', opciones: ['Fondo blanco sin estrella', 'Fondo blanco con estrella', 'Fondo caqui con estrella', 'No lleva divisa'], correcta: 0, porque: 'Fondo blanco, sin estrella: la estrella es solo para Guías Mayores.' },
  { q: '¿En qué manga va la estrella de tiempo de servicio?', opciones: ['Derecha, 1 cm debajo del C1', 'Izquierda, debajo de la divisa', 'Derecha, encima del club', 'En el bolsillo'], correcta: 0, porque: 'Manga derecha, 1 cm debajo del emblema C1.' },
  { q: '¿Desde cuándo se puede usar la estrella de tiempo de servicio?', opciones: ['Desde el final del primer año de actividad en la directiva', 'Desde el primer día', 'Al ser investido Amigo', 'Solo el director'], correcta: 0, porque: 'Se permite al terminar el primer año de actividad en la directiva.' },
  { q: '¿Dónde va la insignia de excelencia?', opciones: ['Centrada encima de la tapa del bolsillo izquierdo', 'En la manga derecha', 'En la pañoleta', 'Debajo del bolsillo derecho'], correcta: 0, porque: 'Centrada encima de la tapa del bolsillo izquierdo (encima de las avanzadas si las hay).' },
  { q: '¿Cómo se colocan los distintivos de liderazgo (GM, Máster, Máster Avanzado)?', opciones: ['Centrados sobre las regulares, el de mayor grado a la derecha', 'El de mayor grado a la izquierda', 'En la manga derecha', 'En la banda únicamente'], correcta: 0, porque: 'El de mayor grado siempre a la derecha de los demás.' },
  { q: '¿Cómo se lleva la banda de especialidades?', opciones: ['Del hombro derecho a la cadera izquierda', 'Del hombro izquierdo a la cadera derecha', 'En la cintura', 'Colgada del cuello'], correcta: 0, porque: 'Apoyada en el hombro derecho y a la altura de la cadera izquierda.' },
  { q: '¿A cuántos cm debajo de la costura del hombro va la bandera en la banda?', opciones: ['6 cm', '1,5 cm', '10 cm', '3 cm'], correcta: 0, porque: 'La bandera del país va centrada a 6 cm de la costura del hombro.' },
  { q: '¿Cuántas bandas se pueden usar al mismo tiempo?', opciones: ['Solo una', 'Dos', 'Tres', 'Las que quieras'], correcta: 0, porque: 'No se deben usar dos bandas al mismo tiempo.' },
  { q: '¿Desde cuándo se puede usar el uniforme de gala (Uniforme A)?', opciones: ['Desde la ceremonia de admisión de la pañoleta', 'Desde el primer sábado', 'Al cumplir 12 años', 'Al ser Guía Mayor'], correcta: 0, porque: 'Solo a partir de la ceremonia de admisión de la pañoleta.' },
  { q: '¿De qué color es la camisa de los Conquistadores de 10 a 15 años?', opciones: ['Caqui', 'Blanca', 'Verde', 'Azul'], correcta: 0, porque: 'Caqui. Los directivos y Guías Mayores (más de 16) usan blanca.' },
  { q: '¿Qué significan los cuatro dedos del saludo Maranata?', opciones: ['Amar, anunciar, apresurar y aguardar el regreso de Cristo', 'Los cuatro puntos cardinales', 'Las cuatro clases', 'Los cuatro evangelios'], correcta: 0, porque: 'Son las cuatro "a" de Maranata.' },
  { q: '¿Qué color tiene el pantalón o falda del uniforme de gala?', opciones: ['Verde petróleo', 'Negro', 'Caqui', 'Azul marino'], correcta: 0, porque: 'Verde petróleo.' },
  { q: '¿Qué va 1 cm debajo del emblema C2?', opciones: ['La divisa de clase', 'La estrella', 'La tira de cargo', 'El C1'], correcta: 0, porque: 'La divisa de clase va 1 cm debajo del C2.' },
]

export function mezclarPreguntas(n: number, rnd = Math.random): Pregunta[] {
  return [...BANCO_UNIFORMES].sort(() => rnd() - 0.5).slice(0, n).map(p => {
    const orden = p.opciones.map((_, i) => i).sort(() => rnd() - 0.5)
    return { ...p, opciones: orden.map(i => p.opciones[i]), correcta: orden.indexOf(p.correcta) }
  })
}
