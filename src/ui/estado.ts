import { create } from 'zustand'
import type { ConexionSala, InicioRonda, JugadorSala, Perfil, ProgresoSala, RepositorioJuego } from '../application/puertos'
import { guardarModo, repoLocal, repoPara, type Modo } from '../adapters/contenedor'
import { TODOS_LOS_NIVELES, type Nivel } from '../domain/niveles'
import type { Dificultad } from '../domain/tipos'

export type Pantalla = 'intro' | 'acceso' | 'editor' | 'mapa' | 'juego' | 'ranking' | 'legal' | 'director' | 'sala'

export interface EstadoSala {
  conexion: ConexionSala
  rol: 'anfitrion' | 'jugador'
  jugadores: JugadorSala[]
  progresos: Record<string, ProgresoSala>
  ronda: InicioRonda | null
  rondaRecibida: number
  cerrada: boolean
}

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
  sala: EstadoSala | null
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
  abrirSala: (codigo: string | null) => Promise<void>
  dejarSala: () => Promise<void>
  iniciarRonda: (nivelId: string, dificultad: Dificultad) => Promise<void>
  reportarProgreso: (avance: number, puntaje?: number, segundos?: number) => void
}

const leerDif = (): Dificultad => { try { return (localStorage.getItem('asp_dif') as Dificultad) || 'medio' } catch { return 'medio' } }

export const useJuego = create<Estado>((set, get) => ({
  pantalla: 'intro',
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
  sala: null,
  mundo: (() => { try { return localStorage.getItem('asp_mundo') || 'uniformes' } catch { return 'uniformes' } })(),
  setMundo: m => { try { localStorage.setItem('asp_mundo', m) } catch { /* */ } set({ mundo: m }) },
  ir: p => set({ pantalla: p }),
  verLegal: t => set({ legalTab: t, pantalla: 'legal' }),
  setSesion: async (modo, perfil) => {
    guardarModo(modo)
    const repo = repoPara(modo)
    set({ modo, perfil, repo })
    await get().refrescarPuntajes()
  },
  setPerfil: p => set({ perfil: p }),
  refrescarPuntajes: async () => {
    try { set({ puntajes: await get().repo.misPuntajes() }) } catch { /* sin conexión */ }
  },
  setDificultad: d => { try { localStorage.setItem('asp_dif', d) } catch { /* */ } set({ dificultad: d }) },
  jugar: (n, desafio, dificultad, semilla = null) => set(s => ({ nivel: n, desafio, dificultad: dificultad ?? s.dificultad, semilla, pantalla: 'juego' })),
  salir: async () => {
    await get().dejarSala()
    await get().repo.salir()
    guardarModo(null)
    set({ perfil: null, modo: null, puntajes: {}, pantalla: 'acceso', repo: repoLocal })
  },
  toggleSonido: () => set(s => {
    try { localStorage.setItem('asp_sonido', s.sonido ? '0' : '1') } catch { /* */ }
    return { sonido: !s.sonido }
  }),

  // ---------- Salas en vivo ----------
  abrirSala: async codigo => {
    const { repo, perfil } = get()
    if (!repo.salas || !perfil) throw new Error('SALA_SIN_CONEXION')
    const anfitrion = codigo === null
    const cod = codigo ?? repo.salas.nuevoCodigo()
    const yo: JugadorSala = { id: perfil.id, apodo: perfil.apodo, club: perfil.club.nombre, avatar: perfil.avatar, anfitrion }
    let ultimos: JugadorSala[] = []
    const conexion = await repo.salas.conectar(cod, yo, {
      onJugadores: j => { ultimos = j; set(s => s.sala ? { sala: { ...s.sala, jugadores: j } } : {}) },
      onProgreso: p => set(s => s.sala && (!s.sala.ronda || p.ronda === s.sala.ronda.ronda) ? { sala: { ...s.sala, progresos: { ...s.sala.progresos, [p.id]: p } } } : {}),
      onCerrada: () => set(s => s.sala ? { sala: { ...s.sala, cerrada: true } } : {}),
      onInicio: r => {
        set(s => s.sala ? { sala: { ...s.sala, ronda: r, rondaRecibida: Date.now(), progresos: {} } } : {})
        const s = get()
        if (s.sala?.rol !== 'jugador') return
        const nivel = TODOS_LOS_NIVELES.find(n => n.id === r.nivelId)
        if (nivel) setTimeout(() => get().jugar(nivel, true, r.dificultad, r.semilla), r.cuentaAtras * 1000)
      },
    })
    set({ sala: { conexion, rol: anfitrion ? 'anfitrion' : 'jugador', jugadores: ultimos, progresos: {}, ronda: null, rondaRecibida: 0, cerrada: false }, pantalla: 'sala' })
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
