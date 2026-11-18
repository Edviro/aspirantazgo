import {
  type ClaseId, type Colocacion, type LiderazgoId, type PanelId, type PerfilUniforme, type Pieza, type Rango,
  ORDEN_LIDERAZGO, esAdulto, esGuiaMayor,
} from './tipos'

/**
 * Medidas tomadas del Manual de Uniformes de Conquistadores (DSA),
 * láminas "Posición de los ítems en el uniforme". Todo en centímetros.
 * La y se mide desde la costura del hombro (mangas) o desde el hombro (pecho/banda).
 */
export const PANEL: Record<PanelId, { w: number; h: number }> = {
  manga_der: { w: 20, h: 26 },
  manga_izq: { w: 20, h: 26 },
  pecho: { w: 50, h: 42 },
  banda: { w: 12, h: 60 },
}

// Geometría del pecho (vista de frente: el bolsillo DERECHO de quien lo viste queda a la IZQUIERDA de la pantalla).
export const BOLSILLO = { der: { x: 8, w: 12 }, izq: { x: 30, w: 12 }, top: 16, solapa: 4, alto: 14 }

// ---------- Fábrica de piezas ----------
export const pieza = {
  tiraClub: (club: string): Pieza => ({ key: 'tira_club', tipo: 'tira_club', texto: club, w: 10, h: 5 }),
  tiraCargo: (cargo: string): Pieza => ({ key: 'tira_cargo', tipo: 'tira_cargo', texto: cargo, w: 7.5, h: 2 }),
  c1: (): Pieza => ({ key: 'c1', tipo: 'c1', w: 7.2, h: 7.5 }),
  estrella: (n = 1): Pieza => ({ key: 'estrella', tipo: 'estrella', nivel: n, w: 3, h: 3 }),
  campo: (): Pieza => ({ key: 'campo', tipo: 'campo', w: 7.5, h: 5.5 }),
  c2: (fondo: 'caqui' | 'blanco'): Pieza => ({ key: 'c2_' + fondo, tipo: 'c2', fondo, w: 6.4, h: 5 }),
  divisa: (v: 'conquistador' | 'lider' | 'guia_mayor', nivel: number): Pieza => ({
    key: `divisa_${v}_${nivel}`, tipo: 'divisa', divisa: v, nivel, w: 4, h: v === 'guia_mayor' ? 8.5 : 4.6,
  }),
  boton: (clase: ClaseId): Pieza => ({ key: 'boton_' + clase, tipo: 'boton_clase', clase, w: 1.6, h: 1.6 }),
  avanzada: (clase: ClaseId): Pieza => ({ key: 'avanzada_' + clase, tipo: 'barra_avanzada', clase, w: 2.4, h: 0.8 }),
  liderazgo: (l: LiderazgoId): Pieza => ({ key: 'lid_' + l, tipo: 'boton_liderazgo', liderazgo: l, w: 1.7, h: 1.7 }),
  excelencia: (): Pieza => ({ key: 'excelencia', tipo: 'excelencia', w: 3.6, h: 0.9 }),
  nombre: (nombre: string, fondo: 'caqui' | 'blanco'): Pieza => ({ key: 'tira_nombre', tipo: 'tira_nombre', texto: nombre, fondo, w: 8, h: 1.6 }),
  funcion: (f: string): Pieza => ({ key: 'funcion', tipo: 'funcion', texto: f, w: 6.5, h: 1.4 }),
  bautismo: (): Pieza => ({ key: 'bautismo', tipo: 'bautismo', w: 2, h: 2 }),
  panoleta: (gm: boolean): Pieza => ({ key: gm ? 'panoleta_gm' : 'panoleta', tipo: 'panoleta', liderazgo: gm ? 'gm' : undefined, w: 14, h: 10 }),
  correa: (): Pieza => ({ key: 'correa', tipo: 'correa', w: 34, h: 2.6 }),
  bandera: (): Pieza => ({ key: 'bandera', tipo: 'bandera_pais', w: 3.6, h: 2.4 }),
  especialidad: (n: number): Pieza => ({ key: 'esp_' + n, tipo: 'especialidad', nivel: n, w: 3.4, h: 3.4 }),
  c2Banda: (): Pieza => ({ key: 'c2_banda', tipo: 'c2_banda', w: 5, h: 4 }),
}

const CX_MANGA = PANEL.manga_der.w / 2
const centro = (topCm: number, p: Pieza) => topCm + p.h / 2

/** Fila centrada de botones (izquierda→derecha en orden de investidura, 0,4 cm de separación). */
export function filaCentrada(n: number, cx: number, ancho: number, sep: number): number[] {
  const total = n * ancho + (n - 1) * sep
  const x0 = cx - total / 2 + ancho / 2
  return Array.from({ length: n }, (_, i) => +(x0 + i * (ancho + sep)).toFixed(2))
}

