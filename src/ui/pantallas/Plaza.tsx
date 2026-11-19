import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FRASES, type ConexionPlaza, type JugadorEnLinea, type PresenteEnPlaza, type PuntoPlaza } from '../../application/puertos'
import { CAMPAMENTO_CENTRAL, CAMPAMENTOS, centralAbierto, progresoCampamento } from '../../domain/campamentos'
import { rachaVigente, retoDelDia } from '../../domain/diario'
import {
  ALTO, ANCHO, OBJETOS, SALIDA, horaLima, luzDelDia, objetoEn, ruta, transitable, usableCerca, type Objeto,
} from '../../domain/plaza'
import { Boton } from '../componentes/Comunes'
import { MenuPrincipal } from '../componentes/MenuPrincipal'
import { BarraFrases, DialogoReto } from '../componentes/Retar'
import { Travesia } from '../componentes/Travesia'
import { HudVidas } from '../componentes/Vidas'
import { useJuego } from '../estado'
import { musica } from '../musica'
import { B, dibujarSuelo, lucesDeNoche, pintarSprite, spriteDe, type Sprite } from '../pixel/plazaPixel'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { useProgreso } from '../progreso'
import { sfx } from '../sonido'
import { limpiarTransicion, marcarTransicion, menosMovimiento, verTransicion } from '../transicion'

const VEL = 3.6 // baldosas por segundo
const VIDA_GLOBO = 4500
const MUELLE = { x: 24.5, y: 4.5 }
const RANGO_TXT: Record<string, string> = { conquistador: 'Conquistador', lider: 'Líder', guia_mayor: 'Guía Mayor', gm_master: 'GM Máster', gm_master_avanzado: 'GM Máster Avanzado' }

interface Ente { x: number; y: number; ruta: PuntoPlaza[]; mira: 1 | -1; camina: boolean; el?: HTMLElement | null; cuerpo?: HTMLElement | null }

const ACCION: Record<string, string> = {
  barco: '⛵ Subir al barco', tablero: '🏆 Ver el tablero de honor', reto: '⭐ Reto del día', 'carpa-club': '⛺ Entrar a la carpa de mi club',
  escenario: '🎤 Escenario', santuario: '🔥 Fogata del Gran Campamento', letrero: '🪧 Leer el letrero',
}

/** Hora para el día y la noche (en desarrollo se puede forzar con window.__hora para probar). */
const horaActual = () => {
  const forzada = import.meta.env.DEV ? (window as unknown as { __hora?: number }).__hora : undefined
  return typeof forzada === 'number' ? forzada : horaLima()
}

/**
 * Plaza Central: mundo abierto donde se encuentran los conquistadores de todos los clubes.
 * Caminas tocando el suelo (o con las flechas), ves a los demás de tu canal moverse, saludas con frases rápidas
 * y usas lo que hay en la plaza: el barco a los campamentos, el tablero de honor, el reto del día, la carpa
 * de tu club y el escenario. Hay día y noche con la hora de Perú.
 */
