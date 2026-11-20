/** Si el equipo puede dibujar en 3D (sin cargar three.js todavía). */
export function soporta3D() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}
const CLAVE = 'asp_vista'
/** El jugador puede preferir la vista clásica (2D). */
export function prefiere3D() {
  try { if (localStorage.getItem(CLAVE) === '2d') return false } catch { /* sin almacenamiento */ }
  return soporta3D()
}
export function guardarVista(v: '2d' | '3d') { try { localStorage.setItem(CLAVE, v) } catch { /* sin almacenamiento */ } }
