import { useEffect, useState } from 'react'
import { mensajeError } from '../../application/errores'
import { useJuego } from '../estado'
import { BotonInstalar } from './BotonInstalar'
import { Boton } from './Comunes'
import { olvidarSalaPendiente, salaDelEnlace } from './CodigoQR'

/** Si se llegó con el enlace o el QR de una sala, entra directo (una sola vez). */
export function useSalaDelEnlace(entrar: (codigo: string) => void) {
  useEffect(() => {
    const cod = salaDelEnlace()
    if (!cod || !useJuego.getState().repo.salas || !useJuego.getState().perfil) return
    olvidarSalaPendiente()
    entrar(cod)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Menú principal (Plaza Central y mapa de cada campamento): parches, ranking, personaje, salas, paneles,
 * sonido, privacidad y cuenta. Incluye los diálogos de "unirme a una sala" y "borrar mi cuenta".
 */
export function MenuPrincipal({ abierto, onCerrar, onCampamentos, textoCampamentos = 'Mapa de campamentos' }: {
  abierto: boolean; onCerrar: () => void; onCampamentos: () => void; textoCampamentos?: string
}) {
  const { perfil, ir, modo, sonido, toggleSonido, musica: conMusica, toggleMusica, salir, abrirSala, repo } = useJuego()
  const [borrar, setBorrar] = useState(false)
  const [unirse, setUnirse] = useState(false)
  const [codigoSala, setCodigoSala] = useState('')
  const [errorSala, setErrorSala] = useState('')
  const [conectando, setConectando] = useState(false)

  const entrarSala = async (codigo: string | null) => {
    setErrorSala(''); setConectando(true)
    try { await abrirSala(codigo) } catch (e) { setErrorSala(mensajeError(e)) } finally { setConectando(false) }
  }
  useSalaDelEnlace(c => void entrarSala(c))

  if (!perfil) return null
  const puedeSalas = !!repo.salas
  const esAdulto = perfil.grupo_edad === 'adulto'

  return (
    <>
      {abierto && (
        <div className="menu pop" onClick={onCerrar}>
          <button onClick={onCampamentos}>{textoCampamentos}</button>
          <button onClick={() => ir('logros')}>Mis parches</button>
          <button onClick={() => ir('ranking')}>Ranking</button>
          <button onClick={() => ir('editor')}>Mi personaje</button>
          {puedeSalas && <button onClick={() => ir('unidad')}>Mi unidad</button>}
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
    </>
  )
}