export default function Plaza() {
  const { perfil, repo, ir, jugar, puntajes, modo, presencia } = useJuego()
  const abierto = centralAbierto(puntajes)
  useEffect(() => { musica('mapa'); void useProgreso.getState().cargarVidas() }, [])

  // ---------- Tamaño y escala (pixel art nítido: escala entera) ----------
  const caja = useRef<HTMLDivElement>(null), capa = useRef<HTMLDivElement>(null), capaLuz = useRef<HTMLDivElement>(null)
  const [vista, setVista] = useState({ w: 390, h: 700, s: 2 })
  useLayoutEffect(() => {
    const el = caja.current
    if (!el) return
    const medir = () => { const w = el.clientWidth, h = el.clientHeight; setVista({ w, h, s: Math.max(2, Math.round(Math.min(w, h) / 230)) }) }
    medir()
    const ro = new ResizeObserver(medir); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const s = vista.s

  // ---------- Suelo y objetos ----------
  const suelo0 = useRef<HTMLCanvasElement>(null), suelo1 = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    for (const [ref, f] of [[suelo0, 0], [suelo1, 1]] as const) {
      const cv = ref.current
      if (!cv) continue
      cv.width = ANCHO * B; cv.height = ALTO * B
      dibujarSuelo(cv.getContext('2d')!, f, abierto)
    }
  }, [abierto])
  const sprites = useMemo(() => OBJETOS.map(ob => ({ ob, sp: spriteDe(ob, abierto) })).filter((x): x is { ob: Objeto; sp: Sprite } => !!x.sp), [abierto])

  // ---------- Día y noche ----------
  const [hora, setHora] = useState(horaActual)
  useEffect(() => { const t = setInterval(() => setHora(horaActual()), 60000); return () => clearInterval(t) }, [])
  const luz = luzDelDia(hora)
  const luces = useMemo(() => lucesDeNoche(OBJETOS, abierto), [abierto])

  // ---------- Entidades: tú y los demás ----------
  const [llegada] = useState(() => verTransicion())
  const yo = useRef<Ente>({ ...(llegada?.tipo === 'llegar' ? MUELLE : SALIDA), ruta: [], mira: 1, camina: false })
  const otros = useRef(new Map<string, Ente>())
  const perfiles = useRef(new Map<string, JugadorEnLinea>())
  const rechazados = useRef(new Set<string>())
  const [ids, setIds] = useState<string[]>([])
  const conexion = useRef<ConexionPlaza | null>(null)
  const [canal, setCanal] = useState<number | null>(null)
  const [red, setRed] = useState<'conectando' | 'vivo' | 'solo'>('conectando')
  const [gestos, setGestos] = useState<Record<string, { frase: number; t: number }>>({})
  const [cerca, setCerca] = useState<Objeto | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [elegido, setElegido] = useState<JugadorEnLinea | null>(null)
  const [rivales, setRivales] = useState<JugadorEnLinea[]>([])
  const [zarpar, setZarpar] = useState(false)
  const [menu, setMenu] = useState(false)
  const [hablar, setHablar] = useState(false)
  const marca = useRef<HTMLDivElement>(null)
  const usoPendiente = useRef<Objeto | null>(null)
  const teclas = useRef(new Set<string>())
  const cam = useRef({ x: yo.current.x, y: yo.current.y, ox: 0, oy: 0 })

  const actualizarLista = useCallback(() => {
    const l = [...otros.current.keys()].filter(id => perfiles.current.has(id)).slice(0, 60)
    setIds(prev => (prev.length === l.length && prev.every((v, i) => v === l[i]) ? prev : l))
  }, [])

  // Pide (en lote) los nombres y avatares verdaderos de quienes aparecen: vienen de la base de datos, no del canal
  const pidiendo = useRef<number>(0)
  const resolver = useCallback(() => {
    clearTimeout(pidiendo.current)
    pidiendo.current = window.setTimeout(async () => {
      const faltan = [...otros.current.keys()].filter(id => !perfiles.current.has(id) && !rechazados.current.has(id)).slice(0, 60)
      if (!faltan.length || !repo.salas) return
      try {
        const l = await repo.salas.perfilesPublicos(faltan)
        for (const j of l) perfiles.current.set(j.id, j)
        for (const id of faltan) if (!perfiles.current.has(id)) rechazados.current.add(id)
        actualizarLista()
      } catch { /* se reintenta con el próximo cambio */ }
    }, 250)
  }, [repo.salas, actualizarLista])

  const presentes = useCallback((lista: PresenteEnPlaza[]) => {
    const vistos = new Set<string>()
    for (const p of lista) {
      vistos.add(p.id)
      const e = otros.current.get(p.id)
      if (!e) otros.current.set(p.id, { x: p.x, y: p.y, ruta: [], mira: 1, camina: false })
      else if (!e.ruta.length && Math.hypot(e.x - p.x, e.y - p.y) > 1.5) { e.x = p.x; e.y = p.y }
    }
    for (const id of [...otros.current.keys()]) if (!vistos.has(id)) otros.current.delete(id)
    resolver(); actualizarLista()
  }, [resolver, actualizarLista])

  const caminar = useCallback((id: string, desde: PuntoPlaza, hasta: PuntoPlaza) => {
    const e = otros.current.get(id)
    if (!e) return
    if (Math.hypot(e.x - desde.x, e.y - desde.y) > 2.5) { e.x = desde.x; e.y = desde.y }
    const r = ruta(e, hasta, true)
    if (r.length) e.ruta = r
    else { e.x = hasta.x; e.y = hasta.y; e.ruta = [] }
  }, [])

  const recibirGesto = useCallback((de: string, frase: number) => {
    setGestos(g => ({ ...g, [de]: { frase, t: Date.now() } }))
    if (de !== perfil?.id) sfx.burbuja()
  }, [perfil?.id])

  // ---------- Conexión al canal de la plaza ----------
  useEffect(() => {
    limpiarTransicion()
    if (!perfil || !repo.salas || modo !== 'en_linea' || perfil.invitado) { setRed('solo'); return }
    let vivo = true, con: ConexionPlaza | null = null
    repo.salas.plaza({ id: perfil.id, clubId: perfil.club.id ?? '' }, { x: yo.current.x, y: yo.current.y }, {
      onPresentes: presentes,
      onIr: m => caminar(m.id, m.desde, m.hasta),
      onGesto: g => recibirGesto(g.de, g.frase),
    }).then(c => {
      if (!vivo) { void c.salir(); return }
      con = c; conexion.current = c; setCanal(c.canal); setRed('vivo')
    }).catch(() => { if (vivo) setRed('solo') })
    return () => { vivo = false; conexion.current = null; void con?.salir() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Usar cosas de la plaza ----------
  const reto = retoDelDia()
  const rachaObj = useProgreso(st => st.racha)
  const hechoHoy = rachaObj.ultimo === reto.fecha
  const completos = CAMPAMENTOS.filter(c => progresoCampamento(c, puntajes).estado === 'completo').length
  const listos = CAMPAMENTOS.filter(c => progresoCampamento(c, puntajes).estado !== 'pronto').length
  const usar = useCallback((ob: Objeto) => {
    sfx.click()
    switch (ob.tipo) {
      case 'barco': sfx.zas(); setZarpar(true); break
      case 'tablero': ir('ranking'); break
      case 'reto':
        if (hechoHoy) setAviso(`Ya cumpliste el reto de hoy (${reto.nivel.titulo}). Racha: ${rachaVigente(rachaObj)} días. ¡Vuelve mañana!`)
        else jugar(reto.nivel, true, 'medio', reto.semilla)
        break
      case 'carpa-club': ir('club'); break
      case 'escenario': setAviso('Aquí se harán los programas en vivo: cultos, predicaciones y presentaciones de los clubes. ¡Muy pronto!'); break
      case 'santuario': setAviso(abierto
        ? '¡Lo lograste! Completaste todos los campamentos: la fogata del Gran Campamento Conquistador está encendida para ti.'
        : `La fogata del Gran Campamento se enciende cuando completes todos los campamentos. Completaste ${completos} de ${listos} ${listos === 1 ? 'campamento abierto' : 'campamentos abiertos'}.`); break
      case 'letrero': setAviso('Toma el barco del muelle para viajar a los campamentos: Uniforme, Historia, Orden Cerrado, Clases, Organización y Emblemas.'); break
    }
  }, [abierto, completos, listos, hechoHoy, ir, jugar, reto, rachaObj])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6500); return () => clearTimeout(t) }, [aviso])

  // ---------- Bucle de animación: mover, cámara y profundidad ----------
  const pintar = useCallback((e: Ente) => {
    if (!e.el) return
    e.el.style.transform = `translate3d(${Math.round(e.x * B * s)}px, ${Math.round(e.y * B * s)}px, 0)`
    e.el.style.zIndex = String(Math.round(e.y * B) + 1)
    e.el.classList.toggle('camina', e.camina)
    if (e.cuerpo) e.cuerpo.style.transform = `scaleX(${e.mira})`
  }, [s])

  useEffect(() => {
    let raf = 0, ant = performance.now(), tCerca = 0, tTecla = 0, conTecla = false
    const avanzar = (e: Ente, dt: number) => {
      if (!e.ruta.length) { e.camina = false; return false }
      let paso = VEL * dt
      while (paso > 0 && e.ruta.length) {
        const t = e.ruta[0], dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy)
        if (Math.abs(dx) > 0.02) e.mira = dx < 0 ? -1 : 1
        if (d <= paso) { e.x = t.x; e.y = t.y; e.ruta.shift(); paso -= d }
        else { e.x += (dx / d) * paso; e.y += (dy / d) * paso; paso = 0 }
      }
      e.camina = true
      return !e.ruta.length
    }
    const bucle = (t: number) => {
      const dt = Math.min(0.1, (t - ant) / 1000); ant = t
      const y0 = yo.current
      // Flechas / WASD: caminar directo, chocando con lo que no se pisa
      const k = teclas.current
      const dx = (k.has('ArrowRight') || k.has('d') ? 1 : 0) - (k.has('ArrowLeft') || k.has('a') ? 1 : 0)
      const dy = (k.has('ArrowDown') || k.has('s') ? 1 : 0) - (k.has('ArrowUp') || k.has('w') ? 1 : 0)
      if (dx || dy) {
        const n = Math.hypot(dx, dy), vx = (dx / n) * VEL * dt, vy = (dy / n) * VEL * dt
        y0.ruta = []; usoPendiente.current = null
        if (transitable(Math.floor(y0.x + vx + Math.sign(vx) * 0.25), Math.floor(y0.y), abierto)) y0.x += vx
        if (transitable(Math.floor(y0.x), Math.floor(y0.y + vy + Math.sign(vy) * 0.1), abierto)) y0.y += vy
        if (dx) y0.mira = dx < 0 ? -1 : 1
        y0.camina = true; conTecla = true
        tTecla += dt
        if (tTecla > 0.25) { tTecla = 0; conexion.current?.ir({ x: y0.x, y: y0.y }, { x: y0.x + (dx / n) * 1.2, y: y0.y + (dy / n) * 1.2 }) }
      } else if (conTecla) {
        conTecla = false; y0.camina = false; tTecla = 1
        conexion.current?.ir({ x: y0.x, y: y0.y }, { x: y0.x, y: y0.y }); conexion.current?.quieto({ x: y0.x, y: y0.y })
      } else if (avanzar(y0, dt)) {
        // llegó a su destino
        conexion.current?.quieto({ x: y0.x, y: y0.y })
        marca.current?.classList.remove('on')
        const ob = usoPendiente.current
        usoPendiente.current = null
        if (ob?.uso && Math.hypot(ob.uso.x - y0.x, ob.uso.y - y0.y) < 1.7) usar(ob)
      }
      pintar(y0)
      for (const e of otros.current.values()) { avanzar(e, dt); pintar(e) }

      // Cámara: sigue a tu personaje con suavidad, sin salirse del mundo
      const c = cam.current, vw = vista.w / (B * s), vh = vista.h / (B * s)
      c.x += (y0.x - c.x) * Math.min(1, dt * 5); c.y += (y0.y - c.y) * Math.min(1, dt * 5)
      // margen de mar alrededor (arriba más, por el barco y la barra de arriba)
      const cx = vw >= ANCHO + 4 ? ANCHO / 2 : Math.min(ANCHO + 2 - vw / 2, Math.max(vw / 2 - 2, c.x))
      const cy = vh >= ALTO + 9 ? ALTO / 2 : Math.min(ALTO + 3 - vh / 2, Math.max(vh / 2 - 6, c.y + 1.5))
      c.ox = Math.round(vista.w / 2 - cx * B * s); c.oy = Math.round(vista.h / 2 - cy * B * s)
      const tr = `translate3d(${c.ox}px, ${c.oy}px, 0)`
      if (capa.current) capa.current.style.transform = tr
      if (capaLuz.current) capaLuz.current.style.transform = tr

      tCerca += dt
      if (tCerca > 0.2) { tCerca = 0; const ob = usableCerca(y0.x, y0.y); setCerca(p => (p === ob ? p : ob)) }
      raf = requestAnimationFrame(bucle)
    }
    raf = requestAnimationFrame(bucle)
    return () => cancelAnimationFrame(raf)
  }, [vista, s, abierto, pintar, usar])

  // Teclado (en PC)
  useEffect(() => {
    const valida = (k: string) => ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(k)
    const abajo = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.closest('.velo'))) return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (valida(k)) { teclas.current.add(k); e.preventDefault() }
      if ((k === 'Enter' || k === ' ' || k === 'e') && cerca && !(t?.tagName === 'BUTTON')) { e.preventDefault(); usar(cerca) }
    }
    const arriba = (e: KeyboardEvent) => teclas.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    const soltarTodo = () => teclas.current.clear()
    window.addEventListener('keydown', abajo); window.addEventListener('keyup', arriba); window.addEventListener('blur', soltarTodo)
    return () => { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); window.removeEventListener('blur', soltarTodo) }
  }, [cerca, usar])

  // Tocar el suelo: caminar hasta ahí (o hasta lo que tocaste, y usarlo al llegar)
  const tocar = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return
    const r = caja.current!.getBoundingClientRect(), c = cam.current
    const tx = (ev.clientX - r.left - c.ox) / (B * s), ty = (ev.clientY - r.top - c.oy) / (B * s)
    const ob = objetoEn(tx, ty)
    const destino = ob?.uso ?? { x: tx, y: ty }
    const camino = ruta(yo.current, destino, abierto)
    setElegido(null); setHablar(false)
    if (!camino.length) return
    usoPendiente.current = ob
    yo.current.ruta = camino
    const fin = camino[camino.length - 1]
    conexion.current?.ir({ x: yo.current.x, y: yo.current.y }, fin)
    if (marca.current) {
      marca.current.style.transform = `translate3d(${fin.x * B * s}px, ${fin.y * B * s}px, 0)`
      marca.current.classList.remove('on'); void marca.current.offsetWidth; marca.current.classList.add('on')
    }
  }

  const decir = (i: number) => {
    if (!perfil) return
    recibirGesto(perfil.id, i)
    void conexion.current?.gesto(i).catch(() => undefined)
    setHablar(false)
  }

  // Llegando en barco: la cámara baja sobre la plaza
  const flash = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (llegada?.tipo !== 'llegar' || menosMovimiento()) return
    capa.current?.parentElement?.animate([{ transform: 'scale(1.6)', filter: 'brightness(1.6)' }, { transform: 'none', filter: 'none' }], { duration: 900, easing: 'cubic-bezier(.16,.7,.2,1)' })
    flash.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Herramienta de prueba (solo en desarrollo): simular otros jugadores sin servidor
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__plaza = {
      agregar: (l: (JugadorEnLinea & { x: number; y: number })[]) => {
        for (const j of l) { perfiles.current.set(j.id, j); otros.current.set(j.id, { x: j.x, y: j.y, ruta: [], mira: 1, camina: false }) }
        actualizarLista()
      },
      ir: (id: string, x: number, y: number) => { const e = otros.current.get(id); if (e) caminar(id, e, { x, y }) },
      gesto: recibirGesto,
      yo: () => ({ x: yo.current.x, y: yo.current.y }),
    }
    return () => { delete w.__plaza }
  }, [actualizarLista, caminar, recibirGesto])

  if (!perfil) return null
  const lista = ids.map(id => perfiles.current.get(id)!).filter(Boolean)
  const ahora = Date.now()
  const globo = (id: string) => {
    const g = gestos[id]
    if (!g || ahora - g.t > VIDA_GLOBO) return null
    const f = FRASES[g.frase]
    return <span className={`plaza-globo ${/^\p{Extended_Pictographic}$/u.test(f) ? 'emoji' : ''}`} key={g.t}>{f}</span>
  }
  const altoPj = 30 * s
  const total = Object.values(puntajes).reduce((a, b) => a + b, 0)

  return (
    <div className="pantalla plaza">
      <div className="plaza-vista" ref={caja} onPointerDown={tocar} aria-label="Plaza Central. Toca el suelo para caminar.">
        <div className="plaza-zoom">
          <div className="plaza-capa" ref={capa} style={{ width: ANCHO * B * s, height: ALTO * B * s }}>
            <canvas ref={suelo0} className="plaza-suelo" style={{ width: ANCHO * B * s, height: ALTO * B * s }} aria-hidden />
            <canvas ref={suelo1} className="plaza-suelo isla-ola" style={{ width: ANCHO * B * s, height: ALTO * B * s }} aria-hidden />
            {sprites.map(({ ob, sp }, i) => <SpriteObjeto key={`${ob.tipo}-${i}-${abierto}`} sp={sp} s={s} />)}
            <div className="plaza-marca" ref={marca} aria-hidden />
            {lista.map(j => (
              <button key={j.id} className="plaza-pj" ref={el => { const e = otros.current.get(j.id); if (e) { e.el = el; e.cuerpo = el?.querySelector('.plaza-cuerpo') as HTMLElement | null; pintar(e) } }}
                onPointerDown={e => e.stopPropagation()} onClick={() => { sfx.click(); setElegido(j); setHablar(false); setAviso(null) }} aria-label={`${j.apodo}, de ${j.club}`}>
                <span className="plaza-pj-dentro">
                  {globo(j.id)}
                  <span className="plaza-nombre">{j.apodo}</span>
                  <span className="plaza-cuerpo"><PixelAvatar a={j.avatar ?? {}} rango={j.rango} animo={gestos[j.id] && ahora - gestos[j.id].t < VIDA_GLOBO ? 'saluda' : 'idle'} alto={altoPj} /></span>
                  <i className="plaza-sombra" />
                </span>
              </button>
            ))}
            <div className="plaza-pj yo" ref={el => { yo.current.el = el; yo.current.cuerpo = el?.querySelector('.plaza-cuerpo') as HTMLElement | null; pintar(yo.current) }}>
              <span className="plaza-pj-dentro">
                {globo(perfil.id)}
                <span className="plaza-nombre">Tú</span>
                <span className="plaza-cuerpo"><PixelAvatar a={perfil.avatar} rango={perfil.rango} animo={gestos[perfil.id] && ahora - gestos[perfil.id].t < VIDA_GLOBO ? 'saluda' : 'idle'} alto={altoPj} /></span>
                <i className="plaza-sombra" />
              </span>
            </div>
          </div>
        </div>
        {/* Noche: oscurece todo y los faroles, la fogata y el escenario alumbran */}
        <div className="plaza-noche" style={{ opacity: luz.oscuridad }} aria-hidden />
        <div className="plaza-dorado" style={{ opacity: luz.dorado }} aria-hidden />
        <div className="plaza-capa plaza-luces" ref={capaLuz} style={{ width: ANCHO * B * s, height: ALTO * B * s, opacity: luz.faroles ? 1 : 0 }} aria-hidden>
          {luces.map((l, i) => <i key={i} className={l.calida ? 'calida' : ''} style={{ left: l.x * B * s, top: l.y * B * s, width: l.r * 2 * B * s, height: l.r * 2 * B * s }} />)}
        </div>
      </div>
      <div className="mundo-flash" ref={flash} style={{ opacity: llegada?.tipo === 'llegar' && !menosMovimiento() ? 1 : 0 }} aria-hidden />

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
      <MenuPrincipal abierto={menu} onCerrar={() => setMenu(false)} onCampamentos={() => setZarpar(true)} />

      <div className="plaza-titulo">
        <h1>Plaza Central</h1>
        <p>{red === 'vivo' ? <><i className="en-vivo-punto" aria-hidden />Canal {canal} · {lista.length + 1} {lista.length === 0 ? 'conquistador' : 'conquistadores'} aquí</>
          : red === 'conectando' ? 'Conectando con los demás clubes…' : modo === 'practica' ? 'Modo práctica: recorres la plaza tú solo' : 'Sin conexión: recorres la plaza tú solo'}
          {luz.fase === 'noche' ? ' · 🌙' : luz.fase === 'atardecer' ? ' · 🌇' : luz.fase === 'amanecer' ? ' · 🌅' : ''}</p>
      </div>

      {aviso && <div className="plaza-aviso pop" role="status" onClick={() => setAviso(null)}>{aviso}</div>}

      {elegido && (
        <div className="plaza-ficha pop" role="dialog" aria-label={`${elegido.apodo}, de ${elegido.club}`}>
          <PixelAvatar a={elegido.avatar ?? {}} rango={elegido.rango} animo="saluda" alto={84} />
          <div><b>{elegido.apodo}</b><small>{RANGO_TXT[elegido.rango]} · {elegido.club}</small></div>
          <div className="fila-botones">
            <Boton tipo="fantasma" onClick={() => setElegido(null)}>Cerrar</Boton>
            {presencia && <Boton tipo="rojo" onClick={() => { setRivales([elegido]); setElegido(null) }}>Retar</Boton>}
          </div>
        </div>
      )}

      {hablar && red === 'vivo' && <div className="plaza-frases pop"><BarraFrases onEnviar={decir} /></div>}

      <nav className="plaza-acciones">
        {red === 'vivo' && <button className={`btn-hablar ${hablar ? 'on' : ''}`} onClick={() => setHablar(h => !h)} aria-expanded={hablar} aria-label="Decir algo">💬<span>Decir</span></button>}
        {cerca
          ? <Boton onClick={() => usar(cerca)}>{ACCION[cerca.tipo]}</Boton>
          : <span className="plaza-pista">Toca el suelo para caminar</span>}
        <button className="btn-brujula" onClick={() => { sfx.zas(); setZarpar(true) }} aria-label="Ir a los campamentos en barco">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden><circle cx="16" cy="16" r="13" fill="#FFF7DF" stroke="#1E140C" strokeWidth="2.5" /><path d="M16 5l4 11h-8z" fill="#D7242F" /><path d="M16 27l-4-11h8z" fill="#1F5FD1" /><circle cx="16" cy="16" r="2" fill="#1E140C" /></svg>
          <span>Campamentos</span>
        </button>
      </nav>

      {rivales.length > 0 && <DialogoReto rivales={rivales} setRivales={setRivales} libres={lista} onCerrar={() => setRivales([])} />}

      {zarpar && <Travesia texto="Zarpando de la" destino="Plaza Central" color="#F2B90F"
        onFin={() => { marcarTransicion({ tipo: 'alejar', desde: CAMPAMENTO_CENTRAL.id }); ir('campamentos') }} />}
    </div>
  )
}

/** Un objeto alto de la plaza (pino, carpa, farol…) en su propio lienzo, ordenado por profundidad. */
function SpriteObjeto({ sp, s }: { sp: Sprite; s: number }) {
  const a = useRef<HTMLCanvasElement>(null), b = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    for (const [ref, f] of [[a, 0], [b, 1]] as const) {
      const cv = ref.current
      if (!cv) continue
      cv.width = sp.w; cv.height = sp.h
      pintarSprite(cv.getContext('2d')!, sp, f)
    }
  }, [sp])
  const estilo = { left: sp.x * s, top: sp.y * s, width: sp.w * s, height: sp.h * s, zIndex: sp.pie }
  return (
    <>
      <canvas ref={a} className={`plaza-sprite ${sp.animado ? 'ola-inversa' : ''}`} style={estilo} aria-hidden />
      {sp.animado && <canvas ref={b} className="plaza-sprite isla-ola" style={estilo} aria-hidden />}
    </>
  )
}