/** El uniforme CORRECTO completo para un perfil. Es la "verdad" contra la que se juega. */
export function uniformeCorrecto(u: PerfilUniforme): Colocacion[] {
  const out: Colocacion[] = []
  const adulto = esAdulto(u.rango)
  const gm = esGuiaMayor(u.rango)
  const fondo = adulto ? 'blanco' : 'caqui'
  const add = (pz: Pieza, panel: PanelId, x: number, y: number, modo: Colocacion['modo'], regla: string) =>
    out.push({ pieza: pz, panel, x, y, modo, regla })

  // ---- Manga derecha ----
  const tc = pieza.tiraClub(u.club)
  add(tc, 'manga_der', CX_MANGA, centro(1.5, tc), 'precision', 'Tira con el nombre del club: a 1,5 cm de la costura del hombro.')
  if (adulto && u.cargo) {
    const cg = pieza.tiraCargo(u.cargo)
    add(cg, 'manga_der', CX_MANGA, centro(8, cg), 'precision', 'Tira de cargo: 1,5 cm debajo de la tira del club.')
    const c1 = pieza.c1()
    add(c1, 'manga_der', CX_MANGA, centro(11.5, c1), 'precision', 'Emblema C1: 1,5 cm debajo de la tira de cargo.')
    if (u.estrellaAnios) {
      const es = pieza.estrella(u.estrellaAnios)
      add(es, 'manga_der', CX_MANGA, centro(20, es), 'precision', 'Estrella de tiempo de servicio: 1 cm debajo del emblema C1.')
    }
  } else {
    const c1 = pieza.c1()
    add(c1, 'manga_der', CX_MANGA, centro(8.5, c1), 'precision', 'Emblema C1: 2 cm debajo de la tira del club.')
  }

  // ---- Manga izquierda ----
  const ca = pieza.campo()
  add(ca, 'manga_izq', CX_MANGA, centro(1.5, ca), 'precision', 'Emblema del Campo local: a 1,5 cm de la costura del hombro.')
  const c2 = pieza.c2(fondo)
  add(c2, 'manga_izq', CX_MANGA, centro(8, c2), 'precision', 'Emblema C2: 1 cm debajo del emblema del Campo.')
  const variante = gm ? 'guia_mayor' : adulto ? 'lider' : 'conquistador'
  const dv = pieza.divisa(variante, Math.max(1, u.clasesRegulares.length))
  add(dv, 'manga_izq', CX_MANGA, centro(14, dv), 'precision',
    gm ? 'Divisa de Guía Mayor (fondo blanco con estrella): 1 cm debajo del C2.'
      : adulto ? 'Divisa de clases en fondo blanco, sin estrella (líder que no es Guía Mayor): 1 cm debajo del C2.'
        : 'Divisa de clases (fondo caqui): 1 cm debajo del C2.')

  // ---- Pecho: bolsillo izquierdo (derecha de la pantalla) ----
  const cxIzq = BOLSILLO.izq.x + BOLSILLO.izq.w / 2
  const solapaMid = BOLSILLO.top + BOLSILLO.solapa / 2
  const lider = u.rango === 'guia_mayor' ? ['gm'] : u.rango === 'gm_master' ? ['gm', 'master']
    : u.rango === 'gm_master_avanzado' ? ['gm', 'master', 'master_avanzado'] : []
  const filaReg = lider.length ? solapaMid + 0.95 : solapaMid
  filaCentrada(u.clasesRegulares.length, cxIzq, 1.6, 0.4).forEach((x, i) => {
    add(pieza.boton(u.clasesRegulares[i]), 'pecho', x, filaReg, 'zona',
      `Distintivos de clases regulares en la solapa del bolsillo izquierdo, de izquierda a derecha en el orden en que se recibieron (posición ${i + 1}).`)
  })
  filaCentrada(lider.length, cxIzq, 1.7, 0.4).forEach((x, i) => {
    add(pieza.liderazgo(ORDEN_LIDERAZGO[i]), 'pecho', x, solapaMid - 0.95, 'zona',
      'Distintivos de liderazgo: centrados encima de las clases regulares; el de mayor grado siempre a la derecha.')
  })
  // Avanzadas: 0,5 cm encima de la tapa, filas de 3, de izquierda a derecha y de abajo hacia arriba.
  let topeAvanzadas = BOLSILLO.top - 0.5
  u.clasesAvanzadas.forEach((c, i) => {
    const fila = Math.floor(i / 3)
    const enFila = Math.min(3, u.clasesAvanzadas.length - fila * 3)
    const xs = filaCentrada(enFila, cxIzq, 2.4, 0.2)
    const y = BOLSILLO.top - 0.5 - 0.4 - fila * 1.0
    topeAvanzadas = Math.min(topeAvanzadas, y - 0.4)
    add(pieza.avanzada(c), 'pecho', xs[i % 3], y, 'zona',
      'Clases avanzadas: 0,5 cm encima de la tapa del bolsillo izquierdo, de izquierda a derecha y de abajo hacia arriba.')
  })
  if (u.excelencia) {
    const ex = pieza.excelencia()
    add(ex, 'pecho', cxIzq, topeAvanzadas - 0.5 - ex.h / 2, 'zona',
      'Insignia de excelencia: centrada encima de la tapa del bolsillo izquierdo (encima de las avanzadas si las hay).')
  }

  // ---- Pecho: bolsillo derecho (izquierda de la pantalla) ----
  const cxDer = BOLSILLO.der.x + BOLSILLO.der.w / 2
  const nm = pieza.nombre(u.nombre, fondo)
  add(nm, 'pecho', cxDer, BOLSILLO.top - 0.4 - nm.h / 2, 'zona', 'Tira con el nombre: encima de la solapa del bolsillo derecho.')
  if (u.funcion && !adulto) {
    const fn = pieza.funcion(u.funcion)
    add(fn, 'pecho', cxDer, BOLSILLO.top - 0.4 - nm.h - 0.4 - fn.h / 2, 'zona', 'Distintivo de función: encima de la tira del nombre.')
  }
  if (u.bautismo) {
    add(pieza.bautismo(), 'pecho', cxDer, solapaMid, 'zona', 'Distintivo de bautismo: centrado en la solapa del bolsillo derecho.')
  }

  // ---- Accesorios ----
  add(pieza.panoleta(gm), 'pecho', 25, 5.5, 'zona', gm
    ? 'Pañoleta de Guía Mayor (borde rojo, emblema LC1), solo después de la investidura.'
    : 'Pañoleta oficial amarilla con el emblema C2, sujeta con el sujetador.')
  add(pieza.correa(), 'pecho', 25, 39.5, 'zona', 'Correa verde petróleo con hebilla del emblema C3.')
  return out
}

