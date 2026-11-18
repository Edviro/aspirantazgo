import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Malla } from '../tres/Toon'
import { useJuego } from '../estado'
import { Cielo } from '../componentes/Comunes'
import { Avatar3D } from '../tres/Avatar3D'
import type { Alcance, FilaRanking } from '../../application/puertos'
import { mensajeError } from '../../application/errores'

const ALCANCES: [Alcance, string][] = [['jugador', 'Jugadores'], ['club', 'Clubes'], ['ciudad', 'Ciudades'], ['campo', 'Campos'], ['pais', 'Países']]
const BANDERA: Record<string, string> = { PE: '🇵🇪', AR: '🇦🇷', BO: '🇧🇴', BR: '🇧🇷', CL: '🇨🇱', CO: '🇨🇴', EC: '🇪🇨', PY: '🇵🇾', UY: '🇺🇾', VE: '🇻🇪', MX: '🇲🇽', US: '🇺🇸', ES: '🇪🇸' }

function Podio({ top }: { top: FilaRanking[] }) {
  const lugares = [{ i: 1, x: -1.25, h: 0.55, c: '#C0C7D1' }, { i: 0, x: 0, h: 0.85, c: '#FFC20E' }, { i: 2, x: 1.25, h: 0.38, c: '#CD7F32' }]
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.4, 3.9], fov: 38 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 6, 4]} intensity={2.4} />
      <group position={[0, -0.9, 0]}>
        {lugares.map(l => (
          <group key={l.i} position={[l.x, 0, 0]}>
            <Malla position={[0, l.h / 2, 0]} geo={<boxGeometry args={[1.1, l.h, 0.9]} />} color={l.c} t={0.03} />
            {top[l.i] && <group position={[0, l.h, 0]}><Avatar3D a={top[l.i].avatar ?? {}} rango={top[l.i].rango ?? 'conquistador'} animo={l.i === 0 ? 'celebra' : 'saluda'} escala={0.62} /></group>}
          </group>
        ))}
      </group>
      <Sparkles count={50} scale={[5, 3, 2]} position={[0, 1, 0]} size={4} speed={0.5} color="#FFE07A" />
    </Canvas>
  )
}

export default function Ranking() {
  const { repo, perfil, ir, modo } = useJuego()
  const [alcance, setAlcance] = useState<Alcance>('jugador')
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

      {alcance === 'jugador' && filas && filas.length > 0 && <div className="podio"><Podio top={filas.slice(0, 3)} /></div>}

      <ol className="lista-ranking">
        {filas === null && <li className="cargando">Cargando…</li>}
        {filas?.length === 0 && !error && <li className="vacio">{modo === 'practica' && alcance !== 'jugador' ? 'Únete a un club para aparecer en los rankings.' : 'Aún no hay puntajes. ¡Sé el primero en jugar un desafío!'}</li>}
        {error && <li className="error">{error}</li>}
        {filas?.map((f, i) => {
          const yo = alcance === 'jugador' ? f.nombre === perfil?.apodo && f.detalle === perfil?.club.nombre : alcance === 'club' && f.nombre === perfil?.club.nombre
          return (
            <li key={i} className={`${yo ? 'yo' : ''} ${f.posicion <= 3 ? 'top' + f.posicion : ''}`}>
              <span className="pos">{f.posicion <= 3 ? ['🥇', '🥈', '🥉'][f.posicion - 1] : f.posicion}</span>
              <span className="quien"><b>{f.nombre}</b><small>{f.detalle ?? ''}{alcance !== 'jugador' ? ` · ${f.jugadores} jugador${f.jugadores === 1 ? '' : 'es'}` : ''}</small></span>
              <span className="bandera">{BANDERA[f.pais ?? ''] ?? ''}</span>
              <span className="pts">{Number(f.puntos).toLocaleString('es-PE')}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
