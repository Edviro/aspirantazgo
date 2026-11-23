import { create } from 'zustand'
import type { ConexionPresencia, ConexionSala, InicioRonda, InvitacionDuelo, JugadorEnLinea, JugadorSala, Perfil, ProgresoSala, RepositorioJuego } from '../application/puertos'
import { guardarModo, repoLocal, repoPara, type Modo } from '../adapters/contenedor'
import { TODOS_LOS_NIVELES, type Nivel } from '../domain/niveles'
import type { Dificultad } from '../domain/tipos'
import { esSabado } from '../domain/plaza'

export type Pantalla = 'intro' | 'acceso' | 'editor' | 'mapa' | 'juego' | 'ranking' | 'legal' | 'director' | 'sala' | 'club' | 'admin' | 'logros' | 'campamentos' | 'plaza' | 'unidad'

export interface EstadoSala {
  conexion: ConexionSala
  rol: 'anfitrion' | 'jugador'
  jugadores: JugadorSala[]
  progresos: Record<string, ProgresoSala>
  ronda: InicioRonda | null
  rondaRecibida: number
  cerrada: boolean
  tipo: 'sala' | 'duelo'
  /** En un reto (2 a 4 jugadores): contra quiénes y qué se juega. El retador da la señal de inicio. */
  duelo?: { rivales: JugadorEnLinea[]; nivelId: string; dificultad: Dificultad; retador: boolean }
}

export interface RetoEnviado {
  rivales: JugadorEnLinea[]
  /** Lo que respondió cada invitado (id → sí/no). Sin respuesta = todavía pensando. */
  respuestas: Record<string, boolean>
  codigo: string; nivelId: string; dificultad: Dificultad; estado: 'esperando' | 'rechazado'
}

interface Estado {
  pantalla: Pantalla
  /** A dónde vuelven los botones de "volver": la Plaza Central o el mapa del campamento (el último visitado). */
  hub: 'plaza' | 'mapa'
  legalTab: 'privacidad' | 'terminos' | 'padres'
  repo: RepositorioJuego
  modo: Modo | null
  perfil: Perfil | null
  puntajes: Record<string, number>
  nivel: Nivel | null
  desafio: boolean
  dificultad: Dificultad
  semilla: number | null
  sonido: boolean
  musica: boolean
  toggleMusica: () => void
  sala: EstadoSala | null
  /** El nivel en curso está en pausa (ver ui/reloj.ts). */
  pausado: boolean
  mundo: string
  setMundo: (m: string) => void
  ir: (p: Pantalla) => void
  verLegal: (t: Estado['legalTab']) => void
  setSesion: (modo: Modo, perfil: Perfil) => Promise<void>
  setPerfil: (p: Perfil) => void
  refrescarPuntajes: () => Promise<void>
  setDificultad: (d: Dificultad) => void
  jugar: (n: Nivel, desafio: boolean, dificultad?: Dificultad, semilla?: number | null) => void
  /** El sábado (viernes 18:00 a sábado 18:00) no hay desafíos ni práctica, salvo en una sala dirigida por un líder. */
  avisoSabado: boolean
  cerrarAvisoSabado: () => void
  salir: () => Promise<void>
  toggleSonido: () => void
  abrirSala: (codigo: string | null, sesionId?: string | null) => Promise<void>
  enLinea: JugadorEnLinea[]
  presencia: ConexionPresencia | null
  invitacion: InvitacionDuelo | null
  retoEnviado: RetoEnviado | null
  conectarPresencia: () => Promise<void>
  desafiar: (rivales: JugadorEnLinea[], nivelId: string, dificultad: Dificultad) => Promise<void>
  /** El retador arranca el reto con los que ya entraron (sin esperar a los demás). */
  empezarReto: () => void
  responderInvitacion: (acepta: boolean) => Promise<void>
  cancelarReto: () => void
  /** Globitos con frases: id del jugador → frase y momento. */
  gestos: Record<string, { frase: number; t: number }>
  miX: number
  enviarGesto: (frase: number) => void
  moverme: (x: number) => void
  dejarSala: () => Promise<void>
  iniciarRonda: (nivelId: string, dificultad: Dificultad) => Promise<void>
  reportarProgreso: (avance: number, puntaje?: number, segundos?: number) => void
}

const leerDif = (): Dificultad => { try { return (localStorage.getItem('asp_dif') as Dificultad) || 'medio' } catch { return 'medio' } }

function yoEnLinea(p: Perfil, ocupado: boolean): JugadorEnLinea {
  return { id: p.id, apodo: p.apodo, rango: p.rango, avatar: p.avatar, club: p.club.nombre, clubId: p.club.id ?? '', ocupado }
}

