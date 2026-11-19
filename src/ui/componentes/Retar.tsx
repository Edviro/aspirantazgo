import { useEffect, useState } from 'react'
import { FRASES, type JugadorEnLinea } from '../../application/puertos'
import { mensajeError } from '../../application/errores'
import { DIFICULTADES } from '../../domain/dificultad'
import { MUNDOS_JUGABLES } from '../../domain/niveles'
import type { Dificultad } from '../../domain/tipos'
import { useJuego } from '../estado'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { Boton } from './Comunes'

const DUELO_TIPOS = new Set(['taller', 'quiz', 'vf', 'lluvia', 'inspector', 'ordenar', 'frase', 'memoria'])

/** Armar un reto de 2 a 4 jugadores: elige nivel y dificultad, suma rivales y envía la invitación. */
export function DialogoReto({ rivales, setRivales, libres, onCerrar }: {
  rivales: JugadorEnLinea[]; setRivales: (f: (l: JugadorEnLinea[]) => JugadorEnLinea[]) => void; libres: JugadorEnLinea[]; onCerrar: () => void
}) {
  const { perfil, desafiar } = useJuego()
  const [nivelId, setNivelId] = useState(MUNDOS_JUGABLES[0].niveles.find(n => n.tipo === 'quiz')?.id ?? MUNDOS_JUGABLES[0].niveles[0].id)
  const [dif, setDif] = useState<Dificultad>('medio')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const rival = rivales[0]
  if (!perfil || !rival) return null
  const enviar = async () => {
    setError(''); setEnviando(true)
    try { await desafiar(rivales, nivelId, dif); onCerrar() } catch (e) { setError(mensajeError(e)) } finally { setEnviando(false) }
  }
  const setRival = (j: null) => { if (j === null) onCerrar() }
  return (
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
  )
}

/** Frases rápidas: al tocar una, se ve que se envió y todas descansan 2,5 s (evita el spam). */
export function BarraFrases({ onEnviar }: { onEnviar: (i: number) => void }) {
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
