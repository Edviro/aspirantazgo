import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FRASES, type Bolsa, type Campamento, type ConexionPlaza, type PerfilPublico, type PresenteEnPlaza, type ProgramaVivo, type PuntoPlaza } from '../../application/puertos'
import { CAMPAMENTO_CENTRAL, CAMPAMENTOS, centralAbierto, progresoCampamento } from '../../domain/campamentos'
import { rachaVigente, retoDelDia } from '../../domain/diario'
import type { Ente3D, Mundo3D, Vista } from '../tres/mundo3d'
import { guardarVista, prefiere3D, soporta3D } from '../tres/soporte'
import { Carpa, type Companero } from '../componentes/plaza/Carpa'
import { Joystick } from '../componentes/plaza/Joystick'
import { MapaViaje, nombreLugar } from '../componentes/plaza/MapaViaje'
import {
  ALTO, ANCHO, CARPAS_POR_LADO, OBJETOS, PARCELAS, POR_CARPA, MUELLE, SALIDA, alturaBanderas, asignar, ceremoniaAhora, esSabado, formacion, horaLima, luzDelDia,
  objetoEn, ruta, transitable, usableCerca, zonaDe, type Asignacion, type Campista, type Objeto, type Zona,
} from '../../domain/plaza'
import { Boton } from '../componentes/Comunes'
import { MenuPrincipal } from '../componentes/MenuPrincipal'
import { BarraFrases, DialogoReto } from '../componentes/Retar'
import { Travesia } from '../componentes/Travesia'
import { HudVidas } from '../componentes/Vidas'
import { FichaCarpa, FichaJugador, RANGO_TXT } from '../componentes/plaza/Fichas'
import { Bandera } from '../componentes/plaza/Iconos'
import { Moneda, Tienda } from '../componentes/plaza/Tienda'
import { Culto, type EscenaCulto } from '../componentes/plaza/Culto'
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

