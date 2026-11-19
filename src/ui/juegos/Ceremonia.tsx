import { useEffect, useState } from 'react'
import { IDEALES } from '../../domain/aspirantazgo'
import { pieza } from '../../domain/uniformes'
import { useJuego } from '../estado'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { Campamento } from '../pixel/Campamento'
import { PiezaIcono } from '../componentes/Insignias'
import { Boton, Confeti } from '../componentes/Comunes'
import { sfx } from '../sonido'

type Fase = 'posicion' | 'voto' | 'panoleta' | 'final'

const LINEAS = [
  'Por la gracia de Dios,',
  'seré puro, bondadoso y leal;',
  'guardaré la Ley del Conquistador,',
  'seré siervo de Dios',
  'y amigo de la humanidad.',
]

/** La ceremonia: posición para el voto, el voto línea por línea y la pañoleta que baja hasta tu cuello. */
export function Ceremonia({ onFin }: { onFin: (f: number[], e: number) => void }) {
  const { perfil, repo, setPerfil } = useJuego()
  const [fase, setFase] = useState<Fase>('posicion')
  const [linea, setLinea] = useState(0)
  const [puesta, setPuesta] = useState(false)
  // Personaje en escala entera (múltiplo de 64) según el alto de la pantalla
  const [alto] = useState(() => (window.innerHeight >= 800 ? 256 : window.innerHeight >= 600 ? 192 : 128))

  useEffect(() => {
    if (fase !== 'final') return
    sfx.victoria()
    const nuevo = { ...(perfil?.avatar ?? {}), panoleta: true }
    if (perfil) setPerfil({ ...perfil, avatar: nuevo })
    repo.guardarAvatar(nuevo).catch(() => undefined)
  }, [fase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!perfil) return null
  const decir = () => {
    sfx.bien()
    if (linea + 1 >= LINEAS.length) { setFase('panoleta'); sfx.trompeta() } else setLinea(linea + 1)
  }

  return (
    <div className="ceremonia">
      <div className="ceremonia-escena ceremonia-pixel">
        <Campamento />
        <div className="ceremonia-foco" aria-hidden />
        <div className="ceremonia-avatar">
          <PixelAvatar a={{ ...perfil.avatar, panoleta: puesta }} rango={perfil.rango}
            animo={fase === 'final' ? 'celebra' : fase === 'voto' || fase === 'panoleta' ? 'voto' : 'idle'} alto={alto} />
          {fase === 'panoleta' && !puesta && (
            <div className="panoleta-baja" onAnimationEnd={() => { setPuesta(true); sfx.perfecto(); setTimeout(() => setFase('final'), 700) }}>
              <PiezaIcono p={pieza.panoleta(false)} size={110} />
              <i className="chispas" />
            </div>
          )}
        </div>
      </div>

      {fase === 'final' && <Confeti cantidad={120} />}

      <div className="ceremonia-panel pop" key={fase}>
        {fase === 'posicion' && (
          <>
            <p className="voz-mando">"Para el voto, posición"</p>
            <p>Levanta el antebrazo derecho, palma al frente, dedos juntos y el pulgar doblado.</p>
            <Boton onClick={() => { setFase('voto'); sfx.click() }}>Tomar posición</Boton>
          </>
        )}
        {fase === 'voto' && (
          <>
            <p className="voto-lineas">
              {LINEAS.slice(0, linea + 1).map((l, i) => <span key={i} className={i === linea ? 'actual' : ''}>{l} </span>)}
            </p>
            <Boton onClick={decir}>{linea + 1 >= LINEAS.length ? 'Terminar el voto' : 'Decir'}</Boton>
          </>
        )}
        {fase === 'panoleta' && <p className="voz-mando">Tu director coloca tu pañoleta…</p>}
        {fase === 'final' && (
          <>
            <h2>¡Ya eres Conquistador!</h2>
            <p>Recibiste tu pañoleta. Ahora tu personaje la lleva en todo el juego.</p>
            <p className="ayuda">{IDEALES.lema}</p>
            <Boton onClick={() => onFin([1, 1, 1], 0)}>Continuar</Boton>
          </>
        )}
      </div>
    </div>
  )
}
