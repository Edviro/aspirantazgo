import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FRASES, type Bolsa, type ConexionPlaza, type PerfilPublico, type PresenteEnPlaza, type ProgramaVivo, type PuntoPlaza } from '../../application/puertos'
import { CAMPAMENTO_CENTRAL, CAMPAMENTOS, centralAbierto, progresoCampamento } from '../../domain/campamentos'
import { rachaVigente, retoDelDia } from '../../domain/diario'
import {
  ALTO, ANCHO, OBJETOS, PARCELAS, MUELLE, SALIDA, alturaBanderas, asignar, ceremoniaAhora, esSabado, formacion, horaLima, luzDelDia,
  objetoEn, ruta, transitable, usableCerca, zonaDe, type Campista, type Objeto, type Zona,
} from '../../domain/plaza'
import { Boton } from '../componentes/Comunes'
import { MenuPrincipal } from '../componentes/MenuPrincipal'
import { BarraFrases, DialogoReto } from '../componentes/Retar'
import { Travesia } from '../componentes/Travesia'
import { HudVidas } from '../componentes/Vidas'
import { FichaCarpa, FichaJugador, RANGO_TXT } from '../componentes/plaza/Fichas'
import { Bandera } from '../componentes/plaza/Iconos'
import { Moneda, Tienda } from '../componentes/plaza/Tienda'
import { Culto } from '../componentes/plaza/Culto'
import { TableroRetos } from '../componentes/plaza/TableroRetos'
import { useJuego } from '../estado'
import { musica } from '../musica'
import { B, dibujarSuelo, lucesDeNoche, pintarSprite, spriteDe, type ExtraSprite, type Sprite } from '../pixel/plazaPixel'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { useProgreso } from '../progreso'
import { sfx } from '../sonido'
import { limpiarTransicion, marcarTransicion, menosMovimiento, verTransicion } from '../transicion'

const VEL = 3.6 // baldosas por segundo
const VIDA_GLOBO = 4500
const COLORES_CLUB = ['#D7242F', '#1F5FD1', '#1E9A4B', '#E8771E', '#7A1F3D', '#0E8C8C', '#5B3FA8', '#B07A3A', '#E25C8A', '#2C3E50', '#C98F00']
const colorDeClub = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORES_CLUB[h % COLORES_CLUB.length] }
const VENDEDORES = [
  { nombre: 'Don Lucho', a: { genero: 'm' as const, piel: 3, pelo: 2, colorPelo: 4 }, x: 39.3, y: 27.55 },
  { nombre: 'Tía Rosa', a: { genero: 'f' as const, piel: 2, pelo: 1, colorPelo: 1 }, x: 41.1, y: 27.55 },
]

interface Ente { x: number; y: number; ruta: PuntoPlaza[]; mira: 1 | -1; camina: boolean; el?: HTMLElement | null; cuerpo?: HTMLElement | null }

const ACCION: Record<string, string> = {
  barco: '⛵ Subir al barco', tablero: '🏆 Torneos y tablero de honor', reto: '⭐ Reto del día', tienda: '🛍️ Tienda de parches y pines',
  escenario: '🎤 Escenario', santuario: '🔥 Gran fogata', letrero: '🪧 Leer el letrero', consejo: '🔥 Fuego del Consejo',
  portada: '⛺ Portada del campamento', 'carpa-p': '⛺ Ver la carpa',
}

const dev = () => (import.meta.env.DEV ? (window as unknown as { __hora?: number; __sabado?: boolean }) : {})
/** Hora para el día, la noche y las ceremonias (en desarrollo se puede forzar con window.__hora). */
const horaActual = () => { const f = dev().__hora; return typeof f === 'number' ? f : horaLima() }
const sabadoAhora = () => { const f = dev().__sabado; return typeof f === 'boolean' ? f : esSabado() }

