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

/**
 * Los emblemas oficiales más complejos (40 KB de trazos vectoriales) se convierten UNA vez en imagen
 * (bitmap) cuando el celular está libre. Así el navegador no recalcula miles de trazos cada vez que
 * una pieza se mueve o se anima: es lo que más pesaba en celulares sencillos.
 */
const enLinea = new Map<string, string>()
let precarga: Promise<void> | null = null
const PESADOS = ['avanzada-pionero', 'avanzada-guia', 'avanzada-explorador', 'avanzada-companero', 'avanzada-amigo', 'avanzada-excursionista',
  'panoleta-gm', 'c4', 'excelencia', 'bautismo', 'pin-gm']

async function rasterizar(k: string, lado: number) {
  const r = await fetch(`${import.meta.env.BASE_URL}assets/oficial/${k}.svg`)
  if (!r.ok) return
  const url = URL.createObjectURL(new Blob([await r.text()], { type: 'image/svg+xml' }))
  try {
    const img = new Image(); img.src = url
    await img.decode()
    const esc = lado / Math.max(img.naturalWidth || lado, img.naturalHeight || lado)
    const cv = document.createElement('canvas')
    cv.width = Math.max(1, Math.round((img.naturalWidth || lado) * esc)); cv.height = Math.max(1, Math.round((img.naturalHeight || lado) * esc))
    cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
    const blob: Blob | null = await new Promise(ok => cv.toBlob(ok, 'image/webp', 0.92))
    if (blob) enLinea.set(k, URL.createObjectURL(blob))
  } finally { URL.revokeObjectURL(url) }
}

export function precargarOficiales(): Promise<void> {
  precarga ??= new Promise<void>(listo => {
    const lado = Math.min(512, Math.max(256, Math.round(128 * (window.devicePixelRatio || 1))))
    const empezar = async () => {
      for (const k of PESADOS) { try { await rasterizar(k, lado) } catch { /* se usa el SVG normal */ } }
      listo()
    }
    // Cuando el celular esté libre (no compite con la carga del juego)
    const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback
    if (ric) ric(() => { void empezar() }, { timeout: 4000 }); else setTimeout(() => { void empezar() }, 1500)
  })
  return precarga
}

export const urlAsset = (clave: string) => enLinea.get(clave) ?? `${import.meta.env.BASE_URL}assets/oficial/${clave}.svg`

export function urlOficial(p: Pieza): string | null {
  const k = claveOficial(p)
  return k && DISPONIBLES.has(k) ? urlAsset(k) : null
}
