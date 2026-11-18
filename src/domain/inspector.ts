import { BOLSILLO, pieza } from './uniformes'
import type { Colocacion, Rango } from './tipos'
import { esAdulto, esGuiaMayor } from './tipos'

export interface ErrorInspector {
  /** Índices (en la lista de colocaciones) de las piezas que están mal. */
  indices: number[]
  explicacion: string
}

type Mutacion = {
  aplica: (r: Rango, u: Colocacion[]) => boolean
  hacer: (u: Colocacion[], r: Rango) => ErrorInspector
}

const idx = (u: Colocacion[], tipo: string) => u.findIndex(c => c.pieza.tipo === tipo)

const MUTACIONES: Mutacion[] = [
  {
    aplica: (_, u) => idx(u, 'c1') >= 0 && idx(u, 'c2') >= 0,
    hacer: u => {
      const a = idx(u, 'c1'), b = idx(u, 'c2')
      const ca = u[a], cb = u[b]
      u[a] = { ...ca, panel: cb.panel, y: cb.y + (ca.pieza.h - cb.pieza.h) / 2 }
      u[b] = { ...cb, panel: ca.panel, y: ca.y }
      return { indices: [a, b], explicacion: 'El C1 va en la manga DERECHA y el C2 en la manga IZQUIERDA.' }
    },
  },
  {
    aplica: (_, u) => u.filter(c => c.pieza.tipo === 'boton_clase').length >= 3,
    hacer: u => {
      const bs = u.map((c, i) => [c, i] as const).filter(([c]) => c.pieza.tipo === 'boton_clase')
      const [, i1] = bs[0], [, i2] = bs[bs.length - 1]
      const x1 = u[i1].x
      u[i1] = { ...u[i1], x: u[i2].x }
      u[i2] = { ...u[i2], x: x1 }
      return { indices: [i1, i2], explicacion: 'Los distintivos de clases van de izquierda a derecha en el orden en que se recibieron.' }
    },
  },
  {
    aplica: () => true,
    hacer: (u, r) => {
      const i = idx(u, 'divisa')
      const actual = u[i]
      const malo = r === 'conquistador' || !esGuiaMayor(r) ? 'guia_mayor' : 'lider'
      const pz = pieza.divisa(malo, actual.pieza.nivel ?? 2)
      u[i] = { ...actual, pieza: pz, y: 14 + pz.h / 2 }
      return {
        indices: [i],
        explicacion: r === 'conquistador'
          ? 'Un Conquistador lleva la divisa en fondo caqui. La de fondo blanco con estrella es solo para Guías Mayores.'
          : esGuiaMayor(r) ? 'Un Guía Mayor investido lleva la divisa blanca CON estrella.'
            : 'Un líder que no es Guía Mayor lleva la divisa blanca SIN estrella.',
      }
    },
  },
  {
    aplica: r => r === 'conquistador',
    hacer: u => {
      const c1 = u[idx(u, 'c1')]
      u.push({ pieza: pieza.estrella(1), panel: 'manga_der', x: 10, y: c1.y + c1.pieza.h / 2 + 2.5, modo: 'precision', regla: '' })
      return { indices: [u.length - 1], explicacion: 'La estrella de tiempo de servicio es para la directiva, a partir del primer año de actividad.' }
    },
  },
  {
    aplica: (_, u) => idx(u, 'tira_nombre') >= 0,
    hacer: u => {
      const i = idx(u, 'tira_nombre')
      u[i] = { ...u[i], x: BOLSILLO.izq.x + BOLSILLO.izq.w / 2, y: BOLSILLO.top + 7 }
      return { indices: [i], explicacion: 'La tira con el nombre va encima de la solapa del bolsillo DERECHO.' }
    },
  },
  {
    aplica: (_, u) => idx(u, 'tira_club') >= 0,
    hacer: u => {
      const a = idx(u, 'tira_club'), b = idx(u, 'c1')
      const ya = u[a].y, yb = u[b].y
      u[a] = { ...u[a], y: yb + u[b].pieza.h / 2 + 3.2 }
      u[b] = { ...u[b], y: ya + 1 }
      return { indices: [a], explicacion: 'La tira del club va arriba, a 1,5 cm de la costura del hombro, encima del C1.' }
    },
  },
  {
    aplica: (_, u) => idx(u, 'bautismo') >= 0 && idx(u, 'tira_nombre') >= 0,
    hacer: u => {
      const i = idx(u, 'bautismo')
      u[i] = { ...u[i], x: BOLSILLO.izq.x + BOLSILLO.izq.w / 2, y: BOLSILLO.top + 9 }
      return { indices: [i], explicacion: 'El distintivo de bautismo va centrado en la solapa del bolsillo DERECHO.' }
    },
  },
  {
    aplica: (_, u) => u.some(c => c.pieza.tipo === 'barra_avanzada'),
    hacer: u => {
      const is = u.map((c, i) => [c, i] as const).filter(([c]) => c.pieza.tipo === 'barra_avanzada').map(([, i]) => i)
      is.forEach(i => { u[i] = { ...u[i], y: u[i].y + 9.5 } })
      return { indices: is, explicacion: 'Las clases avanzadas van 0,5 cm ENCIMA de la tapa del bolsillo izquierdo.' }
    },
  },
  {
    aplica: (_, u) => u.filter(c => c.pieza.tipo === 'boton_liderazgo').length >= 2,
    hacer: u => {
      const is = u.map((c, i) => [c, i] as const).filter(([c]) => c.pieza.tipo === 'boton_liderazgo').map(([, i]) => i)
      const xs = is.map(i => u[i].x).reverse()
      is.forEach((i, k) => { u[i] = { ...u[i], x: xs[k] } })
      return { indices: is, explicacion: 'El distintivo de liderazgo de mayor grado va siempre a la DERECHA de los demás.' }
    },
  },
  {
    aplica: (_, u) => idx(u, 'tira_cargo') >= 0,
    hacer: u => {
      const a = idx(u, 'tira_cargo'), b = idx(u, 'tira_club')
      const ya = u[a].y
      u[a] = { ...u[a], y: 0.6 + u[a].pieza.h / 2 }
      u[b] = { ...u[b], y: ya + 1.5 }
      return { indices: [a], explicacion: 'La tira de cargo va DEBAJO de la tira del club (1,5 cm), no encima.' }
    },
  },
  {
    aplica: (_, u) => idx(u, 'estrella') >= 0,
    hacer: u => {
      const i = idx(u, 'estrella')
      u[i] = { ...u[i], panel: 'manga_izq', y: 24 }
      return { indices: [i], explicacion: 'La estrella de tiempo de servicio va en la manga DERECHA, 1 cm debajo del C1.' }
    },
  },
  {
    aplica: r => esAdulto(r) && !esGuiaMayor(r),
    hacer: u => {
      const i = u.findIndex(c => c.pieza.tipo === 'panoleta')
      u[i] = { ...u[i], pieza: pieza.panoleta(true) }
      return { indices: [i], explicacion: 'La pañoleta de Guía Mayor se usa solo después de la investidura de Guía Mayor.' }
    },
  },
]

/** Arma un uniforme con `n` errores sembrados al azar (sin repetir piezas). */
export function sembrarErrores(correcto: Colocacion[], rango: Rango, n: number, rnd = Math.random) {
  const u = correcto.map(c => ({ ...c }))
  const errores: ErrorInspector[] = []
  const usados = new Set<number>()
  const pool = MUTACIONES.filter(m => m.aplica(rango, u)).sort(() => rnd() - 0.5)
  for (const m of pool) {
    if (errores.length >= n) break
    if (!m.aplica(rango, u)) continue
    const copia = u.map(c => ({ ...c }))
    const e = m.hacer(copia, rango)
    if (e.indices.some(i => usados.has(i))) continue
    u.splice(0, u.length, ...copia)
    e.indices.forEach(i => usados.add(i))
    errores.push(e)
  }
  return { uniforme: u, errores }
}
