import { useEffect, useState } from 'react'
import { SelectorClub, type ClubElegido } from '../componentes/SelectorClub'
import { useJuego } from '../estado'
import { musica } from '../musica'
import { asset, Boton, Cielo } from '../componentes/Comunes'
import { repoEnLinea } from '../../adapters/contenedor'
import { mensajeError } from '../../application/errores'
import { CARGOS_ADULTO } from '../../application/uniformeJugador'
import { olvidarSalaPendiente, salaDelEnlace } from '../componentes/CodigoQR'
import type { Rango } from '../../domain/tipos'

const RANGOS_ADULTO: [Rango, string][] = [
  ['lider', 'Líder / directivo (no Guía Mayor)'], ['guia_mayor', 'Guía Mayor'], ['gm_master', 'Guía Mayor Máster'], ['gm_master_avanzado', 'Guía Mayor Máster Avanzado'],
]
const NOMBRES_PROHIBIDOS = /(\d{6,}|@|https?:|www\.|\.com)/i

function Google() {
  return (
    <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** Cuentas de conquistador usadas en este equipo (club y apodo, nunca el PIN). */
interface Recordada { codigo: string; apodo: string; club: string }
const CLAVE_CUENTAS = 'asp_cuentas'
function leerRecordadas(): Recordada[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_CUENTAS) ?? '[]')
    return Array.isArray(v) ? v.filter((c): c is Recordada => c && /^[A-Z0-9]{4,8}$/.test(c.codigo) && typeof c.apodo === 'string' && c.apodo.length <= 16 && typeof c.club === 'string').slice(0, 5) : []
  } catch { return [] }
}
function recordar(c: Recordada) {
  const l = [c, ...leerRecordadas().filter(x => !(x.codigo === c.codigo && x.apodo.toLowerCase() === c.apodo.toLowerCase()))].slice(0, 5)
  try { localStorage.setItem(CLAVE_CUENTAS, JSON.stringify(l.map(x => ({ ...x, club: x.club.slice(0, 40) })))) } catch { /* sin almacenamiento */ }
  return l
}

