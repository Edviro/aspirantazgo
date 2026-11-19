import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { musica } from '../musica'
import { olvidarSalaPendiente, salaDelEnlace } from '../componentes/CodigoQR'
import { useProgreso } from '../progreso'
import { MEDALLAS } from '../../domain/medallas'
import { BotonInstalar } from '../componentes/BotonInstalar'
import { HudVidas } from '../componentes/Vidas'
import { rachaVigente, retoDelDia } from '../../domain/diario'
import { MUNDOS_JUGABLES } from '../../domain/niveles'
import { APROBADO, estrellasDeMejor } from '../../domain/puntuacion'
import { DIFICULTADES } from '../../domain/dificultad'
import type { Dificultad } from '../../domain/tipos'
import { mensajeError } from '../../application/errores'
import { useJuego } from '../estado'
import { Boton, Estrellas } from '../componentes/Comunes'
import { Travesia } from '../componentes/Travesia'
import { campamentoDeMundo } from '../../domain/campamentos'
import { limpiarTransicion, marcarTransicion, menosMovimiento, verTransicion } from '../transicion'
import { sfx } from '../sonido'
import { MapaPixel, type EstadoNodo } from '../pixel/MapaPixel'

const RANGO_TXT: Record<string, string> = {
  conquistador: 'Conquistador', lider: 'Líder', guia_mayor: 'Guía Mayor', gm_master: 'GM Máster', gm_master_avanzado: 'GM Máster Avanzado',
}

