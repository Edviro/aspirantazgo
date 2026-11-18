import type { Pieza } from './domain/tipos'

/**
 * Assets oficiales en public/assets/oficial/. Cuando agregues un archivo, anótalo aquí
 * (clave → nombre de archivo) y reemplaza automáticamente al dibujo aproximado en todo el juego.
 * Ejemplo: 'c2-caqui': 'c2-caqui.svg'
 */
export const OFICIALES: Record<string, string> = {}

export function claveOficial(p: Pieza): string | null {
  switch (p.tipo) {
    case 'c1': return 'c1'
    case 'c2': return 'c2-' + (p.fondo ?? 'caqui')
    case 'c2_banda': return 'c2-caqui'
    case 'lc_manga': return p.liderazgo === 'master' ? 'lc2' : 'lc3'
    case 'campo': return 'campo'
    case 'bautismo': return 'bautismo'
    case 'boton_clase': return 'boton-' + p.clase
    case 'barra_avanzada': return 'avanzada-' + p.clase
    case 'boton_liderazgo': return p.liderazgo === 'gm' ? 'boton-gm' : p.liderazgo === 'master' ? 'boton-master' : 'boton-master-avanzado'
    case 'excelencia': return 'excelencia'
    case 'divisa': return p.divisa === 'guia_mayor' ? 'divisa-gm' : p.divisa === 'lider' ? 'divisa-lider' : 'divisa-conquistador-' + (p.nivel ?? 1)
    case 'panoleta': return p.liderazgo === 'gm' ? 'panoleta-gm' : 'panoleta-conquistador'
    case 'correa': return 'correa'
    default: return null
  }
}

export function urlOficial(p: Pieza): string | null {
  const k = claveOficial(p)
  return k && OFICIALES[k] ? `${import.meta.env.BASE_URL}assets/oficial/${OFICIALES[k]}` : null
}