let moverT = 0, progresoT = 0, ultimoEnvio = 0
let pendiente: ProgresoSala | null = null

type Set = (p: Partial<Estado> | ((s: Estado) => Partial<Estado>)) => void
let conectarSala: (cod: string, rol: 'anfitrion' | 'jugador', tipo: 'sala' | 'duelo', duelo?: EstadoSala['duelo'], irASala?: boolean) => Promise<void>

function crearConectarSala(set: Set, get: () => Estado) {
  return async (cod: string, rol: 'anfitrion' | 'jugador', tipo: 'sala' | 'duelo', duelo?: EstadoSala['duelo'], irASala = true) => {
    const { repo, perfil } = get()
    if (!repo.salas || !perfil) throw new Error('SALA_SIN_CONEXION')
    await get().dejarSala()
    const yo: JugadorSala = { id: perfil.id, apodo: perfil.apodo, club: perfil.club.nombre, avatar: perfil.avatar, anfitrion: rol === 'anfitrion', rango: perfil.rango }
    let ultimos: JugadorSala[] = []
    const conexion = await repo.salas.conectar(cod, yo, {
      onJugadores: j => {
        ultimos = j
        set(s => s.sala ? { sala: { ...s.sala, jugadores: j } } : {})
        // Reto: cuando entraron todos los que siguen invitados, el retador da la señal de inicio
        revisarInicio(set, get)
      },
      onProgreso: p => set(s => s.sala && (!s.sala.ronda || p.ronda === s.sala.ronda.ronda) ? { sala: { ...s.sala, progresos: { ...s.sala.progresos, [p.id]: p } } } : {}),
      onCerrada: () => set(s => s.sala ? { sala: { ...s.sala, cerrada: true } } : {}),
      onInicio: r => {
        set(s => s.sala ? { sala: { ...s.sala, ronda: r, rondaRecibida: Date.now(), progresos: {} }, pantalla: 'sala' } : {})
        if (get().sala?.rol !== 'jugador') return
        const nivel = TODOS_LOS_NIVELES.find(n => n.id === r.nivelId)
        if (nivel) setTimeout(() => { if (get().sala) get().jugar(nivel, true, r.dificultad, r.semilla) }, r.cuentaAtras * 1000)
      },
    }, rol === 'anfitrion' || tipo === 'duelo')
    set({ sala: { conexion, rol, tipo, duelo, jugadores: ultimos, progresos: {}, ronda: null, rondaRecibida: 0, cerrada: false }, ...(irASala ? { pantalla: 'sala' as const } : {}) })
  }
}

/** El retador arranca cuando ya entraron todos los invitados que no dijeron que no (o cuando él lo decide con `forzar`). */
function revisarInicio(set: Set, get: () => Estado, forzar = false) {
  const s = get().sala, reto = get().retoEnviado
  if (s?.tipo !== 'duelo' || !s.duelo?.retador || s.ronda) return
  const dentro = new Set(s.jugadores.map(x => x.id))
  const pendientes = s.duelo.rivales.filter(r => reto?.respuestas[r.id] !== false)
  const entraron = pendientes.filter(r => dentro.has(r.id))
  if (entraron.length === 0 || (!forzar && entraron.length < pendientes.length)) return
  set({ retoEnviado: null, pantalla: 'sala' })
  s.conexion.iniciarRonda({ ronda: 1, nivelId: s.duelo.nivelId, dificultad: s.duelo.dificultad, semilla: 1 + Math.floor(Math.random() * 1e9), cuentaAtras: 3 })
}

