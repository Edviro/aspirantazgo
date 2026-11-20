/**
 * Versículos para leer en la carpa (Reina-Valera 1960, citas breves con su referencia).
 * Cuando llegue el plan del año bíblico, se agrega aquí la lectura de cada día.
 */
export interface Versiculo { ref: string; texto: string; tema: 'dormir' | 'despertar' | 'valor' | 'amor' | 'guia' | 'sabado' | 'juventud' }
export const VERSICULOS: Versiculo[] = [
  { ref: 'Salmos 4:8', tema: 'dormir', texto: 'En paz me acostaré, y asimismo dormiré; porque solo tú, Jehová, me haces vivir confiado.' },
  { ref: 'Lamentaciones 3:22-23', tema: 'despertar', texto: 'Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad.' },
  { ref: 'Juan 3:16', tema: 'amor', texto: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.' },
  { ref: '2 Corintios 5:14', tema: 'amor', texto: 'Porque el amor de Cristo nos constriñe, pensando esto: que si uno murió por todos, luego todos murieron.' },
  { ref: 'Salmos 23:1', tema: 'guia', texto: 'Jehová es mi pastor; nada me faltará.' },
  { ref: 'Josué 1:9', tema: 'valor', texto: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.' },
  { ref: 'Filipenses 4:13', tema: 'valor', texto: 'Todo lo puedo en Cristo que me fortalece.' },
  { ref: 'Isaías 41:10', tema: 'valor', texto: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.' },
  { ref: 'Proverbios 3:5-6', tema: 'guia', texto: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.' },
  { ref: 'Salmos 119:105', tema: 'guia', texto: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.' },
  { ref: 'Eclesiastés 12:1', tema: 'juventud', texto: 'Acuérdate de tu Creador en los días de tu juventud, antes que vengan los días malos, y lleguen los años de los cuales digas: No tengo en ellos contentamiento.' },
  { ref: '1 Timoteo 4:12', tema: 'juventud', texto: 'Ninguno tenga en poco tu juventud, sino sé ejemplo de los creyentes en palabra, conducta, amor, espíritu, fe y pureza.' },
  { ref: 'Éxodo 20:8', tema: 'sabado', texto: 'Acuérdate del día de reposo para santificarlo.' },
  { ref: 'Salmos 46:1', tema: 'valor', texto: 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.' },
  { ref: 'Mateo 28:20', tema: 'guia', texto: 'Y he aquí yo estoy con vosotros todos los días, hasta el fin del mundo. Amén.' },
]
/** El versículo del día (cambia cada día, igual para todos). */
export function versiculoDelDia(fecha = new Date()) {
  const d = Math.floor((fecha.getTime() - fecha.getTimezoneOffset() * 60000) / 86400000)
  return VERSICULOS[d % VERSICULOS.length]
}
