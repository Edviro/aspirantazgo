import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FRASES, type AvatarConfig, type AvisosCulto, type EmisionVoz, type EstadoVoz, type MiembroPrograma, type ProgramaVivo, type RecepcionVoz } from '../../../application/puertos'
import type { Pantalla3D } from '../../tres/mundo3d'
import { mensajeError } from '../../../application/errores'
import type { Rango } from '../../../domain/tipos'
import { useJuego } from '../../estado'
import { ATRIL, CH, CW, EMBLEMAS, PANTALLA, PISO, dibujarAtril, dibujarEscenario, dibujarPublico, puestosPublico } from '../../pixel/cultoPixel'
import { PixelAvatar } from '../../pixel/PixelAvatar'
import { sfx } from '../../sonido'
import { menosMovimiento } from '../../transicion'
import { Boton } from '../Comunes'
import { TIPO_PARTE } from '../../../domain/programa'

export interface Espectador { id: string; apodo: string; avatar?: AvatarConfig; rango: Rango }
const REACCIONES = [FRASES.indexOf('¡Amén!'), FRASES.indexOf('🙏'), FRASES.indexOf('🙌'), FRASES.indexOf('👏')].filter(i => i >= 0)
const VIDA_DICHO = 9000
const fechaLarga = (iso: string) => new Date(iso).toLocaleString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
const aTexto = (d: string[]) => d.join('\n\n')
const aDiapositivas = (t: string) => t.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).slice(0, 30).map(x => x.slice(0, 400))
const limpiar = (s: string, n: number) => s.replace(/[<>\u0000-\u0009\u000b-\u001f\u007f]/g, '').slice(0, n)

/**
 * El culto en vivo visto desde el público: la cámara baja desde la vista aérea hasta quedar de frente al escenario.
 * Todos miran; solo el equipo del programa habla, cambia lo que se proyecta y avanza. Todo lo valida el servidor.
 */
