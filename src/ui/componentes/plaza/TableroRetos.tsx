import { useEffect, useState } from 'react'
import type { AmbitoTorneo, Torneo } from '../../../application/puertos'
import { mensajeError } from '../../../application/errores'
import { TODOS_LOS_NIVELES } from '../../../domain/niveles'
import { useJuego } from '../../estado'
import { Boton } from '../Comunes'
import { Bandera } from './Iconos'

const QUIENES: Record<AmbitoTorneo, string> = { clubes: 'Clubes', campos: 'Asociaciones y misiones', uniones: 'Uniones', paises: 'Países' }
const MEDALLA = ['🥇', '🥈', '🥉']
const cuando = (t: Torneo) => {
  const ahora = Date.now(), ini = new Date(t.inicia).getTime(), fin = new Date(t.termina).getTime()
  const dia = (ms: number) => new Date(ms).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
  if (ahora < ini) return { estado: 'pronto', txt: `Empieza el ${dia(ini)}` }
  if (ahora > fin) return { estado: 'fin', txt: 'Terminó' }
  const h = Math.round((fin - ahora) / 3600000)
  return { estado: 'vivo', txt: h < 48 ? `Quedan ${h} h` : `Hasta el ${dia(fin)}` }
}

/**
 * Tablero del Gran Campamento: torneos entre clubes, asociaciones, uniones y países, y los retos que aceptó tu club.
 * Para sumar, juegas el desafío del torneo (tu mejor puntaje en esas fechas cuenta para tu grupo).
 */
export function TableroRetos({ onCerrar, onRanking, sabado }: { onCerrar: () => void; onRanking: () => void; sabado: boolean }) {
  const { repo, jugar } = useJuego()
  const [lista, setLista] = useState<Torneo[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!repo.torneos) { setLista([]); return }
    repo.torneos().then(setLista).catch(e => { setLista([]); setError(mensajeError(e)) })
  }, [repo])

  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop tablero-retos" role="dialog" aria-modal="true" aria-label="Torneos y retos" onClick={e => e.stopPropagation()}>
        <h2>Torneos y retos</h2>
        <p className="tienda-saludo">Juega el desafío del torneo: tu mejor puntaje en esas fechas suma para tu club, tu asociación, tu unión y tu país.</p>
        {error && <p className="error" role="alert">{error}</p>}
        {lista === null ? <p>Cargando…</p> : lista.length === 0 ? (
          <p className="nota">{repo.torneos ? 'Por ahora no hay torneos. Tu director puede retar a otros clubes desde su panel.' : 'Los torneos funcionan con tu cuenta en línea.'}</p>
        ) : (
          <ul className="torneos">
            {lista.map(t => {
              const c = cuando(t), nivel = TODOS_LOS_NIVELES.find(n => n.id === t.reto)
              return (
                <li key={t.id} className={`torneo ${c.estado}`}>
                  <div className="torneo-cabeza">
                    <span className="torneo-tipo">{t.tipo === 'clubes' ? 'Reto entre clubes' : `Torneo de ${QUIENES[t.ambito].toLowerCase()}`}{t.pais ? <> · <Bandera tipo="pais" pais={t.pais} alto={11} /></> : ''}</span>
                    <b>{t.titulo}</b>
                    <small>{nivel?.titulo ?? 'Desafío'} · {c.txt}</small>
                  </div>
                  {t.top.length > 0 ? (
                    <ol className="torneo-tabla">
                      {t.top.map((f, i) => (
                        <li key={i} className={f.mio ? 'mio' : ''}>
                          <span className="pos">{MEDALLA[i] ?? i + 1}</span>
                          <span className="nom">{t.ambito === 'paises' && f.pais ? <Bandera tipo="pais" pais={f.pais} alto={11} /> : null}{f.nombre}</span>
                          <span className="pts">{f.puntos.toLocaleString('es-PE')}</span>
                        </li>
                      ))}
                      {t.mio && !t.top.some(f => f.mio) && (
                        <li className="mio"><span className="pos">{t.mio.puesto}</span><span className="nom">{t.mio.nombre}</span><span className="pts">{t.mio.puntos.toLocaleString('es-PE')}</span></li>
                      )}
                    </ol>
                  ) : <p className="nota">{c.estado === 'pronto' ? 'Todavía no empieza.' : 'Nadie ha jugado aún: ¡sé el primero en sumar!'}</p>}
                  {c.estado === 'vivo' && nivel && (
                    <Boton tipo={sabado ? 'fantasma' : 'verde'} disabled={sabado} onClick={() => { onCerrar(); jugar(nivel, true) }}>{sabado ? 'Vuelve el sábado a las 6 p. m.' : 'Jugar y sumar'}</Boton>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <div className="fila-botones">
          <Boton tipo="fantasma" onClick={onCerrar}>Cerrar</Boton>
          <Boton tipo="azul" onClick={onRanking}>Tablero de honor</Boton>
        </div>
      </div>
    </div>
  )
}
