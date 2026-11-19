import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Memoria } from '../juegos/Memoria'
import { useReto, type FinReto } from '../juegos/useReto'
import { sfx } from '../sonido'
import { musica, pistaDeNivel } from '../musica'
import { APROBADO } from '../../domain/puntuacion'
import { esRetoDelDia, useProgreso } from '../progreso'
import { rachaVigente } from '../../domain/diario'

export default function Juego() {
  const { nivel, desafio, dificultad, semilla, perfil, ir, jugar, modo, sala } = useJuego()
  const enSala = !!sala && sala.rol === 'jugador'
  const [fase, setFase] = useState<'intro' | 'jugando' | 'fin'>(enSala ? 'jugando' : 'intro')
  const [fin, setFin] = useState<FinReto | null>(null)
  const [ronda, setRonda] = useState(0)
  const [reloj, setReloj] = useState(0)
  const reto = useReto(nivel!, desafio, dificultad)
  const pausado = useJuego(s => s.pausado)
  const puntajeNivel = useJuego(s => (nivel ? s.puntajes[nivel.id] ?? 0 : 0))
  // Puntaje guardado ANTES de esta partida: sirve para saber si acabas de desbloquear el siguiente nivel
  const antes = useRef(puntajeNivel)
  useEffect(() => () => { reanudar(); musica('mapa') }, [])
  useEffect(() => { musica(fase === 'jugando' ? (enSala ? 'himno_epico' : pistaDeNivel(nivel?.tipo ?? '')) : fase === 'fin' ? null : 'mapa') }, [fase]) // eslint-disable-line react-hooks/exhaustive-deps
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
    // Reto del día: si lo apruebas, suma a tu racha
    const diario = desafio && esRetoDelDia(nivel!.id, semilla) && r.resultado.estrellas >= 1 && useProgreso.getState().cumplirDiario()
    setFin({ ...r, diario: diario ? rachaVigente(useProgreso.getState().racha) : undefined })
    setFase('fin')
    if (r.resultado.estrellas >= 1) sfx.nivel(); else sfx.mal()
  }, [reto, desafio, nivel, semilla])

  if (!nivel || !perfil) return null
  const siguiente = mundoDeNivel(nivel.id).niveles.find(n => n.num === nivel.num + 1)
  const reglas = DIFICULTADES[dificultad]

  const empezar = () => { reto.iniciar(); setFase('jugando'); sfx.trompeta() }
  const repetir = () => { reanudar(); antes.current = useJuego.getState().puntajes[nivel.id] ?? 0; setFin(null); setRonda(r => r + 1); setFase('intro'); setReloj(0) }
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
        {fase !== 'intro' && nivel.tipo === 'memoria' && <Memoria {...props} />}
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
        <FinNivel fin={fin} desafio={desafio} enSala={enSala} multiplicador={reglas.multiplicador} nombreDif={reglas.nombre}
          desbloqueado={desafio && !!siguiente && antes.current < APROBADO && puntajeNivel >= APROBADO ? siguiente.titulo : null}
          numSiguiente={siguiente?.num}
          onMapa={() => ir('mapa')} onSala={() => ir('sala')} onRepetir={repetir}
          onDesafio={!desafio ? () => { setFin(null); jugar(nivel, true); repetir() } : undefined}
          onSiguiente={desafio && siguiente && fin.resultado.estrellas > 0 ? () => { jugar(siguiente, true); repetir() } : undefined} />
      )}
    </div>
  )
}

function useContador(meta: number, ms = 1100) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(meta); return }
    let raf = 0; const t0 = performance.now()
    const paso = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(meta * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(paso) }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [meta, ms])
  return v
}

/** Pantalla de fin de nivel: titular de cómic, estrellas una a una, puntaje que sube y desbloqueo del siguiente nivel. */
function FinNivel({ fin, desafio, enSala, multiplicador, nombreDif, desbloqueado, numSiguiente, onMapa, onSala, onRepetir, onDesafio, onSiguiente }: {
  fin: FinReto; desafio: boolean; enSala: boolean; multiplicador: number; nombreDif: string; desbloqueado: string | null; numSiguiente?: number
  onMapa: () => void; onSala: () => void; onRepetir: () => void; onDesafio?: () => void; onSiguiente?: () => void
}) {
  const r = fin.resultado
  const puntos = useContador(r.puntaje)
  const aprobado = r.estrellas >= 1
  useEffect(() => {
    if (!desbloqueado) return
    const t = setTimeout(() => sfx.desbloqueo(), 1500)
    return () => clearTimeout(t)
  }, [desbloqueado])
  const titular = !aprobado ? '¡Casi lo logras!' : desafio ? '¡Nivel completado!' : '¡Práctica completada!'
  const sub = r.estrellas === 3 ? 'Impecable, como en el manual.' : r.estrellas === 2 ? '¡Muy bien hecho!' : r.estrellas === 1 ? 'Aprobado. ¡Ve por las 3 estrellas!' : 'Practica un poco más y vuelve a intentarlo.'
  return (
    <div className="velo">
      {aprobado && <Confeti />}
      <div className={`fin-nivel ${aprobado ? 'ok' : 'casi'}`} role="dialog" aria-modal="true" aria-label={titular}>
        <div className="fin-titular"><span>{titular}</span></div>
        <p className="fin-sub">{sub}</p>
        <Estrellas n={r.estrellas} grande />
        <div className="resultado-puntos"><span>{puntos}</span><small>puntos{desafio && multiplicador !== 1 ? ` (x${String(multiplicador).replace('.', ',')} por ${nombreDif})` : ''}</small></div>
        <div className="resultado-datos">
          <div><b>{Math.round(r.precision * 100)}%</b><small>precisión</small></div>
          <div><b>{r.errores}</b><small>errores</small></div>
          <div><b>{Math.round(r.segundos)}s</b><small>tiempo</small></div>
        </div>
        {fin.diario !== undefined && (
          <div className="fin-desbloqueo fin-diario"><b>¡Reto del día cumplido!</b><span>Racha: {fin.diario} {fin.diario === 1 ? 'día' : 'días'} seguidos</span></div>
        )}
        {desbloqueado && (
          <div className="fin-desbloqueo"><b>¡Nivel {numSiguiente} desbloqueado!</b><span>{desbloqueado}</span></div>
        )}
        {fin.servidor && <p className="resultado-servidor">Tu mejor marca: <b>{fin.servidor.mejor}</b>. Puesto <b>#{fin.servidor.puesto}</b> en este nivel.</p>}
        {!desafio && <p className="nota">La práctica no cuenta para el ranking ni desbloquea niveles. Juega el desafío para avanzar.</p>}
        {fin.aviso && <p className="nota aviso">{fin.aviso}</p>}
        <div className="fila-botones">
          {enSala ? <Boton onClick={onSala}>Ver resultados</Boton> : (
            <>
              <Boton tipo="fantasma" onClick={onMapa}>Mapa</Boton>
              <Boton tipo="azul" onClick={onRepetir}>Repetir</Boton>
              {onDesafio && <Boton onClick={onDesafio}>Ir al desafío</Boton>}
              {onSiguiente && <Boton onClick={onSiguiente}>Siguiente nivel</Boton>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
