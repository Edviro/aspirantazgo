import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { esAdulto, esGuiaMayor } from '../../domain/tipos'

export const PIELES = ['#F3D1B5', '#E8B793', '#D39A73', '#B87A55', '#8A5A3C', '#5E3B26']
export const PELOS = ['#1B1410', '#3B2414', '#6B4423', '#A8743F', '#D9B26A', '#7A2E1F']

const C = {
  caqui: '#D9C49A', caquiS: '#BFA676', blanca: '#F3F1EA', blancaS: '#D9D7CE',
  verde: '#14504A', verdeS: '#0E3B36', zapato: '#2A2320',
  panoleta: '#F2C230', panoletaS: '#D9A91C', bordeGM: '#D7242F',
  rojo: '#D7242F', mejilla: '#E79A9A', out: '#20160E',
  oro: '#F2C230', plata: '#CFD6DF', torzalR: '#C62230', torzalB: '#F0ECE0',
}

/** El personaje mide 48×64 "pixeles". Se dibuja con bloques enteros para el look pixel-art. */
export const PX_W = 48
export const PX_H = 64

type Opts = { genero?: 'm' | 'f'; piel?: number; pelo?: number; peinado?: number; adulto?: boolean; gm?: boolean; torzal?: boolean; galon?: 'plata' | 'oro' | null; panoleta?: boolean }

export function opcionesDe(a: AvatarConfig, rango: Rango): Opts {
  const adulto = esAdulto(rango), gm = esGuiaMayor(rango)
  const galon = (a.uniforme?.cargo ?? '').toUpperCase()
  const g = /DEPARTAMENTAL|REGIONAL/.test(galon) ? 'oro' as const : /DIRECTOR|DISTRITAL/.test(galon) ? 'plata' as const : null
  return {
    genero: a.genero === 'f' ? 'f' : 'm', piel: a.piel ?? 2, pelo: a.colorPelo ?? 0, peinado: a.pelo ?? 0,
    adulto, gm, torzal: adulto, galon: g, panoleta: rango !== 'conquistador' || a.panoleta !== false,
  }
}

export function dibujarAvatar(ctx: CanvasRenderingContext2D, o: Opts) {
  const px = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
  ctx.clearRect(0, 0, PX_W, PX_H)
  const piel = PIELES[o.piel ?? 2] ?? PIELES[2]
  const pelo = PELOS[o.pelo ?? 0] ?? PELOS[0]
  const camisa = o.adulto ? C.blanca : C.caqui, camisaS = o.adulto ? C.blancaS : C.caquiS
  const chica = o.genero === 'f'
  const estilo = o.peinado ?? 0

  // Piernas / falda
  if (chica) {
    px(14, 40, 20, 9, C.verdeS); px(15, 40, 18, 8, C.verde)
    px(18, 48, 5, 8, piel); px(25, 48, 5, 8, piel)
  } else {
    px(17, 40, 14, 16, C.verdeS); px(18, 40, 12, 15, C.verde); px(24, 42, 1, 13, C.verdeS)
  }
  px(17, 55, 6, 4, C.zapato); px(25, 55, 6, 4, C.zapato)

  // Cuerpo / camisa
  px(13, 28, 22, 14, camisaS); px(14, 28, 20, 13, camisa)
  px(14, 28, 2, 13, camisaS); px(32, 28, 2, 13, camisaS)
  px(17, 34, 6, 5, camisaS); px(25, 34, 6, 5, camisaS)
  px(18, 35, 4, 3, camisa); px(26, 35, 4, 3, camisa)
  for (let i = 0; i < 3; i++) px(23, 30 + i * 4, 2, 2, camisaS)
  px(14, 41, 20, 2, C.verdeS); px(22, 41, 4, 2, C.oro)

  // Brazos
  px(10, 28, 4, 12, camisaS); px(34, 28, 4, 12, camisaS)
  px(10, 38, 4, 4, piel); px(34, 38, 4, 4, piel)

  // Galón en los hombros (plata/oro)
  if (o.galon) {
    const col = o.galon === 'oro' ? C.oro : C.plata
    px(11, 28, 3, 2, col); px(34, 28, 3, 2, col)
  }

  // Pañoleta
  if (o.panoleta) {
    for (let i = 0; i < 7; i++) px(19 + i, 26 + i, 10 - 2 * i, 1, C.panoleta)
    px(22, 26, 4, 2, C.panoletaS); px(23, 33, 2, 4, C.panoleta)
    if (o.gm) { for (let i = 0; i < 7; i++) { px(19 + i, 26 + i, 1, 1, C.bordeGM); px(28 - i, 26 + i, 1, 1, C.bordeGM) } }
    px(23, 28, 2, 2, o.gm ? '#2a3a8a' : C.rojo)
  }

  // Torzal (cordón blanco y rojo, solo adultos)
  if (o.torzal) {
    px(20, 28, 1, 9, C.torzalR); px(21, 29, 1, 8, C.torzalB)
    px(16, 38, 2, 2, C.plata) // silbato
  }

  // Cabeza
  px(18, 12, 12, 14, piel); px(17, 14, 1, 10, piel); px(30, 14, 1, 10, piel)
  px(21, 25, 6, 3, piel)
  px(19, 20, 2, 2, C.mejilla); px(27, 20, 2, 2, C.mejilla)
  px(21, 18, 2, 3, C.out); px(25, 18, 2, 3, C.out)
  px(21, 18, 1, 1, '#fff'); px(25, 18, 1, 1, '#fff')
  px(23, 23, 2, 1, C.rojo)

  // Pelo
  px(17, 10, 14, 5, pelo); px(16, 12, 2, 6, pelo); px(30, 12, 2, 6, pelo)
  if (chica || estilo >= 3) { px(15, 14, 2, 14, pelo); px(31, 14, 2, 14, pelo); px(15, 26, 4, 6, pelo); px(29, 26, 4, 6, pelo) }
  if (estilo === 1) { px(17, 9, 14, 2, pelo); px(19, 8, 3, 2, pelo); px(26, 8, 3, 2, pelo) }
  px(18, 14, 12, 2, pelo); px(22, 15, 4, 1, piel)
}
