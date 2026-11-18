import type { Pieza } from './domain/tipos'

/**
 * Assets oficiales (de la carpeta de Eduardo) en public/assets/oficial/.
 * Cada pieza del juego busca aquí su archivo; si no existe, se usa el dibujo aproximado.
 */
const DISPONIBLES = new Set([
  'c1', 'c2-caqui', 'c2-blanco', 'c3', 'c4', 'c5', 'lc2', 'lc3', 'pin-gm', 'pin-master', 'pin-master-avanzado',
  'boton-amigo', 'boton-companero', 'boton-explorador', 'boton-pionero', 'boton-excursionista', 'boton-guia',
  'avanzada-amigo', 'avanzada-companero', 'avanzada-explorador', 'avanzada-pionero', 'avanzada-excursionista', 'avanzada-guia',
  'divisa-conquistador-1', 'divisa-conquistador-2', 'divisa-conquistador-3', 'divisa-conquistador-4', 'divisa-conquistador-5', 'divisa-conquistador-6',
  'divisa-lider-1', 'divisa-lider-2', 'divisa-lider-3', 'divisa-lider-4', 'divisa-lider-5', 'divisa-lider-6', 'divisa-gm',
  'estrella-servicio', 'bautismo', 'excelencia', 'tira-nombre-caqui', 'tira-nombre-blanca', 'tira-club', 'tira-cargo', 'tira-funcion',
  'panoleta-conquistador', 'panoleta-gm', 'hebilla',
])

export function claveOficial(p: Pieza): string | null {
  switch (p.tipo) {
    case 'c1': return 'c1'
    case 'c2': return 'c2-' + (p.fondo === 'blanco' ? 'blanco' : 'caqui')
    case 'c2_banda': return 'c2-caqui'
    case 'lc_manga': return p.liderazgo === 'master' ? 'lc2' : 'lc3'
    case 'bautismo': return 'bautismo'
    case 'boton_clase': return 'boton-' + p.clase
    case 'barra_avanzada': return 'avanzada-' + p.clase
    case 'boton_liderazgo': return p.liderazgo === 'gm' ? 'pin-gm' : p.liderazgo === 'master' ? 'pin-master' : 'pin-master-avanzado'
    case 'excelencia': return 'excelencia'
    case 'estrella': return 'estrella-servicio'
    case 'divisa': return p.divisa === 'guia_mayor' ? 'divisa-gm' : `divisa-${p.divisa === 'lider' ? 'lider' : 'conquistador'}-${Math.min(6, Math.max(1, p.nivel ?? 1))}`
    case 'panoleta': return p.liderazgo === 'gm' ? 'panoleta-gm' : 'panoleta-conquistador'
    case 'tira_nombre': return p.fondo === 'blanco' ? 'tira-nombre-blanca' : 'tira-nombre-caqui'
    case 'tira_club': return 'tira-club'
    case 'tira_cargo': return 'tira-cargo'
    case 'funcion': return 'tira-funcion'
    default: return null
  }
}

/** Copias en data: URI, necesarias para dibujar los SVG dentro de texturas 3D (un SVG-imagen no carga archivos externos). */
const enLinea = new Map<string, string>()
let precarga: Promise<void> | null = null

export function precargarOficiales(): Promise<void> {
  precarga ??= Promise.all([...DISPONIBLES, 'c5'].map(async k => {
    try {
      const txt = await (await fetch(`${import.meta.env.BASE_URL}assets/oficial/${k}.svg`)).text()
      enLinea.set(k, 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt))))
    } catch { /* se usa la URL normal */ }
  })).then(() => undefined)
  return precarga
}

export const urlAsset = (clave: string) => enLinea.get(clave) ?? `${import.meta.env.BASE_URL}assets/oficial/${clave}.svg`

export function urlOficial(p: Pieza): string | null {
  const k = claveOficial(p)
  return k && DISPONIBLES.has(k) ? urlAsset(k) : null
}
