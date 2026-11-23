import { useEffect, useState } from 'react'
import type { PiezaMuseo, PuertoAdmin } from '../../../application/puertos'
import { useJuego } from '../../estado'
import { Boton } from '../Comunes'

type Pendiente = PiezaMuseo & { club: string; campo: string | null; creada: string }

function Vista({ ruta, alt }: { ruta: string; alt: string }) {
  const { repo } = useJuego()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { repo.clubPerfil?.urlFoto(ruta).then(setUrl).catch(() => undefined) }, [ruta, repo])
  return url ? <img src={url} alt={alt} referrerPolicy="no-referrer" /> : <span className="museo-foto-cargando" />
}

/** Superadmin: aprobar las fotos que suben los directores al museo de su club. */
export function AdminMuseo({ admin, hacer }: { admin: PuertoAdmin; hacer: (fn: () => Promise<void>, ok?: string) => Promise<void> }) {
  const [lista, setLista] = useState<Pendiente[] | null>(null)
  const cargar = () => hacer(async () => { setLista(admin.museoPendientes ? await admin.museoPendientes() : []) })
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const resolver = (p: Pendiente, ok: boolean) => hacer(async () => { await admin.resolverMuseo?.(p.id, ok); await cargar() }, ok ? 'Foto aprobada.' : 'Foto rechazada.')
  if (lista === null) return <p>Cargando…</p>
  if (!lista.length) return <p className="nota">No hay fotos por revisar.</p>
  return (
    <ul className="admin-museo">
      {lista.map(p => (
        <li key={p.id}>
          {p.ruta && <Vista ruta={p.ruta} alt={p.titulo} />}
          <div><b>{p.titulo}</b><small>{p.club}{p.campo ? ` · ${p.campo}` : ''} · {[p.anio, p.campamento].filter(Boolean).join(' · ')}</small>{p.descripcion && <small>{p.descripcion}</small>}</div>
          <div className="fila-botones"><Boton tipo="fantasma" onClick={() => resolver(p, false)}>Rechazar</Boton><Boton onClick={() => resolver(p, true)}>Aprobar</Boton></div>
        </li>
      ))}
    </ul>
  )
}
