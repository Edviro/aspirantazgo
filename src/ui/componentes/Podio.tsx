import type { AvatarConfig } from '../../application/puertos'
import type { Rango } from '../../domain/tipos'
import { PixelAvatar } from '../pixel/PixelAvatar'

export interface Subido { nombre: string; avatar?: AvatarConfig | null; rango?: Rango | null; puntos?: number }

/** Podio pixel: 2.º, 1.º y 3.º con sus personajes sobre los bloques. */
export function Podio({ top }: { top: Subido[] }) {
  const conPuntos = top.some(t => t.puntos !== undefined)
  const lugares = [{ i: 1, alto: conPuntos ? 74 : 54, c: '#C0C7D1', medalla: '🥈' }, { i: 0, alto: conPuntos ? 100 : 86, c: '#FFC20E', medalla: '🥇' }, { i: 2, alto: conPuntos ? 74 : 38, c: '#CD7F32', medalla: '🥉' }]
  return (
    <div className="podio-pixel">
      {lugares.map(l => (
        <div key={l.i} className="podio-lugar">
          {top[l.i] && <PixelAvatar a={top[l.i].avatar ?? {}} rango={top[l.i].rango ?? 'conquistador'} animo={l.i === 0 ? 'celebra' : 'saluda'} alto={96} />}
          <div className="podio-bloque" style={{ height: l.alto, background: l.c }}>
            <span className="podio-medalla">{l.medalla}</span>
            {top[l.i] && <small className="podio-nombre">{top[l.i].nombre}</small>}
            {top[l.i]?.puntos !== undefined && <small className="podio-pts">{top[l.i].puntos}</small>}
          </div>
        </div>
      ))}
    </div>
  )
}
