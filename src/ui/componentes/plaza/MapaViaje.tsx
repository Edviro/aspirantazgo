import { useEffect, useMemo, useState } from 'react'
import type { Campamento, LugarMapa, MapaCampamentos, PuertoSalas } from '../../../application/puertos'
import { mensajeError } from '../../../application/errores'
import { Boton } from '../Comunes'

const PAISES: Record<string, string> = { PE: 'Perú', BO: 'Bolivia', AR: 'Argentina', BR: 'Brasil', CL: 'Chile', EC: 'Ecuador', PY: 'Paraguay', UY: 'Uruguay' }
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'do', 'da', 'dos', 'das'])
const titulo = (t: string) => t.toLowerCase().replace(/(^|[\s(/-])(\p{L}+)/gu, (_, a: string, w: string) => a + (a && MENORES.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
const SECTOR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** "Región 4 Conquistadores · sector B" */
export const nombreLugar = (c: Campamento) => `${titulo(c.titulo)}${c.sectores > 1 ? ` · sector ${SECTOR[c.sector] ?? c.sector + 1}` : ''}`

/**
 * Mapa para viajar entre campamentos en orden: País → Unión → Asociación/Misión → Región.
 * Solo aparecen los campamentos con clubes que ya juegan. Cada región puede tener varios sectores (11 clubes cada uno).
 */
export function MapaViaje({ salas, camp, onIr, onCerrar }: {
  salas: PuertoSalas
  camp: Campamento | null
  onIr: (lugar: string | undefined) => void
  onCerrar: () => void
}) {
  const [datos, setDatos] = useState<MapaCampamentos | null>(null)
  const [error, setError] = useState('')
  const [pais, setPais] = useState(camp?.pais ?? 'PE')
  const [union, setUnion] = useState(camp?.union ?? '')
  const [asoc, setAsoc] = useState(camp?.asociacion ?? '')

  useEffect(() => {
    if (!salas.mapaCampamentos) { setError('El mapa funciona con tu cuenta en línea.'); return }
    salas.mapaCampamentos().then(setDatos).catch(e => setError(mensajeError(e)))
  }, [salas])

  const lugares = datos?.lugares ?? []
  const paises = useMemo(() => [...new Set(lugares.map(l => l.pais ?? '').filter(Boolean))], [lugares])
  const uniones = useMemo(() => [...new Set(lugares.filter(l => l.pais === pais).map(l => l.union ?? ''))].sort(), [lugares, pais])
  const asocs = useMemo(() => [...new Set(lugares.filter(l => l.pais === pais && (l.union ?? '') === union).map(l => l.asociacion ?? ''))].sort(), [lugares, pais, union])
  const regiones = useMemo(() => lugares.filter(l => l.pais === pais && (l.union ?? '') === union && (l.asociacion ?? '') === asoc)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { numeric: true })), [lugares, pais, union, asoc])
  const cuenta = (f: (l: LugarMapa) => boolean) => lugares.filter(f).reduce((n, l) => n + l.clubes, 0)

  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop mapa-viaje" role="dialog" aria-modal="true" aria-label="Mapa de campamentos" onClick={e => e.stopPropagation()}>
        <h2>Mapa de campamentos</h2>
        {camp && (
          <p className="tienda-saludo">
            Estás en <b>{titulo(camp.titulo)}{camp.sectores > 1 ? ` · sector ${SECTOR[camp.sector] ?? camp.sector + 1}` : ''}</b>
            {camp.asociacion ? <> · {camp.asociacion}</> : null}
          </p>
        )}
        {camp && !camp.mio && <Boton onClick={() => onIr(undefined)}>Volver a mi campamento</Boton>}
        {error && <p className="error" role="alert">{error}</p>}
        {!datos && !error && <p>Cargando…</p>}
        {datos && (
          <div className="form mapa-filtros">
            <label>País<select value={pais} onChange={e => { setPais(e.target.value); setUnion(''); setAsoc('') }}>
              {paises.map(p => <option key={p} value={p}>{PAISES[p] ?? p} ({cuenta(l => l.pais === p)} clubes)</option>)}
            </select></label>
            <label>Unión<select value={union} onChange={e => { setUnion(e.target.value); setAsoc('') }}>
              <option value="">Elige…</option>
              {uniones.map(u => <option key={u} value={u}>{u} ({cuenta(l => l.pais === pais && l.union === u)})</option>)}
            </select></label>
            <label>Asociación o Misión<select value={asoc} onChange={e => setAsoc(e.target.value)} disabled={!union}>
              <option value="">Elige…</option>
              {asocs.map(a => <option key={a} value={a}>{a} ({cuenta(l => l.pais === pais && l.union === union && l.asociacion === a)})</option>)}
            </select></label>
          </div>
        )}
        {datos && asoc && (
          <ul className="mapa-regiones">
            {regiones.map(r => (
              <li key={r.base}>
                <span><b>{titulo(r.titulo)}</b><small>{r.clubes} {r.clubes === 1 ? 'club' : 'clubes'}{r.base === datos.mio ? ' · el tuyo' : ''}</small></span>
                <span className="mapa-sectores">
                  {Array.from({ length: Math.min(r.sectores, 26) }, (_, k) => {
                    const l = `${r.base}-${k}`
                    return (
                      <button key={l} type="button" className={l === camp?.lugar ? 'on' : ''} disabled={l === camp?.lugar} onClick={() => onIr(l)}>
                        {l === camp?.lugar ? 'Aquí' : r.sectores > 1 ? `Ir ${SECTOR[k]}` : 'Ir'}
                      </button>
                    )
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Boton tipo="fantasma" onClick={onCerrar}>Cerrar</Boton>
      </div>
    </div>
  )
}
