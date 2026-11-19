import { useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { Cielo } from '../componentes/Comunes'
import { Podio } from '../componentes/Podio'
import type { Alcance, FilaRanking } from '../../application/puertos'
import { mensajeError } from '../../application/errores'

const ALCANCES: [Alcance, string][] = [['mi_club', 'Mi club'], ['jugador', 'Jugadores'], ['club', 'Clubes'], ['campo', 'Asoc./Misión'], ['union', 'Uniones'], ['pais', 'Países']]
const BANDERA: Record<string, string> = { PE: '🇵🇪', AR: '🇦🇷', BO: '🇧🇴', BR: '🇧🇷', CL: '🇨🇱', CO: '🇨🇴', EC: '🇪🇨', PY: '🇵🇾', UY: '🇺🇾', VE: '🇻🇪', MX: '🇲🇽', US: '🇺🇸', ES: '🇪🇸' }

export default function Ranking() {
  const { repo, perfil, ir, modo } = useJuego()
  const modoInicial: Alcance = modo === 'practica' ? 'jugador' : 'mi_club'
  const [alcance, setAlcance] = useState<Alcance>(modoInicial)
  const [miPais, setMiPais] = useState(false)
  const [filas, setFilas] = useState<FilaRanking[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setFilas(null); setError('')
    repo.ranking(alcance, miPais ? perfil?.club.pais : undefined)
      .then(f => { if (vivo) setFilas(f) })
      .catch(e => { if (vivo) { setError(mensajeError(e)); setFilas([]) } })
    return () => { vivo = false }
  }, [repo, alcance, miPais, perfil?.club.pais])

  return (
    <div className="pantalla ranking">
      <Cielo />
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir('mapa')} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><small>Isla del Uniforme</small><strong>Ranking</strong></div>
        <button className={`chip-pais ${miPais ? 'on' : ''}`} onClick={() => setMiPais(v => !v)}>{miPais ? (BANDERA[perfil?.club.pais ?? ''] ?? '🏳️') + ' Mi país' : '🌎 Mundial'}</button>
      </header>
      <div className="tabs ranking-tabs" role="tablist">
        {ALCANCES.map(([a, n]) => <button key={a} role="tab" aria-selected={alcance === a} className={alcance === a ? 'on' : ''} onClick={() => setAlcance(a)}>{n}</button>)}
      </div>

      {(alcance === 'jugador' || alcance === 'mi_club') && filas && filas.length > 0 && <div className="podio"><Podio top={filas.slice(0, 3).map(f => ({ nombre: f.nombre, avatar: f.avatar, rango: f.rango }))} /></div>}

      <ol className="lista-ranking">
        {filas === null && <li className="cargando">Cargando…</li>}
        {filas?.length === 0 && !error && <li className="vacio">{modo === 'practica' && alcance !== 'jugador' ? 'Únete a un club para aparecer en los rankings.' : 'Aún no hay puntajes. ¡Sé el primero en jugar un desafío!'}</li>}
        {error && <li className="error">{error}</li>}
        {filas?.map((f, i) => {
          const yo = f.es_mio ?? (alcance === 'jugador' ? f.nombre === perfil?.apodo && f.detalle === perfil?.club.nombre : alcance === 'club' && f.nombre === perfil?.club.nombre)
          return (
            <li key={i} className={`${yo ? 'yo' : ''} ${f.posicion <= 3 ? 'top' + f.posicion : ''}`}>
              <span className="pos">{f.posicion <= 3 ? ['🥇', '🥈', '🥉'][f.posicion - 1] : f.posicion}</span>
              <span className="quien"><b>{f.nombre}</b><small>{f.detalle ?? ''}{alcance !== 'jugador' && alcance !== 'mi_club' ? ` · ${f.jugadores} jugador${f.jugadores === 1 ? '' : 'es'}` : ''}</small></span>
              <span className="bandera">{BANDERA[f.pais ?? ''] ?? ''}</span>
              <span className="pts">{Number(f.puntos).toLocaleString('es-PE')}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
