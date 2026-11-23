import type { PerfilPublico } from '../../../application/puertos'
import { PixelAvatar } from '../../pixel/PixelAvatar'
import { Boton } from '../Comunes'
import { Bandera, CAMPEON_TXT, IconoItem } from './Iconos'

export const RANGO_TXT: Record<string, string> = { conquistador: 'Conquistador', lider: 'Líder', guia_mayor: 'Guía Mayor', gm_master: 'GM Máster', gm_master_avanzado: 'GM Máster Avanzado' }

/** Lo que se ve al tocar a alguien en el Gran Campamento: quién es, de dónde, sus logros y dónde está. */
export function FichaJugador({ j, zona, onCerrar, onRetar, onIntercambiar }: { j: PerfilPublico; zona: string; onCerrar: () => void; onRetar?: () => void; onIntercambiar?: () => void }) {
  return (
    <div className="plaza-ficha pop" role="dialog" aria-label={`${j.apodo}, de ${j.club}`}>
      <PixelAvatar a={j.avatar ?? {}} rango={j.rango} animo="saluda" alto={92} />
      <div className="ficha-datos">
        <b>{j.apodo}</b>
        <small>{RANGO_TXT[j.rango]} · {j.club}</small>
        <span className="ficha-org"><Bandera tipo="pais" pais={j.pais} alto={14} />{[j.campo, j.union].filter(Boolean).join(' · ')}</span>
        <span className="ficha-zona">📍 Está en: {zona}</span>
      </div>
      <div className="ficha-logros">
        <span className="ficha-aprob">✅ {j.aprobados ?? 0} {j.aprobados === 1 ? 'nivel aprobado' : 'niveles aprobados'}</span>
        {(j.campeon ?? []).map(c => <span key={c} className="ficha-campeon">{CAMPEON_TXT[c]}</span>)}
        {!!j.pines?.length && <span className="ficha-pines" aria-label={`${j.pines.length} pines y parches`}>{j.pines.slice(0, 8).map(p => <IconoItem key={p} id={p} alto={22} />)}</span>}
      </div>
      <div className="fila-botones">
        <Boton tipo="fantasma" onClick={onCerrar}>Cerrar</Boton>
        {onIntercambiar && <Boton tipo="azul" onClick={onIntercambiar}>Intercambiar</Boton>}
        {onRetar && <Boton tipo="rojo" onClick={onRetar}>Retar</Boton>}
      </div>
    </div>
  )
}

/** Una carpa del campamento del club: quiénes duermen ahí y sus logros. */
export function FichaCarpa({ titulo, ocupantes, onCerrar }: { titulo: string; ocupantes: (PerfilPublico & { yo?: boolean })[]; onCerrar: () => void }) {
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop carpa-ficha" role="dialog" aria-modal="true" aria-label={titulo} onClick={e => e.stopPropagation()}>
        <h2>{titulo}</h2>
        {ocupantes.length === 0 ? <p>Carpa libre: aquí dormirán los siguientes que lleguen.</p> : (
          <ul className="carpa-lista">
            {ocupantes.map(o => (
              <li key={o.id} className={o.yo ? 'yo' : ''}>
                <PixelAvatar a={o.avatar ?? {}} rango={o.rango} alto={64} />
                <span className="quien"><b>{o.yo ? `${o.apodo} (tú)` : o.apodo}</b><small>{RANGO_TXT[o.rango]} · ✅ {o.aprobados ?? 0}</small>
                  {!!o.campeon?.length && <small className="ficha-campeon">{CAMPEON_TXT[o.campeon[0]]}</small>}
                </span>
                <span className="ficha-pines">{(o.pines ?? []).slice(0, 6).map(p => <IconoItem key={p} id={p} alto={20} />)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="fila-botones"><Boton tipo="fantasma" onClick={onCerrar}>Cerrar</Boton></div>
      </div>
    </div>
  )
}