export default function Mapa() {
  const { perfil, puntajes, jugar, ir, modo, sonido, toggleSonido, musica: conMusica, toggleMusica, salir, dificultad, setDificultad, abrirSala, repo, mundo, enLinea } = useJuego()
  const mundoActual = MUNDOS_JUGABLES.find(m => m.id === mundo) ?? MUNDOS_JUGABLES[0]
  const niveles = mundoActual.niveles
  const [sel, setSel] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)
  const rachaObj = useProgreso(st => st.racha)
  useEffect(() => { musica('mapa'); void useProgreso.getState().cargarVidas() }, [])
  // Si llegó con el enlace o el QR de una sala, entra directo
  useEffect(() => {
    const cod = salaDelEnlace()
    if (!cod || !repo.salas || !useJuego.getState().perfil) return
    olvidarSalaPendiente()
    entrarSala(cod)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [borrar, setBorrar] = useState(false)
  const [unirse, setUnirse] = useState(false)
  const [codigoSala, setCodigoSala] = useState('')
  const [errorSala, setErrorSala] = useState('')
  const [conectando, setConectando] = useState(false)
  const [zarpar, setZarpar] = useState(false)
  // Llegando en barco desde el mapa de campamentos: la cámara termina de bajar sobre la isla
  const lienzo = useRef<HTMLDivElement>(null), flash = useRef<HTMLDivElement>(null)
  const [llego] = useState(() => verTransicion()?.tipo === 'llegar' && !menosMovimiento())
  useLayoutEffect(() => {
    limpiarTransicion()
    if (!llego) return
    lienzo.current?.animate([{ transform: 'scale(1.7)', filter: 'brightness(1.6)' }, { transform: 'none', filter: 'none' }], { duration: 900, easing: 'cubic-bezier(.16,.7,.2,1)' })
    flash.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const medallas = useProgreso(s => s.medallas)
  if (!perfil) return null
  const total = Object.values(puntajes).reduce((a, b) => a + b, 0)
  const nivelSel = sel !== null ? niveles[sel] : null
  const medallasMundo = niveles.reduce((n, nv) => n + (medallas[nv.id]?.length ?? 0), 0)
  const puedeSalas = !!repo.salas
  const reto = retoDelDia()
  const hechoHoy = rachaObj.ultimo === reto.fecha
  const racha = rachaVigente(rachaObj)
  const vivos = enLinea.filter(j => j.clubId === perfil.club.id && j.id !== perfil.id).length
  const esAdulto = perfil.grupo_edad === 'adulto'

  const entrarSala = async (codigo: string | null) => {
    setErrorSala(''); setConectando(true)
    try { await abrirSala(codigo) } catch (e) { setErrorSala(mensajeError(e)) } finally { setConectando(false) }
  }

  return (
    <div className="pantalla mapa">
      <div className="mapa-canvas" ref={lienzo}>
        <MapaPixel key={mundoActual.id} niveles={niveles} estados={estados} estrellas={estrellas} actual={actual}
          avatar={perfil.avatar} rango={perfil.rango} onElegir={i => setSel(i)} />
      </div>

      {llego && <div className="mundo-flash" ref={flash} aria-hidden />}
      <header className="hud">
        <button className="hud-perfil" onClick={() => ir('editor')} aria-label="Editar personaje">
          <span className="hud-avatar">{perfil.apodo.slice(0, 1).toUpperCase()}</span>
          <span className="hud-txt"><b>{perfil.apodo}</b><small>{RANGO_TXT[perfil.rango]}, {perfil.club.nombre}</small></span>
        </button>
        <HudVidas />
        <div className="hud-puntos" title="Puntos totales"><span>★</span>{total.toLocaleString('es-PE')}</div>
        <button className="icono" onClick={() => setMenu(m => !m)} aria-label="Menú">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
      </header>

      {menu && (
        <div className="menu pop" onClick={() => setMenu(false)}>
          <button onClick={() => setZarpar(true)}>Mapa de campamentos</button>
          <button onClick={() => ir('logros')}>Mis parches</button>
          <button onClick={() => ir('ranking')}>Ranking</button>
          <button onClick={() => ir('editor')}>Mi personaje</button>
          {puedeSalas && <button onClick={() => ir('club')}>Campamento del club en vivo</button>}
          {puedeSalas && <button onClick={() => setUnirse(true)}>Unirme a una sala</button>}
          {puedeSalas && esAdulto && <button onClick={() => ir('director')}>{perfil.club.soy_director ? 'Panel del club' : 'Panel del líder'}</button>}
          {perfil.superadmin && <button onClick={() => ir('admin')}>Panel de administrador</button>}
          <BotonInstalar variante="menu" />
          <button onClick={toggleMusica}>{conMusica ? 'Apagar música' : 'Encender música'}</button>
          <button onClick={toggleSonido}>{sonido ? 'Silenciar efectos' : 'Activar efectos'}</button>
          <button onClick={() => useJuego.getState().verLegal('privacidad')}>Privacidad y términos</button>
          <button onClick={() => setBorrar(true)}>Borrar mi cuenta</button>
          <button onClick={() => salir()}>{modo === 'practica' ? 'Salir del modo práctica' : 'Cerrar sesión'}</button>
        </div>
      )}

      <div className="mapa-titulo">
        <h1>{mundoActual.nombre}</h1>
        <p>{estados.filter(e => e === 'hecho').length} de {niveles.length} niveles superados · 🏅 {medallasMundo}/{niveles.length * 3}</p>
      </div>

      <button className={`reto-dia ${hechoHoy ? 'hecho' : ''}`} onClick={() => (hechoHoy ? ir('logros') : jugar(reto.nivel, true, 'medio', reto.semilla))}
        aria-label={`Reto del día: ${reto.nivel.titulo}${hechoHoy ? ', cumplido' : ''}. Racha de ${racha} días`}>
        <span className="reto-dia-tit">Reto del día</span>
        <b>{reto.nivel.titulo}</b>
        <span className="reto-dia-racha"><i aria-hidden />{racha} {racha === 1 ? 'día' : 'días'}{hechoHoy ? ' · ¡cumplido!' : ''}</span>
      </button>

      <nav className="mapa-acciones">
        <button className="btn-brujula" onClick={() => { sfx.zas(); setZarpar(true) }} aria-label="Ver los otros campamentos">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden><circle cx="16" cy="16" r="13" fill="#FFF7DF" stroke="#1E140C" strokeWidth="2.5" /><path d="M16 5l4 11h-8z" fill="#D7242F" /><path d="M16 27l-4-11h8z" fill="#1F5FD1" /><circle cx="16" cy="16" r="2" fill="#1E140C" /></svg>
          <span>Campamentos</span>
        </button>
        {puedeSalas ? <Boton tipo="azul" onClick={() => ir('club')}>Club en vivo{vivos > 0 ? ` (${vivos})` : ''}</Boton>
          : <Boton tipo="azul" onClick={() => ir('ranking')}>Ranking</Boton>}
        <Boton onClick={() => setSel(actual)}>Jugar nivel {actual + 1}</Boton>
      </nav>

      {zarpar && <Travesia texto="Zarpando del" destino={mundoActual.nombre} color={campamentoDeMundo(mundoActual.id).color}
        onFin={() => { marcarTransicion({ tipo: 'alejar', desde: campamentoDeMundo(mundoActual.id).id }); ir('campamentos') }} />}

      {errorSala && !unirse && <div className="toast toast-mal" style={{ top: 120 }}>{errorSala}</div>}

      {unirse && (
        <div className="velo">
          <form className="resultado pop form-sala" onSubmit={e => { e.preventDefault(); entrarSala(codigoSala.trim().toUpperCase()) }}>
            <h2>Unirme a una sala</h2>
            <label htmlFor="codigo-sala">Código que te dio tu líder</label>
            <input id="codigo-sala" value={codigoSala} onChange={e => setCodigoSala(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))} placeholder="ABCDE" autoCapitalize="characters" autoComplete="off" />
            {errorSala && <p className="error">{errorSala}</p>}
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => { setUnirse(false); setErrorSala('') }}>Cancelar</Boton>
              <Boton type="submit" disabled={codigoSala.length !== 5 || conectando}>{conectando ? 'Entrando…' : 'Entrar'}</Boton>
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
          {nivelSel.tipo !== 'ceremonia' && (
            <div className="medallas-mini" aria-label={`Medallas: ${medallas[nivelSel.id]?.length ?? 0} de 3`}>
              {MEDALLAS.map(m => <span key={m.id} className={(medallas[nivelSel.id] ?? []).includes(m.id) ? 'tengo' : ''} title={`${m.nombre}: ${m.como}`}>{m.icono}</span>)}
            </div>
          )}
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
