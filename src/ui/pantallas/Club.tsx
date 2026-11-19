import { useMemo, useState, useEffect } from 'react'
import { useJuego } from '../estado'
import { musica } from '../musica'
import { Boton, Cielo } from '../componentes/Comunes'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { EscenaClub } from '../pixel/EscenaClub'
import type { JugadorEnLinea } from '../../application/puertos'
import { BarraFrases, DialogoReto } from '../componentes/Retar'
import { mensajeError } from '../../application/errores'

const RANGO: Record<string, string> = { conquistador: 'Conquistador', lider: 'Líder', guia_mayor: 'Guía Mayor', gm_master: 'GM Máster', gm_master_avanzado: 'GM Máster Avanzado' }

/** La isla de tu club: quién está conectado ahora, con su personaje, y a quién puedes retar (de tu club o de otra isla). */
export default function Club() {
  const { perfil, enLinea, ir, presencia, conectarPresencia, enviarGesto, hub } = useJuego()
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
  const [error, setError] = useState('')
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
        <button className="icono" onClick={() => ir(hub)} aria-label="Volver">
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
            {error && <p className="error" role="alert">{error}</p>}
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

      {rival && <DialogoReto rivales={rivales} setRivales={setRivales} libres={libres} onCerrar={() => setRival(null)} />}
    </div>
  )
}
