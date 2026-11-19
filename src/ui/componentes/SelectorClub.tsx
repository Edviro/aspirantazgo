import { useEffect, useMemo, useState } from 'react'
import type { CatalogoOrg, ClubLista, PuertoCuentas } from '../../application/puertos'

export const OTRO_CLUB = '__otro__'

export interface ClubElegido {
  /** Id del club registrado, o null si lo escribió a mano. */
  id: string | null
  /** Nombre a mostrar (del catálogo o escrito). */
  nombre: string
}

/**
 * País → Unión → Asociación/Misión → Club, con los clubes que ya existen en el juego para que no se dupliquen.
 * Si el club no está, "Mi club no está en la lista" abre un campo de texto. Si el catálogo no carga
 * (sin conexión), queda solo el campo de texto.
 */
export function SelectorClub({ cuentas, onCambio }: { cuentas: PuertoCuentas | null; onCambio: (c: ClubElegido | null) => void }) {
  const [cat, setCat] = useState<CatalogoOrg | null>(null)
  const [fallo, setFallo] = useState(false)
  const [pais, setPais] = useState('PE')
  const [unionId, setUnionId] = useState<number | ''>('')
  const [campoId, setCampoId] = useState<number | ''>('')
  const [clubes, setClubes] = useState<ClubLista[] | null>(null)
  const [clubId, setClubId] = useState('')
  const [texto, setTexto] = useState('')

  useEffect(() => {
    if (!cuentas) { setFallo(true); return }
    let vivo = true
    cuentas.catalogo().then(c => { if (vivo) setCat(c) }).catch(() => { if (vivo) setFallo(true) })
    return () => { vivo = false }
  }, [cuentas])

  useEffect(() => {
    setClubes(null); setClubId('')
    if (campoId === '' || !cuentas) return
    let vivo = true
    cuentas.clubesDeCampo(campoId).then(l => { if (vivo) setClubes(l) }).catch(() => { if (vivo) setClubes([]) })
    return () => { vivo = false }
  }, [campoId, cuentas])

  const uniones = useMemo(() => cat?.uniones.filter(u => u.pais === pais) ?? [], [cat, pais])
  const campos = useMemo(() => cat?.campos.filter(c => c.union === unionId) ?? [], [cat, unionId])
  const aMano = fallo || clubId === OTRO_CLUB

  // Avisa al formulario qué club quedó elegido (o null si aún falta)
  useEffect(() => {
    if (aMano) { const t = texto.trim(); onCambio(t.length >= 2 ? { id: null, nombre: t } : null); return }
    const c = clubes?.find(x => x.id === clubId)
    onCambio(c ? { id: c.id, nombre: c.nombre } : null)
  }, [aMano, texto, clubId, clubes]) // eslint-disable-line react-hooks/exhaustive-deps

  const limpiar = (v: string) => v.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü .-]/g, '').slice(0, 40)
  const campoTexto = (
    <label>{fallo ? 'Tu club' : 'Nombre de tu club'}
      <input value={texto} onChange={e => setTexto(limpiar(e.target.value))} maxLength={40} placeholder="Ej. Halcones" required autoComplete="off" />
    </label>
  )
  if (fallo) return campoTexto

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
        <option value="">{unionId === '' ? 'Primero elige la unión' : campos.length ? 'Elige…' : 'Aún no hay campos para esta unión'}</option>
        {campos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select></label>
      <label>Club<select value={clubId} onChange={e => setClubId(e.target.value)} disabled={campoId === '' || clubes === null} required>
        <option value="">{campoId === '' ? 'Primero elige tu asociación o misión' : clubes === null ? 'Cargando clubes…' : clubes.length ? 'Elige tu club…' : 'No hay clubes aún'}</option>
        {(clubes ?? []).map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.ciudad})</option>)}
        {campoId !== '' && clubes !== null && <option value={OTRO_CLUB}>Mi club no está en la lista</option>}
      </select></label>
      {clubId === OTRO_CLUB && campoTexto}
    </fieldset>
  )
}
