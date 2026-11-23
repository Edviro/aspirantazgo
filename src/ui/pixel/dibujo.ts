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

type Opts = {
  genero?: 'm' | 'f'; piel?: number; pelo?: number; peinado?: number; adulto?: boolean; gm?: boolean
  torzal?: boolean; galon?: 'plata' | 'oro' | null; panoleta?: boolean; blazer?: boolean; clases?: number; brazoArriba?: boolean
  avanzadas?: number; excelencia?: boolean; bautismo?: boolean
}
const COLOR_CLASE = ['#1F4FBF', '#D7242F', '#1E7A3C', '#8A8F98', '#7A2E3B', '#F2C230']

export function opcionesDe(a: AvatarConfig, rango: Rango): Opts {
  const adulto = esAdulto(rango), gm = esGuiaMayor(rango)
  const cargo = (a.uniforme?.cargo ?? (adulto ? (rango === 'lider' ? 'CONSEJERO' : 'DIRECTOR') : '')).toUpperCase()
  // Manual: Director C5 plateado, Distrital 1 tira plata, Regional 2 plata, Departamental 2 doradas.
  const galon = !adulto ? null : cargo === 'DEPARTAMENTAL' ? 'oro' as const : /^(DIRECTOR|DISTRITAL|REGIONAL)$/.test(cargo) ? 'plata' as const : null
  const clases = gm ? 6 : a.uniforme?.regulares?.length ?? (adulto ? 6 : 1)
  return {
    genero: a.genero === 'f' ? 'f' : 'm', piel: a.piel ?? 2, pelo: a.colorPelo ?? 0, peinado: a.pelo ?? 0,
    adulto, gm, torzal: adulto, galon, // La pañoleta es el primer paso: quien ya tiene una clase (o es líder) la lleva siempre
    panoleta: rango !== 'conquistador' || clases > 0 || a.panoleta !== false,
    blazer: adulto && cargo === 'DEPARTAMENTAL', clases,
    avanzadas: gm ? 0 : a.uniforme?.avanzadas?.length ?? 0, excelencia: !!a.uniforme?.excelencia,
    bautismo: adulto || a.uniforme?.bautismo !== false,
  }
}

