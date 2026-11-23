import { useEffect, useState } from 'react'
import type { PuertoAdmin, SolicitudCargo } from '../../../application/puertos'
import { Boton } from '../Comunes'

const fecha = (iso: string) => new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Superadmin: aprobar directores de club (solo con Google) y uniformes de Departamental. */
export function AdminCargos({ admin, hacer }: { admin: PuertoAdmin; hacer: (fn: () => Promise<void>, ok?: string) => Promise<void> }) {
  const [lista, setLista] = useState<SolicitudCargo[] | null>(null)
  const cargar = () => hacer(async () => { setLista(admin.solicitudesCargo ? await admin.solicitudesCargo() : []) })
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const resolver = (s: SolicitudCargo, aprobar: boolean) => hacer(async () => {
    if (!admin.resolverSolicitudCargo) return
    await admin.resolverSolicitudCargo(s.id, aprobar)
    await cargar()
  }, aprobar ? `Aprobado: ${s.apodo} (${s.tipo === 'director' ? 'director de ' + s.club : 'Departamental'})` : 'Solicitud rechazada')

  if (lista === null) return <p>Cargando…</p>
  if (!lista.length) return <p className="nota">No hay solicitudes pendientes de director ni de Departamental.</p>
  return (
    <ul className="admin-lista admin-cargos">
      {lista.map(s => (
        <li key={s.id}>
          <div>
            <b>{s.tipo === 'director' ? 'Director' : 'Departamental'}</b> · {s.apodo}
            <small>{s.club}{s.campo ? ` · ${s.campo}` : ''} · {fecha(s.creada)}</small>
            <small>{s.correo ?? 'sin correo'} · {s.google ? 'cuenta de Google ✓' : 'NO es cuenta de Google'}{s.tipo === 'director' && s.club_con_director ? ' · el club ya tiene director' : ''}</small>
            {s.nota && <small>“{s.nota}”</small>}
          </div>
          <div className="fila-botones">
            <Boton tipo="fantasma" onClick={() => resolver(s, false)}>Rechazar</Boton>
            <Boton onClick={() => resolver(s, true)} disabled={s.tipo === 'director' && (!s.google || s.club_con_director)}>Aprobar</Boton>
          </div>
        </li>
      ))}
    </ul>
  )
}