/** Asientos frente al escenario para mirar el culto (filas de 9, en orden de llegada). */
const ASIENTOS = (() => { const l: PuntoPlaza[] = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) l.push({ x: 44.9 + c * 0.9 + (r % 2) * 0.3, y: 38.2 + r * 0.95 }); return l })()
const VISTAS: Vista[] = ['tv', 'cerca', 'aerea', 'primera']
const VISTA_TXT: Record<Vista, string> = { tv: 'TV', cerca: 'Cerca', aerea: 'Aérea', primera: '1.ª persona' }
const claveSueno = (id: string) => `asp_durmiendo_${id}`

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
  const tiempos = useRef(new Map<string, { t: number; cer: boolean; cul?: boolean; dur?: boolean }>())
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
  const [carpa, setCarpa] = useState<{ inicio: 'despierto' | 'amaneciendo' | 'durmiendo'; horas?: number } | null>(null)
  const carpaAbierta = useRef(false)
  carpaAbierta.current = !!carpa
  // ---------- 3D: mundo con cámara libre (estilo consola de los 90) ----------
  const [tres, setTres] = useState(prefiere3D)
  const [listo3d, setListo3d] = useState(false)
  const [vista3d, setVista3d] = useState<Vista>('tv')
  const [nitido, setNitido] = useState(false)
  const lienzo3d = useRef<HTMLCanvasElement>(null)
  const mundo = useRef<Mundo3D | null>(null)
  const gestosRef = useRef<Record<string, { frase: number; t: number }>>({})
  const miAsiento = useRef<PuntoPlaza | null>(null)
  // Estado que hay que volver a anunciar si el canal se reconecta
  const formadoRef = useRef(false), durmiendoRef = useRef(false), llegadaRef = useRef(0)
  useEffect(() => { formadoRef.current = formado }, [formado])
  const marca = useRef<HTMLDivElement>(null)
  const usoPendiente = useRef<Objeto | null>(null)
  const teclas = useRef(new Set<string>())
  const palanca = useRef({ x: 0, y: 0 })
  const [tactil] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches)
  const [ayudaTeclas, setAyudaTeclas] = useState(() => { try { return localStorage.getItem('asp_ayuda_teclas') !== '0' } catch { return true } })
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
  const anunciado = useRef(new Map<string, PuntoPlaza>())
  const resolver = useCallback((): void => {
    clearTimeout(pidiendo.current)
    pidiendo.current = window.setTimeout(async () => {
      const faltan = [...otros.current.keys()].filter(id => !perfiles.current.has(id) && !rechazados.current.has(id)).slice(0, 60)
      if (!faltan.length || !repo.salas) return
      try {
        const l = await repo.salas.perfilesPublicos(faltan)
        for (const j of l) perfiles.current.set(j.id, j)
        for (const id of faltan) if (!perfiles.current.has(id)) rechazados.current.add(id)
        actualizarLista(); setVer(v => v + 1)
      } catch { pidiendo.current = window.setTimeout(() => resolver(), 4000) /* se reintenta solo */ }
    }, 250)
  }, [repo.salas, actualizarLista])

  const presentes = useCallback((lista: PresenteEnPlaza[]) => {
    const vistos = new Set<string>()
    for (const p of lista) {
      vistos.add(p.id)
      tiempos.current.set(p.id, { t: p.t, cer: p.cer, cul: p.cul, dur: p.dur })
      const e = otros.current.get(p.id), antes = anunciado.current.get(p.id)
      anunciado.current.set(p.id, { x: p.x, y: p.y })
      if (!e) otros.current.set(p.id, { x: p.x, y: p.y, ruta: [], mira: 1, camina: false })
      // Solo se corrige si ESA persona anunció un lugar nuevo (si no, su dato de Presence es viejo y lo vivo va por "ir")
      else if (antes && (antes.x !== p.x || antes.y !== p.y) && !e.ruta.length && Math.hypot(e.x - p.x, e.y - p.y) > 1.5) { e.x = p.x; e.y = p.y }
    }
    for (const id of [...otros.current.keys()]) if (!vistos.has(id)) { otros.current.delete(id); tiempos.current.delete(id); anunciado.current.delete(id) }
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
    gestosRef.current = { ...gestosRef.current, [de]: { frase, t: Date.now() } }
    setGestos(g => ({ ...g, [de]: { frase, t: Date.now() } }))
    if (de !== perfil?.id) sfx.burbuja()
  }, [perfil?.id])

  // ---------- Campamento de tu región (o el que visitas con el mapa) ----------
  const enLinea = !!perfil && !!repo.salas && modo === 'en_linea' && !perfil.invitado
  const [destino, setDestino] = useState<string | undefined>(undefined)
  const [camp, setCamp] = useState<Campamento | null>(null)
  const [campListo, setCampListo] = useState(false)
  const [mapa, setMapa] = useState(false)
  useEffect(() => {
    if (!enLinea || !repo.salas?.campamento) { setCampListo(true); return }
    let vivo = true
    const cargar = (primera: boolean) => repo.salas!.campamento!(destino)
      .then(c => { if (vivo) { setCamp(c); setCampListo(true) } })
      .catch(() => { if (vivo && primera) { setCamp(null); setCampListo(true) } })
    void cargar(true)
    // Los clubes y miembros nuevos aparecen solos (sus carpas quedan armadas)
    const t = setInterval(() => void cargar(false), 120000)
    return () => { vivo = false; clearInterval(t) }
  }, [enLinea, destino]) // eslint-disable-line react-hooks/exhaustive-deps
  const lugar = camp?.lugar
  /** Viajar a otro campamento (o volver al tuyo con `undefined`). */
  const viajar = (l: string | undefined) => {
    setMapa(false)
    if (l === lugar || (l === undefined && camp?.mio)) return
    sfx.zas(); romperFilas(); setCarpa(null); setCulto(false)
    otros.current.clear(); tiempos.current.clear(); anunciado.current.clear(); setIds([])
    Object.assign(yo.current, { ...SALIDA, ruta: [] }); Object.assign(cam.current, { x: SALIDA.x, y: SALIDA.y })
    colocado.current = false
    setCampListo(false); setDestino(l)
  }

  // ---------- Conexión al canal ----------
  // Si el canal se cae (corte de red, celular en segundo plano), se vuelve a entrar solo
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (intento === 0) limpiarTransicion()
    if (!enLinea) { setRed('solo'); return }
    if (!campListo) return
    setRed('conectando')
    let vivo = true, con: ConexionPlaza | null = null, tReintento = 0
    const reintentar = (ms: number) => { if (vivo && !tReintento) tReintento = window.setTimeout(() => { tReintento = 0; if (vivo) setIntento(i => i + 1) }, ms) }
    repo.salas.plaza({ id: perfil.id, clubId: perfil.club.id ?? '', llegada: llegadaRef.current }, { x: yo.current.x, y: yo.current.y }, {
      onPresentes: presentes,
      onIr: m => caminar(m.id, m.desde, m.hasta),
      onGesto: g => recibirGesto(g.de, g.frase),
      onCaida: () => { if (!vivo) return; conexion.current = null; setRed('solo'); reintentar(8000) },
    }, lugar).then(c => {
      if (!vivo) { void c.salir(); return }
      con = c; conexion.current = c; setCanal(c.canal); llegadaRef.current = c.llegada; setMiLlegada(c.llegada); setRed('vivo')
      // Lo que ya tenías puesto (culto, carpa, formación) se vuelve a anunciar
      if (formadoRef.current) c.formar(true)
      c.marcar({ cul: miAsiento.current !== null, dur: durmiendoRef.current })
    }).catch(() => { if (vivo) { setRed('solo'); reintentar(12000) } })
    return () => { vivo = false; clearTimeout(tReintento); conexion.current = null; void con?.salir() }
  }, [intento, campListo, lugar]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Campamentos de los clubes ----------
  // En línea: cada club de la región tiene parcela FIJA y cada miembro su carpa fija (aunque no esté conectado).
  // Sin conexión (práctica): parcelas por orden de llegada, como antes.
  const asignacion = useMemo((): Asignacion => {
    if (camp) {
      const parcelas = new Map<string, number>(), carpas: Asignacion['carpas'] = new Map()
      for (const c of camp.clubes) {
        parcelas.set(c.id, c.parcela)
        for (const sexo of ['m', 'f'] as const) c[sexo].forEach((id, k) => {
          const slot = Math.floor(k / POR_CARPA)
          if (slot < CARPAS_POR_LADO) carpas.set(id, { parcela: c.parcela, sexo, slot })
        })
      }
      return { parcelas, carpas }
    }
    if (!perfil) return asignar([])
    const campistas: Campista[] = [{ id: perfil.id, clubId: miClub, t: miLlegada, genero: perfil.avatar.genero === 'f' ? 'f' : 'm' }]
    for (const id of ids) {
      const j = perfiles.current.get(id)
      if (!j) continue
      campistas.push({ id, clubId: j.clubId, t: tiempos.current.get(id)?.t ?? Date.now(), genero: j.avatar?.genero === 'f' ? 'f' : 'm' })
    }
    return asignar(campistas)
  }, [camp, ids, ver, miLlegada, perfil, miClub])
  const clubDeParcela = useMemo(() => {
    const m = new Map<number, { id: string; nombre: string; pais?: string | null; bandera?: string | null; color: string }>()
    if (camp) {
      for (const c of camp.clubes) m.set(c.parcela, { id: c.id, nombre: c.nombre, pais: c.pais, bandera: c.bandera, color: colorDeClub(c.id) })
      return m
    }
    for (const [clubId, i] of asignacion.parcelas) {
      const mio = clubId === miClub
      const alguien = mio ? null : [...perfiles.current.values()].find(j => j.clubId === clubId)
      m.set(i, mio
        ? { id: clubId, nombre: perfil?.club.nombre ?? 'Mi club', pais: perfil?.club.pais, bandera: perfil?.club.bandera, color: colorDeClub(clubId) }
        : { id: clubId, nombre: alguien?.club ?? 'Club', pais: alguien?.pais, bandera: alguien?.bandera, color: colorDeClub(clubId) })
    }
    return m
  }, [camp, asignacion, miClub, perfil])
  const miParcela = asignacion.parcelas.get(miClub)

  // Al entrar (sin barco) apareces en tu campamento, frente a tu carpa
  useEffect(() => {
    if (colocado.current || red === 'conectando' || !perfil || !campListo) return
    colocado.current = true
    const c = asignacion.carpas.get(perfil.id)
    const carpa = c && OBJETOS.find(o => o.tipo === 'carpa-p' && o.parcela === c.parcela && o.sexo === c.sexo && o.slot === c.slot)
    const p = carpa?.uso ?? (miParcela !== undefined ? PARCELAS[miParcela].patio : null)
    if (!p) return
    Object.assign(yo.current, { x: p.x, y: p.y, ruta: [] })
    Object.assign(cam.current, { x: p.x, y: p.y })
    conexion.current?.quieto(p)
    // Si te quedaste durmiendo en tu carpa, amanece ahí mismo
    let desde = 0
    try { desde = Number(localStorage.getItem(claveSueno(perfil.id))) || 0 } catch { /* sin almacenamiento */ }
    if (desde && carpa) {
      const h = horaActual(), deNoche = h < 5.5 || h >= 18.5
      // Si aún es de noche sigues durmiendo; si ya amaneció, despiertas con el sol
      if (deNoche) { setCarpa({ inicio: 'durmiendo' }); conexion.current?.marcar({ dur: true }) }
      else { try { localStorage.removeItem(claveSueno(perfil.id)) } catch { /* sin almacenamiento */ } setCarpa({ inicio: 'amaneciendo', horas: (Date.now() - desde) / 3600000 }) }
    }
  }, [red, asignacion, miParcela, perfil, campListo])

  // ---------- Sprites (se reutilizan si no cambian) ----------
  const cacheSprites = useRef(new Map<string, Sprite>())
  const sprites = useMemo(() => {
    const ocupadas = new Set<string>()
    for (const c of asignacion.carpas.values()) ocupadas.add(`${c.parcela}-${c.sexo}-${c.slot}`)
    const lista: { clave: string; sp: Sprite }[] = []
    OBJETOS.forEach((ob, i) => {
      const club = ob.parcela !== undefined ? clubDeParcela.get(ob.parcela) : undefined
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
          ? `Campamento del club ${club.nombre}: ${n} ${n === 1 ? 'acampando' : 'acampando'}. Las banderas se izan a las 7:00 y se arrían a las 18:00.`
          : 'Parcela libre: aquí acampará el próximo club que llegue.')
        break
      }
      case 'carpa-p': {
        const mia = perfil ? asignacion.carpas.get(perfil.id) : undefined
        if (mia && mia.parcela === ob.parcela && mia.sexo === ob.sexo && mia.slot === ob.slot) entrarCarpa(ob)
        else setCarpaVista(ob)
        break
      }
    }
  }, [abierto, completos, listos, hechoHoy, ir, jugar, reto, rachaObj, sabado, clubDeParcela, asignacion, s]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Cámara al escenario: baja desde la vista aérea hasta quedar de frente (como en los juegos de fútbol) ----------
  const ESC = OBJETOS.find(o => o.tipo === 'escenario')!
  function asientoPara(id: string) {
    const enCulto = [...tiempos.current.entries()].filter(([k, v]) => v.cul && k !== id).map(([k, v]) => ({ id: k, t: v.t }))
    enCulto.push({ id, t: id === perfil?.id ? miLlegada : tiempos.current.get(id)?.t ?? 0 })
    enCulto.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))
    return ASIENTOS[Math.min(ASIENTOS.length - 1, enCulto.findIndex(e => e.id === id))]
  }
  function entrarCulto() {
    romperFilas(); setAviso(null); setElegido(null); setHablar(false)
    const m = mundo.current
    if (m && perfil) {
      const a = asientoPara(perfil.id)
      miAsiento.current = a
      Object.assign(yo.current, { x: a.x, y: a.y, ruta: [] })
      conexion.current?.quieto(a); conexion.current?.marcar({ cul: true })
      sfx.zas()
      m.mirarDesde(a, { x: ESC.x + ESC.w / 2, y: ESC.y, alto: 2.6 })
      m.setCentro(vista.w < vista.h ? 0.3 : 0.4)
      setCulto(true)
      return
    }
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
    conexion.current?.marcar({ cul: false })
    miAsiento.current = null
    if (mundo.current) { mundo.current.mirarDesde(null); mundo.current.setCentro(0.5); return }
    const z = capa.current?.parentElement
    if (!z || menosMovimiento()) return
    z.animate([{ transform: 'scale(2.6)', filter: 'brightness(1.25)' }, { transform: 'none', filter: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)' })
  }
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t) }, [aviso])

  // ---------- Tu carpa: entras, duermes y amaneces ahí ----------
  function entrarCarpa(ob: Objeto) {
    romperFilas(); setAviso(null); setElegido(null); setHablar(false)
    const abrir = () => setCarpa({ inicio: 'despierto' })
    const m = mundo.current
    if (m && !menosMovimiento()) { sfx.zas(); m.acercarA(ob.x + 1, ob.y + 1, abrir) } else abrir()
  }
  const dormir = () => {
    try { if (perfil) localStorage.setItem(claveSueno(perfil.id), String(Date.now())) } catch { /* sin almacenamiento */ }
    durmiendoRef.current = true; conexion.current?.marcar({ dur: true })
  }
  const despertar = () => {
    try { if (perfil) localStorage.removeItem(claveSueno(perfil.id)) } catch { /* sin almacenamiento */ }
    durmiendoRef.current = false; conexion.current?.marcar({ dur: false })
  }
  useEffect(() => {
    if (carpa?.inicio === 'amaneciendo') { durmiendoRef.current = false; conexion.current?.marcar({ dur: false }) }
    if (carpa?.inicio === 'durmiendo') { durmiendoRef.current = true; conexion.current?.marcar({ dur: true }) }
  }, [carpa?.inicio, red])

  // ---------- Mundo 3D ----------
  useEffect(() => {
    if (!tres) return
    let vivo = true, m: Mundo3D | null = null
    import('../tres/mundo3d').then(mod => {
      if (!vivo || !lienzo3d.current) return
      m = new mod.Mundo3D(lienzo3d.current, abierto)
      mundo.current = m
      setListo3d(true)
    }).catch(() => { if (vivo) { setTres(false); guardarVista('2d') } })
    return () => { vivo = false; mundo.current = null; setListo3d(false); m?.dispose() }
  }, [tres]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { mundo.current?.redimensionar(vista.w, vista.h, nitido) }, [vista, nitido, listo3d])
  useEffect(() => { mundo.current?.setLuz(luz) }, [luz.oscuridad, luz.dorado, luz.faroles, listo3d]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { mundo.current?.setAlturaBanderas(altura) }, [altura, listo3d])
  const abiertoAntes = useRef(abierto)
  useEffect(() => { if (mundo.current && abiertoAntes.current !== abierto) { abiertoAntes.current = abierto; mundo.current.setAbierto(abierto) } }, [abierto, listo3d])
  useEffect(() => {
    const m = mundo.current
    if (!m) return
    const ocupadas = new Set<string>()
    for (const c of asignacion.carpas.values()) ocupadas.add(`${c.parcela}-${c.sexo}-${c.slot}`)
    m.setParcelas(new Map([...clubDeParcela].map(([i, c]) => [i, { nombre: c.nombre, color: c.color, pais: c.pais, bandera: c.bandera }])), ocupadas)
  }, [clubDeParcela, asignacion, listo3d])
  useEffect(() => { mundo.current?.setVista(vista3d) }, [vista3d, listo3d])
  // El escenario del mundo muestra el programa aunque no estés mirando el culto
  useEffect(() => {
    const m = mundo.current
    if (!m || culto) return
    if (programa?.estado === 'en_vivo') {
      const parte = programa.partes[programa.parte]
      const orador = programa.equipo.find(e => e.id === parte?.responsable) ?? programa.equipo.find(e => e.rol === 'conductor')
      m.setEscenario(programa.equipo, orador?.id ?? null)
      m.setPantalla({ arriba: '● EN VIVO', texto: programa.titulo, abajo: parte?.titulo, encendida: true })
    } else {
      m.setEscenario([], null)
      m.setPantalla(programa ? { arriba: 'Próximo programa', texto: programa.titulo, encendida: true } : sabado ? { arriba: 'Feliz sábado', texto: '«Acuérdate del día de reposo para santificarlo»', abajo: 'Éxodo 20:8', encendida: true } : { texto: '', encendida: false })
    }
  }, [programa, listo3d, culto, sabado])
  const enEscena = useCallback((e: EscenaCulto) => {
    const m = mundo.current
    if (!m) return
    m.setEscenario(e.equipo, e.orador); m.setPantalla(e.pantalla); m.saludaEnEscenario(e.hablando)
  }, [])
  // Llegando en barco: la cámara baja desde arriba
  useEffect(() => {
    if (!listo3d || llegada?.tipo !== 'llegar' || menosMovimiento()) return
    setVista3d('aerea')
    const t = setTimeout(() => setVista3d('tv'), 350)
    return () => clearTimeout(t)
  }, [listo3d]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Bucle de animación: mover, cámara y profundidad ----------
  const pintar = useCallback((e: Ente) => {
    if (!e.el) return
    e.el.style.transform = `translate3d(${Math.round(e.x * B * s)}px, ${Math.round(e.y * B * s)}px, 0)`
    e.el.style.zIndex = String(Math.round(e.y * B) + 1)
    e.el.classList.toggle('camina', e.camina)
    if (e.cuerpo) e.cuerpo.style.transform = `scaleX(${e.mira})`
  }, [s])

  /** En 3D: el nombre y el globo de cada uno flotan sobre su cabeza. */
  const etiqueta = (e: Ente, m: Mundo3D, esYo: boolean, oculto?: boolean) => {
    if (!e.el) return
    const p = oculto ? null : m.proyectar(e.x, e.y, 1.62)
    if (!p || (esYo && (m.vista === 'primera' || miAsiento.current || carpaAbierta.current))) { e.el.style.visibility = 'hidden'; return }
    e.el.style.visibility = ''
    e.el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`
    e.el.classList.toggle('lejos', p.d > 26)
    e.el.style.zIndex = String(1000 - Math.round(p.d * 10))
  }

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
      const m3 = mundo.current
      // Teclado (flechas o WASD) o la palanca del celular (con intensidad: más lejos, más rápido)
      const pj = palanca.current, conPalanca = Math.hypot(pj.x, pj.y) > 0.18
      const ix = conPalanca ? pj.x : (k.has('ArrowRight') || k.has('d') ? 1 : 0) - (k.has('ArrowLeft') || k.has('a') ? 1 : 0)
      const iy = conPalanca ? pj.y : (k.has('ArrowDown') || k.has('s') ? 1 : 0) - (k.has('ArrowUp') || k.has('w') ? 1 : 0)
      const ritmo = conPalanca ? Math.min(1, Math.hypot(pj.x, pj.y)) * 1.15 : k.has('Shift') ? 1.6 : 1
      if (m3 && k.has('q')) m3.girar(dt * 1.9)
      if (m3 && k.has('e')) m3.girar(-dt * 1.9)
      // En 3D las flechas van según hacia dónde mira la cámara
      const ya = m3 ? m3.yaw : 0, cy0 = Math.cos(ya), sy0 = Math.sin(ya)
      const dx = m3 ? ix * cy0 + iy * sy0 : ix, dy = m3 ? -ix * sy0 + iy * cy0 : iy
      if (dx || dy) {
        const n = Math.hypot(dx, dy), vx = (dx / n) * VEL * ritmo * dt, vy = (dy / n) * VEL * ritmo * dt
        y0.ruta = []; usoPendiente.current = null
        if (transitable(Math.floor(y0.x + vx + Math.sign(vx) * 0.25), Math.floor(y0.y), abierto)) y0.x += vx
        if (transitable(Math.floor(y0.x), Math.floor(y0.y + vy + Math.sign(vy) * 0.1), abierto)) y0.y += vy
        if (Math.abs(dx) > 0.1) y0.mira = dx < 0 ? -1 : 1
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
      // Quienes miran el culto están en su asiento; quienes duermen, dentro de su carpa
      for (const [id, e] of otros.current) {
        const tm = tiempos.current.get(id)
        if (tm?.cul && !e.ruta.length) { const a = asientoPara(id); if (a) { e.x = a.x; e.y = a.y } }
        avanzar(e, dt)
      }
      if (m3) {
        const lista3d: Ente3D[] = [{ id: perfil?.id ?? 'yo', x: y0.x, y: y0.y, avatar: perfil?.avatar, rango: perfil?.rango ?? 'conquistador', camina: y0.camina, saluda: (gestosRef.current[perfil?.id ?? '']?.t ?? 0) > Date.now() - VIDA_GLOBO, visible: !carpaAbierta.current, mira: miAsiento.current ? { x: 0, y: -1 } : undefined }]
        for (const [id, e] of otros.current) {
          const j = perfiles.current.get(id)
          if (!j) continue
          lista3d.push({ id, x: e.x, y: e.y, avatar: j.avatar, rango: j.rango, camina: e.camina, saluda: (gestosRef.current[id]?.t ?? 0) > Date.now() - VIDA_GLOBO, visible: !tiempos.current.get(id)?.dur, mira: tiempos.current.get(id)?.cul && !e.ruta.length ? { x: 0, y: -1 } : undefined })
        }
        VENDEDORES.forEach((v, i) => lista3d.push({ id: `vend-${i}`, x: v.x, y: v.y, avatar: v.a, rango: 'lider', camina: false, saluda: false }))
        m3.entes(lista3d, perfil?.id ?? null)
        m3.cuadro(dt, miAsiento.current ?? y0)
        etiqueta(y0, m3, true)
        for (const [id, e] of otros.current) etiqueta(e, m3, false, tiempos.current.get(id)?.dur)
      } else {
        pintar(y0)
        for (const [id, e] of otros.current) { pintar(e); if (e.el) e.el.style.visibility = tiempos.current.get(id)?.dur ? 'hidden' : '' }
      }

      // Cámara: sigue a tu personaje con suavidad, con un margen de mar alrededor
      const c = cam.current
      if (!m3) {
      const vw = vista.w / (B * s), vh = vista.h / (B * s)
      c.x += (y0.x - c.x) * Math.min(1, dt * 5); c.y += (y0.y - c.y) * Math.min(1, dt * 5)
      const cx = vw >= ANCHO + 4 ? ANCHO / 2 : Math.min(ANCHO + 2 - vw / 2, Math.max(vw / 2 - 2, c.x))
      const cy = vh >= ALTO + 9 ? ALTO / 2 : Math.min(ALTO + 3 - vh / 2, Math.max(vh / 2 - 6, c.y + 1.5))
      c.ox = Math.round(vista.w / 2 - cx * B * s); c.oy = Math.round(vista.h / 2 - cy * B * s)
      const tr = `translate3d(${c.ox}px, ${c.oy}px, 0)`
      if (capa.current) capa.current.style.transform = tr
      if (capaLuz.current) capaLuz.current.style.transform = tr
      }

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
  }, [vista, s, abierto, pintar, usar, listo3d]) // eslint-disable-line react-hooks/exhaustive-deps

  // Teclado (en PC)
  useEffect(() => {
    const valida = (k: string) => ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'Shift'].includes(k)
    const abajo = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (cultoAbierto.current || carpaAbierta.current || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.closest('.velo')))) return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (valida(k)) { teclas.current.add(k); if (k !== 'Shift') { e.preventDefault(); romperFilas() } }
      if (k === 'q' || k === 'e') teclas.current.add(k)
      if (mundo.current && (k === '+' || k === 'z')) mundo.current.zoom(0.85)
      if (mundo.current && (k === '-' || k === 'x')) mundo.current.zoom(1.18)
      if (mundo.current && k === 'v') setVista3d(v => VISTAS[(VISTAS.indexOf(v) + 1) % VISTAS.length])
      if ((k === 'Enter' || k === ' ' || k === 'f') && cerca && !(t?.tagName === 'BUTTON')) { e.preventDefault(); usar(cerca) }
    }
    const arriba = (e: KeyboardEvent) => teclas.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    const soltarTodo = () => teclas.current.clear()
    window.addEventListener('keydown', abajo); window.addEventListener('keyup', arriba); window.addEventListener('blur', soltarTodo)
    return () => { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); window.removeEventListener('blur', soltarTodo) }
  }, [cerca, usar]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 3D: arrastrar gira la cámara, pellizcar o la rueda acercan, tocar camina ----------
  const punteros = useRef(new Map<number, { x: number; y: number; x0: number; y0: number }>())
  const arrastre = useRef({ movio: false, dist: 0 })
  const abajo3d = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return
    punteros.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY })
    if (punteros.current.size === 1) arrastre.current = { movio: false, dist: 0 }
    else { const [a, b] = [...punteros.current.values()]; arrastre.current = { movio: true, dist: Math.hypot(a.x - b.x, a.y - b.y) } }
    caja.current?.setPointerCapture(ev.pointerId)
  }
  const mover3d = (ev: React.PointerEvent<HTMLDivElement>) => {
    const p = punteros.current.get(ev.pointerId), m = mundo.current
    if (!p || !m) return
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y
    p.x = ev.clientX; p.y = ev.clientY
    if (punteros.current.size >= 2) {
      const [a, b] = [...punteros.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y)
      if (arrastre.current.dist > 0 && d > 0) m.zoom(arrastre.current.dist / d)
      arrastre.current.dist = d
      return
    }
    if (!arrastre.current.movio && Math.hypot(ev.clientX - p.x0, ev.clientY - p.y0) > 8) arrastre.current.movio = true
    if (arrastre.current.movio) m.rotar(dx, dy)
  }
  const arriba3d = (ev: React.PointerEvent<HTMLDivElement>) => {
    const p = punteros.current.get(ev.pointerId)
    punteros.current.delete(ev.pointerId)
    if (!p || arrastre.current.movio || punteros.current.size) return
    const m = mundo.current
    if (!m || !caja.current) return
    const r = m.elegir(ev.clientX, ev.clientY, caja.current.getBoundingClientRect())
    if (!r) return
    if (r.tipo === 'ente') {
      const j = perfiles.current.get(r.id)
      if (j) { sfx.click(); setElegido(j); setHablar(false); setAviso(null) }
      return
    }
    if (culto) return
    caminarA(r.x, r.y)
  }

  // Tocar el suelo: caminar hasta ahí (o hasta lo que tocaste, y usarlo al llegar)
  const tocar = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return
    const r = caja.current!.getBoundingClientRect(), c = cam.current
    caminarA((ev.clientX - r.left - c.ox) / (B * s), (ev.clientY - r.top - c.oy) / (B * s))
  }
  const caminarA = (tx: number, ty: number) => {
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
    if (marca.current && !mundo.current) {
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
    <div className={`pantalla plaza ${culto && tres ? 'culto-3d' : ''}`}>
      {tres ? (
      <div className={`plaza-vista tres ${culto ? 'en-culto' : ''}`} ref={caja} onPointerDown={abajo3d} onPointerMove={mover3d} onPointerUp={arriba3d} onPointerCancel={arriba3d}
        onWheel={e => mundo.current?.zoom(e.deltaY > 0 ? 1.12 : 0.89)} aria-label="Gran Campamento en 3D. Toca el suelo para caminar; arrastra para girar la cámara.">
        <canvas ref={lienzo3d} className={`plaza-3d ${nitido ? 'nitido' : ''}`} />
        {!listo3d && <div className="plaza-cargando">Armando el Gran Campamento…</div>}
        <div className="p3-capa" aria-hidden={false}>
          {lista.map(j => (
            <button key={j.id} className="p3-etq" ref={el => { const e = otros.current.get(j.id); if (e) e.el = el }}
              onPointerDown={e => e.stopPropagation()} onClick={() => { sfx.click(); setElegido(j); setHablar(false); setAviso(null) }} aria-label={`${j.apodo}, de ${j.club}`}>
              {globo(j.id)}<span className="plaza-nombre">{j.apodo}</span>
            </button>
          ))}
          <div className="p3-etq yo" ref={el => { yo.current.el = el }}>{globo(perfil.id)}<span className="plaza-nombre">Tú</span></div>
        </div>
      </div>
      ) : (
      <div className="plaza-vista" ref={caja} onPointerDown={tocar} aria-label="Gran Campamento. Toca el suelo para caminar.">
        <div className="plaza-zoom">
          <div className="plaza-capa" ref={capa} style={{ width: ANCHO * B * s, height: ALTO * B * s }}>
            <canvas ref={suelo0} className="plaza-suelo" style={{ width: ANCHO * B * s, height: ALTO * B * s }} aria-hidden />
            <canvas ref={suelo1} className="plaza-suelo isla-ola" style={{ width: ANCHO * B * s, height: ALTO * B * s }} aria-hidden />
            {sprites.map(({ clave, sp }) => <SpriteObjeto key={clave} sp={sp} s={s} />)}
            {/* Banderas amarradas en el pórtico de cada campamento: país, Conquistadores y (si tiene) la del club. Suben a las 7:00 y bajan a las 18:00. */}
            {[...clubDeParcela.entries()].map(([i, club]) => {
              const o = OBJETOS.find(x => x.tipo === 'portada' && x.parcela === i)!
              return (club.bandera ? ['pais', 'conquis', 'club'] as const : ['pais', 'conquis'] as const).map((t, k) => (
                <div key={`b-${i}-${t}`} className="plaza-bandera" style={{ left: (o.x * B + 2) * s, top: (o.y * B - 30 + k * 15 + (1 - altura) * 12) * s, zIndex: o.y * B + o.h * B + 1 }}>
                  <Bandera tipo={t} pais={club.pais} bandera={club.bandera} alto={8 * s} />
                </div>
              ))
            })}
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
      )}
      {/* Cámara: girar, acercar, cambiar de vista (y volver a la vista clásica) */}
      {tres && listo3d && !carpa && (
        <div className={`cam3d ${culto ? 'en-culto' : ''} ${tactil ? 'tactil' : ''}`} onPointerDown={e => e.stopPropagation()} role="toolbar" aria-label="Cámara">
          <div className="cam3d-grupo">
            <button onClick={() => mundo.current?.girar(Math.PI / 4)} title="Girar a la izquierda (Q)" aria-label="Girar a la izquierda">
              <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></svg>
            </button>
            <button onClick={() => mundo.current?.girar(-Math.PI / 4)} title="Girar a la derecha (E)" aria-label="Girar a la derecha">
              <svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v4h-4" /></svg>
            </button>
          </div>
          {!culto && <>
            <div className="cam3d-grupo">
              <button onClick={() => mundo.current?.zoom(0.8)} title="Acercar (Z o rueda)" aria-label="Acercar"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
              <button onClick={() => mundo.current?.zoom(1.25)} title="Alejar (X o rueda)" aria-label="Alejar"><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
            </div>
            <button className="cam3d-vista" onClick={() => { sfx.click(); setVista3d(v => VISTAS[(VISTAS.indexOf(v) + 1) % VISTAS.length]) }} title="Cambiar la cámara (V)" aria-label={`Cámara: ${VISTA_TXT[vista3d]}. Cambiar`}>
              <svg viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10" rx="2" /><path d="M16 11l5-3v8l-5-3z" /></svg>
              <small>{VISTA_TXT[vista3d]}</small>
            </button>
            <details className="cam3d-mas">
              <summary title="Más opciones" aria-label="Más opciones de imagen"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg></summary>
              <div>
                <button onClick={() => setNitido(n => !n)}>{nitido ? 'Imagen retro (90)' : 'Imagen nítida (HD)'}</button>
                <button onClick={() => { guardarVista('2d'); setTres(false) }}>Vista clásica 2D</button>
              </div>
            </details>
          </>}
        </div>
      )}
      {/* Para caminar: palanca en el celular; en la PC, teclado */}
      {tactil && !culto && !carpa && <Joystick valor={palanca} onUsar={() => cerca && usar(cerca)} />}
      {!tactil && tres && listo3d && !culto && !carpa && ayudaTeclas && (
        <div className="ayuda-teclas" role="note">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> caminar</span>
          <span><kbd>Shift</kbd> correr</span>
          <span><kbd>Q</kbd><kbd>E</kbd> girar</span>
          <span><kbd>V</kbd> cámara</span>
          <span><kbd>Enter</kbd> usar</span>
          <span>Arrastra con el mouse para mirar</span>
          <button onClick={() => { setAyudaTeclas(false); try { localStorage.setItem('asp_ayuda_teclas', '0') } catch { /* sin almacenamiento */ } }} aria-label="Ocultar ayuda">✕</button>
        </div>
      )}
      {!tres && soporta3D() && <button className="cam3d-volver" onClick={() => { guardarVista('3d'); setTres(true) }}>Ver en 3D</button>}
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
        {camp && <p className="plaza-lugar">{nombreLugar(camp)}{camp.asociacion ? ` · ${camp.asociacion}` : ''}{!camp.mio ? ' · de visita' : ''}</p>}
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
          <b>🎺 {cer!.tipo === 'izamiento' ? 'Izamiento de banderas — 7:00' : 'Arriamiento de banderas — 18:00'}</b>
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

      <nav className={`plaza-acciones ${tactil ? 'con-palanca' : ''}`}>
        {red === 'vivo' && <button className={`btn-hablar ${hablar ? 'on' : ''}`} onClick={() => setHablar(h => !h)} aria-expanded={hablar} aria-label="Decir algo">💬<span>Decir</span></button>}
        {cerca
          ? <Boton onClick={() => usar(cerca)}>{ACCION[cerca.tipo]}</Boton>
          : <span className="plaza-pista">Toca el suelo para caminar</span>}
        {enLinea && repo.salas?.mapaCampamentos && (
          <button className="btn-brujula btn-mapa" onClick={() => { sfx.click(); setMapa(true) }} aria-label="Mapa: viajar a otros campamentos por país, unión, asociación y región">
            <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden><path d="M4 8l8-3 8 3 8-3v19l-8 3-8-3-8 3z" fill="#FFF7DF" stroke="#1E140C" strokeWidth="2.3" strokeLinejoin="round" /><path d="M12 5v19M20 8v19" stroke="#1E140C" strokeWidth="2" /><circle cx="16" cy="14" r="2.6" fill="#D7242F" /></svg>
            <span>Mapa</span>
          </button>
        )}
        <button className="btn-brujula" onClick={() => { sfx.zas(); setZarpar(true) }} aria-label="Ir a los campamentos de desafíos en barco">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden><circle cx="16" cy="16" r="13" fill="#FFF7DF" stroke="#1E140C" strokeWidth="2.5" /><path d="M16 5l4 11h-8z" fill="#D7242F" /><path d="M16 27l-4-11h8z" fill="#1F5FD1" /><circle cx="16" cy="16" r="2" fill="#1E140C" /></svg>
          <span>Desafíos</span>
        </button>
      </nav>

      {rivales.length > 0 && <DialogoReto rivales={rivales} setRivales={setRivales} libres={lista} onCerrar={() => setRivales([])} />}

      {mapa && repo.salas && <MapaViaje salas={repo.salas} camp={camp} onIr={viajar} onCerrar={() => setMapa(false)} />}
      {tablero && <TableroRetos onCerrar={() => setTablero(false)} onRanking={() => ir('ranking')} sabado={sabado} />}
      {culto && <Culto publico={[{ id: perfil.id, apodo: perfil.apodo, avatar: perfil.avatar, rango: perfil.rango }, ...lista.map(j => ({ id: j.id, apodo: j.apodo, avatar: j.avatar, rango: j.rango }))]}
        gestos={gestos} onGesto={decir} puedeReaccionar={red === 'vivo'} sabado={sabado} luz={luz} onCerrar={salirCulto}
        modo3d={tres && listo3d} onEscena={tres ? enEscena : undefined} />}
      {carpa && (() => {
        const mia = asignacion.carpas.get(perfil.id)
        const club = miParcela !== undefined ? clubDeParcela.get(miParcela) : undefined
        const companeros: Companero[] = mia ? [...asignacion.carpas.entries()]
          .filter(([id, c]) => id !== perfil.id && c.parcela === mia.parcela && c.sexo === mia.sexo && c.slot === mia.slot)
          .map(([id]) => perfiles.current.get(id)).filter((j): j is PerfilPublico => !!j)
          .map(j => ({ id: j.id, apodo: j.apodo, avatar: j.avatar, rango: j.rango, durmiendo: !!tiempos.current.get(j.id)?.dur })) : []
        return <Carpa yo={{ id: perfil.id, apodo: perfil.apodo, avatar: perfil.avatar, rango: perfil.rango }} color={club?.color ?? '#1E9A4B'} club={club ? `Campamento de ${club.nombre}` : 'Gran Campamento'}
          items={bolsa?.items ?? []} aprobados={Object.values(puntajes).filter(p => p >= 400).length} campeon={[]} racha={rachaVigente(rachaObj)}
          companeros={companeros} inicio={carpa.inicio} horasDormidas={carpa.horas} oscuridad={luz.oscuridad} hora={hora}
          onDormir={dormir} onDespertar={despertar} onSalir={() => setCarpa(null)} />
      })()}

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