export function dibujarAvatar(ctx: CanvasRenderingContext2D, o: Opts) {
  const px = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
  ctx.clearRect(0, 0, PX_W, PX_H)
  const piel = PIELES[o.piel ?? 2] ?? PIELES[2]
  const pelo = PELOS[o.pelo ?? 0] ?? PELOS[0]
  const camisa = o.adulto ? C.blanca : C.caqui, camisaS = o.adulto ? C.blancaS : C.caquiS
  // Departamental: saco verde petróleo sobre camisa blanca (uniforme del departamental)
  const tela = o.blazer ? '#0F4A47' : camisa, telaS = o.blazer ? '#0A3533' : camisaS
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

  // Tronco
  px(13, 28, 22, 14, telaS); px(14, 28, 20, 13, tela)
  px(14, 28, 2, 13, telaS); px(32, 28, 2, 13, telaS)
  if (o.blazer) {
    // camisa blanca en V entre las solapas, botones dorados
    for (let i = 0; i < 6; i++) px(21 + Math.floor(i / 2), 28 + i, 6 - 2 * Math.floor(i / 2), 1, C.blanca)
    px(20, 28, 1, 7, '#16605C'); px(27, 28, 1, 7, '#16605C')
    px(23, 36, 2, 1, C.oro); px(23, 39, 2, 1, C.oro)
  } else {
    for (let i = 0; i < 3; i++) px(23, 30 + i * 4, 2, 2, camisaS)
  }
  // bolsillos con tapa
  px(16, 33, 7, 6, telaS); px(17, 35, 5, 3, tela); px(16, 33, 7, 1, o.blazer ? '#16605C' : camisaS)
  px(26, 33, 7, 6, telaS); px(27, 35, 5, 3, tela); px(26, 33, 7, 1, o.blazer ? '#16605C' : camisaS)
  // tira del nombre (sobre el bolsillo derecho de quien lo usa = izquierda en pantalla)
  px(16, 31, 7, 1, o.adulto ? '#FFFFFF' : '#EBDDB5')
  // Insignias de clases regulares sobre el bolsillo izquierdo de quien lo usa (2 filas de 3); las avanzadas llevan borde dorado
  for (let i = 0; i < Math.min(6, o.clases ?? 0); i++) {
    const x = 24 + (i % 3) * 2, y = 29 + Math.floor(i / 3) * 2
    if (o.avanzadas && o.avanzadas > i) px(x, y + 1, 2, 1, C.oro)
    px(x, y, 2, 1, COLOR_CLASE[i])
  }
  // Barra de excelencia (sobre la tira del nombre) y botón de bautismo (en el bolsillo)
  if (o.excelencia) { px(16, 29, 7, 1, C.oro); px(18, 29, 3, 1, C.rojo) }
  if (o.bautismo) { px(19, 36, 2, 2, '#2F6FD6'); px(19, 36, 1, 1, '#FFFFFF') }
  // correa con hebilla
  px(14, 41, 20, 2, C.verdeS); px(22, 41, 4, 2, C.oro)

  // Brazos (el derecho de la pantalla se levanta al saludar: nunca se dibujan tres)
  px(10, 28, 4, 12, telaS); px(10, 38, 4, 4, piel)
  if (o.brazoArriba) { px(34, 17, 4, 12, telaS); px(35, 18, 2, 10, tela); px(34, 13, 4, 4, piel); px(33, 14, 1, 2, piel) }
  else { px(34, 28, 4, 12, telaS); px(34, 38, 4, 4, piel) }

  // Galón en los hombros (barras plata u oro sobre petróleo)
  if (o.galon) {
    const col = o.galon === 'oro' ? C.oro : C.plata
    px(12, 27, 6, 2, '#0E3B36'); px(30, 27, 6, 2, '#0E3B36')
    px(13, 27, 1, 2, col); px(15, 27, 1, 2, col); px(32, 27, 1, 2, col); px(34, 27, 1, 2, col)
  }

  // Pañoleta (GM: borde rojo y emblema LC1)
  if (o.panoleta) {
    for (let i = 0; i < 7; i++) px(19 + i, 26 + i, 10 - 2 * i, 1, C.panoleta)
    px(22, 26, 4, 2, C.panoletaS); px(23, 33, 2, 4, C.panoleta)
    if (o.gm) { for (let i = 0; i < 7; i++) { px(19 + i, 26 + i, 1, 1, C.bordeGM); px(28 - i, 26 + i, 1, 1, C.bordeGM) } }
    px(23, 28, 2, 2, o.gm ? '#2A3A8A' : C.rojo)
  }

  // Torzal blanco y rojo: del hombro al bolsillo, del lado izquierdo de quien lo usa (derecha en pantalla)
  if (o.torzal) {
    // cordón trenzado de 2 px: rojo y blanco alternados en diagonal
    for (let y = 27; y <= 35; y++) {
      const x = 32 - Math.floor((y - 27) / 2)
      px(x, y, 1, 1, y % 2 ? C.torzalR : C.torzalB); px(x + 1, y, 1, 1, y % 2 ? C.torzalB : C.torzalR)
    }
    px(26, 36, 3, 2, C.plata); px(26, 37, 1, 1, '#7A828C') // silbato
  }

  // Cabeza
  px(18, 12, 12, 14, piel); px(17, 14, 1, 10, piel); px(30, 14, 1, 10, piel)
  px(21, 25, 6, 3, piel)
  px(19, 20, 2, 2, C.mejilla); px(27, 20, 2, 2, C.mejilla)
  px(21, 18, 2, 3, C.out); px(25, 18, 2, 3, C.out)
  px(21, 18, 1, 1, '#fff'); px(25, 18, 1, 1, '#fff')
  px(23, 23, 2, 1, C.rojo)

  // Pelo (cada peinado se distingue de frente)
  const sombra = C.out
  px(17, 10, 14, 5, pelo); px(16, 12, 2, 6, pelo); px(30, 12, 2, 6, pelo)
  const peinadoChica = chica ? (estilo >= 3 && estilo <= 6 ? estilo : 5) : estilo
  if (peinadoChica === 3) {
    // Trenzas: dos trenzas por delante de los hombros, con ligas de color
    for (const x of [15, 31]) {
      px(x, 14, 2, 4, pelo)
      for (let y = 18; y < 34; y += 3) { px(x, y, 2, 2, pelo); px(x + (y % 2 ? 1 : 0), y + 2, 1, 1, sombra) }
      px(x, 33, 2, 1, C.rojo); px(x, 34, 2, 2, pelo)
    }
  } else if (peinadoChica === 4) {
    // Cola: pelo recogido (sin mechones a los lados) y la cola asomando por un costado
    px(16, 12, 1, 4, pelo); px(31, 12, 1, 4, pelo)
    px(31, 13, 2, 2, C.rojo) // liga
    px(32, 15, 3, 3, pelo); px(33, 18, 3, 4, pelo); px(34, 22, 2, 4, pelo); px(35, 26, 1, 2, pelo)
  } else if (peinadoChica === 5) {
    // Suelto: largo y liso hasta el pecho
    px(15, 14, 2, 14, pelo); px(31, 14, 2, 14, pelo); px(15, 26, 4, 6, pelo); px(29, 26, 4, 6, pelo)
  } else if (peinadoChica === 6) {
    // Moño: recogido arriba, con el moño redondo sobre la cabeza
    px(16, 12, 1, 3, pelo); px(31, 12, 1, 3, pelo)
    px(20, 5, 8, 5, pelo); px(19, 6, 10, 3, pelo); px(21, 4, 6, 1, pelo)
    px(21, 9, 6, 1, C.rojo) // cinta
  } else if (!chica && estilo >= 3) {
    px(15, 14, 2, 14, pelo); px(31, 14, 2, 14, pelo)
  }
  if (!chica && estilo === 1) { px(17, 9, 14, 2, pelo); px(19, 8, 3, 2, pelo); px(26, 8, 3, 2, pelo) }
  if (!chica && estilo === 2) { px(17, 10, 14, 2, piel); px(18, 10, 12, 1, pelo) } // rapado: se ve la piel
  px(18, 14, 12, 2, pelo); px(22, 15, 4, 1, piel)
  if (chica && peinadoChica !== 5) px(18, 14, 4, 2, pelo) // flequillo de lado
}

