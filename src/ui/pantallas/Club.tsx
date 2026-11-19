import { useMemo, useState, useEffect } from 'react'
import { useJuego } from '../estado'
import { musica } from '../musica'
import { Boton, Cielo } from '../componentes/Comunes'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { EscenaClub } from '../pixel/EscenaClub'
import { MUNDOS_JUGABLES } from '../../domain/niveles'
import { DIFICULTADES } from '../../domain/dificultad'
import type { Dificultad } from '../../domain/tipos'
import { FRASES, type JugadorEnLinea } from '../../application/puertos'
import { mensajeError } from '../../application/errores'

const RANGO: Record<string, string> = { conquistador: 'Conquistador', lider: 'Líder', guia_mayor: 'Guía Mayor', gm_master: 'GM Máster', gm_master_avanzado: 'GM Máster Avanzado' }
const DUELO_TIPOS = new Set(['taller', 'quiz', 'vf', 'lluvia', 'inspector', 'ordenar', 'frase', 'memoria'])

/** La isla de tu club: quién está conectado ahora, con su personaje, y a quién puedes retar (de tu club o de otra isla). */
export default function Club() {
  const { perfil, enLinea, ir, desafiar, presencia, conectarPresencia, enviarGesto } = useJuego()
  useEffect(() => { musica('mapa') }, [])
  // Las otras islas se actualizan cada 30 s mientras miras la isla (no hace falta un canal global)
  useEffect(() => {
    if (!presencia) return
    void presencia.refrescarOtros()
    const t = setInterval(() => { if (!document.hidden) void presencia.refrescarOtros() }, 30000)
    return () => clearInterval(t)
  }, [presencia])
  const [rivales, setRivales] = useState<JugadorEnLinea[]>([])
  const rival = rivales[0] ?? null
  const setRival = (j: JugadorEnLinea | null) => setRivales(j ? [j] : [])
  const [nivelId, setNivelId] = useState(MUNDOS_JUGABLES[0].niveles.find(n => n.tipo === 'quiz')?.id ?? MUNDOS_JUGABLES[0].niveles[0].id)
  const [dif, setDif] = useState<Dificultad>('medio')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [verOtras, setVerOtras] = useState(false)

  const { mios, otras } = useMemo(() => {
    const otros = enLinea.filter(j => j.id !== perfil?.id)
    const mios = otros.filter(j => j.clubId === perfil?.club.id)
    const porClub = new Map<string, { club: string; jugadores: JugadorEnLinea[] }>()
    for (const j of otros) {
      if (j.clubId === perfil?.club.id) continue
      const g = porClub.get(j.clubId) ?? { club: j.club, jugadores: [] }
      g.jugadores.push(j); porClub.set(j.clubId, g)
    }
    return { mios, otras: [...porClub.values()].sort((a, b) => b.jugadores.length - a.jugadores.length) }
  }, [enLinea, perfil])

  if (!perfil) return null
  // Quienes se pueden sumar a un reto: conectados que no están jugando (primero los de tu club)
  const libres = [...mios, ...otras.flatMap(g => g.jugadores)].filter(j => !j.ocupado)
  const enviar = async () => {
    if (!rivales.length) return
    setError(''); setEnviando(true)
    try { await desafiar(rivales, nivelId, dif); setRival(null) } catch (e) { setError(mensajeError(e)) } finally { setEnviando(false) }
  }

  const tarjeta = (j: JugadorEnLinea) => (
    <li key={j.id} className={`jugador-vivo ${j.ocupado ? 'ocupado' : ''}`}>
      <span className="jugador-avatar"><PixelAvatar a={j.avatar ?? {}} rango={j.rango} alto={64} /></span>
      <span className="quien"><b>{j.apodo}</b><small>{RANGO[j.rango]}{j.clubId !== perfil.club.id ? ` · ${j.club}` : ''}</small></span>
      {j.ocupado ? <span className="estado-vivo">Jugando</span> : <Boton tipo="rojo" onClick={() => { setError(''); setRival(j) }}>Retar</Boton>}
    </li>
  )

  return (
    <div className="pantalla club">
      <Cielo />
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir('mapa')} aria-label="Volver al mapa">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="juego-titulo"><small>Campamento del club</small><strong>{perfil.club.nombre}</strong></div>
        <span className="en-vivo"><i />{mios.length + 1} en línea</span>
      </header>

      <EscenaClub perfil={perfil} otros={mios} onRetar={j => { setError(''); setRival(j) }} />
      <BarraFrases onEnviar={enviarGesto} />

      <div className="club-cuerpo">
        {!presencia && (
          <section className="tarjeta">
            <p>No estás conectado al campamento del club en vivo.</p>
            <Boton onClick={() => conectarPresencia().catch(e => setError(mensajeError(e)))}>Conectarme</Boton>
          </section>
        )}
        {libres.length >= 2 && (
          <section className="tarjeta reto-grupo-cta">
            <div><h3>Reto en grupo</h3><p>Juega contra 2 o 3 personas a la vez. Al final sale el podio.</p></div>
            <Boton tipo="rojo" onClick={() => { setError(''); setRivales(libres.slice(0, 2)) }}>Armar reto</Boton>
          </section>
        )}
        <section className="tarjeta">
          <h3>Tu club en línea ({mios.length})</h3>
          <ul className="lista-vivo">
            {mios.map(tarjeta)}
            {mios.length === 0 && <li className="vacio">Nadie más de tu club está conectado ahora. Invita a tu unidad a entrar o reta a alguien de otra isla.</li>}
          </ul>
        </section>
        <section className="tarjeta">
          <h3>Otros clubes ({otras.reduce((a, g) => a + g.jugadores.length, 0)} jugadores)</h3>
          {otras.length === 0 && <p className="vacio">No hay otros clubes conectados en este momento.</p>}
          {otras.slice(0, verOtras ? 50 : 4).map(g => (
            <div key={g.club} className="otra-isla">
              <h4>{g.club} <small>{g.jugadores.length} en línea</small></h4>
              <ul className="lista-vivo">{g.jugadores.slice(0, 8).map(tarjeta)}</ul>
            </div>
          ))}
          {otras.length > 4 && <button className="enlace" onClick={() => setVerOtras(v => !v)}>{verOtras ? 'Ver menos' : `Ver los ${otras.length} clubes`}</button>}
        </section>
      </div>

      {rival && (
        <div className="velo">
          <div className="resultado pop reto-form" role="dialog" aria-modal="true" aria-label={rivales.length > 1 ? `Reto de ${rivales.length + 1} jugadores` : `Retar a ${rival.apodo}`}>
            <h2>{rivales.length > 1 ? `Reto de ${rivales.length + 1} jugadores` : `Retar a ${rival.apodo}`}</h2>
            <div className={`reto-vs ${rivales.length > 1 ? 'grupo' : ''}`}>
              <div className="reto-quien"><PixelAvatar a={perfil.avatar} rango={perfil.rango} alto={rivales.length > 1 ? 76 : 96} /><b>Tú</b></div>
              {rivales.length === 1 && <b>VS</b>}
              {rivales.map(r => (
                <div key={r.id} className="reto-quien">
                  <PixelAvatar a={r.avatar ?? {}} rango={r.rango} alto={rivales.length > 1 ? 76 : 96} /><b>{r.apodo}</b>
                  {rivales.length > 1 && <button className="quitar-rival" onClick={() => setRivales(l => l.filter(x => x.id !== r.id))} aria-label={`Quitar a ${r.apodo}`}>×</button>}
                </div>
              ))}
            </div>
            {rivales.length < 3 && libres.filter(j => !rivales.some(r => r.id === j.id)).length > 0 && (
              <div className="sumar-rivales">
                <span>Suma más jugadores (hasta 4 en total):</span>
                <div className="chips">
                  {libres.filter(j => !rivales.some(r => r.id === j.id)).slice(0, 12).map(j => (
                    <button key={j.id} onClick={() => setRivales(l => (l.length < 3 ? [...l, j] : l))}>+ {j.apodo}{j.clubId !== perfil.club.id ? <small> · {j.club}</small> : null}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="campo-select">Nivel del duelo
              <select value={nivelId} onChange={e => setNivelId(e.target.value)}>
                {MUNDOS_JUGABLES.map(m => (
                  <optgroup key={m.id} label={m.nombre}>
                    {m.niveles.filter(n => DUELO_TIPOS.has(n.tipo)).map(n => <option key={n.id} value={n.id}>{n.num}. {n.titulo}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="chips dificultad">
              {(Object.keys(DIFICULTADES) as Dificultad[]).map(d => (
                <button key={d} className={dif === d ? 'on' : ''} onClick={() => setDif(d)}>{DIFICULTADES[d].nombre}</button>
              ))}
            </div>
            <p className="ayuda">{rivales.length > 1 ? 'Todos juegan' : 'Los dos juegan'} el mismo nivel, con las mismas piezas, al mismo tiempo. Gana quien saque más puntos{rivales.length > 1 ? ' y al final sale el podio' : ''}.</p>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => setRival(null)}>Cancelar</Boton>
              <Boton tipo="rojo" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando…' : '¡Enviar reto!'}</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Frases rápidas: al tocar una, se ve que se envió y todas descansan 2,5 s (evita el spam). */
function BarraFrases({ onEnviar }: { onEnviar: (i: number) => void }) {
  const [enviada, setEnviada] = useState<{ i: number; t: number } | null>(null)
  useEffect(() => {
    if (!enviada) return
    const t = setTimeout(() => setEnviada(null), 2500)
    return () => clearTimeout(t)
  }, [enviada])
  const esEmoji = (f: string) => /^\p{Extended_Pictographic}$/u.test(f)
  const boton = (f: string, i: number) => (
    <button key={f} className={`${esEmoji(f) ? 'emoji' : ''} ${enviada?.i === i ? 'enviada' : ''}`} disabled={!!enviada}
      onClick={() => { onEnviar(i); setEnviada({ i, t: Date.now() }) }} aria-label={esEmoji(f) ? `Enviar ${f}` : undefined}>
      {f}{enviada?.i === i && <span className="ok-enviada" aria-label="enviado"> ✓</span>}
    </button>
  )
  return (
    <div className="frases" role="group" aria-label="Frases rápidas para tu club">
      <span className="frases-titulo">Di algo:</span>
      {FRASES.map((f, i) => (esEmoji(f) ? null : boton(f, i)))}
      <span className="frases-caritas">{FRASES.map((f, i) => (esEmoji(f) ? boton(f, i) : null))}</span>
    </div>
  )
}
