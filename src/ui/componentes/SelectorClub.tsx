import { useEffect, useMemo, useState } from 'react'
import type { CatalogoOrg, ClubOficial, PuertoCuentas } from '../../application/puertos'

const NUEVO = '__nuevo__'

export interface ClubElegido {
  /** Asociación o misión (campo) del club. */
  campo: number
  /** Id del club en el directorio oficial de la DSA (null si es un club nuevo que aún no figura). */
  oficial: number | null
  /** Id del club en el juego, si ya existe. */
  juego: string | null
  nombre: string
  conDirector: boolean
  /** Solo si el club aún no figura en el directorio y se registra a mano. */
  nuevo?: { nombre: string; ciudad: string }
}

const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'do', 'da', 'dos', 'das'])
const titulo = (t: string) => t.toLowerCase().replace(/(^|[\s(/-])(\p{L}+)/gu, (_, a: string, w: string) => a + (a && MENORES.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * País → Unión → Asociación/Misión → Región → Club, con la lista OFICIAL de clubes de Conquistadores de la DSA
 * (clubes.adventistas.org). Así nadie escribe nombres inventados ni duplica su club.
 * Con `permitirNuevo`, un club recién fundado que aún no figura se puede registrar a mano.
 */
export function SelectorClub({ cuentas, onCambio, permitirNuevo = false }: {
  cuentas: PuertoCuentas | null
  onCambio: (c: ClubElegido | null) => void
  permitirNuevo?: boolean
}) {
  const [cat, setCat] = useState<CatalogoOrg | null>(null)
  const [fallo, setFallo] = useState(false)
  const [pais, setPais] = useState('PE')
  const [unionId, setUnionId] = useState<number | ''>('')
  const [campoId, setCampoId] = useState<number | ''>('')
  const [clubes, setClubes] = useState<ClubOficial[] | null>(null)
  const [region, setRegion] = useState('')
  const [buscar, setBuscar] = useState('')
  const [clave, setClave] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaCiudad, setNuevaCiudad] = useState('')

  useEffect(() => {
    if (!cuentas) { setFallo(true); return }
    let vivo = true
    cuentas.catalogo().then(c => { if (vivo) setCat(c) }).catch(() => { if (vivo) setFallo(true) })
    return () => { vivo = false }
  }, [cuentas])

  useEffect(() => {
    setClubes(null); setClave(''); setRegion(''); setBuscar('')
    if (campoId === '' || !cuentas) return
    let vivo = true
    cuentas.clubesOficiales(campoId).then(l => { if (vivo) setClubes(l) }).catch(() => { if (vivo) setClubes([]) })
    return () => { vivo = false }
  }, [campoId, cuentas])

  const uniones = useMemo(() => cat?.uniones.filter(u => u.pais === pais) ?? [], [cat, pais])
  const campos = useMemo(() => cat?.campos.filter(c => c.union === unionId) ?? [], [cat, unionId])
  const regiones = useMemo(() => [...new Set((clubes ?? []).map(c => c.region))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })), [clubes])
  const claveDe = (c: ClubOficial) => c.oficial !== null ? 'o' + c.oficial : 'j' + c.juego
  const visibles = useMemo(() => {
    const q = sinTildes(buscar.trim())
    return (clubes ?? []).filter(c => (q ? sinTildes(c.nombre).includes(q) || sinTildes(c.ciudad ?? '').includes(q) : !region || c.region === region))
  }, [clubes, region, buscar])

  // Avisa al formulario qué club quedó elegido (o null si aún falta)
  useEffect(() => {
    if (campoId === '') { onCambio(null); return }
    if (clave === NUEVO) {
      const n = nuevoNombre.trim(), ci = nuevaCiudad.trim()
      onCambio(n.length >= 2 && ci.length >= 2 ? { campo: campoId, oficial: null, juego: null, nombre: n, conDirector: false, nuevo: { nombre: n, ciudad: ci } } : null)
      return
    }
    const c = clubes?.find(x => claveDe(x) === clave)
    onCambio(c ? { campo: campoId, oficial: c.oficial, juego: c.juego, nombre: c.nombre, conDirector: c.con_director } : null)
  }, [campoId, clave, clubes, nuevoNombre, nuevaCiudad]) // eslint-disable-line react-hooks/exhaustive-deps

  const limpiar = (v: string) => v.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü .'-]/g, '').slice(0, 60)

  if (fallo) return <p className="error" role="alert">No se pudo cargar la lista de clubes. Revisa tu conexión y vuelve a intentar.</p>

  return (
    <fieldset className="selector-club">
      <legend>Tu club</legend>
      <div className="dos">
        <label>País<select value={pais} onChange={e => { setPais(e.target.value); setUnionId(''); setCampoId('') }} disabled={!cat}>
          {!cat && <option>Cargando…</option>}
          {(cat?.paises ?? []).map(p => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
        </select></label>
        <label>Unión<select value={unionId} onChange={e => { setUnionId(e.target.value ? Number(e.target.value) : ''); setCampoId('') }} disabled={!cat} required>
          <option value="">Elige…</option>
          {uniones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select></label>
      </div>
      <label>Asociación o Misión<select value={campoId} onChange={e => setCampoId(e.target.value ? Number(e.target.value) : '')} disabled={unionId === ''} required>
        <option value="">{unionId === '' ? 'Primero elige la unión' : 'Elige…'}</option>
        {campos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select></label>

      <div className="dos">
        <label>Región<select value={region} onChange={e => { setRegion(e.target.value); setBuscar(''); setClave('') }} disabled={!regiones.length}>
          <option value="">{campoId === '' ? '—' : clubes === null ? 'Cargando…' : 'Todas'}</option>
          {regiones.map(r => <option key={r} value={r}>{titulo(r)}</option>)}
        </select></label>
        <label>Buscar club
          <span className="buscar-club">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>
            <input type="search" value={buscar} onChange={e => { setBuscar(limpiar(e.target.value).slice(0, 30)); setClave('') }}
              placeholder="Nombre o ciudad" maxLength={30} autoComplete="off" disabled={!clubes} aria-label="Buscar club por nombre o ciudad" />
          </span>
        </label>
      </div>
      <label>Club<select value={clave} onChange={e => setClave(e.target.value)} required disabled={!clubes}>
        <option value="">{campoId === '' ? 'Primero elige tu asociación o misión' : clubes === null ? 'Cargando clubes…'
          : visibles.length ? `Elige tu club (${visibles.length})…` : buscar ? 'Ningún club coincide' : 'Aún no hay clubes cargados'}</option>
        {visibles.map(c => (
          <option key={claveDe(c)} value={claveDe(c)}>
            {c.nombre}{c.ciudad ? ` · ${titulo(c.ciudad)}` : ''}{c.juego ? ' ✓' : ''}
          </option>
        ))}
        {permitirNuevo && clubes && <option value={NUEVO}>Mi club es nuevo y aún no aparece</option>}
      </select></label>
      {clubes && (
        <>
          {clubes.some(c => c.juego) && <p className="ayuda">✓ = ese club ya juega en Aspirantazgo.</p>}
          {clave === NUEVO && (
            <>
              <div className="dos">
                <label>Nombre del club<input value={nuevoNombre} onChange={e => setNuevoNombre(limpiar(e.target.value))} maxLength={60} required autoComplete="off" /></label>
                <label>Ciudad<input value={nuevaCiudad} onChange={e => setNuevaCiudad(limpiar(e.target.value))} maxLength={60} required autoComplete="off" /></label>
              </div>
              <p className="ayuda">Solo si tu club es nuevo y todavía no figura en el directorio oficial de la DSA. Queda pendiente de verificación.</p>
            </>
          )}
        </>
      )}
    </fieldset>
  )
}