/** El mismo personaje visto de espaldas (para la cámara 3D): pelo atrás, espalda lisa y el triángulo de la pañoleta. */
export function dibujarAvatarEspalda(ctx: CanvasRenderingContext2D, o: Opts) {
  dibujarAvatar(ctx, { ...o, brazoArriba: false })
  const px = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
  const piel = PIELES[o.piel ?? 2] ?? PIELES[2], pelo = PELOS[o.pelo ?? 0] ?? PELOS[0]
  const tela = o.blazer ? '#0F4A47' : o.adulto ? C.blanca : C.caqui, telaS = o.blazer ? '#0A3533' : o.adulto ? C.blancaS : C.caquiS
  // Espalda lisa (sin bolsillos, botones ni tira)
  px(14, 28, 20, 13, tela); px(14, 28, 2, 13, telaS); px(32, 28, 2, 13, telaS); px(23, 29, 2, 12, telaS)
  px(14, 41, 20, 2, C.verdeS)
  // Pañoleta: el triángulo cae por la espalda
  if (o.panoleta) {
    for (let i = 0; i < 8; i++) px(16 + i, 27 + i, 16 - 2 * i, 1, i > 4 ? C.panoletaS : C.panoleta)
    if (o.gm) for (let i = 0; i < 8; i++) { px(16 + i, 27 + i, 1, 1, C.bordeGM); px(31 - i, 27 + i, 1, 1, C.bordeGM) }
  }
  // Cabeza de espaldas: todo pelo, con orejas y nuca
  px(21, 24, 6, 4, piel)
  px(17, 10, 14, 15, pelo); px(16, 12, 16, 10, pelo)
  px(15, 17, 1, 3, piel); px(32, 17, 1, 3, piel)
  px(19, 11, 4, 1, 'rgba(255,255,255,.22)')
  const chica = o.genero === 'f', estilo = o.peinado ?? 0
  if (chica) {
    if (estilo === 4) { px(22, 22, 4, 2, C.rojo); px(22, 24, 4, 10, pelo) } // cola
    else if (estilo === 6) { px(20, 6, 8, 5, pelo); px(21, 9, 6, 1, C.rojo) } // moño
    else if (estilo === 3) { px(18, 22, 3, 12, pelo); px(27, 22, 3, 12, pelo); px(18, 33, 3, 1, C.rojo); px(27, 33, 3, 1, C.rojo) } // trenzas
    else px(16, 22, 16, 8, pelo) // suelto
  } else if (estilo >= 3) px(16, 22, 16, 8, pelo)
}