export interface EscenaCulto { orador: string | null; equipo: MiembroPrograma[]; hablando: Set<string>; pantalla: Pantalla3D }
export function Culto({ publico, gestos, onGesto, puedeReaccionar, sabado, luz, onCerrar, modo3d = false, onEscena }: {
  publico: Espectador[]; gestos: Record<string, { frase: number; t: number }>; onGesto: (i: number) => void; puedeReaccionar: boolean
  sabado: boolean; luz: { oscuridad: number; dorado: number }; onCerrar: () => void
  /** En 3D el escenario se ve en el mundo (desde tu asiento): aquí solo van los controles. */
  modo3d?: boolean; onEscena?: (e: EscenaCulto) => void
}) {
  const { repo } = useJuego()
  const culto = repo.culto ?? null
  const demo = import.meta.env.DEV ? (window as unknown as { __cultoDemo?: ProgramaVivo | null }).__cultoDemo : undefined
  const [prog, setProg] = useState<ProgramaVivo | null | undefined>(demo === undefined ? undefined : demo)
  const [error, setError] = useState('')
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<{ orden: number; texto: string } | null>(null)
  const [grande, setGrande] = useState(false)
  const [verPrograma, setVerPrograma] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [, setTic] = useState(0)

  // ---------- Datos: se piden al servidor; el canal solo avisa "cambió algo" ----------
  const version = useRef(-1), ultimo = useRef(0), espera = useRef<number>(0), avisos = useRef<AvisosCulto | null>(null)
  const llegaron = useRef(new Map<number, number>())
  const traer = useCallback(async () => {
    if (!culto) { if (demo === undefined) setProg(null); return }
    ultimo.current = Date.now()
    try {
      const p = await culto.actual()
      if (p) {
        version.current = p.version
        for (const d of p.dichos) if (!llegaron.current.has(d.id)) llegaron.current.set(d.id, Date.now())
      }
      setProg(p)
    } catch (e) { setError(mensajeError(e)) }
  }, [culto, demo])
  const pedir = useCallback((v?: number) => {
    if (v !== undefined && v <= version.current) return
    clearTimeout(espera.current)
    espera.current = window.setTimeout(traer, Math.max(0, 1500 - (Date.now() - ultimo.current)) + Math.random() * 700)
  }, [traer])
  useEffect(() => { void traer() }, [traer])
  const enVivo = prog?.estado === 'en_vivo'
  useEffect(() => {
    const t = setInterval(() => pedir(), enVivo ? 15000 : 45000)
    return () => clearInterval(t)
  }, [pedir, enVivo])
  useEffect(() => {
    if (!culto || !prog?.id) return
    let vivo = true
    culto.escuchar(prog.id, v => pedir(v)).then(a => { if (vivo) avisos.current = a; else void a.salir() }).catch(() => undefined)
    return () => { vivo = false; void avisos.current?.salir(); avisos.current = null }
  }, [culto, prog?.id, pedir])
  useEffect(() => { const t = setInterval(() => setTic(x => x + 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => () => clearTimeout(espera.current), [])

  const accion = async (fn: () => Promise<number | void>, ok?: () => void) => {
    setError('')
    try { const v = await fn(); if (typeof v === 'number') avisos.current?.avisar(v); ok?.(); await traer() } catch (e) { setError(mensajeError(e)); sfx.mal() }
  }

  // ---------- Escala: el escenario llena el espacio disponible ----------
  const marco = useRef<HTMLDivElement>(null)
  const [s, setS] = useState(2)
  useLayoutEffect(() => {
    const el = marco.current
    if (!el) return
    const medir = () => { const k = Math.min(el.clientWidth / (CW - 40), el.clientHeight / CH); // en celular se recortan los costados (torres y árboles)
       setS(k >= 2 ? Math.floor(k * 2) / 2 : Math.max(1, k)) }
    medir()
    const ro = new ResizeObserver(medir); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---------- Lienzos ----------
  const fondo = useRef<HTMLCanvasElement>(null), atril = useRef<HTMLCanvasElement>(null), pub0 = useRef<HTMLCanvasElement>(null), pub1 = useRef<HTMLCanvasElement>(null)
  const noche = luz.oscuridad
  useEffect(() => {
    const cv = fondo.current
    if (!cv) return
    cv.width = CW; cv.height = CH
    const ctx = cv.getContext('2d')!
    dibujarEscenario(ctx, { noche, dorado: luz.dorado, sabado, enVivo })
    const img = new Image()
    img.onload = () => { ctx.imageSmoothingEnabled = false; for (const e of EMBLEMAS) ctx.drawImage(img, e.x, e.y, e.t, e.t) }
    img.src = `${import.meta.env.BASE_URL}assets/emblema-c1.webp`
  }, [noche > 0.5, luz.dorado > 0.4, sabado, enVivo]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const cv = atril.current; if (cv) { cv.width = CW; cv.height = CH; dibujarAtril(cv.getContext('2d')!) } }, [])
  const gente = useMemo(() => publico.slice(0, 43), [publico])
  const claveGente = gente.map(g => g.id + JSON.stringify(g.avatar ?? {})).join('|')
  useEffect(() => {
    for (const [ref, f] of [[pub0, 0], [pub1, 1]] as const) {
      const cv = ref.current
      if (!cv) continue
      cv.width = CW; cv.height = CH
      dibujarPublico(cv.getContext('2d')!, gente, f)
    }
  }, [claveGente]) // eslint-disable-line react-hooks/exhaustive-deps
  const puestos = useMemo(() => puestosPublico(gente.length), [gente.length])

  // ---------- Quién está en el escenario ----------
  const parte = prog?.partes[prog.parte]
  const equipo = prog?.equipo ?? []
  const orador: MiembroPrograma | undefined = equipo.find(e => e.id === parte?.responsable) ?? equipo.find(e => e.rol === 'conductor')
  const otros = equipo.filter(e => e.id !== orador?.id).slice(0, 6)
  const lugares = [62, 82, 146, 166, 44, 186]
  const ahora = Date.now()
  const dichosVivos = (prog?.dichos ?? []).filter(d => ahora - (llegaron.current.get(d.id) ?? 0) < VIDA_DICHO)
  const ultimoDe = (id: string) => [...dichosVivos].reverse().find(d => d.de === id)
  const subtitulo = dichosVivos[dichosVivos.length - 1]

  // ---------- Permisos del que mira (el servidor igual lo vuelve a verificar) ----------
  const rol = prog?.mi_rol ?? null
  const yoId = publico[0]?.id
  const soyResponsable = !!parte && parte.responsable === yoId
  const puedeMover = enVivo && (rol === 'conductor' || soyResponsable)
  const total = prog?.total_diapositivas ?? 0

  // ---------- Voz en vivo: habla quien tiene el turno; los demás oyen ----------
  const voz = culto?.voz ?? null
  const micro = enVivo ? prog?.microfono ?? null : null
  const [emision, setEmision] = useState<EmisionVoz | null>(null)
  const [abriendo, setAbriendo] = useState(false)
  const [oyentes, setOyentes] = useState(0)
  const [mudo, setMudo] = useState(false)
  const [oyendo, setOyendo] = useState<EstadoVoz | null>(null)
  const [silencio, setSilencio] = useState(false)
  const recepcion = useRef<RecepcionVoz | null>(null), emisionRef = useRef<EmisionVoz | null>(null), abiertoEn = useRef(0)
  emisionRef.current = emision
  useEffect(() => {
    if (!voz || !prog?.id || !micro || !yoId || micro.de === yoId) { setOyendo(null); return }
    let vivo = true
    voz.escuchar(prog.id, yoId, micro.de, micro.huella, e => { if (vivo) setOyendo(e) })
      .then(r => { if (vivo) { recepcion.current = r; r.volumen(silencio ? 0 : 1) } else void r.cerrar() })
      .catch(() => { if (vivo) setOyendo('sin_conexion') })
    return () => { vivo = false; void recepcion.current?.cerrar(); recepcion.current = null }
  }, [voz, prog?.id, micro?.de, micro?.huella, yoId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { recepcion.current?.volumen(silencio ? 0 : 1) }, [silencio])
  // Si el servidor ya no te da el micrófono (cambió la parte o terminó), se cierra solo
  useEffect(() => {
    if (emision && prog !== undefined && ultimo.current > abiertoEn.current + 50 && (!enVivo || prog?.microfono?.de !== yoId)) { void emision.cerrar(); setEmision(null) }
  }, [prog, emision, enVivo, yoId])
  useEffect(() => () => { void emisionRef.current?.cerrar() }, [])
  const abrirMicro = async () => {
    if (!voz || !prog || !yoId) return
    setError(''); setAbriendo(true)
    try {
      const e = await voz.hablar(prog.id, yoId, setOyentes)
      abiertoEn.current = Date.now(); setEmision(e); setMudo(false)
      await traer(); avisos.current?.avisar(version.current)
    } catch (e) { setError(mensajeError(e)); sfx.mal() } finally { setAbriendo(false) }
  }
  const cerrarMicro = async () => { const e = emision; setEmision(null); await e?.cerrar(); await traer(); avisos.current?.avisar(version.current) }

  const cerrar = () => {
    if (menosMovimiento()) { onCerrar(); return }
    setSaliendo(true); sfx.zas()
    setTimeout(onCerrar, 420)
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (grande) setGrande(false); else cerrar() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const rectPantalla = grande ? { left: 6 * s, top: 6 * s, width: (CW - 12) * s, height: (PISO - 6) * s } : { left: PANTALLA.x * s, top: PANTALLA.y * s, width: PANTALLA.w * s, height: PANTALLA.h * s }
  const yt = enVivo && prog?.youtube && /^[A-Za-z0-9_-]{11}$/.test(prog.youtube) ? prog.youtube : null
  const altoOrador = 36, altoOtro = 30

  const pantalla = () => {
    if (prog === undefined) return <div className="culto-diap"><small>Conectando…</small></div>
    if (!prog) return (
      <div className="culto-diap">
        <small>{sabado ? 'Feliz sábado' : 'Escenario del Gran Campamento'}</small>
        <p>{sabado ? '«Acuérdate del día de reposo para santificarlo»' : 'Aquí se presentan los cultos y programas en vivo.'}</p>
        <small>{sabado ? 'Éxodo 20:8' : 'Pronto, el próximo programa.'}</small>
      </div>
    )
    if (!enVivo) {
      const falta = new Date(prog.inicia).getTime() - ahora
      const h = Math.floor(falta / 3600000), m = Math.floor((falta % 3600000) / 60000), sg = Math.floor((falta % 60000) / 1000)
      return (
        <div className="culto-diap">
          <small>Próximo programa</small>
          <p>{prog.titulo}</p>
          <small>{falta > 0 && falta < 86400000 ? `Empieza en ${h ? `${h} h ` : ''}${m} min ${h ? '' : `${sg} s`}` : fechaLarga(prog.inicia)}</small>
        </div>
      )
    }
    if (yt) return <iframe className="culto-video" title={`Transmisión: ${prog.titulo}`} src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&playsinline=1&rel=0&modestbranding=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" />
    const t = prog.texto ?? ''
    const tam = t.length > 160 ? 'chico' : t.length > 60 ? 'medio' : 'grande'
    return (
      <div className="culto-diap">
        <small>{parte ? `${TIPO_PARTE[parte.tipo]}${parte.apodo ? ` · ${parte.apodo}` : ''}` : prog.titulo}</small>
        {t ? <p className={tam}>{t}</p> : <p>{parte?.titulo ?? prog.titulo}</p>}
        {total > 1 && <small>{prog.diapositiva + 1} / {total}</small>}
      </div>
    )
  }

  // En 3D: lo que se ve en el escenario del mundo (pantalla LED, quién está y quién habla)
  const textoPantalla = (): Pantalla3D => {
    if (prog === undefined) return { texto: 'Conectando…', encendida: false }
    if (!prog) return sabado ? { arriba: 'Feliz sábado', texto: '«Acuérdate del día de reposo para santificarlo»', abajo: 'Éxodo 20:8', encendida: true } : { texto: 'Escenario del Gran Campamento', encendida: false }
    if (!enVivo) return { arriba: 'Próximo programa', texto: prog.titulo, abajo: fechaLarga(prog.inicia), encendida: true }
    if (yt) return { arriba: prog.titulo, texto: '● Transmisión en vivo', abajo: parte?.titulo, encendida: true }
    return { arriba: parte ? `${TIPO_PARTE[parte.tipo]}${parte.apodo ? ` · ${parte.apodo}` : ''}` : prog.titulo, texto: prog.texto || (parte?.titulo ?? prog.titulo), abajo: total > 1 ? `${prog.diapositiva + 1} / ${total}` : undefined, encendida: true }
  }
  const claveEscena = `${prog?.version ?? -1}|${prog === undefined}|${dichosVivos.map(d => d.id).join(',')}|${sabado}`
  useEffect(() => {
    if (!onEscena) return
    const hablando = new Set(dichosVivos.map(d => d.de))
    if (micro) hablando.add(micro.de)
    onEscena({ orador: orador?.id ?? null, equipo, hablando, pantalla: textoPantalla() })
  }, [claveEscena]) // eslint-disable-line react-hooks/exhaustive-deps

  const avatarEn = (m: MiembroPrograma, x: number, alto: number, clase = '') => {
    const ancho = alto * 48 / 64, d = ultimoDe(m.id)
    return (
      <div key={m.id} className={`culto-pj ${clase}`} style={{ left: (x - ancho / 2) * s, top: (PISO - alto) * s, width: ancho * s, height: alto * s }}>
        {d && <span className="culto-globo" style={{ maxWidth: 70 * s }}>{d.texto.length > 90 ? d.texto.slice(0, 88) + '…' : d.texto}</span>}
        <PixelAvatar a={m.avatar ?? {}} rango={m.rango} animo={d ? 'saluda' : 'idle'} alto={alto * s} />
        <span className="culto-nombre">{m.apodo}</span>
      </div>
    )
  }

  return (
    <div className={`culto ${modo3d ? 'tres' : ''} ${saliendo ? 'saliendo' : ''}`} role="dialog" aria-modal="true" aria-label="Escenario: culto en vivo">
      <header className="culto-barra">
        <button className="icono" onClick={cerrar} aria-label="Volver al campamento">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="culto-titulo">
          <small>{enVivo ? <><i className="en-vivo-punto" aria-hidden />En vivo</> : 'Escenario'}</small>
          <strong>{prog?.titulo ?? (sabado ? 'Culto de sábado' : 'Escenario del campamento')}</strong>
        </div>
        {enVivo && yt && <button className="culto-grande" onClick={() => setGrande(g => !g)}>{grande ? 'Pantalla normal' : 'Pantalla grande'}</button>}
      </header>

      {modo3d ? (
        <div className="culto-hueco">
          {yt && <div className={`culto-tele ${grande ? 'grande' : ''}`}>{pantalla()}</div>}
          {modo3d && <p className="culto-pista">Arrastra para mirar alrededor desde tu asiento</p>}
        </div>
      ) : (
      <div className="culto-marco" ref={marco}>
        <div className={`culto-escena ${menosMovimiento() ? '' : 'camara'}`} style={{ width: CW * s, height: CH * s }}>
          <canvas ref={fondo} className="culto-capa" aria-hidden />
          <div className={`culto-pantalla ${grande ? 'grande' : ''} ${enVivo ? 'encendida' : ''}`} style={{ ...rectPantalla, fontSize: Math.max(9, 4.2 * s) }}>{pantalla()}</div>
          {!grande && <>
            {otros.map((m, i) => avatarEn(m, lugares[i], altoOtro))}
            {orador && avatarEn(orador, ATRIL.x + ATRIL.w / 2, altoOrador, 'orador')}
            <canvas ref={atril} className="culto-capa atril" aria-hidden />
          </>}
          <div className="culto-noche" style={{ opacity: Math.min(0.55, noche * 0.6) }} aria-hidden />
          {noche > 0.3 && <div className="culto-focos" aria-hidden>{[43, 69, 175, 201].map(x => <i key={x} style={{ left: (x - 30) * s, top: 14 * s, width: 60 * s, height: 90 * s }} />)}</div>}
          <canvas ref={pub0} className="culto-capa publico ola-inversa" aria-hidden />
          <canvas ref={pub1} className="culto-capa publico isla-ola" aria-hidden />
          {gente.map((g, i) => {
            const st = puestos[i], gg = gestos[g.id]
            if (!st) return null
            const mostrar = gg && ahora - gg.t < 4500
            return (
              <span key={g.id} className={`culto-asiento ${i === 0 ? 'yo' : ''}`} style={{ left: (st.x + 7) * s, top: st.y * s }}>
                {mostrar && <b className={/^\p{Extended_Pictographic}$/u.test(FRASES[gg.frase]) ? 'emoji' : ''} key={gg.t}>{FRASES[gg.frase]}</b>}
                {i === 0 && <em>Tú</em>}
              </span>
            )
          })}
        </div>
      </div>
      )}

      <div className="culto-sub" aria-live="polite">{subtitulo ? <><b>{subtitulo.apodo}:</b> {subtitulo.texto}</> : enVivo ? <span className="tenue">{parte ? `Ahora: ${parte.titulo}${parte.apodo ? ` · ${parte.apodo}` : ''}` : ''}</span> : null}</div>

      <section className="culto-panel">
        {error && <p className="error" role="alert">{error}</p>}
        {!culto && demo === undefined && <p className="nota">Los cultos en vivo funcionan con tu cuenta en línea.</p>}

        {micro && micro.de !== yoId && (
          <div className="culto-voz">
            <span className={`voz-punto ${oyendo === 'oyendo' ? 'on' : ''}`} aria-hidden />
            <span><b>🔊 Habla {micro.apodo}</b><small>{!voz ? (culto ? 'Tu navegador no puede reproducir la voz en vivo.' : 'La voz en vivo funciona con tu cuenta en línea.') : oyendo === 'oyendo' ? (silencio ? 'Sonido apagado' : 'Escuchando en vivo') : oyendo === 'sin_conexion' ? 'No se pudo conectar el audio (red muy cerrada).' : 'Conectando el audio…'}</small></span>
            {voz && <button className="enlace" onClick={() => setSilencio(v => !v)}>{silencio ? 'Activar sonido' : 'Silenciar'}</button>}
          </div>
        )}
        {enVivo && prog?.puedo_hablar && (
          <div className="culto-voz mia">
            {!voz ? <small>Tu navegador no permite el micrófono en vivo.</small>
              : emision ? <>
                <span className="voz-punto on rojo" aria-hidden />
                <span><b>🎙️ Al aire</b><small>{oyentes === 1 ? '1 persona te escucha' : `${oyentes} personas te escuchan`}{mudo ? ' · micrófono en silencio' : ''}</small></span>
                <button className="enlace" onClick={() => { emision.silenciar(!mudo); setMudo(!mudo) }}>{mudo ? 'Activar' : 'Silenciar'}</button>
                <Boton tipo="rojo" onClick={cerrarMicro}>Cerrar micrófono</Boton>
              </> : <>
                <span><b>Te toca hablar</b><small>{micro ? `Ahora tiene el micrófono ${micro.apodo}.` : 'Abre tu micrófono y todos te oirán.'}</small></span>
                <Boton tipo="verde" disabled={abriendo} onClick={abrirMicro}>{abriendo ? 'Abriendo…' : '🎙️ Abrir mi micrófono'}</Boton>
              </>}
          </div>
        )}

        {puedeReaccionar && enVivo && (
          <div className="culto-reacciones" aria-label="Reaccionar">
            {REACCIONES.map(i => <button key={i} onClick={() => { onGesto(i); sfx.click() }}>{FRASES[i]}</button>)}
          </div>
        )}

        {rol && prog && (
          <div className="culto-equipo">
            <p className="culto-rol">{rol === 'conductor' ? '🎙️ Eres el conductor: manejas todo el programa.' : soyResponsable ? '🎙️ Es tu parte: habla y pasa las diapositivas.' : '🎙️ Estás en el equipo del programa.'}</p>
            {enVivo && (
              <form className="culto-hablar" onSubmit={e => { e.preventDefault(); const t = texto.trim(); if (!t) return; void accion(() => culto!.decir(prog.id, t), () => setTexto('')) }}>
                <input value={texto} onChange={e => setTexto(limpiar(e.target.value, 240))} maxLength={240} placeholder="Lo que dices en el escenario…" aria-label="Hablar en el escenario" />
                <Boton type="submit" disabled={!texto.trim()}>Decir</Boton>
              </form>
            )}
            {puedeMover && (
              <div className="culto-controles">
                <Boton tipo="fantasma" disabled={prog.diapositiva <= 0} onClick={() => accion(() => culto!.control(prog.id, prog.parte, prog.diapositiva - 1))}>◀ Anterior</Boton>
                <Boton tipo="fantasma" disabled={prog.diapositiva >= total - 1} onClick={() => accion(() => culto!.control(prog.id, prog.parte, prog.diapositiva + 1))}>Siguiente ▶</Boton>
                {prog.parte < prog.partes.length - 1 && <Boton tipo="azul" onClick={() => accion(() => culto!.control(prog.id, prog.parte + 1, 0))}>Pasar a: {prog.partes[prog.parte + 1].titulo}</Boton>}
              </div>
            )}
            {rol === 'conductor' && (
              <div className="culto-controles">
                {enVivo && <select value={prog.parte} onChange={e => accion(() => culto!.control(prog.id, Number(e.target.value), 0))} aria-label="Ir a la parte">
                  {prog.partes.map(p => <option key={p.orden} value={p.orden}>{p.orden + 1}. {p.titulo}</option>)}
                </select>}
                {enVivo ? <Boton tipo="rojo" onClick={() => accion(() => culto!.estado(prog.id, 'terminado'))}>Terminar programa</Boton>
                  : <Boton tipo="verde" onClick={() => accion(() => culto!.estado(prog.id, 'en_vivo'))}>Empezar en vivo</Boton>}
              </div>
            )}
            {!!prog.mis_partes.length && (
              <details className="culto-mis">
                <summary>Lo que se proyecta en {rol === 'conductor' ? 'el programa' : 'tu parte'}</summary>
                {prog.mis_partes.map(mp => {
                  const pt = prog.partes.find(p => p.orden === mp.orden)
                  const ed = editando?.orden === mp.orden
                  return (
                    <div key={mp.orden} className="culto-mi-parte">
                      <b>{mp.orden + 1}. {pt?.titulo}</b> <small>{mp.diapositivas.length} {mp.diapositivas.length === 1 ? 'diapositiva' : 'diapositivas'}</small>
                      {ed ? <>
                        <textarea rows={5} value={editando.texto} onChange={e => setEditando({ orden: mp.orden, texto: limpiar(e.target.value, 6000) })} placeholder="Separa cada diapositiva con una línea en blanco (versículo, letra del himno, puntos del mensaje…)" />
                        <div className="fila-botones">
                          <Boton tipo="fantasma" onClick={() => setEditando(null)}>Cancelar</Boton>
                          <Boton onClick={() => accion(() => culto!.diapositivas(prog.id, mp.orden, aDiapositivas(editando.texto)), () => setEditando(null))}>Guardar</Boton>
                        </div>
                      </> : <button className="enlace" onClick={() => setEditando({ orden: mp.orden, texto: aTexto(mp.diapositivas) })}>Editar</button>}
                    </div>
                  )
                })}
              </details>
            )}
          </div>
        )}

        {prog && (
          <div className="culto-programa">
            <button className="enlace" onClick={() => setVerPrograma(v => !v)} aria-expanded={verPrograma}>{verPrograma ? 'Ocultar el programa' : `Ver el programa (${prog.partes.length} partes)`}</button>
            {verPrograma && (
              <ol>
                {prog.partes.map(p => (
                  <li key={p.orden} className={enVivo && p.orden === prog.parte ? 'ahora' : enVivo && p.orden < prog.parte ? 'hecha' : ''}>
                    <span>{p.titulo}</span><small>{p.apodo ?? (TIPO_PARTE[p.tipo])}</small>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        {!rol && enVivo && <p className="nota">Solo el equipo del programa habla en el escenario. Tú puedes reaccionar con un Amén.</p>}
      </section>
    </div>
  )
}
