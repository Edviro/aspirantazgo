/**
 * El escenario del Gran Campamento visto DE FRENTE (la cámara baja desde arriba hasta la altura del público):
 * cielo, árboles, la estructura del escenario con su pantalla, el atril y el público de espaldas.
 * Todo en pixel art lógico de 240×150; la pantalla, los nombres y los textos van encima en HTML (nítidos).
 */
import type { AvatarConfig } from '../../application/puertos'
import { esAdulto, type Rango } from '../../domain/tipos'
import { PELOS, PIELES } from './dibujo'

export const CW = 240, CH = 150
/** Rectángulo de la pantalla LED (16:9) y otros puntos del escenario, en pixeles lógicos. */
export const PANTALLA = { x: 79, y: 14, w: 82, h: 46 }
export const PISO = 97 // donde pisan los del escenario
export const ATRIL = { x: 112, y: 80, w: 16, h: 18 }

const TINTA = '#1E140C', ORO = '#F2B90F', ORO_O = '#C98F00'
type Px = (x: number, y: number, w: number, h: number, c: string) => void
const lapiz = (ctx: CanvasRenderingContext2D): Px => (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }

/** Fondo: cielo (día, atardecer o noche), árboles, escenario con telón, torres de sonido y la pantalla apagada. */
export function dibujarEscenario(ctx: CanvasRenderingContext2D, o: { noche: number; dorado: number; sabado: boolean; enVivo: boolean }) {
  const p = lapiz(ctx)
  ctx.clearRect(0, 0, CW, CH)
  // Cielo por franjas (pixel art: sin degradados suaves)
  const dia = ['#5fb6ea', '#74c1ee', '#8bcdf1', '#a3d8f3', '#bce3f5'], tarde = ['#3d4f9a', '#6b5aa8', '#c0699a', '#ee8f6e', '#f6b968'], noche = ['#0a1230', '#0e1838', '#132044', '#18284f', '#1d305a']
  const cielo = o.noche > 0.5 ? noche : o.dorado > 0.4 ? tarde : dia
  cielo.forEach((c, i) => p(0, i * 12, CW, 12, c))
  if (o.noche > 0.5) for (let i = 0; i < 40; i++) { const x = (i * 53) % CW, y = (i * 29) % 52; p(x, y, 1, 1, i % 5 ? '#c9d6ff' : '#ffffff') }
  // Árboles al fondo
  const verde = o.noche > 0.5 ? '#0f2a24' : '#1d5e3a', verdeC = o.noche > 0.5 ? '#163a30' : '#2a7a4a'
  p(0, 56, CW, 50, verde)
  for (let x = -6; x < CW; x += 11) { const h = 10 + ((x * 7) % 9); for (let k = 0; k < h; k++) p(x + 6 - Math.floor(k / 2), 56 - k, 1 + Math.floor(k / 2) * 2, 1, k % 3 ? verde : verdeC) }
  // Suelo de la plaza (adoquín) delante del escenario
  p(0, 100, CW, CH - 100, o.noche > 0.5 ? '#4a4237' : '#b39a70')
  for (let y = 100; y < CH; y += 4) for (let x = (y / 4) % 2 ? 0 : 6; x < CW; x += 12) { p(x, y, 11, 3, o.noche > 0.5 ? '#5d5446' : '#cdb48a'); p(x, y + 3, 11, 1, o.noche > 0.5 ? '#4a4237' : '#b39a70') }

  // Estructura: viga superior y torres
  p(16, 4, 208, 9, TINTA); p(17, 5, 206, 7, '#3a3f4a')
  for (let x = 20; x < 220; x += 8) { p(x, 6, 4, 1, '#5a6070'); p(x + 2, 9, 4, 1, '#5a6070') } // reticulado
  for (const x of [16, 210]) { p(x, 4, 14, 96, TINTA); p(x + 1, 5, 12, 94, '#2e323b'); for (let y = 12; y < 96; y += 10) { p(x + 2, y, 10, 8, '#16181d'); p(x + 5, y + 2, 4, 4, '#3c414c'); p(x + 6, y + 3, 2, 2, '#6c7380') } }
  // Luces en la viga
  for (const x of [40, 66, 172, 198]) { p(x, 12, 6, 4, TINTA); p(x + 1, 13, 4, 2, o.enVivo ? '#FFE680' : '#8d8670') }

  // Telón (rojo; azul el sábado) con pliegues
  const tela = o.sabado ? '#2a3f8f' : '#A3141E', telaC = o.sabado ? '#3b55b5' : '#D7242F', telaO = o.sabado ? '#1c2c6b' : '#7a0f17'
  p(30, 13, 180, 85, telaO)
  for (let x = 30; x < 210; x += 6) { p(x, 13, 3, 85, tela); p(x + 1, 13, 1, 85, telaC) }
  // Cenefa dorada festoneada
  p(30, 13, 180, 3, ORO); for (let x = 30; x < 210; x += 10) { p(x, 16, 10, 1, ORO_O); p(x + 2, 17, 6, 1, ORO_O); p(x + 4, 18, 2, 1, ORO_O) }
  // Estandartes a los lados de la pantalla: Conquistadores y (el sábado) la cruz
  for (const x of [44, 182]) {
    p(x, 20, 14, 40, TINTA); p(x + 1, 21, 12, 38, '#F3F1EA')
    p(x + 1, 21, 6, 19, '#D7242F'); p(x + 7, 40, 6, 19, '#1F4FB8'); p(x + 7, 21, 6, 19, '#ffffff'); p(x + 1, 40, 6, 19, '#ffffff')
    p(x + 4, 31, 6, 9, ORO); p(x + 5, 33, 4, 5, '#D7242F') // escudo
    p(x, 59, 3, 3, TINTA); p(x + 11, 59, 3, 3, TINTA); p(x + 5, 60, 4, 4, TINTA)
  }
  if (o.sabado) for (const x of [64, 170]) { p(x + 2, 30, 2, 16, '#ffffff'); p(x - 1, 34, 8, 2, '#ffffff') }
  // Marco de la pantalla LED
  const { x: sx, y: sy, w: sw, h: sh } = PANTALLA
  p(sx - 3, sy - 3, sw + 6, sh + 6, TINTA); p(sx - 2, sy - 2, sw + 4, sh + 4, '#2e323b'); p(sx, sy, sw, sh, '#0b0d12')
  p(sx + sw / 2 - 2, sy + sh + 3, 4, 10, TINTA)

  // Piso del escenario (visto un poco desde arriba) y frente de madera con escalones
  p(26, 92, 188, 6, TINTA); for (let x = 27; x < 213; x += 9) p(x, 93, 8, 4, (x / 9) % 2 ? '#c98d55' : '#b97d47')
  p(26, 98, 188, 14, TINTA); for (let x = 27; x < 213; x += 7) { p(x, 99, 6, 12, '#8a5a2e'); p(x, 99, 6, 1, '#a36c39') }
  p(104, 104, 32, 3, TINTA); p(105, 105, 30, 2, '#c98d55'); p(100, 108, 40, 4, TINTA); p(101, 109, 38, 3, '#b97d47')
  // Monitores de piso
  for (const x of [52, 176]) { p(x, 89, 12, 6, TINTA); p(x + 1, 90, 10, 4, '#2e323b'); p(x + 3, 91, 6, 2, '#16181d') }
}

