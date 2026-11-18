import { useCallback, useEffect, useMemo, useState } from 'react'
import { mundoDeNivel, prepararNivel } from '../../domain/niveles'
import { describirCaso } from '../../domain/uniformes'
import { COMO_SE_JUEGA } from '../comoSeJuega'
import { pausar, reanudar } from '../reloj'
import { azar } from '../../domain/azar'
import { esAdulto } from '../../domain/tipos'
import { DIFICULTADES } from '../../domain/dificultad'
import { useJuego } from '../estado'
import { Boton, Confeti, Dialogo, Estrellas } from '../componentes/Comunes'
import { Taller } from '../juegos/Taller'
import { Inspector } from '../juegos/Inspector'
import { Quiz } from '../juegos/Quiz'
import { VerdaderoFalso } from '../juegos/VerdaderoFalso'
import { Lluvia } from '../juegos/Lluvia'
import { Ordenar } from '../juegos/Ordenar'
import { Frase } from '../juegos/Frase'
import { Parejas } from '../juegos/Parejas'
import { Ceremonia } from '../juegos/Ceremonia'
import { useReto, type FinReto } from '../juegos/useReto'
import { sfx } from '../sonido'

export default function Juego() {
  const { nivel, desafio, dificultad, semilla, perfil, ir, jugar, modo, sala } = useJuego()
  const enSala = !!sala && sala.rol === 'jugador'
  const [fase, setFase] = useState<'intro' | 'jugando' | 'fin'>(enSala ? 'jugando' : 'intro')
  const [fin, setFin] = useState<FinReto | null>(null)
  const [ronda, setRonda] = useState(0)
  const [reloj, setReloj] = useState(0)
  const reto = useReto(nivel!, desafio, dificultad)
  const pausado = useJuego(s => s.pausado)
  useEffect(() => () => reanudar(), [])
  useEffect(() => {
    if (fase !== 'jugando' || enSala) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') (useJuego.getState().pausado ? reanudar : pausar)() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [fase, enSala])
  const apodo = perfil ? (perfil.avatar.nombreTira || perfil.apodo) : ''
  const club = !perfil || perfil.club.nombre === 'Modo práctica' ? 'CLUB CONQUIS' : perfil.club.nombre
  const unidad = perfil?.avatar.unidad || 'HALCONES'
  // Un caso nuevo por partida. En una sala, todos reciben el mismo (misma semilla).
  const partida = useMemo(() => nivel ? prepararNivel(nivel, apodo, club, unidad, semilla ? azar(semilla) : Math.random) : null,
    [nivel, apodo, club, unidad, semilla, ronda]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (enSala) { reto.iniciar(); sfx.trompeta() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fase !== 'jugando') return
    const t = setInterval(() => setReloj(Math.floor(reto.segundos())), 500)
    return () => clearInterval(t)
  }, [fase, reto])

  const alTerminar = useCallback(async (factores: number[], errores: number) => {
    reanudar()
    const r = await reto.terminar(factores, errores)
    setFin(r)
    setFase('fin')
    if (r.resultado.estrellas >= 2) sfx.victoria(); else sfx.bien()
  }, [reto])

  if (!nivel || !perfil) return null
  const siguiente = mundoDeNivel(nivel.id).niveles.find(n => n.num === nivel.num + 1)
  const reglas = DIFICULTADES[dificultad]

  const empezar = () => { reto.iniciar(); setFase('jugando'); sfx.trompeta() }
  const repetir = () => { reanudar(); setFin(null); setRonda(r => r + 1); setFase('intro'); setReloj(0) }
  const como = COMO_SE_JUEGA[nivel.tipo]
  const props = { dificultad, semilla, onFin: alTerminar }

  return (
    <div className="pantalla juego">
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir(enSala ? 'sala' : 'mapa')} aria-label="Salir del nivel">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo">
          <div className="chips-nivel">
            <span className="chip-nivel">Nivel {nivel.num}</span>
            <span className={`chip-modo ${desafio ? 'desafio' : ''}`}>{enSala ? `Sala ${sala?.conexion.codigo}` : desafio ? reglas.nombre : 'Práctica'}</span>
          </div>
          <strong>{nivel.titulo}</strong>
        </div>
        <div className="juego-reloj">{Math.floor(reloj / 60)}:{String(reloj % 60).padStart(2, '0')}</div>
        {fase === 'jugando' && !enSala && (
          <button className="icono btn-pausa" onClick={pausar} aria-label="Pausar">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
          </button>
        )}
      </header>

      <main className={`juego-zona ${pausado ? 'pausado' : ''}`} key={ronda} aria-hidden={pausado || undefined}>
        {fase !== 'intro' && nivel.tipo === 'taller' && <Taller nivel={nivel} slots={partida!.slots} blanca={esAdulto(partida!.caso?.rango ?? nivel.rango)} desafio={desafio} dificultad={dificultad} caso={partida!.caso ? describirCaso(partida!.caso) : undefined} onFin={alTerminar} />}
        {fase !== 'intro' && nivel.tipo === 'inspector' && <Inspector nivel={nivel} base={partida!.slots} rango={partida!.caso?.rango ?? nivel.rango} {...props} />}
        {fase !== 'intro' && nivel.tipo === 'quiz' && <Quiz {...props} banco={nivel.banco} imagen={nivel.imagen} segPregunta={nivel.id === 'a08-palabra' ? (desafio ? 40 : 90) : undefined} />}
        {fase !== 'intro' && nivel.tipo === 'vf' && <VerdaderoFalso {...props} banco={nivel.vf} />}
        {fase !== 'intro' && nivel.tipo === 'frase' && nivel.rondas && <Frase rondas={nivel.rondas} {...props} />}
        {fase !== 'intro' && nivel.tipo === 'parejas' && nivel.parejas && <Parejas parejas={nivel.parejas} semilla={semilla} onFin={alTerminar} />}
        {fase !== 'intro' && nivel.tipo === 'ceremonia' && <Ceremonia onFin={alTerminar} />}
        {fase !== 'intro' && nivel.tipo === 'lluvia' && <Lluvia {...props} />}
        {fase !== 'intro' && nivel.tipo === 'ordenar' && <Ordenar {...props} />}
      </main>

      {fase === 'intro' && (
        <Dialogo npc={nivel.npc} titulo={nivel.titulo} accion={desafio ? '¡Al desafío!' : '¡A practicar!'} onAccion={empezar}
          secundaria="Volver" onSecundaria={() => ir('mapa')}>
          <p>{nivel.intro}</p>
          <div className="como-juega">
            <b><span aria-hidden>{como.icono}</span> Cómo se juega</b>
            <ol>{como.pasos.map(p => <li key={p}>{p}</li>)}</ol>
          </div>
          {partida?.caso && (
            <div className="caso">
              <b>Caso de hoy</b>
              <ul>{describirCaso(partida.caso).map(l => <li key={l}>{l}</li>)}</ul>
            </div>
          )}
          {nivel.tipo === 'taller' && <p className="nota">{desafio ? 'Desafío: sin medidas ni pistas de qué va dónde. Cuentan los aciertos, el tiempo y los errores.' : 'Práctica: cada cuadrito te muestra qué pieza va y verás las medidas del manual.'}</p>}
          {desafio && <p className="nota">Dificultad {reglas.nombre}: {reglas.descripcion}</p>}
          {desafio && modo === 'practica' && <p className="nota">Sin cuenta, tu puntaje se guarda solo en este dispositivo.</p>}
        </Dialogo>
      )}

      {pausado && fase === 'jugando' && (
        <div className="velo">
          <div className="pausa pop" role="dialog" aria-modal="true" aria-label="Juego en pausa">
            <h2>Pausa</h2>
            <p>El reloj está detenido. Tómate tu tiempo.</p>
            <div className="pausa-botones">
              <Boton onClick={reanudar}>Seguir jugando</Boton>
              <Boton tipo="fantasma" onClick={repetir}>Empezar de nuevo</Boton>
              <Boton tipo="fantasma" onClick={() => { reanudar(); ir('mapa') }}>Salir al mapa</Boton>
            </div>
          </div>
        </div>
      )}

      {fase === 'fin' && fin && (
        <div className="velo">
          {fin.resultado.estrellas >= 2 && <Confeti />}
          <div className="resultado pop">
            <h2>{fin.resultado.estrellas === 3 ? '¡Impecable!' : fin.resultado.estrellas === 2 ? '¡Muy bien!' : fin.resultado.estrellas === 1 ? '¡Aprobado!' : '¡Sigue practicando!'}</h2>
            <Estrellas n={fin.resultado.estrellas} grande />
            <div className="resultado-puntos"><span>{fin.resultado.puntaje}</span><small>puntos{desafio && reglas.multiplicador !== 1 ? ` (x${String(reglas.multiplicador).replace('.', ',')} por ${reglas.nombre})` : ''}</small></div>
            <div className="resultado-datos">
              <div><b>{Math.round(fin.resultado.precision * 100)}%</b><small>precisión</small></div>
              <div><b>{fin.resultado.errores}</b><small>errores</small></div>
              <div><b>{Math.round(fin.resultado.segundos)}s</b><small>tiempo</small></div>
            </div>
            {fin.servidor && <p className="resultado-servidor">Tu mejor marca: <b>{fin.servidor.mejor}</b>. Puesto <b>#{fin.servidor.puesto}</b> en este nivel.</p>}
            {!desafio && <p className="nota">La práctica no cuenta para el ranking. Juega el desafío para competir.</p>}
            {fin.aviso && <p className="nota aviso">{fin.aviso}</p>}
            <div className="fila-botones">
              {enSala ? (
                <Boton onClick={() => ir('sala')}>Ver la sala</Boton>
              ) : (
                <>
                  <Boton tipo="fantasma" onClick={() => ir('mapa')}>Mapa</Boton>
                  <Boton tipo="azul" onClick={repetir}>Repetir</Boton>
                  {!desafio && <Boton onClick={() => { setFin(null); jugar(nivel, true); repetir() }}>Desafío</Boton>}
                  {desafio && siguiente && fin.resultado.estrellas > 0 && <Boton onClick={() => { jugar(siguiente, true); repetir() }}>Siguiente</Boton>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
