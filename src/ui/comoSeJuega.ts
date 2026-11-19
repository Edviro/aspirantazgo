import type { TipoNivel } from '../domain/niveles'

/** Instrucciones cortas que se muestran antes de cada juego. Son pasos: van en orden. */
export const COMO_SE_JUEGA: Record<TipoNivel, { icono: string; pasos: string[] }> = {
  memoria: { icono: '🃏', pasos: ['Toca dos cartas para darles la vuelta.', 'Si la pieza y el lugar donde va coinciden, se quedan descubiertas.', 'Si no, se vuelven a tapar: recuerda dónde estaba cada una. Menos intentos, más puntos.'] },
  lluvia: { icono: '🌧️', pasos: [
    'Arriba aparece qué atrapar, por ejemplo "lo que va en la manga derecha".',
    'Toca solo esos emblemas antes de que lleguen al suelo.',
    'La orden cambia cada rato: mírala seguido. Si tocas uno que no va, pierdes puntos.',
  ] },
  taller: { icono: '🧵', pasos: [
    'Arrastra cada pieza a su cuadrito amarillo, o tócala y después toca su lugar.',
    'Si una pieza no va en este uniforme, llévala a "No va".',
    'Usa las pestañas para cambiar entre pecho y mangas.',
  ] },
  inspector: { icono: '🔎', pasos: [
    'Este uniforme tiene errores escondidos.',
    'Toca cada pieza que esté mal puesta o que no deba ir.',
    'Encuéntralos todos antes de que se acabe el tiempo.',
  ] },
  quiz: { icono: '❓', pasos: ['Lee la pregunta y mira la imagen si la hay.', 'Toca la respuesta correcta antes de que se vacíe la barra.'] },
  vf: { icono: '⚖️', pasos: ['Lee la frase.', 'Toca Verdadero o Falso. Entre más rápido, más puntos.'] },
  ordenar: { icono: '🔢', pasos: ['Toca las clases en el orden correcto, de Amigo a Guía.', 'Luego reconoce sus colores y elige la divisa correcta.'] },
  frase: { icono: '📜', pasos: ['Toca las palabras en orden para armar la frase.', 'Si te equivocas, la palabra vuelve a su lugar.'] },
  parejas: { icono: '🃏', pasos: ['Voltea dos cartas.', 'Si forman pareja se quedan; si no, se vuelven a tapar.'] },
  ceremonia: { icono: '🎖️', pasos: ['Sigue la ceremonia y recibe tu pañoleta.'] },
}