/** Versión pequeña (14×20) para el mapa: mismo tamaño de pixel que la isla. */
export const MINI_W = 14
export const MINI_H = 20
export function dibujarMini(ctx: CanvasRenderingContext2D, o: Opts, paso = 0) {
  const piel = PIELES[o.piel ?? 2] ?? PIELES[2]
  const pelo = PELOS[o.pelo ?? 0] ?? PELOS[0]
  const chica = o.genero === 'f'
  const camisa = o.adulto ? C.blanca : C.caqui, sombra = o.adulto ? C.blancaS : C.caquiS
  const cuerpo = (p: (x: number, y: number, w: number, h: number, c: string) => void) => {
    p(3, 0, 8, 2, pelo); p(2, 1, 10, 2, pelo)
    p(3, 3, 8, 5, piel)
    p(2, 3, 1, chica || (o.peinado ?? 0) >= 3 ? 7 : 3, pelo); p(11, 3, 1, chica || (o.peinado ?? 0) >= 3 ? 7 : 3, pelo)
    p(5, 5, 1, 1, C.out); p(8, 5, 1, 1, C.out); p(6, 7, 2, 1, '#c0504a')
    const tela = o.blazer ? '#0F4A47' : camisa, telaS = o.blazer ? '#0A3533' : sombra
    p(3, 8, 8, 6, tela); p(3, 8, 1, 6, telaS); p(10, 8, 1, 6, telaS); if (o.blazer) p(6, 8, 2, 3, C.blanca)
    p(2, 8, 1, 5, telaS); p(11, 8, 1, 5, telaS); p(2, 13, 1, 1, piel); p(11, 13, 1, 1, piel)
    if (o.panoleta) { p(5, 8, 4, 1, C.panoleta); p(6, 9, 2, 2, C.panoleta); if (o.gm) { p(5, 8, 1, 1, C.bordeGM); p(8, 8, 1, 1, C.bordeGM) } }
    if (o.torzal) { p(9, 8, 1, 1, C.torzalR); p(9, 9, 1, 1, C.torzalB); p(8, 10, 1, 1, C.torzalR); p(8, 11, 1, 1, C.plata) }
    if (o.galon) { const g = o.galon === 'oro' ? C.oro : C.plata; p(3, 8, 1, 1, g); p(10, 8, 1, 1, g) }
    p(3, 13, 8, 1, C.verdeS); p(6, 13, 2, 1, C.oro)
    if (chica) { p(3, 14, 8, 2, C.verde); p(5, 16, 1, 2, piel); p(8, 16, 1, 2, piel) }
    else { p(4, 14, 2, 4 - paso, C.verde); p(8, 14, 2, 4 - (1 - paso), C.verde); p(6, 14, 2, 1, C.verde) }
    p(4, 18 - (chica ? 0 : paso), 2, 1, C.zapato); p(8, 18 - (chica ? 0 : 1 - paso), 2, 1, C.zapato)
  }
  ctx.clearRect(0, 0, MINI_W + 2, MINI_H + 2)
  // contorno de tinta para que se lea sobre el pasto
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) cuerpo((x, y, w, h) => { ctx.fillStyle = '#20160E'; ctx.fillRect(x + 1 + dx, y + 1 + dy, w, h) })
  cuerpo((x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + 1, y + 1, w, h) })
}