export default function Acceso() {
  const { setSesion, ir, verLegal } = useJuego()
  const cuentas = repoEnLinea?.cuentas ?? null
  const [tab, setTab] = useState<'nino' | 'adulto' | 'invitado'>('nino')
  // Invitado de sala: entra con el código (o el QR) + su nombre + su club, sin crear cuenta
  const [salaPend] = useState(() => salaDelEnlace())
  const [codSala, setCodSala] = useState(salaPend ?? '')
  const [nombreInv, setNombreInv] = useState('')
  const [clubInv, setClubInv] = useState<ClubElegido | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Niño: código del club + apodo + PIN (sin correo ni datos personales).
  // En este equipo se recuerdan las cuentas que ya entraron (club y apodo, nunca el PIN): solo falta el PIN.
  const [recordadas, setRecordadas] = useState(leerRecordadas)
  const [nuevo, setNuevo] = useState(() => leerRecordadas().length === 0)
  const [codigo, setCodigo] = useState('')
  const [apodo, setApodo] = useState('')
  const [pin, setPin] = useState('')

  // Adulto: cuenta
  const [modoCuenta, setModoCuenta] = useState<'entrar' | 'crear' | 'olvide' | 'nueva'>('entrar')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [aviso, setAviso] = useState('')
  const [adultoEmail, setAdultoEmail] = useState<string | null>(null)

  // Adulto: registro en su club (elegido del directorio oficial de la DSA)
  const [clubAd, setClubAd] = useState<ClubElegido | null>(null)
  const [soyDirector, setSoyDirector] = useState(false)
  const [rango, setRango] = useState<Rango>('lider')
  const [cargo, setCargo] = useState('CONSEJERO')
  const [acepta, setAcepta] = useState(false)
  const [autoriza, setAutoriza] = useState(false)

  useEffect(() => { musica('himno') }, [])

  useEffect(() => {
    if (!repoEnLinea) return
    repoEnLinea.adultoSinClub().then(e => { if (e) { setAdultoEmail(e); setTab('adulto') } }).catch(() => undefined)
    repoEnLinea.sesionActual().then(async p => { if (p) { await setSesion('en_linea', p); ir('plaza') } }).catch(() => undefined)
    return cuentas?.alRecuperar(() => { setTab('adulto'); setModoCuenta('nueva') })
  }, [ir, setSesion, cuentas])

  const yaTieneDirector = !!(clubAd?.juego && clubAd.conDirector)
  const puedeDirigir = !!clubAd && !yaTieneDirector

  const accion = async (fn: () => Promise<void>) => {
    setError(''); setAviso(''); setCargando(true)
    try { await fn() } catch (e) { setError(mensajeError(e)) } finally { setCargando(false) }
  }
  const validarApodo = () => {
    if (apodo.trim().length < 3) throw new Error('APODO_CORTO')
    if (NOMBRES_PROHIBIDOS.test(apodo)) throw new Error('APODO_CON_DATOS')
  }
  const validarCorreo = () => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) throw new Error('CORREO_INVALIDO') }
  const validarClave = () => { if (clave.length < 8 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave)) throw new Error('CLAVE_DEBIL') }

  const entrarInvitado = () => accion(async () => {
    if (!repoEnLinea?.entrarInvitado) throw new Error('SIN_CONEXION')
    if (!/^[A-Z]{5}$/.test(codSala)) throw new Error('SALA_NO_EXISTE')
    if (!clubInv) throw new Error('CLUB_INVALIDO')
    const r = await repoEnLinea.entrarInvitado(codSala, nombreInv.trim(), clubInv.nombre, clubInv.juego)
    try { sessionStorage.setItem('asp_sala_invitado', r.codigo) } catch { /* */ }
    olvidarSalaPendiente()
    await setSesion('en_linea', r.perfil)
    await useJuego.getState().abrirSala(r.codigo)
  })

  const entrarNino = () => accion(async () => {
    if (!repoEnLinea) throw new Error('SIN_CONEXION')
    validarApodo()
    let p
    try { p = nuevo ? await repoEnLinea.unirseNino(codigo, apodo, pin) : await repoEnLinea.entrarNino(codigo, apodo, pin) }
    catch (e) { if (nuevo && e instanceof Error && e.message.includes('APODO_OCUPADO')) throw new Error('APODO_YA_ES_TUYO'); throw e }
    setRecordadas(recordar({ codigo: codigo.toUpperCase(), apodo: apodo.trim(), club: p.club.nombre }))
    await setSesion('en_linea', p)
    ir(nuevo || !p.avatar?.genero ? 'editor' : 'plaza')
  })

  const cuenta = () => accion(async () => {
    if (!cuentas) throw new Error('SIN_CONEXION')
    if (modoCuenta === 'nueva') { validarClave(); await cuentas.cambiarClave(clave); setAviso('Listo, tu contraseña cambió.'); setModoCuenta('entrar'); await continuar(); return }
    validarCorreo()
    if (modoCuenta === 'olvide') { await cuentas.recuperarClave(email); setAviso(`Te enviamos un enlace a ${email.trim()} para crear una contraseña nueva.`); return }
    validarClave()
    if (modoCuenta === 'crear') {
      const r = await cuentas.crearCuenta(email, clave)
      if (r === 'confirmar') { setAviso(`Te enviamos un correo a ${email.trim()}. Ábrelo y toca el enlace para confirmar tu cuenta; luego vuelve aquí y entra.`); setModoCuenta('entrar'); return }
    } else {
      await cuentas.entrarConCorreo(email, clave)
    }
    await continuar()
  })

  /** Ya entró con su cuenta: si tiene perfil va al mapa, si no, completa el registro de su club. */
  const continuar = async () => {
    const p = await repoEnLinea!.sesionActual()
    if (p) { await setSesion('en_linea', p); ir('plaza'); return }
    setAdultoEmail((await repoEnLinea!.adultoSinClub()) ?? email)
  }

  const registrar = () => accion(async () => {
    validarApodo()
    if (!clubAd) throw new Error('ELIGE_CLUB')
    if (!acepta) throw new Error('FALTA_CONSENTIMIENTO')
    if (soyDirector && puedeDirigir && !autoriza) throw new Error('FALTA_CONSENTIMIENTO')
    const p = await cuentas!.registrarAdulto({
      club: clubAd.juego, campo: clubAd.campo, oficial: clubAd.juego ? null : clubAd.oficial,
      nombreClub: clubAd.nuevo?.nombre, ciudad: clubAd.nuevo?.ciudad,
      soyDirector: !!(soyDirector && puedeDirigir), apodo, rango, cargo: cargo.replace(/\./g, ''), acepta, autoriza,
    })
    await setSesion('en_linea', p)
    ir('editor')
  })

  return (
    <div className="pantalla acceso">
      <Cielo />
      <div className="acceso-caja pop">
        <img className="acceso-logo" src={asset('logo-alas')} alt="" />
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'nino'} className={tab === 'nino' ? 'on' : ''} onClick={() => { setTab('nino'); setError('') }}>Soy Conquistador</button>
          <button role="tab" aria-selected={tab === 'adulto'} className={tab === 'adulto' ? 'on' : ''} onClick={() => { setTab('adulto'); setError('') }}>Soy líder (16+)</button>
          <button role="tab" aria-selected={tab === 'invitado'} className={tab === 'invitado' ? 'on' : ''} onClick={() => { setTab('invitado'); setError('') }}>Invitado de sala</button>
        </div>
        {salaPend && tab !== 'invitado' && (
          <button type="button" className="aviso-sala-invitado" onClick={() => setTab('invitado')}>
            Te invitaron a la sala <b>{salaPend}</b>. ¿No tienes cuenta? <u>Entra como invitado</u>
          </button>
        )}

        {tab === 'invitado' && (
          <form className="form" onSubmit={e => { e.preventDefault(); entrarInvitado() }}>
            <p className="ayuda">Para jugar <b>solo en una sala</b> (con el QR o el código que te dio el líder), sin crear cuenta.</p>
            <label>Código de la sala<input value={codSala} onChange={e => setCodSala(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))} maxLength={5} placeholder="Ej. KQZTP" autoCapitalize="characters" autoComplete="off" required /></label>
            <label>Tu nombre<input value={nombreInv} onChange={e => setNombreInv(e.target.value.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü ]/g, '').slice(0, 12))} maxLength={12} placeholder="Ej. Sofía" autoComplete="given-name" required /></label>
            <SelectorClub cuentas={cuentas} onCambio={setClubInv} />
            <p className="ayuda">Solo tu nombre (sin apellido). Tu acceso sirve únicamente para esta sala, no aparece en los rankings y se borra solo a los 2 días.</p>
            {error && <p className="error" role="alert">{error}</p>}
            <Boton type="submit" disabled={cargando || !repoEnLinea || !clubInv}>Entrar a la sala</Boton>
          </form>
        )}

        {tab === 'nino' && (
          <form className="form" onSubmit={e => { e.preventDefault(); entrarNino() }}>
            <div className="segmento">
              <button type="button" className={!nuevo ? 'on' : ''} onClick={() => setNuevo(false)}>Ya tengo cuenta</button>
              <button type="button" className={nuevo ? 'on' : ''} onClick={() => setNuevo(true)}>Soy nuevo</button>
            </div>
            {!nuevo && recordadas.length > 0 && (
              <div className="cuentas-recordadas" aria-label="Cuentas de este equipo">
                {recordadas.map(c => (
                  <button type="button" key={c.codigo + c.apodo} className={c.codigo === codigo && c.apodo === apodo ? 'on' : ''}
                    onClick={() => { setCodigo(c.codigo); setApodo(c.apodo); setPin(''); setError('') }}>
                    <b>{c.apodo}</b><small>{c.club}</small>
                  </button>
                ))}
              </div>
            )}
            {!nuevo && <p className="ayuda">Entras con tu misma cuenta: tu personaje, tus puntos y tus parches siguen ahí. No se crea otro personaje.</p>}
            <label>Código de tu club<input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} placeholder="Ej. K7P2QA" autoCapitalize="characters" autoComplete="off" required /></label>
            <label>Tu apodo de jugador<input value={apodo} onChange={e => setApodo(e.target.value.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü_ ]/g, ''))} maxLength={16} placeholder="Ej. HalconVeloz" autoComplete="nickname" required /></label>
            <p className="ayuda">No uses tu nombre real ni tu apellido. Tu apodo es lo único que verán los demás.</p>
            <label>PIN secreto (4 números)<input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" placeholder="••••" autoComplete={nuevo ? 'new-password' : 'current-password'} required /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <Boton type="submit" disabled={cargando || !repoEnLinea}>{nuevo ? 'Unirme a mi club' : 'Entrar'}</Boton>
            <p className="ayuda">¿No tienes código? Pídeselo a tu líder. Él registra al club y se encarga de la autorización de tus padres.</p>
          </form>
        )}

        {tab === 'adulto' && !adultoEmail && (
          <form className="form" onSubmit={e => { e.preventDefault(); cuenta() }}>
            {modoCuenta !== 'nueva' && modoCuenta !== 'olvide' && (
              <>
                <button type="button" className="btn-google" onClick={() => accion(async () => { await cuentas!.entrarConGoogle() })} disabled={cargando || !cuentas}>
                  <Google /> Continuar con Google
                </button>
                <div className="separador"><span>o con tu correo</span></div>
                <div className="segmento">
                  <button type="button" className={modoCuenta === 'entrar' ? 'on' : ''} onClick={() => setModoCuenta('entrar')}>Entrar</button>
                  <button type="button" className={modoCuenta === 'crear' ? 'on' : ''} onClick={() => setModoCuenta('crear')}>Crear cuenta</button>
                </div>
              </>
            )}
            {modoCuenta === 'olvide' && <p className="ayuda">Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.</p>}
            {modoCuenta === 'nueva' && <p className="ayuda">Escribe tu contraseña nueva.</p>}
            {modoCuenta !== 'nueva' && (
              <label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} placeholder="tucorreo@ejemplo.com" autoComplete="email" required /></label>
            )}
            {modoCuenta !== 'olvide' && (
              <label>Contraseña
                <span className="campo-clave">
                  <input type={verClave ? 'text' : 'password'} value={clave} onChange={e => setClave(e.target.value)} maxLength={72} minLength={8}
                    autoComplete={modoCuenta === 'entrar' ? 'current-password' : 'new-password'} required />
                  <button type="button" onClick={() => setVerClave(v => !v)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{verClave ? 'Ocultar' : 'Ver'}</button>
                </span>
              </label>
            )}
            {(modoCuenta === 'crear' || modoCuenta === 'nueva') && <p className="ayuda">Mínimo 8 caracteres, con letras y números.</p>}
            {aviso && <div className="aviso-ok" role="status">{aviso}</div>}
            {error && <p className="error" role="alert">{error}</p>}
            <Boton type="submit" disabled={cargando || !cuentas}>
              {modoCuenta === 'entrar' ? 'Entrar' : modoCuenta === 'crear' ? 'Crear mi cuenta' : modoCuenta === 'olvide' ? 'Enviarme el enlace' : 'Guardar contraseña'}
            </Boton>
            {modoCuenta === 'entrar' && <button type="button" className="enlace" onClick={() => setModoCuenta('olvide')}>Olvidé mi contraseña</button>}
            {modoCuenta === 'olvide' && <button type="button" className="enlace" onClick={() => setModoCuenta('entrar')}>Volver</button>}
          </form>
        )}

        {tab === 'adulto' && adultoEmail && (
          <form className="form" onSubmit={e => { e.preventDefault(); registrar() }}>
            <p className="ayuda">Conectado como <b>{adultoEmail}</b>. Ahora elige tu club.</p>
            <SelectorClub cuentas={cuentas} permitirNuevo onCambio={c => { setClubAd(c); setSoyDirector(false) }} />
            {puedeDirigir && (
              <label className="check"><input type="checkbox" checked={soyDirector} onChange={e => setSoyDirector(e.target.checked)} />
                <span>Soy el director de este club (recibo el código para mis Conquistadores).</span></label>
            )}
            {yaTieneDirector && <p className="ayuda">Este club ya tiene director. Entrarás como miembro de su directiva.</p>}
            <div className="dos">
              <label>Tu apodo<input value={apodo} onChange={e => setApodo(e.target.value.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü_ ]/g, ''))} maxLength={16} required /></label>
              <label>Tu rango<select value={rango} onChange={e => setRango(e.target.value as Rango)}>{RANGOS_ADULTO.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
            </div>
            <label>Tu cargo<select value={cargo} onChange={e => setCargo(e.target.value)}>{CARGOS_ADULTO.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}</select></label>
            <label className="check"><input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
              <span>Acepto los <a onClick={() => verLegal('terminos')}>Términos</a> y la <a onClick={() => verLegal('privacidad')}>Política de privacidad</a>, y entiendo que mis medallas y parches se guardan en este celular (si lo cambio, se pierden).</span></label>
            {soyDirector && puedeDirigir && (
              <label className="check"><input type="checkbox" checked={autoriza} onChange={e => setAutoriza(e.target.checked)} />
                <span>Como director, me comprometo a obtener la <a onClick={() => verLegal('padres')}>autorización firmada de los padres</a> antes de entregar el código del club a cada menor.</span></label>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            <Boton type="submit" disabled={cargando}>Entrar a mi club</Boton>
            <button type="button" className="enlace" onClick={() => accion(async () => { await repoEnLinea?.salir(); setAdultoEmail(null) })}>Usar otra cuenta</button>
          </form>
        )}

        <footer className="acceso-pie">
          <a onClick={() => verLegal('privacidad')}>Privacidad</a> · <a onClick={() => verLegal('terminos')}>Términos</a> · <a onClick={() => verLegal('padres')}>Para padres</a>
        </footer>
      </div>
    </div>
  )
}
