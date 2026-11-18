import { useMemo, useState } from 'react'
import { MUNDO_UNIFORMES } from '../../domain/niveles'
import { APROBADO, estrellas as estrellasDe } from '../../domain/puntuacion'
import { useJuego } from '../estado'
import { Boton, Estrellas } from '../componentes/Comunes'
import { Mundo3D, type EstadoNodo } from '../tres/Mundo3D'

const RANGO_TXT: Record<string, string> = {
  conquistador: 'Conquistador', lider: 'Líder', guia_mayor: 'Guía Mayor', gm_master: 'GM Máster', gm_master_avanzado: 'GM Máster Avanzado',
}

export default function Mapa() {
  const { perfil, puntajes, jugar, ir, modo, sonido, toggleSonido, salir } = useJuego()
  const niveles = MUNDO_UNIFORMES.niveles
  const [sel, setSel] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)
  const [borrar, setBorrar] = useState(false)

  const { estados, estrellas, actual } = useMemo(() => {
    const estados: EstadoNodo[] = []
    const estrellas: number[] = []
    let actual = 0
    niveles.forEach((n, i) => {
      const p = puntajes[n.id] ?? 0
      const previoOk = i === 0 || (puntajes[niveles[i - 1].id] ?? 0) >= APROBADO
      estados.push(p >= APROBADO ? 'hecho' : previoOk ? 'abierto' : 'bloqueado')
      estrellas.push(estrellasDe(p))
      if (previoOk) actual = i
    })
    return { estados, estrellas, actual }
  }, [niveles, puntajes])

  if (!perfil) return null
  const total = Object.values(puntajes).reduce((a, b) => a + b, 0)
  const nivelSel = sel !== null ? niveles[sel] : null

  return (
    <div className="pantalla mapa">
      <div className="mapa-canvas">
        <Mundo3D niveles={niveles} estados={estados} estrellas={estrellas} actual={actual} foco={sel ?? actual}
          avatar={perfil.avatar} rango={perfil.rango} onElegir={i => setSel(i)} />
      </div>

      <header className="hud">
        <button className="hud-perfil" onClick={() => ir('editor')} aria-label="Editar personaje">
          <span className="hud-avatar">{perfil.apodo.slice(0, 1).toUpperCase()}</span>
          <span className="hud-txt"><b>{perfil.apodo}</b><small>{RANGO_TXT[perfil.rango]} · {perfil.club.nombre}</small></span>
        </button>
        <div className="hud-puntos" title="Puntos totales"><span>★</span>{total.toLocaleString('es-PE')}</div>
        <button className="icono" onClick={() => setMenu(m => !m)} aria-label="Menú">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
      </header>

      {menu && (
        <div className="menu pop" onClick={() => setMenu(false)}>
          <button onClick={() => ir('ranking')}>🏆 Ranking</button>
          <button onClick={() => ir('editor')}>🎨 Mi personaje</button>
          {perfil.club.soy_director && <button onClick={() => ir('director')}>🛡️ Panel del club</button>}
          <button onClick={toggleSonido}>{sonido ? '🔊 Sonido: sí' : '🔇 Sonido: no'}</button>
          <button onClick={() => useJuego.getState().verLegal('privacidad')}>🔒 Privacidad y términos</button>
          <button onClick={() => setBorrar(true)}>🗑️ Borrar mi cuenta</button>
          <button onClick={() => salir()}>🚪 {modo === 'practica' ? 'Salir del modo práctica' : 'Cerrar sesión'}</button>
        </div>
      )}

      <div className="mapa-titulo">
        <h1>Isla del Uniforme</h1>
        <p>{estados.filter(e => e === 'hecho').length} de {niveles.length} niveles superados</p>
      </div>

      <nav className="mapa-acciones">
        <Boton tipo="azul" onClick={() => ir('ranking')}>🏆 Ranking</Boton>
        <Boton onClick={() => setSel(actual)}>▶ Jugar nivel {actual + 1}</Boton>
      </nav>

      {borrar && (
        <div className="velo">
          <div className="resultado pop">
            <h2>¿Borrar tu cuenta?</h2>
            <p>Se eliminarán tu apodo, tu personaje y todos tus puntajes. No se puede deshacer.</p>
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => setBorrar(false)}>Cancelar</Boton>
              <Boton tipo="rojo" onClick={async () => { try { await useJuego.getState().repo.borrarMisDatos() } finally { setBorrar(false); await salir() } }}>Borrar todo</Boton>
            </div>
          </div>
        </div>
      )}

      {nivelSel && sel !== null && (
        <div className="hoja pop" role="dialog" aria-label={nivelSel.titulo}>
          <button className="hoja-cerrar" onClick={() => setSel(null)} aria-label="Cerrar">×</button>
          <small className="hoja-num">Nivel {nivelSel.num}</small>
          <h2>{nivelSel.titulo}</h2>
          <p className="hoja-sub">{nivelSel.subtitulo}</p>
          <Estrellas n={estrellas[sel]} />
          <p className="hoja-mejor">{puntajes[nivelSel.id] ? <>Mejor puntaje: <b>{puntajes[nivelSel.id]}</b></> : 'Aún no lo juegas en desafío'}</p>
          {estados[sel] === 'bloqueado' ? (
            <p className="nota">🔒 Supera el nivel {sel} en modo desafío (400 puntos o más) para abrir este.</p>
          ) : (
            <div className="fila-botones">
              <Boton tipo="verde" onClick={() => jugar(nivelSel, false)}>📘 Práctica</Boton>
              <Boton onClick={() => jugar(nivelSel, true)}>⚔️ Desafío</Boton>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