/** Lo que va DELANTE de quien predica: el atril de madera con el emblema (y plantas). */
export function dibujarAtril(ctx: CanvasRenderingContext2D) {
  const p = lapiz(ctx)
  ctx.clearRect(0, 0, CW, CH)
  const { x, y, w, h } = ATRIL
  p(x - 1, y, w + 2, 3, TINTA); p(x, y + 1, w, 1, '#c98d55')
  p(x + 1, y + 3, w - 2, h - 3, TINTA); p(x + 2, y + 3, w - 4, h - 4, '#8a5a2e'); p(x + 3, y + 4, 1, h - 6, '#a36c39')
  p(x + 5, y + 6, 6, 7, ORO); p(x + 6, y + 7, 4, 5, '#D7242F'); p(x + 7, y + 8, 2, 3, ORO) // emblema
  p(x + w - 4, y - 7, 1, 7, '#333'); p(x + w - 5, y - 9, 3, 3, TINTA) // micrófono
  for (const px of [30, 196]) { p(px, 82, 14, 12, '#2a7a4a'); p(px + 2, 78, 10, 6, '#1d5e3a'); p(px + 3, 92, 8, 6, '#8a5a2e'); p(px + 2, 92, 10, 1, TINTA) }
}

/** Puestos del público: filas de espaldas mirando al escenario (el tuyo, adelante al centro). */
export function puestosPublico(n: number) {
  const filas = [{ y: 116, x0: 9, paso: 16, cupo: 14 }, { y: 125, x0: 1, paso: 16, cupo: 15 }, { y: 134, x0: 9, paso: 16, cupo: 14 }]
  const r: { x: number; y: number; fila: number }[] = []
  // Primero la fila de adelante desde el centro hacia los lados; luego las de atrás
  for (const f of [2, 1, 0]) {
    const fila = filas[f], centro = Math.floor(fila.cupo / 2)
    for (let k = 0; k < fila.cupo; k++) {
      const i = centro + (k % 2 ? Math.ceil(k / 2) : -k / 2)
      r.push({ x: fila.x0 + i * fila.paso, y: fila.y, fila: f })
    }
  }
  return r.slice(0, n)
}

