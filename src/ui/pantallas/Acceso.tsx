import { useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { asset, Boton, Cielo } from '../componentes/Comunes'
import { repoEnLinea, repoLocal } from '../../adapters/contenedor'
import { mensajeError } from '../../application/errores'
import type { Rango } from '../../domain/tipos'

const PAISES: [string, string][] = [
  ['PE', 'Perú'], ['AR', 'Argentina'], ['BO', 'Bolivia'], ['BR', 'Brasil'], ['CL', 'Chile'], ['CO', 'Colombia'], ['EC', 'Ecuador'],
  ['PY', 'Paraguay'], ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['MX', 'México'], ['US', 'Estados Unidos'], ['ES', 'España'], ['OT', 'Otro'],
]
const RANGOS_ADULTO: [Rango, string][] = [
  ['lider', 'Líder / directivo (no Guía Mayor)'], ['guia_mayor', 'Guía Mayor'], ['gm_master', 'Guía Mayor Máster'], ['gm_master_avanzado', 'Guía Mayor Máster Avanzado'],
]
const NOMBRES_PROHIBIDOS = /(\d{6,}|@|https?:|www\.|\.com)/i

export default function Acceso() {
  const { setSesion, ir, verLegal } = useJuego()
  const [tab, setTab] = useState<'nino' | 'adulto'>('nino')
  const [nuevo, setNuevo] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [apodo, setApodo] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [adultoEmail, setAdultoEmail] = useState<string | null>(null)
  const [crear, setCrear] = useState(true)
  const [club, setClub] = useState({ nombre: '', ciudad: '', campo: '', union: '', pais: 'PE' })
  const [rango, setRango] = useState<Rango>('lider')
  const [acepta, setAcepta] = useState(false)
  const [padres, setPadres] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const enLinea = !!repoEnLinea

  useEffect(() => {
    repoEnLinea?.adultoSinClub().then(e => { if (e) { setAdultoEmail(e); setTab('adulto') } })
    repoEnLinea?.sesionActual().then(async p => { if (p) { await setSesion('en_linea', p); ir('mapa') } }).catch(() => undefined)
  }, [ir, setSesion])

  const accion = async (fn: () => Promise<void>) => {
    setError(''); setCargando(true)
    try { await fn() } catch (e) { setError(mensajeError(e)) } finally { setCargando(false) }
  }

  const validarApodo = () => {
    if (apodo.trim().length < 3) throw new Error('El apodo debe tener de 3 a 16 letras o números.')
    if (NOMBRES_PROHIBIDOS.test(apodo)) throw new Error('El apodo no puede tener teléfonos, correos ni enlaces.')
  }

  const entrarNino = () => accion(async () => {
    if (!repoEnLinea) throw new Error('Sin conexión')
    validarApodo()
    const p = nuevo ? await repoEnLinea.unirseNino(codigo, apodo, pin) : await repoEnLinea.entrarNino(codigo, apodo, pin)
    await setSesion('en_linea', p)
    ir(nuevo ? 'editor' : 'mapa')
  })

  const practica = () => accion(async () => {
    const p = await repoLocal.iniciarPractica(apodo.trim().length >= 3 ? apodo.trim() : 'Explorador')
    await setSesion('practica', p)
    ir('editor')
  })

  const enviarEnlace = () => accion(async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Escribe un correo válido.')
    await repoEnLinea!.enviarEnlaceAdulto(email)
    setEnviado(true)
  })

  const registrarAdulto = () => accion(async () => {
    validarApodo()
    if (!acepta) throw new Error('FALTA_CONSENTIMIENTO')
    const p = crear
      ? await repoEnLinea!.crearClub({ ...club, apodo, rango, acepta, autorizaPadres: padres })
      : await repoEnLinea!.unirseAdulto(codigo, apodo, rango, acepta)
    await setSesion('en_linea', p)
    ir(crear ? 'director' : 'editor')
  })

  return (
    <div className="pantalla acceso">
      <Cielo />
      <div className="acceso-caja pop">
        <img className="acceso-logo" src={asset('logo-alas')} alt="" />
        {!enLinea && <p className="aviso-demo">Versión de demostración: aquí funciona el modo práctica. Los clubes, cuentas y rankings se activan en la versión publicada.</p>}
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'nino'} className={tab === 'nino' ? 'on' : ''} onClick={() => setTab('nino')}>Soy Conquistador</button>
          <button role="tab" aria-selected={tab === 'adulto'} className={tab === 'adulto' ? 'on' : ''} onClick={() => setTab('adulto')}>Soy líder / +16</button>
        </div>

        {tab === 'nino' && (
          <form className="form" onSubmit={e => { e.preventDefault(); entrarNino() }}>
            <div className="segmento">
              <button type="button" className={nuevo ? 'on' : ''} onClick={() => setNuevo(true)}>Soy nuevo</button>
              <button type="button" className={!nuevo ? 'on' : ''} onClick={() => setNuevo(false)}>Ya tengo cuenta</button>
            </div>
            <label>Código de tu club<input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} maxLength={6} placeholder="Ej. K7P2QA" autoCapitalize="characters" required /></label>
            <label>Tu apodo de jugador<input value={apodo} onChange={e => setApodo(e.target.value)} maxLength={16} placeholder="Ej. HalcónVeloz" required /></label>
            <p className="ayuda">🛡️ No uses tu nombre real ni tu apellido. Tu apodo es lo único que verán los demás.</p>
            <label>PIN secreto (4 números)<input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" placeholder="••••" required /></label>
            {error && <p className="error">{error}</p>}
            <Boton type="submit" disabled={cargando || !enLinea}>{nuevo ? 'Unirme a mi club' : 'Entrar'}</Boton>
            <p className="ayuda">¿No tienes código? Pídeselo a tu líder. Él registra al club y se encarga de la autorización de tus padres.</p>
            <div className="separador"><span>o</span></div>
            <Boton tipo="fantasma" onClick={practica} disabled={cargando}>Jugar en modo práctica (sin cuenta)</Boton>
          </form>
        )}

        {tab === 'adulto' && !adultoEmail && (
          <form className="form" onSubmit={e => { e.preventDefault(); enviarEnlace() }}>
            {enviado ? (
              <div className="aviso-ok">📬 Te enviamos un enlace a <b>{email}</b>. Ábrelo en este mismo dispositivo para continuar.</div>
            ) : (
              <>
                <p className="ayuda">Para líderes, directores y mayores de 16 años. Entras con tu correo, sin contraseña.</p>
                <label>Tu correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" required /></label>
                {error && <p className="error">{error}</p>}
                <Boton type="submit" disabled={cargando || !enLinea}>Enviarme el enlace</Boton>
              </>
            )}
          </form>
        )}

        {tab === 'adulto' && adultoEmail && (
          <form className="form" onSubmit={e => { e.preventDefault(); registrarAdulto() }}>
            <p className="ayuda">Conectado como <b>{adultoEmail}</b></p>
            <div className="segmento">
              <button type="button" className={crear ? 'on' : ''} onClick={() => setCrear(true)}>Registrar mi club</button>
              <button type="button" className={!crear ? 'on' : ''} onClick={() => setCrear(false)}>Unirme a un club</button>
            </div>
            {crear ? (
              <>
                <label>Nombre del club<input value={club.nombre} onChange={e => setClub({ ...club, nombre: e.target.value })} maxLength={60} required /></label>
                <div className="dos">
                  <label>Ciudad<input value={club.ciudad} onChange={e => setClub({ ...club, ciudad: e.target.value })} maxLength={60} required /></label>
                  <label>País<select value={club.pais} onChange={e => setClub({ ...club, pais: e.target.value })}>{PAISES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
                </div>
                <label>Campo (Asociación / Misión)<input value={club.campo} onChange={e => setClub({ ...club, campo: e.target.value })} maxLength={80} placeholder="Ej. Asociación Peruana Central Este" required /></label>
                <label>Unión (opcional)<input value={club.union} onChange={e => setClub({ ...club, union: e.target.value })} maxLength={80} /></label>
              </>
            ) : (
              <label>Código del club<input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} maxLength={6} required /></label>
            )}
            <div className="dos">
              <label>Tu apodo<input value={apodo} onChange={e => setApodo(e.target.value)} maxLength={16} required /></label>
              <label>Tu rango<select value={rango} onChange={e => setRango(e.target.value as Rango)}>{RANGOS_ADULTO.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
            </div>
            <label className="check"><input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
              <span>Acepto los <a onClick={() => verLegal('terminos')}>Términos</a> y la <a onClick={() => verLegal('privacidad')}>Política de privacidad</a>.</span></label>
            {crear && (
              <label className="check"><input type="checkbox" checked={padres} onChange={e => setPadres(e.target.checked)} />
                <span>Como director, me comprometo a obtener la <a onClick={() => verLegal('padres')}>autorización firmada de los padres</a> antes de entregar el código del club a cada menor.</span></label>
            )}
            {error && <p className="error">{error}</p>}
            <Boton type="submit" disabled={cargando}>{crear ? 'Registrar club' : 'Unirme'}</Boton>
          </form>
        )}

        <footer className="acceso-pie">
          <a onClick={() => verLegal('privacidad')}>Privacidad</a> · <a onClick={() => verLegal('terminos')}>Términos</a> · <a onClick={() => verLegal('padres')}>Para padres</a>
        </footer>
      </div>
    </div>
  )
}
