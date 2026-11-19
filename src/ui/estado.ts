import { create } from 'zustand'
import type { ConexionPresencia, ConexionSala, InicioRonda, InvitacionDuelo, JugadorEnLinea, JugadorSala, Perfil, ProgresoSala, RepositorioJuego } from '../application/puertos'
import { guardarModo, repoLocal, repoPara, type Modo } from '../adapters/contenedor'
import { TODOS_LOS_NIVELES, type Nivel } from '../domain/niveles'
import type { Dificultad } from '../domain/tipos'

export type Pantalla = 'intro' | 'acceso' | 'editor' | 'mapa' | 'juego' | 'ranking' | 'legal' | 'director' | 'sala' | 'club' | 'admin'

export interface EstadoSala {
  conexion: ConexionSala
  rol: 'anfitrion' | 'jugador'
  jugadores: JugadorSala[]
  progresos: Record<string, ProgresoSala>
  ronda: InicioRonda | null
  rondaRecibida: number
  cerrada: boolean
  tipo: 'sala' | 'duelo'
  /** En un duelo: contra quién y qué se juega. El retador da la señal de inicio. */
  duelo?: { rival: JugadorEnLinea; nivelId: string; dificultad: Dificultad; retador: boolean }
}

export interface RetoEnviado { rival: JugadorEnLinea; codigo: string; nivelId: string; dificultad: Dificultad; estado: 'esperando' | 'rechazado' }

interface Estado {
  pantalla: Pantalla
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
  salir: () => Promise<void>
  toggleSonido: () => void
  abrirSala: (codigo: string | null, sesionId?: string | null) => Promise<void>
  enLinea: JugadorEnLinea[]
  presencia: ConexionPresencia | null
  invitacion: InvitacionDuelo | null
  retoEnviado: RetoEnviado | null
  conectarPresencia: () => Promise<void>
  desafiar: (rival: JugadorEnLinea, nivelId: string, dificultad: Dificultad) => Promise<void>
  responderInvitacion: (acepta: boolean) => Promise<void>
  cancelarReto: () => void
  dejarSala: () => Promise<void>
  iniciarRonda: (nivelId: string, dificultad: Dificultad) => Promise<void>
  reportarProgreso: (avance: number, puntaje?: number, segundos?: number) => void
}

const leerDif = (): Dificultad => { try { return (localStorage.getItem('asp_dif') as Dificultad) || 'medio' } catch { return 'medio' } }

function yoEnLinea(p: Perfil, ocupado: boolean): JugadorEnLinea {
  return { id: p.id, apodo: p.apodo, rango: p.rango, avatar: p.avatar, club: p.club.nombre, clubId: p.club.id ?? '', ocupado }
}

type Set = (p: Partial<Estado> | ((s: Estado) => Partial<Estado>)) => void
let conectarSala: (cod: string, rol: 'anfitrion' | 'jugador', tipo: 'sala' | 'duelo', duelo?: EstadoSala['duelo'], irASala?: boolean) => Promise<void>

function crearConectarSala(set: Set, get: () => Estado) {
  return async (cod: string, rol: 'anfitrion' | 'jugador', tipo: 'sala' | 'duelo', duelo?: EstadoSala['duelo'], irASala = true) => {
    const { repo, perfil } = get()
    if (!repo.salas || !perfil) throw new Error('SALA_SIN_CONEXION')
    await get().dejarSala()
    const yo: JugadorSala = { id: perfil.id, apodo: perfil.apodo, club: perfil.club.nombre, avatar: perfil.avatar, anfitrion: rol === 'anfitrion' }
    let ultimos: JugadorSala[] = []
    const conexion = await repo.salas.conectar(cod, yo, {
      onJugadores: j => {
        ultimos = j
        set(s => s.sala ? { sala: { ...s.sala, jugadores: j } } : {})
        // Duelo: en cuanto el rival entra, el retador da la señal de inicio
        const s = get().sala
        if (s?.tipo === 'duelo' && s.duelo?.retador && !s.ronda && j.some(x => x.id === s.duelo!.rival.id)) {
          set({ retoEnviado: null, pantalla: 'sala' })
          s.conexion.iniciarRonda({ ronda: 1, nivelId: s.duelo.nivelId, dificultad: s.duelo.dificultad, semilla: 1 + Math.floor(Math.random() * 1e9), cuentaAtras: 3 })
        }
      },
      onProgreso: p => set(s => s.sala && (!s.sala.ronda || p.ronda === s.sala.ronda.ronda) ? { sala: { ...s.sala, progresos: { ...s.sala.progresos, [p.id]: p } } } : {}),
      onCerrada: () => set(s => s.sala ? { sala: { ...s.sala, cerrada: true } } : {}),
      onInicio: r => {
        set(s => s.sala ? { sala: { ...s.sala, ronda: r, rondaRecibida: Date.now(), progresos: {} }, pantalla: 'sala' } : {})
        if (get().sala?.rol !== 'jugador') return
        const nivel = TODOS_LOS_NIVELES.find(n => n.id === r.nivelId)
        if (nivel) setTimeout(() => { if (get().sala) get().jugar(nivel, true, r.dificultad, r.semilla) }, r.cuentaAtras * 1000)
      },
    })
    set({ sala: { conexion, rol, tipo, duelo, jugadores: ultimos, progresos: {}, ronda: null, rondaRecibida: 0, cerrada: false }, ...(irASala ? { pantalla: 'sala' as const } : {}) })
  }
}

