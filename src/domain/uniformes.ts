import {
  type ClaseId, type Colocacion, type LiderazgoId, type PanelId, type PerfilUniforme, type Pieza, type Rango,
  ORDEN_CLASES, ORDEN_LIDERAZGO, esAdulto, esGuiaMayor,
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
  bandera: { w: 128, h: 90 },
  banderin: { w: 55, h: 36 },
}

// Geometría del pecho (vista de frente: el bolsillo DERECHO de quien lo viste queda a la IZQUIERDA de la pantalla).
export const BOLSILLO = { der: { x: 8, w: 12 }, izq: { x: 30, w: 12 }, top: 16, solapa: 4, alto: 14 }

// ---------- Fábrica de piezas ----------
export const pieza = {
  tiraClub: (club: string): Pieza => ({ key: 'tira_club', tipo: 'tira_club', texto: club, w: 10, h: 5 }),
  tiraCargo: (cargo: string): Pieza => ({ key: 'tira_cargo', tipo: 'tira_cargo', texto: cargo, w: 7.5, h: 2 }),
  c1: (): Pieza => ({ key: 'c1', tipo: 'c1', w: 7.2, h: 7.5 }),
  estrella: (n = 1): Pieza => ({ key: 'estrella', tipo: 'estrella', nivel: n, w: 3.2, h: 3.04 }),
  campo: (): Pieza => ({ key: 'campo', tipo: 'campo', w: 7.5, h: 5.5 }),
  c2: (fondo: 'caqui' | 'blanco'): Pieza => ({ key: 'c2_' + fondo, tipo: 'c2', fondo, w: 6.4, h: 5 }),
  divisa: (v: 'conquistador' | 'lider' | 'guia_mayor', nivel: number): Pieza => ({
    key: `divisa_${v}_${nivel}`, tipo: 'divisa', divisa: v, nivel, w: 4, h: v === 'guia_mayor' ? 7.17 : 4.6,
  }),
  boton: (clase: ClaseId): Pieza => ({ key: 'boton_' + clase, tipo: 'boton_clase', clase, w: 1.64, h: 1.64 }),
  avanzada: (clase: ClaseId): Pieza => ({ key: 'avanzada_' + clase, tipo: 'barra_avanzada', clase, w: 2.42, h: 0.82 }),
  liderazgo: (l: LiderazgoId): Pieza => ({ key: 'lid_' + l, tipo: 'boton_liderazgo', liderazgo: l, w: 1.7, h: l === 'gm' ? 1.7 : 1.33 }),
  excelencia: (): Pieza => ({ key: 'excelencia', tipo: 'excelencia', w: 4.1, h: 0.92 }),
  nombre: (nombre: string, fondo: 'caqui' | 'blanco'): Pieza => ({ key: 'tira_nombre', tipo: 'tira_nombre', texto: nombre, fondo, w: 8.07, h: 1.67 }),
  funcion: (f: string): Pieza => ({ key: 'funcion', tipo: 'funcion', texto: f, w: 6.54, h: 1.4 }),
  bautismo: (): Pieza => ({ key: 'bautismo', tipo: 'bautismo', w: 2, h: 2 }),
  panoleta: (gm: boolean): Pieza => ({ key: gm ? 'panoleta_gm' : 'panoleta', tipo: 'panoleta', liderazgo: gm ? 'gm' : undefined, w: 17, h: 17 }),
  correa: (): Pieza => ({ key: 'correa', tipo: 'correa', w: 34, h: 2.6 }),
  bandera: (): Pieza => ({ key: 'bandera', tipo: 'bandera_pais', w: 3.6, h: 2.4 }),
  especialidad: (n: number): Pieza => ({ key: 'esp_' + n, tipo: 'especialidad', nivel: n, grupo: 'especialidad', w: 3.4, h: 3.4 }),
  lcManga: (l: 'master' | 'master_avanzado'): Pieza => ({ key: 'lc_' + l, tipo: 'lc_manga', liderazgo: l, w: 6.4, h: 5 }),
  cuadrante: (color: 'azul' | 'blanco', n: number): Pieza => ({ key: `cuad_${color}_${n}`, tipo: 'cuadrante', fondo: color, grupo: 'cuad_' + color, w: 64, h: 45 }),
  c1Bandera: (): Pieza => ({ key: 'c1_bandera', tipo: 'c1', w: 29, h: 30 }),
  textoClub: (t: string): Pieza => ({ key: 'texto_club', tipo: 'texto_club', texto: t, w: 50, h: 6 }),
  franjaAzul: (): Pieza => ({ key: 'franja_azul', tipo: 'franja_azul', w: 10, h: 36 }),
  c1Banderin: (): Pieza => ({ key: 'c1_banderin', tipo: 'c1', w: 9.6, h: 10 }),
  textoClubVertical: (t: string): Pieza => ({ key: 'texto_club_v', tipo: 'texto_club', texto: t, vertical: true, w: 4, h: 19 }),
  disenoUnidad: (): Pieza => ({ key: 'diseno_unidad', tipo: 'diseno_unidad', w: 12.5, h: 12.5 }),
  textoUnidad: (t: string): Pieza => ({ key: 'texto_unidad', tipo: 'texto_unidad', texto: t, w: 22, h: 3 }),
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
  if (u.rango === 'gm_master' || u.rango === 'gm_master_avanzado') {
    const lc = pieza.lcManga(u.rango === 'gm_master' ? 'master' : 'master_avanzado')
    add(lc, 'manga_izq', CX_MANGA, centro(8, lc), 'precision', u.rango === 'gm_master'
      ? 'El emblema LC2 de Guía Mayor Máster reemplaza al C2: 1 cm debajo del emblema del Campo.'
      : 'El emblema LC3 de Máster Avanzado reemplaza al C2: 1 cm debajo del emblema del Campo.')
  } else {
    const c2 = pieza.c2(fondo)
    add(c2, 'manga_izq', CX_MANGA, centro(8, c2), 'precision', 'Emblema C2: 1 cm debajo del emblema del Campo.')
  }
  // La divisa muestra las clases que la persona tiene (parcial: de Amigo a la clase alcanzada).
  // Conquistador: fondo caqui. Líder: fondo blanco sin estrella. Guía Mayor: fondo blanco con estrella.
  if (u.clasesRegulares.length >= 1) {
    const variante = gm ? 'guia_mayor' : adulto ? 'lider' : 'conquistador'
    const dv = pieza.divisa(variante, Math.max(1, u.clasesRegulares.length))
    add(dv, 'manga_izq', CX_MANGA, centro(14, dv), 'precision',
      gm ? 'Divisa de Guía Mayor (fondo blanco con estrella): 1 cm debajo del C2.'
        : adulto ? 'Divisa de clases en fondo blanco, sin estrella (líder que no es Guía Mayor): 1 cm debajo del C2.'
          : 'Divisa de clases (fondo caqui): 1 cm debajo del C2.')
  }

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
  u = { ...u, clasesAvanzadas: avanzadasValidas(u.clasesRegulares, u.clasesAvanzadas) }
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
  add(pieza.panoleta(gm), 'pecho', 25, 8.2, 'zona', gm
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

/** Bandera oficial: 128 × 90 cm en cuatro partes, C1 de 30 × 30 al centro y el nombre del club abajo a la derecha. */
export function banderaCorrecta(club: string): Colocacion[] {
  const r = 'Bandera: superior izquierda e inferior derecha en azul royal; superior derecha e inferior izquierda en blanco.'
  return [
    { pieza: pieza.cuadrante('azul', 1), panel: 'bandera', x: 32, y: 22.5, modo: 'zona', regla: r },
    { pieza: pieza.cuadrante('azul', 2), panel: 'bandera', x: 96, y: 67.5, modo: 'zona', regla: r },
    { pieza: pieza.cuadrante('blanco', 1), panel: 'bandera', x: 96, y: 22.5, modo: 'zona', regla: r },
    { pieza: pieza.cuadrante('blanco', 2), panel: 'bandera', x: 32, y: 67.5, modo: 'zona', regla: r },
    { pieza: pieza.c1Bandera(), panel: 'bandera', x: 64, y: 45, modo: 'zona', regla: 'Emblema C1 de 30 × 30 cm, justo en el centro de la bandera.' },
    { pieza: pieza.textoClub(club), panel: 'bandera', x: 98, y: 77, modo: 'zona', regla: 'El nombre del club va abajo a la derecha, en Arial Black, con 6 cm de alto y hasta 50 cm de largo.' },
  ]
}

/** Banderín de unidad: 55 cm, franja azul de 36 × 10 a la izquierda, C1 a 5 cm de arriba, diseño de la unidad a la derecha. */
export function banderinCorrecto(club: string, unidad: string): Colocacion[] {
  return [
    { pieza: pieza.franjaAzul(), panel: 'banderin', x: 5, y: 18, modo: 'zona', regla: 'Franja vertical azul royal de 36 × 10 cm en el lado izquierdo.' },
    { pieza: pieza.c1Banderin(), panel: 'banderin', x: 10, y: 10, modo: 'zona', regla: 'Emblema C1 de 10 × 10 cm, a 5 cm de arriba, dividido entre la parte azul y la blanca.' },
    { pieza: pieza.textoClubVertical(club), panel: 'banderin', x: 5, y: 25.5, modo: 'zona', regla: 'Nombre del club en amarillo, de abajo hacia arriba, sobre la franja azul.' },
    { pieza: pieza.disenoUnidad(), panel: 'banderin', x: 29, y: 13.5, modo: 'zona', regla: 'Diseño de la unidad de 12,5 × 12,5 cm, centrado en la parte blanca.' },
    { pieza: pieza.textoUnidad(unidad), panel: 'banderin', x: 29, y: 24, modo: 'zona', regla: 'Nombre de la unidad en azul royal, debajo del diseño.' },
  ]
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

// ---------- Casos aleatorios coherentes ----------
export const FUNCIONES = ['CAPITÁN', 'SECRETARIO', 'TESORERO', 'CAPELLÁN']
export const CARGOS = ['CONSEJERO', 'INSTRUCTOR', 'SECRETARIO', 'DIRECTOR', 'DIR. ASOCIADO']

/**
 * Regla del manual: una clase avanzada solo se lleva si ya se tiene la regular de esa clase.
 * Devuelve las avanzadas que sí corresponden, en orden de investidura.
 */
export function avanzadasValidas(regulares: ClaseId[], avanzadas: ClaseId[]): ClaseId[] {
  return ORDEN_CLASES.filter(c => avanzadas.includes(c) && regulares.includes(c))
}

/** Un caso al azar que siempre respeta el manual (para salas y desafíos). */
export function perfilAleatorio(rango: Rango, rnd: () => number, nombre = 'TU APODO', club = 'TU CLUB'): PerfilUniforme {
  const entre = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
  const conquis = rango === 'conquistador'
  // Máster y Máster Avanzado salen con las 12 clases (6 regulares + 6 avanzadas).
  const esMaster = rango === 'gm_master' || rango === 'gm_master_avanzado'
  const nReg = conquis ? entre(1, 6) : rango === 'lider' ? entre(3, 6) : 6
  const regulares = ORDEN_CLASES.slice(0, nReg)
  const nAv = esMaster ? 6 : conquis ? (rnd() < 0.35 ? 0 : entre(1, nReg)) : rango === 'lider' ? entre(0, nReg) : entre(0, 6)
  const avanzadas = avanzadasValidas(regulares, ORDEN_CLASES.slice(0, nAv))
  return {
    rango, clasesRegulares: regulares, clasesAvanzadas: avanzadas,
    // Todo adulto (líder de 16+, Guía Mayor, Máster, Máster Avanzado) es bautizado.
    excelencia: rnd() < 0.4, bautismo: conquis ? rnd() < 0.75 : true,
    funcion: conquis && rnd() < 0.6 ? FUNCIONES[entre(0, FUNCIONES.length - 1)] : undefined,
    cargo: conquis ? undefined : CARGOS[entre(0, CARGOS.length - 1)],
    estrellaAnios: conquis ? undefined : entre(1, 12),
    nombre, club,
  }
}

export const NOMBRE_CLASE: Record<ClaseId, string> = { amigo: 'Amigo', companero: 'Compañero', explorador: 'Explorador', pionero: 'Pionero', excursionista: 'Excursionista', guia: 'Guía' }
const RANGO_TXT: Record<Rango, string> = { conquistador: 'Conquistador', lider: 'Líder (no Guía Mayor)', guia_mayor: 'Guía Mayor', gm_master: 'Guía Mayor Máster', gm_master_avanzado: 'Guía Mayor Máster Avanzado' }

/** Texto corto del caso, para mostrarlo antes de jugar. */
export function describirCaso(p: PerfilUniforme): string[] {
  const r = p.clasesRegulares, a = p.clasesAvanzadas
  const tramo = (l: ClaseId[]) => l.length === 1 ? NOMBRE_CLASE[l[0]] : `de ${NOMBRE_CLASE[l[0]]} a ${NOMBRE_CLASE[l[l.length - 1]]}`
  const out = [RANGO_TXT[p.rango] + (p.cargo ? `, cargo ${p.cargo.toLowerCase()}` : p.funcion ? `, ${p.funcion.toLowerCase()} de su unidad` : '')]
  out.push(`Clases regulares: ${tramo(r)}`)
  out.push(a.length ? `Clases avanzadas: ${tramo(a)}` : 'Sin clases avanzadas')
  const extras = [p.bautismo ? 'bautizado' : 'aún no bautizado', p.excelencia ? 'con insignia de excelencia' : '']
  if (p.estrellaAnios) extras.push(`${p.estrellaAnios} año${p.estrellaAnios === 1 ? '' : 's'} de servicio`)
  out.push(extras.filter(Boolean).join(', '))
  return out
}