/** Uniforme de la banda de especialidades. */
export function bandaCorrecta(nEsp: number): Colocacion[] {
  const out: Colocacion[] = []
  const b = pieza.bandera()
  out.push({ pieza: b, panel: 'banda', x: 6, y: 6 + b.h / 2, modo: 'precision', regla: 'Bandera del país: centrada y a 6 cm debajo de la costura del hombro.' })
  for (let i = 0; i < nEsp; i++) {
    const fila = Math.floor(i / 2)
    out.push({ pieza: pieza.especialidad(i), panel: 'banda', x: i % 2 ? 8.4 : 3.6, y: 13 + fila * 4.2, modo: 'zona',
      regla: 'Insignias de especialidades: adelante, agrupadas por categoría y colores.' })
  }
  out.push({ pieza: pieza.c2Banda(), panel: 'banda', x: 6, y: 55, modo: 'zona', regla: 'Emblema C2: en la parte inferior de la banda, centrado.' })
  return out
}

export function perfilDemo(rango: Rango, nombre = 'TU APODO', club = 'TU CLUB'): PerfilUniforme {
  switch (rango) {
    case 'conquistador':
      return { rango, clasesRegulares: ['amigo', 'companero'], clasesAvanzadas: [], excelencia: false, bautismo: true, nombre, club }
    case 'lider':
      return { rango, clasesRegulares: ['amigo', 'companero', 'explorador', 'pionero', 'excursionista', 'guia'], clasesAvanzadas: [],
        excelencia: false, bautismo: true, cargo: 'CONSEJERO', estrellaAnios: 2, nombre, club }
    case 'guia_mayor':
      return { rango, clasesRegulares: ['amigo', 'companero', 'explorador', 'pionero', 'excursionista', 'guia'],
        clasesAvanzadas: ['amigo', 'companero', 'explorador'], excelencia: true, bautismo: true, cargo: 'DIRECTOR', estrellaAnios: 5, nombre, club }
    case 'gm_master':
    case 'gm_master_avanzado':
      return { rango, clasesRegulares: ['amigo', 'companero', 'explorador', 'pionero', 'excursionista', 'guia'],
        clasesAvanzadas: ['amigo', 'companero', 'explorador', 'pionero', 'excursionista', 'guia'], excelencia: true, bautismo: true,
        cargo: 'DIRECTOR', estrellaAnios: 10, nombre, club }
  }
}