export const useJuego = create<Estado>((set, get) => (conectarSala = crearConectarSala(set as Set, get), {
  pantalla: 'intro',
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
  mundo: (() => { try { return localStorage.getItem('asp_mundo') || 'uniformes' } catch { return 'uniformes' } })(),
  setMundo: m => { try { localStorage.setItem('asp_mundo', m) } catch { /* */ } set({ mundo: m }) },
  ir: p => set({ pantalla: p }),
  verLegal: t => set({ legalTab: t, pantalla: 'legal' }),
  setSesion: async (modo, perfil) => {
    guardarModo(modo)
    const repo = repoPara(modo)
    set({ modo, perfil, repo })
    await get().refrescarPuntajes()
    if (modo === 'en_linea') get().conectarPresencia().catch(() => undefined)
  },
  setPerfil: p => set({ perfil: p }),
  refrescarPuntajes: async () => {
    try { set({ puntajes: await get().repo.misPuntajes() }) } catch { /* sin conexión */ }
  },
  setDificultad: d => { try { localStorage.setItem('asp_dif', d) } catch { /* */ } set({ dificultad: d }) },
  jugar: (n, desafio, dificultad, semilla = null) => set(s => ({ nivel: n, desafio, dificultad: dificultad ?? s.dificultad, semilla, pantalla: 'juego' })),
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
    const conexion = await repo.salas.presencia(yoEnLinea(perfil, false), {
      onLista: j => set({ enLinea: j }),
      onInvitacion: inv => { if (!get().sala && !get().invitacion) set({ invitacion: inv }) },
      onRespuesta: r => {
        const reto = get().retoEnviado
        if (!reto || reto.codigo !== r.codigo) return
        if (r.acepta) set({ retoEnviado: null })
        else { set({ retoEnviado: { ...reto, estado: 'rechazado' } }); get().dejarSala() }
      },
    })
    set({ presencia: conexion })
  },
  desafiar: async (rival, nivelId, dificultad) => {
    const { repo, presencia, perfil } = get()
    if (!repo.salas || !presencia || !perfil) throw new Error('SALA_SIN_CONEXION')
    const codigo = await repo.salas.crearDuelo(rival.id)
    set({ retoEnviado: { rival, codigo, nivelId, dificultad, estado: 'esperando' } })
    await conectarSala(codigo, 'jugador', 'duelo', { rival, nivelId, dificultad, retador: true }, false)
    await presencia.invitar({ para: rival.id, de: yoEnLinea(perfil, false), codigo, nivelId, dificultad })
  },
  responderInvitacion: async acepta => {
    const { invitacion: inv, presencia, perfil, repo } = get()
    if (!inv || !perfil) return
    set({ invitacion: null })
    await presencia?.responder({ para: inv.de.id, de: perfil.id, codigo: inv.codigo, acepta }).catch(() => undefined)
    if (!acepta || !repo.salas) return
    await repo.salas.entrar(inv.codigo)
    await conectarSala(inv.codigo, 'jugador', 'duelo', { rival: inv.de, nivelId: inv.nivelId, dificultad: inv.dificultad, retador: false })
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
    sala.conexion.enviarProgreso({ id: perfil.id, apodo: perfil.apodo, avance, puntaje, segundos, ronda: sala.ronda.ronda }).catch(() => undefined)
  },
}))

// Los demás ven si estás jugando (no se les deja retarte en medio de un nivel)
useJuego.subscribe((s, prev) => {
  if (s.pantalla !== prev.pantalla && s.presencia && s.perfil && (s.pantalla === 'juego' || prev.pantalla === 'juego')) {
    s.presencia.actualizar(yoEnLinea(s.perfil, s.pantalla === 'juego')).catch(() => undefined)
  }
})

// Solo en desarrollo: permite a las pruebas automáticas simular jugadores en línea.
if (import.meta.env.DEV) (window as unknown as { __juego: typeof useJuego }).__juego = useJuego
