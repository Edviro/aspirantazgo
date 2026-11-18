import { useMemo, useState } from 'react'
import { MUNDOS_JUGABLES } from '../../domain/niveles'
import { APROBADO, estrellasDeMejor } from '../../domain/puntuacion'
import { DIFICULTADES } from '../../domain/dificultad'
import type { Dificultad } from '../../domain/tipos'
import { mensajeError } from '../../application/errores'
import { useJuego } from '../estado'
import { Boton, Estrellas } from '../componentes/Comunes'
import { Mundo3D, type EstadoNodo } from '../tres/Mundo3D'

const RANGO_TXT: Record<string, string> = {
  conquistador: 'Conquistador', lider: 'Líder', guia_mayor: 'Guía Mayor', gm_master: 'GM Máster', gm_master_avanzado: 'GM Máster Avanzado',
}

export default function Mapa() {
  const { perfil, puntajes, jugar, ir, modo, sonido, toggleSonido, salir, dificultad, setDificultad, abrirSala, repo, mundo, setMundo } = useJuego()
  const mundoActual = MUNDOS_JUGABLES.find(m => m.id === mundo) ?? MUNDOS_JUGABLES[0]
  const niveles = mundoActual.niveles
  const [sel, setSel] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)
  const [borrar, setBorrar] = useState(false)
  const [unirse, setUnirse] = useState(false)
  const [codigoSala, setCodigoSala] = useState('')
  const [errorSala, setErrorSala] = useState('')
  const [conectando, setConectando] = useState(false)

  const { estados, estrellas, actual } = useMemo(() => {
    const estados: EstadoNodo[] = []
    const estrellas: number[] = []
    let actual = 0
    niveles.forEach((n, i) => {
      const p = puntajes[n.id] ?? 0
      const previoOk = i === 0 || (puntajes[niveles[i - 1].id] ?? 0) >= APROBADO
      estados.push(p >= APROBADO ? 'hecho' : previoOk ? 'abierto' : 'bloqueado')
      estrellas.push(estrellasDeMejor(p))
      if (previoOk) actual = i
    })
    return { estados, estrellas, actual }
  }, [niveles, puntajes])

  if (!perfil) return null
  const total = Object.values(puntajes).reduce((a, b) => a + b, 0)
  const nivelSel = sel !== null ? niveles[sel] : null
  const puedeSalas = !!repo.salas
  const esAdulto = perfil.grupo_edad === 'adulto'

  const entrarSala = async (codigo: string | null) => {
    setErrorSala(''); setConectando(true)
    try { await abrirSala(codigo) } catch (e) { setErrorSala(mensajeError(e)) } finally { setConectando(false) }
  }

  return (
    <div className="pantalla mapa">
      <div className="mapa-canvas">
        <Mundo3D key={mundoActual.id} mundo={mundoActual.id} onIrMundo={id => { setSel(null); setMundo(id) }} niveles={niveles} estados={estados} estrellas={estrellas} actual={actual} foco={sel ?? actual}
          avatar={perfil.avatar} rango={perfil.rango} club={perfil.club.nombre} apodo={perfil.apodo} onElegir={i => setSel(i)} />
      </div>

      <header className="hud">
        <button className="hud-perfil" onClick={() => ir('editor')} aria-label="Editar personaje">
          <span className="hud-avatar">{perfil.apodo.slice(0, 1).toUpperCase()}</span>
          <span className="hud-txt"><b>{perfil.apodo}</b><small>{RANGO_TXT[perfil.rango]}, {perfil.club.nombre}</small></span>
        </button>
        <div className="hud-puntos" title="Puntos totales"><span>★</span>{total.toLocaleString('es-PE')}</div>
        <button className="icono" onClick={() => setMenu(m => !m)} aria-label="Menú">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
      </header>

      {menu && (
        <div className="menu pop" onClick={() => setMenu(false)}>
          <button onClick={() => ir('ranking')}>Ranking</button>
          <button onClick={() => ir('editor')}>Mi personaje</button>
          {puedeSalas && <button onClick={() => setUnirse(true)}>Unirme a una sala</button>}
          {puedeSalas && esAdulto && <button onClick={() => entrarSala(null)}>Crear sala en vivo</button>}
          {perfil.club.soy_director && <button onClick={() => ir('director')}>Panel del club</button>}
          <button onClick={toggleSonido}>{sonido ? 'Silenciar sonido' : 'Activar sonido'}</button>
          <button onClick={() => useJuego.getState().verLegal('privacidad')}>Privacidad y términos</button>
          <button onClick={() => setBorrar(true)}>Borrar mi cuenta</button>
          <button onClick={() => salir()}>{modo === 'practica' ? 'Salir del modo práctica' : 'Cerrar sesión'}</button>
        </div>
      )}

      <div className="mapa-titulo">
        <h1>{mundoActual.nombre}</h1>
        <p>{estados.filter(e => e === 'hecho').length} de {niveles.length} niveles superados</p>
        {MUNDOS_JUGABLES.length > 1 && <div className="islas" role="tablist" aria-label="Islas">
          {MUNDOS_JUGABLES.map(m => (
            <button key={m.id} role="tab" aria-selected={m.id === mundoActual.id} className={m.id === mundoActual.id ? 'on' : ''}
              onClick={() => { setSel(null); setMundo(m.id) }}>{m.nombre.replace('Isla del ', '')}</button>
          ))}
        </div>}
      </div>

      <nav className="mapa-acciones">
        {puedeSalas ? <Boton tipo="azul" onClick={() => (esAdulto ? entrarSala(null) : setUnirse(true))}>{esAdulto ? 'Crear sala' : 'Sala en vivo'}</Boton>
          : <Boton tipo="azul" onClick={() => ir('ranking')}>Ranking</Boton>}
        <Boton onClick={() => setSel(actual)}>Jugar nivel {actual + 1}</Boton>
      </nav>

      {errorSala && !unirse && <div className="toast toast-mal" style={{ top: 120 }}>{errorSala}</div>}

      {unirse && (
        <div className="velo">
          <form className="resultado pop form-sala" onSubmit={e => { e.preventDefault(); entrarSala(codigoSala.trim().toUpperCase()) }}>
            <h2>Unirme a una sala</h2>
            <label htmlFor="codigo-sala">Código que te dio tu líder</label>
            <input id="codigo-sala" value={codigoSala} onChange={e => setCodigoSala(e.target.value.toUpperCase().slice(0, 4))} placeholder="ABCD" autoCapitalize="characters" autoComplete="off" />
            {errorSala && <p className="error">{errorSala}</p>}
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => { setUnirse(false); setErrorSala('') }}>Cancelar</Boton>
              <Boton type="submit" disabled={codigoSala.length !== 4 || conectando}>{conectando ? 'Entrando…' : 'Entrar'}</Boton>
            </div>
          </form>
        </div>
      )}

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
          <span className="chip-nivel">Nivel {nivelSel.num}</span>
          <h2>{nivelSel.titulo}</h2>
          <p className="hoja-sub">{nivelSel.subtitulo}</p>
          <Estrellas n={estrellas[sel]} />
          <p className="hoja-mejor">{puntajes[nivelSel.id] ? <>Mejor puntaje: <b>{puntajes[nivelSel.id]}</b></> : 'Aún no lo juegas en desafío'}</p>
          {estados[sel] === 'bloqueado' ? (
            <p className="nota">Supera el nivel {sel} en desafío, con 400 puntos o más, para abrir este.</p>
          ) : (
            <>
              <div className="chips dificultad" role="radiogroup" aria-label="Dificultad del desafío">
                {(Object.keys(DIFICULTADES) as Dificultad[]).map(d => (
                  <button key={d} role="radio" aria-checked={dificultad === d} className={`${dificultad === d ? 'on' : ''} dif-${d}`} onClick={() => setDificultad(d)}>
                    {DIFICULTADES[d].nombre}
                  </button>
                ))}
              </div>
              <p className="nota dif-desc">{DIFICULTADES[dificultad].descripcion}</p>
              <div className="fila-botones">
                <Boton tipo="verde" onClick={() => jugar(nivelSel, false)}>Practicar</Boton>
                <Boton onClick={() => jugar(nivelSel, true)}>Desafío {DIFICULTADES[dificultad].nombre.toLowerCase()}</Boton>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