/**
 * Gran Campamento: el mundo abierto donde se encuentran los conquistadores de todos los clubes.
 * Caminas tocando el suelo (o con las flechas), ves a los de tu canal, tu club tiene su parcela con portada, banderas
 * y carpas; hay tienda, Fuego del Consejo, escenario, día y noche, izamiento y arriamiento, y el sábado es de culto.
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

  // ---------- Hora: día y noche, ceremonias y sábado ----------
  const [hora, setHora] = useState(horaActual)
  const [sabado, setSabado] = useState(sabadoAhora)
  useEffect(() => {
    const t = setInterval(() => {
      const h = horaActual()
      // cada segundo cerca de las ceremonias (para que las banderas suban suave); si no, cada 30 s
      setHora(prev => (ceremoniaAhora(h) || ceremoniaAhora(prev) || Math.abs(h - prev) > 0.008 ? h : prev))
      setSabado(sabadoAhora())
    }, 1000)
    return () => clearInterval(t)
  }, [])
  const luz = luzDelDia(hora)
  const cer = ceremoniaAhora(hora)
  const altura = alturaBanderas(hora)

  // ---------- Suelo ----------
  const suelo0 = useRef<HTMLCanvasElement>(null), suelo1 = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    for (const [ref, f] of [[suelo0, 0], [suelo1, 1]] as const) {
      const cv = ref.current
      if (!cv) continue
      cv.width = ANCHO * B; cv.height = ALTO * B
      dibujarSuelo(cv.getContext('2d')!, f, abierto)
    }
  }, [abierto])

  // ---------- Entidades: tú y los demás ----------
  const [llegada] = useState(() => verTransicion())
  const yo = useRef<Ente>({ ...(llegada?.tipo === 'llegar' ? MUELLE : SALIDA), ruta: [], mira: 1, camina: false })
  const otros = useRef(new Map<string, Ente>())
  const perfiles = useRef(new Map<string, PerfilPublico>())
  const tiempos = useRef(new Map<string, { t: number; cer: boolean }>())
  const rechazados = useRef(new Set<string>())
  const [ids, setIds] = useState<string[]>([])
  const [ver, setVer] = useState(0)
  const conexion = useRef<ConexionPlaza | null>(null)
  const [canal, setCanal] = useState<number | null>(null)
  const [miLlegada, setMiLlegada] = useState(0)
  const [red, setRed] = useState<'conectando' | 'vivo' | 'solo'>('conectando')
  const [gestos, setGestos] = useState<Record<string, { frase: number; t: number }>>({})
  const [cerca, setCerca] = useState<Objeto | null>(null)
  const [zona, setZona] = useState<Zona>({ tipo: 'plaza' })
  const [aviso, setAviso] = useState<string | null>(null)
  const [elegido, setElegido] = useState<PerfilPublico | null>(null)
  const [carpaVista, setCarpaVista] = useState<Objeto | null>(null)
  const [rivales, setRivales] = useState<PerfilPublico[]>([])
  const [zarpar, setZarpar] = useState(false)
  const [menu, setMenu] = useState(false)
  const [hablar, setHablar] = useState(false)
  const [tienda, setTienda] = useState(false)
  const [bolsa, setBolsa] = useState<Bolsa | null>(null)
  const [formado, setFormado] = useState(false)
  const [rechazoCer, setRechazoCer] = useState<string | null>(null)
  const [culto, setCulto] = useState(false)
  const [tablero, setTablero] = useState(false)
  const [programa, setPrograma] = useState<ProgramaVivo | null>(null)
  const cultoAbierto = useRef(false)
  cultoAbierto.current = culto
  const marca = useRef<HTMLDivElement>(null)
  const usoPendiente = useRef<Objeto | null>(null)
  const teclas = useRef(new Set<string>())
  const cam = useRef({ x: yo.current.x, y: yo.current.y, ox: 0, oy: 0 })
  const colocado = useRef(llegada?.tipo === 'llegar')
  const miClub = perfil?.club.id ?? 'mi-club'

  useEffect(() => { repo.bolsa?.().then(setBolsa).catch(() => undefined) }, [repo])
  // ¿Hay un programa en vivo en el escenario? (se revisa cada minuto)
  useEffect(() => {
    if (!repo.culto) return
    const ver = () => { repo.culto!.actual().then(setPrograma).catch(() => undefined) }
    ver()
    const t = setInterval(ver, 60000)
    return () => clearInterval(t)
  }, [repo])

  const actualizarLista = useCallback(() => {
    const l = [...otros.current.keys()].filter(id => perfiles.current.has(id)).slice(0, 60)
    setIds(prev => (prev.length === l.length && prev.every((v, i) => v === l[i]) ? prev : l))
  }, [])

  // Pide (en lote) los nombres, clubes y logros verdaderos de quienes aparecen: vienen de la base de datos, no del canal
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
        actualizarLista(); setVer(v => v + 1)
      } catch { /* se reintenta con el próximo cambio */ }
    }, 250)
  }, [repo.salas, actualizarLista])

  const presentes = useCallback((lista: PresenteEnPlaza[]) => {
    const vistos = new Set<string>()
    for (const p of lista) {
      vistos.add(p.id)
      tiempos.current.set(p.id, { t: p.t, cer: p.cer })
      const e = otros.current.get(p.id)
      if (!e) otros.current.set(p.id, { x: p.x, y: p.y, ruta: [], mira: 1, camina: false })
      else if (!e.ruta.length && Math.hypot(e.x - p.x, e.y - p.y) > 1.5) { e.x = p.x; e.y = p.y }
    }
    for (const id of [...otros.current.keys()]) if (!vistos.has(id)) { otros.current.delete(id); tiempos.current.delete(id) }
    resolver(); actualizarLista(); setVer(v => v + 1)
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

  // ---------- Conexión al canal ----------
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
      con = c; conexion.current = c; setCanal(c.canal); setMiLlegada(c.llegada); setRed('vivo')
    }).catch(() => { if (vivo) setRed('solo') })
    return () => { vivo = false; conexion.current = null; void con?.salir() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Campamentos de los clubes: parcelas por orden de llegada y carpas por sexo ----------
  const asignacion = useMemo(() => {
    if (!perfil) return asignar([])
    const campistas: Campista[] = [{ id: perfil.id, clubId: miClub, t: miLlegada, genero: perfil.avatar.genero === 'f' ? 'f' : 'm' }]
    for (const id of ids) {
      const j = perfiles.current.get(id)
      if (!j) continue
      campistas.push({ id, clubId: j.clubId, t: tiempos.current.get(id)?.t ?? Date.now(), genero: j.avatar?.genero === 'f' ? 'f' : 'm' })
    }
    return asignar(campistas)
  }, [ids, ver, miLlegada, perfil, miClub])
  const clubDeParcela = useMemo(() => {
    const m = new Map<number, { id: string; nombre: string; pais?: string | null; bandera?: string | null; color: string }>()
    for (const [clubId, i] of asignacion.parcelas) {
      const mio = clubId === miClub
      const alguien = mio ? null : [...perfiles.current.values()].find(j => j.clubId === clubId)
      m.set(i, mio
        ? { id: clubId, nombre: perfil?.club.nombre ?? 'Mi club', pais: perfil?.club.pais, bandera: perfil?.club.bandera, color: colorDeClub(clubId) }
        : { id: clubId, nombre: alguien?.club ?? 'Club', pais: alguien?.pais, bandera: alguien?.bandera, color: colorDeClub(clubId) })
    }
    return m
  }, [asignacion, miClub, perfil])
  const miParcela = asignacion.parcelas.get(miClub)

  // Al entrar (sin barco) apareces en tu campamento, frente a tu carpa
  useEffect(() => {
    if (colocado.current || red === 'conectando' || !perfil) return
    colocado.current = true
    const c = asignacion.carpas.get(perfil.id)
    const carpa = c && OBJETOS.find(o => o.tipo === 'carpa-p' && o.parcela === c.parcela && o.sexo === c.sexo && o.slot === c.slot)
    const p = carpa?.uso ?? (miParcela !== undefined ? PARCELAS[miParcela].patio : null)
    if (!p) return
    Object.assign(yo.current, { x: p.x, y: p.y, ruta: [] })
    Object.assign(cam.current, { x: p.x, y: p.y })
    conexion.current?.quieto(p)
  }, [red, asignacion, miParcela, perfil])

  // ---------- Sprites (se reutilizan si no cambian) ----------
  const cacheSprites = useRef(new Map<string, Sprite>())
  const sprites = useMemo(() => {
    const ocupadas = new Set<string>()
    for (const c of asignacion.carpas.values()) ocupadas.add(`${c.parcela}-${c.sexo}-${c.slot}`)
    const lista: { clave: string; sp: Sprite }[] = []
    OBJETOS.forEach((ob, i) => {
      const club = ob.parcela !== undefined ? clubDeParcela.get(ob.parcela) : undefined
      if (ob.tipo === 'asta' && ob.slot === 2 && !club?.bandera) return // tercera asta solo si el club tiene bandera
      const extra: ExtraSprite = { sabado }
      if (ob.parcela !== undefined) { extra.color = club?.color; extra.ocupada = ob.tipo === 'carpa-p' ? ocupadas.has(`${ob.parcela}-${ob.sexo}-${ob.slot}`) : !!club }
      const clave = `${i}|${abierto}|${extra.color ?? ''}|${extra.ocupada ?? ''}|${(ob.tipo === 'reto' || ob.tipo === 'tienda' || ob.tipo === 'escenario') && sabado}`
      let sp = cacheSprites.current.get(clave)
      if (!sp) { const nuevo = spriteDe(ob, abierto, extra); if (!nuevo) return; sp = nuevo; cacheSprites.current.set(clave, sp) }
      lista.push({ clave, sp })
    })
    return lista
  }, [asignacion, clubDeParcela, abierto, sabado])
  const luces = useMemo(() => lucesDeNoche(OBJETOS), [])

  // ---------- Ceremonia de banderas ----------
  const miembrosFormados = useMemo(() => {
    if (!perfil || miParcela === undefined) return null
    const lista = [...ids].map(id => perfiles.current.get(id)!).filter(j => j && j.clubId === miClub && tiempos.current.get(j.id)?.cer)
      .map(j => ({ id: j.id, sexo: (j.avatar?.genero === 'f' ? 'f' : 'm') as 'm' | 'f', lider: j.rango !== 'conquistador', t: tiempos.current.get(j.id)!.t }))
    if (formado) lista.push({ id: perfil.id, sexo: perfil.avatar.genero === 'f' ? 'f' : 'm', lider: perfil.rango !== 'conquistador', t: miLlegada })
    return formacion(PARCELAS[miParcela], lista)
  }, [ids, ver, formado, perfil, miParcela, miClub, miLlegada])
  // Ir (o volver) al lugar de la formación; los demás formados de tu club también se ordenan
  useEffect(() => {
    if (!miembrosFormados || !perfil) return
    for (const [id, pos] of miembrosFormados) {
      if (id === perfil.id) {
        if (Math.hypot(yo.current.x - pos.x, yo.current.y - pos.y) > 0.3) {
          const r = ruta(yo.current, pos, abierto)
          yo.current.ruta = r.length ? [...r.slice(0, -1), pos] : [pos]
          conexion.current?.ir({ x: yo.current.x, y: yo.current.y }, pos)
        }
      } else {
        const e = otros.current.get(id)
        if (e && !e.ruta.length && Math.hypot(e.x - pos.x, e.y - pos.y) > 0.3) { const r = ruta(e, pos, true); e.ruta = r.length ? [...r.slice(0, -1), pos] : [pos] }
      }
    }
  }, [miembrosFormados, perfil, abierto])
  // Termina la ceremonia: se rompe filas
  useEffect(() => {
    if (!cer && formado) { setFormado(false); conexion.current?.formar(false) }
    if (cer?.fase === 'en_curso' && cer.minutos < 0.02 && formado) sfx.trompeta()
  }, [cer?.fase, formado]) // eslint-disable-line react-hooks/exhaustive-deps
  const formarme = () => { setFormado(true); conexion.current?.formar(true); sfx.aviso(); setAviso(null) }
  const romperFilas = () => { if (formado) { setFormado(false); conexion.current?.formar(false) } }

  // ---------- Usar cosas del campamento ----------
  const reto = retoDelDia()
  const rachaObj = useProgreso(st => st.racha)
  const hechoHoy = rachaObj.ultimo === reto.fecha
  const completos = CAMPAMENTOS.filter(c => progresoCampamento(c, puntajes).estado === 'completo').length
  const listos = CAMPAMENTOS.filter(c => progresoCampamento(c, puntajes).estado !== 'pronto').length
  const usar = useCallback((ob: Objeto) => {
    sfx.click()
    switch (ob.tipo) {
      case 'barco': sfx.zas(); setZarpar(true); break
      case 'tablero': setTablero(true); break
      case 'reto':
        if (sabado) setAviso('Feliz sábado: los desafíos descansan hasta el sábado a las 6 p. m. ¡Te esperamos en el culto!')
        else if (hechoHoy) setAviso(`Ya cumpliste el reto de hoy (${reto.nivel.titulo}). Racha: ${rachaVigente(rachaObj)} días. ¡Vuelve mañana!`)
        else jugar(reto.nivel, true, 'medio', reto.semilla)
        break
      case 'tienda':
        if (sabado) setAviso('La tienda está cerrada por ser sábado. Abre el sábado a las 6 p. m.')
        else setTienda(true)
        break
      case 'escenario': entrarCulto(); break
      case 'santuario': setAviso(abierto
        ? '¡Lo lograste! Completaste todos los campamentos: la gran fogata del Gran Campamento es tuya.'
        : `La gran fogata es el corazón del Gran Campamento. Su puerta se abre cuando completes todos los campamentos (llevas ${completos} de ${listos}).`); break
      case 'consejo': setAviso('Fuego del Consejo: aquí se reúnen todos los clubes alrededor del fuego para historias, alabanzas y reconocimientos.'); break
      case 'letrero': setAviso('Toma el barco del muelle para ir a los campamentos de desafíos: Uniforme, Historia, Orden Cerrado, Clases, Organización y Emblemas.'); break
      case 'portada': {
        const club = ob.parcela !== undefined ? clubDeParcela.get(ob.parcela) : undefined
        const n = club ? [...asignacion.carpas.values()].filter(c => c.parcela === ob.parcela).length : 0
        setAviso(club
          ? `Campamento del club ${club.nombre}: ${n} ${n === 1 ? 'acampando' : 'acampando'}. Las banderas se izan a las 7:00 y se arrían a las 19:00.`
          : 'Parcela libre: aquí acampará el próximo club que llegue.')
        break
      }
      case 'carpa-p': setCarpaVista(ob); break
    }
  }, [abierto, completos, listos, hechoHoy, ir, jugar, reto, rachaObj, sabado, clubDeParcela, asignacion, s]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Cámara al escenario: baja desde la vista aérea hasta quedar de frente (como en los juegos de fútbol) ----------
  const ESC = OBJETOS.find(o => o.tipo === 'escenario')!
  function entrarCulto() {
    romperFilas(); setAviso(null); setElegido(null); setHablar(false)
    const z = capa.current?.parentElement
    if (!z || menosMovimiento()) { setCulto(true); return }
    const c = cam.current
    z.style.transformOrigin = `${(ESC.x + ESC.w / 2) * B * s + c.ox}px ${(ESC.y - 1) * B * s + c.oy}px`
    sfx.zas()
    const an = z.animate([{ transform: 'none', filter: 'none' }, { transform: 'scale(2.6)', filter: 'brightness(1.25) blur(1px)' }], { duration: 620, easing: 'cubic-bezier(.55,0,.75,.35)', fill: 'forwards' })
    an.onfinish = () => { setCulto(true); requestAnimationFrame(() => an.cancel()) }
  }
  const salirCulto = () => {
    setCulto(false)
    const z = capa.current?.parentElement
    if (!z || menosMovimiento()) return
    z.animate([{ transform: 'scale(2.6)', filter: 'brightness(1.25)' }, { transform: 'none', filter: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)' })
  }
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t) }, [aviso])

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
        conexion.current?.quieto({ x: y0.x, y: y0.y })
        marca.current?.classList.remove('on')
        const ob = usoPendiente.current
        usoPendiente.current = null
        if (ob?.uso && Math.hypot(ob.uso.x - y0.x, ob.uso.y - y0.y) < 1.7) usar(ob)
      }
      pintar(y0)
      for (const e of otros.current.values()) { avanzar(e, dt); pintar(e) }

      // Cámara: sigue a tu personaje con suavidad, con un margen de mar alrededor
      const c = cam.current, vw = vista.w / (B * s), vh = vista.h / (B * s)
      c.x += (y0.x - c.x) * Math.min(1, dt * 5); c.y += (y0.y - c.y) * Math.min(1, dt * 5)
      const cx = vw >= ANCHO + 4 ? ANCHO / 2 : Math.min(ANCHO + 2 - vw / 2, Math.max(vw / 2 - 2, c.x))
      const cy = vh >= ALTO + 9 ? ALTO / 2 : Math.min(ALTO + 3 - vh / 2, Math.max(vh / 2 - 6, c.y + 1.5))
      c.ox = Math.round(vista.w / 2 - cx * B * s); c.oy = Math.round(vista.h / 2 - cy * B * s)
      const tr = `translate3d(${c.ox}px, ${c.oy}px, 0)`
      if (capa.current) capa.current.style.transform = tr
      if (capaLuz.current) capaLuz.current.style.transform = tr

      tCerca += dt
      if (tCerca > 0.25) {
        tCerca = 0
        const ob = usableCerca(y0.x, y0.y); setCerca(p => (p === ob ? p : ob))
        const z = zonaDe(y0.x, y0.y); setZona(p => (p.tipo === z.tipo && (p.tipo !== 'parcela' || (z.tipo === 'parcela' && p.parcela === z.parcela)) ? p : z))
      }
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
      if (cultoAbierto.current || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.closest('.velo')))) return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (valida(k)) { teclas.current.add(k); e.preventDefault(); romperFilas() }
      if ((k === 'Enter' || k === ' ' || k === 'e') && cerca && !(t?.tagName === 'BUTTON')) { e.preventDefault(); usar(cerca) }
    }
    const arriba = (e: KeyboardEvent) => teclas.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    const soltarTodo = () => teclas.current.clear()
    window.addEventListener('keydown', abajo); window.addEventListener('keyup', arriba); window.addEventListener('blur', soltarTodo)
    return () => { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); window.removeEventListener('blur', soltarTodo) }
  }, [cerca, usar]) // eslint-disable-line react-hooks/exhaustive-deps

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
    romperFilas()
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

  // Llegando en barco: la cámara baja sobre el muelle
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
      agregar: (l: (PerfilPublico & { x: number; y: number; t?: number; cer?: boolean })[]) => {
        for (const j of l) {
          perfiles.current.set(j.id, j); tiempos.current.set(j.id, { t: j.t ?? Date.now(), cer: !!j.cer })
          otros.current.set(j.id, { x: j.x, y: j.y, ruta: [], mira: 1, camina: false })
        }
        actualizarLista(); setVer(v => v + 1)
      },
      formar: (id: string, si: boolean) => { const t = tiempos.current.get(id); if (t) { t.cer = si; setVer(v => v + 1) } },
      ir: (id: string, x: number, y: number) => { const e = otros.current.get(id); if (e) caminar(id, e, { x, y }) },
      gesto: recibirGesto,
      yo: () => ({ x: yo.current.x, y: yo.current.y }),
      teletransportar: (x: number, y: number) => { Object.assign(yo.current, { x, y, ruta: [] }); Object.assign(cam.current, { x, y }) },
      asignacion: () => ({ parcelas: [...asignacion.parcelas], carpas: [...asignacion.carpas] }),
      programa: (p: ProgramaVivo | null) => setPrograma(p),
    }
    return () => { delete w.__plaza }
  }, [actualizarLista, caminar, recibirGesto, asignacion])

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
  const nombreZona = (z: Zona) => z.tipo === 'parcela' ? (clubDeParcela.get(z.parcela) ? `Campamento de ${clubDeParcela.get(z.parcela)!.nombre}` : 'Parcela libre')
    : z.tipo === 'plaza' ? 'Plaza Central' : z.tipo === 'consejo' ? 'Fuego del Consejo' : z.tipo === 'muelle' ? 'Muelle' : 'Gran Campamento'
  const zonaDeOtro = (id: string) => { const e = otros.current.get(id); return e ? nombreZona(zonaDe(e.x, e.y)) : 'Gran Campamento' }
  const yoPublico: PerfilPublico & { yo: boolean } = {
    id: perfil.id, apodo: perfil.apodo, rango: perfil.rango, avatar: perfil.avatar, club: perfil.club.nombre, clubId: miClub, pais: perfil.club.pais,
    aprobados: Object.values(puntajes).filter(p => p >= 400).length, pines: bolsa?.items ?? [], yo: true,
  }
  const ocupantesDe = (ob: Objeto) => [...asignacion.carpas.entries()]
    .filter(([, c]) => c.parcela === ob.parcela && c.sexo === ob.sexo && c.slot === ob.slot)
    .map(([id]) => (id === perfil.id ? yoPublico : perfiles.current.get(id)))
    .filter((x): x is PerfilPublico => !!x)
  const invitar = cer && cer.fase !== 'final' && miParcela !== undefined && !formado && rechazoCer !== `${cer.tipo}-${Math.floor(hora)}`
  const invitarVisible = !!invitar

  return (
    <div className="pantalla plaza">
      <div className="plaza-vista" ref={caja} onPointerDown={tocar} aria-label="Gran Campamento. Toca el suelo para caminar.">
        <div className="plaza-zoom">
          <div className="plaza-capa" ref={capa} style={{ width: ANCHO * B * s, height: ALTO * B * s }}>
            <canvas ref={suelo0} className="plaza-suelo" style={{ width: ANCHO * B * s, height: ALTO * B * s }} aria-hidden />
            <canvas ref={suelo1} className="plaza-suelo isla-ola" style={{ width: ANCHO * B * s, height: ALTO * B * s }} aria-hidden />
            {sprites.map(({ clave, sp }) => <SpriteObjeto key={clave} sp={sp} s={s} />)}
            {/* Banderas de cada campamento: país, Conquistadores y (si tiene) la del club. Suben a las 7:00 y bajan a las 19:00. */}
            {[...clubDeParcela.entries()].map(([i, club]) => OBJETOS.filter(o => o.tipo === 'asta' && o.parcela === i && (o.slot! < 2 || club.bandera)).map(o => (
              <div key={`b-${i}-${o.slot}`} className="plaza-bandera" style={{ left: (o.x * B + 9) * s, top: (o.y * B - 36 + (1 - altura) * 32) * s, zIndex: o.y * B + B + 1 }}>
                <Bandera tipo={o.slot === 0 ? 'pais' : o.slot === 1 ? 'conquis' : 'club'} pais={club.pais} bandera={club.bandera} alto={10 * s} />
              </div>
            )))}
            {/* Nombre del club en cada portada */}
            {OBJETOS.filter(o => o.tipo === 'portada').map(o => {
              const club = clubDeParcela.get(o.parcela!)
              return <span key={`p-${o.parcela}`} className={`plaza-portada ${club ? '' : 'libre'}`} style={{ left: (o.x * B + 8) * s, top: (o.y * B + 6) * s, zIndex: o.y * B + o.h * B + 2, ['--c' as string]: club?.color ?? '#8d8d86' }}>{club ? club.nombre : 'Libre'}</span>
            })}
            {VENDEDORES.map(v => (
              <div key={v.nombre} className="plaza-pj vendedor" style={{ transform: `translate3d(${v.x * B * s}px, ${v.y * B * s}px, 0)`, zIndex: 27 * B }} aria-hidden>
                <span className="plaza-pj-dentro"><span className="plaza-cuerpo"><PixelAvatar a={v.a} rango="lider" animo="idle" alto={altoPj} /></span></span>
              </div>
            ))}
            {programa?.estado === 'en_vivo' && <span className="plaza-envivo" style={{ left: (ESC.x + ESC.w / 2) * B * s, top: (ESC.y * B - 34) * s, zIndex: ESC.y * B + ESC.h * B + 3 }}><i className="en-vivo-punto" aria-hidden />EN VIVO</span>}
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
        <div className="plaza-noche" style={{ opacity: luz.oscuridad }} aria-hidden />
        <div className="plaza-dorado" style={{ opacity: luz.dorado }} aria-hidden />
        <div className="plaza-capa plaza-luces" ref={capaLuz} style={{ width: ANCHO * B * s, height: ALTO * B * s, opacity: luz.faroles ? 1 : 0 }} aria-hidden>
          {luces.map((l, i) => <i key={i} className={l.calida ? 'calida' : ''} style={{ left: l.x * B * s, top: l.y * B * s, width: l.r * 2 * B * s, height: l.r * 2 * B * s }} />)}
        </div>
      </div>
      <div className="mundo-flash" ref={flash} style={{ opacity: llegada?.tipo === 'llegar' && !menosMovimiento() ? 1 : 0 }} aria-hidden />

      <header className="hud">
        <button className="hud-perfil" onClick={() => ir('editor')} aria-label="Ver mi personaje">
          <span className="hud-avatar">{perfil.apodo.slice(0, 1).toUpperCase()}</span>
          <span className="hud-txt"><b>{perfil.apodo}</b><small>{RANGO_TXT[perfil.rango]}, {perfil.club.nombre}</small></span>
        </button>
        <HudVidas />
        {bolsa ? <button className="hud-puntos hud-monedas" onClick={() => (sabado ? setAviso('La tienda está cerrada por ser sábado.') : setTienda(true))} title="ConquisCoins"><Moneda n={bolsa.saldo} /></button>
          : <div className="hud-puntos" title="Puntos totales"><span>★</span>{total.toLocaleString('es-PE')}</div>}
        <button className="icono" onClick={() => setMenu(m => !m)} aria-label="Menú">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
      </header>
      <MenuPrincipal abierto={menu} onCerrar={() => setMenu(false)} onCampamentos={() => setZarpar(true)} />

      <div className="plaza-titulo">
        <h1>{nombreZona(zona)}</h1>
        <p>{red === 'vivo' ? <><i className="en-vivo-punto" aria-hidden />Canal {canal} · {lista.length + 1} {lista.length === 0 ? 'conquistador' : 'conquistadores'}</>
          : red === 'conectando' ? 'Conectando con los demás clubes…' : modo === 'practica' ? 'Modo práctica: recorres el campamento tú solo' : 'Sin conexión: recorres el campamento tú solo'}
          {luz.fase === 'noche' ? ' · 🌙' : luz.fase === 'atardecer' ? ' · 🌇' : luz.fase === 'amanecer' ? ' · 🌅' : ''}</p>
        {sabado && <p className="plaza-sabado">🕊️ ¡Feliz sábado! Hoy es día de culto: los desafíos y la tienda descansan.</p>}
        {programa?.estado === 'en_vivo' && !culto && !invitarVisible && (
          <button className="plaza-envivo-aviso pop" onClick={entrarCulto}>
            <i className="en-vivo-punto" aria-hidden /><span><b>En vivo en el escenario</b><small>{programa.titulo}</small></span><em>Ver</em>
          </button>
        )}
      </div>

      {aviso && <div className="plaza-aviso pop" role="status" onClick={() => setAviso(null)}>{aviso}</div>}


      {invitar && (
        <div className="plaza-ceremonia pop" role="dialog" aria-label="Ceremonia de banderas">
          <b>🎺 {cer!.tipo === 'izamiento' ? 'Izamiento de banderas — 7:00' : 'Arriamiento de banderas — 19:00'}</b>
          <p>{cer!.fase === 'invitacion' ? `Empieza en ${Math.max(1, Math.ceil(-cer!.minutos))} min` : '¡Está empezando!'} en el campamento de tu club. Varones a la izquierda, damas a la derecha, en filas de 8; los líderes adelante y atrás, y tres izan las banderas.</p>
          <div className="fila-botones">
            <Boton tipo="fantasma" onClick={() => setRechazoCer(`${cer!.tipo}-${Math.floor(hora)}`)}>Ahora no</Boton>
            <Boton onClick={formarme}>Formarme</Boton>
          </div>
        </div>
      )}
      {formado && cer && <div className="plaza-formado" role="status">{cer.fase === 'invitacion' ? '¡Atención! Formados para la ceremonia…' : cer.fase === 'en_curso' ? (cer.tipo === 'izamiento' ? '🎺 Izando las banderas…' : '🎺 Arriando las banderas…') : '¡Rompan filas!'}</div>}

      {elegido && <FichaJugador j={elegido} zona={zonaDeOtro(elegido.id)} onCerrar={() => setElegido(null)}
        onRetar={presencia && !sabado ? () => { setRivales([elegido]); setElegido(null) } : undefined} />}
      {carpaVista && <FichaCarpa titulo={`Carpa ${carpaVista.sexo === 'f' ? 'de damas' : 'de varones'} ${(carpaVista.slot ?? 0) + 1}${clubDeParcela.get(carpaVista.parcela!) ? ` · ${clubDeParcela.get(carpaVista.parcela!)!.nombre}` : ''}`}
        ocupantes={ocupantesDe(carpaVista)} onCerrar={() => setCarpaVista(null)} />}
      {tienda && <Tienda bolsa={bolsa} onBolsa={setBolsa} onCerrar={() => setTienda(false)} />}

      {hablar && red === 'vivo' && <div className="plaza-frases pop"><BarraFrases onEnviar={decir} /></div>}

      <nav className="plaza-acciones">
        {red === 'vivo' && <button className={`btn-hablar ${hablar ? 'on' : ''}`} onClick={() => setHablar(h => !h)} aria-expanded={hablar} aria-label="Decir algo">💬<span>Decir</span></button>}
        {cerca
          ? <Boton onClick={() => usar(cerca)}>{ACCION[cerca.tipo]}</Boton>
          : <span className="plaza-pista">Toca el suelo para caminar</span>}
        <button className="btn-brujula" onClick={() => { sfx.zas(); setZarpar(true) }} aria-label="Ir a los campamentos de desafíos en barco">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden><circle cx="16" cy="16" r="13" fill="#FFF7DF" stroke="#1E140C" strokeWidth="2.5" /><path d="M16 5l4 11h-8z" fill="#D7242F" /><path d="M16 27l-4-11h8z" fill="#1F5FD1" /><circle cx="16" cy="16" r="2" fill="#1E140C" /></svg>
          <span>Desafíos</span>
        </button>
      </nav>

      {rivales.length > 0 && <DialogoReto rivales={rivales} setRivales={setRivales} libres={lista} onCerrar={() => setRivales([])} />}

      {tablero && <TableroRetos onCerrar={() => setTablero(false)} onRanking={() => ir('ranking')} sabado={sabado} />}
      {culto && <Culto publico={[{ id: perfil.id, apodo: perfil.apodo, avatar: perfil.avatar, rango: perfil.rango }, ...lista.map(j => ({ id: j.id, apodo: j.apodo, avatar: j.avatar, rango: j.rango }))]}
        gestos={gestos} onGesto={decir} puedeReaccionar={red === 'vivo'} sabado={sabado} luz={luz} onCerrar={salirCulto} />}

      {zarpar && <Travesia texto="Zarpando del" destino="Gran Campamento" color="#F2B90F"
        onFin={() => { marcarTransicion({ tipo: 'alejar', desde: CAMPAMENTO_CENTRAL.id }); ir('campamentos') }} />}
    </div>
  )
}

/** Un objeto alto (pino, carpa, farol…) en su propio lienzo, ordenado por profundidad. */
const SpriteObjeto = memo(function SpriteObjeto({ sp, s }: { sp: Sprite; s: number }) {
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
})