export const useJuego = create<Estado>((set, get) => (conectarSala = crearConectarSala(set as Set, get), {
  pantalla: 'intro',
  hub: 'plaza',
  pausado: false,
  legalTab: 'privacidad',
  repo: repoLocal,
  modo: null,
  perfil: null,
  puntajes: {},
  nivel: null,
  desafio: false,
  dificultad: leerDif(),
  semilla: null,
  sonido: (() => { try { return localStorage.getItem('asp_sonido') !== '0' } catch { return true } })(),
  musica: (() => { try { return localStorage.getItem('asp_musica') !== '0' } catch { return true } })(),
  toggleMusica: () => set(s => {
    try { localStorage.setItem('asp_musica', s.musica ? '0' : '1') } catch { /* */ }
    return { musica: !s.musica }
  }),
  sala: null,
  enLinea: [],
  presencia: null,
  invitacion: null,
  retoEnviado: null,
  gestos: {},
  miX: 0.3,
  mundo: (() => { try { return localStorage.getItem('asp_mundo') || 'uniformes' } catch { return 'uniformes' } })(),
  setMundo: m => { try { localStorage.setItem('asp_mundo', m) } catch { /* */ } set({ mundo: m }) },
  ir: p => {
    // Si un jugador vuelve al campamento o al mapa, deja la sala o el duelo: así nada lo "jala" de vuelta a Salas
    // más tarde (una ronda nueva o un reto que se aceptó cuando ya se había ido). El líder anfitrión mantiene su sala.
    const s = get().sala
    if (s && (p === 'plaza' || p === 'mapa' || p === 'campamentos') && (s.rol === 'jugador' || s.tipo === 'duelo')) {
      set({ retoEnviado: null })
      void get().dejarSala()
    }
    set(p === 'plaza' || p === 'mapa' ? { pantalla: p, hub: p } : { pantalla: p })
  },
  verLegal: t => set({ legalTab: t, pantalla: 'legal' }),
  setSesion: async (modo, perfil) => {
    guardarModo(modo)
    const repo = repoPara(modo)
    set({ modo, perfil, repo })
    await get().refrescarPuntajes()
    // Los invitados de una sala no entran a la isla en vivo
    if (modo === 'en_linea' && !perfil.invitado) get().conectarPresencia().catch(() => undefined)
  },
  setPerfil: p => set({ perfil: p }),
  refrescarPuntajes: async () => {
    try { set({ puntajes: await get().repo.misPuntajes() }) } catch { /* sin conexión */ }
  },
  setDificultad: d => { try { localStorage.setItem('asp_dif', d) } catch { /* */ } set({ dificultad: d }) },
  jugar: (n, desafio, dificultad, semilla = null) => {
    const forzado = import.meta.env.DEV ? (window as unknown as { __sabado?: boolean }).__sabado : undefined
    if (!get().sala && (typeof forzado === 'boolean' ? forzado : esSabado())) { set({ avisoSabado: true }); return }
    set(s => ({ nivel: n, desafio, dificultad: dificultad ?? s.dificultad, semilla, pantalla: 'juego' }))
  },
  avisoSabado: false,
  cerrarAvisoSabado: () => set({ avisoSabado: false }),
  salir: async () => {
    await get().dejarSala()
    await get().presencia?.salir().catch(() => undefined)
    set({ presencia: null, enLinea: [], invitacion: null, retoEnviado: null })
    await get().repo.salir()
    guardarModo(null)
    set({ perfil: null, modo: null, puntajes: {}, pantalla: 'acceso', repo: repoLocal })
  },
  toggleSonido: () => set(s => {
    try { localStorage.setItem('asp_sonido', s.sonido ? '0' : '1') } catch { /* */ }
    return { sonido: !s.sonido }
  }),

  // ---------- Salas en vivo ----------
  abrirSala: async (codigo, sesionId = null) => {
    const { repo, perfil } = get()
    if (!repo.salas || !perfil) throw new Error('SALA_SIN_CONEXION')
    if (codigo === null) {
      const { codigo: cod } = await repo.salas.abrir(sesionId)
      await conectarSala(cod, 'anfitrion', 'sala')
    } else {
      const r = await repo.salas.entrar(codigo.trim().toUpperCase())
      await conectarSala(r.codigo, r.anfitrion && r.tipo === 'sala' ? 'anfitrion' : 'jugador', r.tipo)
    }
  },

  // ---------- Presencia y duelos ----------
  conectarPresencia: async () => {
    const { repo, perfil, presencia } = get()
    if (!repo.salas || !perfil?.club.id || presencia) return
    const conexion = await repo.salas.presencia({ ...yoEnLinea(perfil, false), x: get().miX }, {
      onLista: j => set({ enLinea: j }),
      onInvitacion: inv => { if (!get().sala && !get().invitacion) set({ invitacion: inv }) },
      onGesto: g => set(s => ({ gestos: { ...s.gestos, [g.de]: { frase: g.frase, t: Date.now() } } })),
      onRespuesta: r => {
        const reto = get().retoEnviado
        if (!reto || reto.codigo !== r.codigo || !reto.rivales.some(x => x.id === r.de)) return
        const respuestas = { ...reto.respuestas, [r.de]: r.acepta }
        // Todos dijeron que no: se cancela. Si no, se espera a que entren los que aceptaron.
        if (reto.rivales.every(x => respuestas[x.id] === false)) { set({ retoEnviado: { ...reto, respuestas, estado: 'rechazado' } }); get().dejarSala(); return }
        set({ retoEnviado: { ...reto, respuestas } })
        revisarInicio(set as Set, get)
      },
    })
    set({ presencia: conexion })
  },
  desafiar: async (rivales, nivelId, dificultad) => {
    const { repo, presencia, perfil } = get()
    if (!repo.salas || !presencia || !perfil) throw new Error('SALA_SIN_CONEXION')
    const lista = rivales.filter((r, i) => rivales.findIndex(x => x.id === r.id) === i).slice(0, 3)
    const codigo = await repo.salas.crearReto(lista.map(r => r.id))
    set({ retoEnviado: { rivales: lista, respuestas: {}, codigo, nivelId, dificultad, estado: 'esperando' } })
    await conectarSala(codigo, 'jugador', 'duelo', { rivales: lista, nivelId, dificultad, retador: true }, false)
    for (const r of lista) {
      const otros = lista.filter(x => x.id !== r.id).map(x => x.apodo)
      await presencia.invitar({ para: r.id, de: yoEnLinea(perfil, false), codigo, nivelId, dificultad, otros: otros.length ? otros : undefined })
    }
  },
  empezarReto: () => revisarInicio(set as Set, get, true),
  responderInvitacion: async acepta => {
    const { invitacion: inv, presencia, perfil, repo } = get()
    if (!inv || !perfil) return
    set({ invitacion: null })
    await presencia?.responder({ para: inv.de.id, de: perfil.id, codigo: inv.codigo, acepta }).catch(() => undefined)
    if (!acepta || !repo.salas) return
    await repo.salas.entrar(inv.codigo)
    await conectarSala(inv.codigo, 'jugador', 'duelo', { rivales: [inv.de], nivelId: inv.nivelId, dificultad: inv.dificultad, retador: false })
  },
  enviarGesto: frase => {
    const { presencia, perfil, gestos } = get()
    if (!perfil) return
    const mio = gestos[perfil.id]
    if (mio && Date.now() - mio.t < 2500) return
    set({ gestos: { ...gestos, [perfil.id]: { frase, t: Date.now() } } })
    presencia?.gesto(perfil.id, frase).catch(() => undefined)
  },
  moverme: x => {
    const nx = Math.min(0.92, Math.max(0.08, x))
    set({ miX: nx })
    // Se avisa como mucho una vez cada 0,7 s (con la última posición): menos mensajes, igual de fluido
    if (moverT) return
    moverT = window.setTimeout(() => { moverT = 0; get().presencia?.mover(get().miX).catch(() => undefined) }, 700)
  },
  cancelarReto: () => {
    const reto = get().retoEnviado
    set({ retoEnviado: null })
    if (reto) get().dejarSala()
  },
  dejarSala: async () => {
    const s = get().sala
    if (!s) return
    set({ sala: null })
    try { if (s.rol === 'anfitrion') await s.conexion.cerrar(); else await s.conexion.salir() } catch { /* */ }
  },
  iniciarRonda: async (nivelId, dificultad) => {
    const s = get().sala
    if (!s) return
    const ronda = (s.ronda?.ronda ?? 0) + 1
    await s.conexion.iniciarRonda({ ronda, nivelId, dificultad, semilla: Math.floor(Math.random() * 1e9), cuentaAtras: 3 })
  },
  reportarProgreso: (avance, puntaje, segundos) => {
    const { sala, perfil } = get()
    if (!sala || sala.rol !== 'jugador' || !sala.ronda || !perfil) return
    const p = { id: perfil.id, apodo: perfil.apodo, avance, puntaje, segundos, ronda: sala.ronda.ronda }
    // Tu propio avance se ve al instante; a los demás se les envía como mucho cada 1 s (duelo) o 2,5 s (sala).
    // El resultado final (con puntaje) sale siempre enseguida.
    set(s => s.sala ? { sala: { ...s.sala, progresos: { ...s.sala.progresos, [p.id]: p } } } : {})
    pendiente = p
    const espera = sala.tipo === 'duelo' ? 1000 : 2500
    const enviar = () => { const x = pendiente; pendiente = null; ultimoEnvio = Date.now(); if (x) get().sala?.conexion.enviarProgreso(x).catch(() => undefined) }
    clearTimeout(progresoT)
    if (puntaje !== undefined || Date.now() - ultimoEnvio >= espera) enviar()
    else progresoT = window.setTimeout(enviar, espera - (Date.now() - ultimoEnvio))
  },
}))

// Los demás ven si estás jugando (no se les deja retarte en medio de un nivel)
useJuego.subscribe((s, prev) => {
  if (s.pantalla !== prev.pantalla && s.presencia && (s.pantalla === 'juego' || prev.pantalla === 'juego')) {
    s.presencia.ocupado(s.pantalla === 'juego').catch(() => undefined)
  }
})

// Solo en desarrollo: permite a las pruebas automáticas simular jugadores en línea.
if (import.meta.env.DEV) (window as unknown as { __juego: typeof useJuego }).__juego = useJuego