/** Una persona de espaldas (14×18): pelo, cuello, camisa y el triángulo de la pañoleta en la espalda. */
function espalda(p: Px, x: number, y: number, a: AvatarConfig, rango: Rango, f: 0 | 1) {
  const pelo = PELOS[a.colorPelo ?? 0] ?? PELOS[0], piel = PIELES[a.piel ?? 2] ?? PIELES[2]
  const adulto = esAdulto(rango), chica = a.genero === 'f'
  const camisa = adulto ? '#F3F1EA' : '#D9C49A', camisaS = adulto ? '#D9D7CE' : '#BFA676'
  const dy = f
  // Hombros y espalda
  p(x, y + 10, 14, 9, TINTA); p(x + 1, y + 11, 12, 8, camisa); p(x + 1, y + 11, 1, 8, camisaS); p(x + 12, y + 11, 1, 8, camisaS)
  // Pañoleta: triángulo amarillo en la espalda
  p(x + 3, y + 11, 8, 1, '#F2C230'); p(x + 4, y + 12, 6, 1, '#F2C230'); p(x + 5, y + 13, 4, 1, '#D9A91C'); p(x + 6, y + 14, 2, 1, '#D9A91C')
  // Cuello y cabeza (pelo por detrás)
  p(x + 5, y + 8 + dy, 4, 3, piel)
  p(x + 2, y + dy, 10, 9, TINTA); p(x + 3, y + 1 + dy, 8, 7, pelo)
  p(x + 2, y + 4 + dy, 1, 2, piel); p(x + 11, y + 4 + dy, 1, 2, piel) // orejas
  const estilo = a.pelo ?? (chica ? 3 : 0)
  if (chica) {
    if (estilo === 4) { p(x + 6, y + 8 + dy, 2, 5, TINTA); p(x + 6, y + 8 + dy, 2, 4, pelo) } // cola
    else if (estilo === 3) { p(x + 3, y + 8 + dy, 2, 5, pelo); p(x + 9, y + 8 + dy, 2, 5, pelo) } // trenzas
    else if (estilo === 6) { p(x + 5, y - 2 + dy, 4, 3, TINTA); p(x + 6, y - 1 + dy, 2, 2, pelo) } // moño
    else { p(x + 2, y + 7 + dy, 10, 4, TINTA); p(x + 3, y + 7 + dy, 8, 3, pelo) } // suelto
  } else if (estilo === 2) { p(x + 3, y + 1 + dy, 8, 2, piel); p(x + 3, y + 3 + dy, 8, 1, pelo) } // rapado
  p(x + 4, y + 1 + dy, 3, 1, 'rgba(255,255,255,.25)') // brillo
}

/** El público de espaldas en dos cuadros (respiran y se mueven un poco). */
export function dibujarPublico(ctx: CanvasRenderingContext2D, gente: { avatar?: AvatarConfig; rango: Rango }[], frame: 0 | 1) {
  const p = lapiz(ctx)
  ctx.clearRect(0, 0, CW, CH)
  const puestos = puestosPublico(gente.length)
  // De atrás hacia adelante para que se tapen bien
  const orden = puestos.map((s, i) => ({ s, i })).sort((a, b) => a.s.y - b.s.y)
  for (const { s, i } of orden) espalda(p, s.x, s.y, gente[i].avatar ?? {}, gente[i].rango, (frame + i) % 3 === 0 ? 1 : 0)
}
