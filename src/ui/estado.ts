import { create } from 'zustand'
import type { Perfil, RepositorioJuego } from '../application/puertos'
import { guardarModo, repoLocal, repoPara, type Modo } from '../adapters/contenedor'
import type { Nivel } from '../domain/niveles'

export type Pantalla = 'intro' | 'acceso' | 'editor' | 'mapa' | 'juego' | 'ranking' | 'legal' | 'director'

interface Estado {
  pantalla: Pantalla
  legalTab: 'privacidad' | 'terminos' | 'padres'
  repo: RepositorioJuego
  modo: Modo | null
  perfil: Perfil | null
  puntajes: Record<string, number>
  nivel: Nivel | null
  desafio: boolean
  sonido: boolean
  ir: (p: Pantalla) => void
  verLegal: (t: Estado['legalTab']) => void
  setSesion: (modo: Modo, perfil: Perfil) => Promise<void>
  setPerfil: (p: Perfil) => void
  refrescarPuntajes: () => Promise<void>
  jugar: (n: Nivel, desafio: boolean) => void
  salir: () => Promise<void>
  toggleSonido: () => void
}

export const useJuego = create<Estado>((set, get) => ({
  pantalla: 'intro',
  legalTab: 'privacidad',
  repo: repoLocal,
  modo: null,
  perfil: null,
  puntajes: {},
  nivel: null,
  desafio: false,
  sonido: (() => { try { return localStorage.getItem('asp_sonido') !== '0' } catch { return true } })(),
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
  jugar: (n, desafio) => set({ nivel: n, desafio, pantalla: 'juego' }),
  salir: async () => {
    await get().repo.salir()
    guardarModo(null)
    set({ perfil: null, modo: null, puntajes: {}, pantalla: 'acceso', repo: repoLocal })
  },
  toggleSonido: () => set(s => {
    try { localStorage.setItem('asp_sonido', s.sonido ? '0' : '1') } catch { /* */ }
    return { sonido: !s.sonido }
  }),
}))
