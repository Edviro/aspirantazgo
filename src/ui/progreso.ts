import { create } from 'zustand'
import { cumplirHoy, rachaVigente, retoDelDia, type Racha } from '../domain/diario'
import { logrosGanados } from '../domain/logros'
import type { Estadisticas } from '../application/puertos'
import { useJuego } from './estado'

let silencioHasta = 0
const VACIA: Racha = { ultimo: null, actual: 0, mejor: 0, total: 0 }
const leer = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d } catch { return d } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

interface Progreso {
  duenio: string | null
  racha: Racha
  logros: string[]
  /** Parches recién ganados que aún no se mostraron. */
  nuevos: string[]
  stats: Estadisticas | null
  cargar: (perfilId: string) => void
  cumplirDiario: () => boolean
  evaluar: () => void
  verNuevo: () => void
  /** Quita un parche de la cola de avisos (ya se mostró de otra forma, p. ej. en la celebración de la isla). */
  descartarNuevo: (id: string) => void
  refrescarStats: () => void
}

/** Racha del reto diario y parches de logros, por jugador (en este dispositivo; las estadísticas de duelos vienen del servidor). */
export const useProgreso = create<Progreso>((set, get) => ({
  duenio: null,
  racha: VACIA,
  logros: [],
  nuevos: [],
  stats: null,
  cargar: id => {
    if (get().duenio === id) return
    const guardados = leer<string[] | null>(`asp_logros_${id}`, null)
    set({ duenio: id, racha: leer(`asp_racha_${id}`, VACIA), logros: guardados ?? [], nuevos: [], stats: null })
    // La primera vez en este dispositivo, los parches que ya tenía se registran en silencio
    // (mientras llegan sus puntajes y estadísticas), sin anunciarlos uno por uno
    silencioHasta = guardados ? 0 : Date.now() + 5000
    useJuego.getState().repo.estadisticas().then(stats => { set({ stats }); get().evaluar() }).catch(() => get().evaluar())
  },
  cumplirDiario: () => {
    const { duenio, racha } = get()
    if (!duenio) return false
    const nueva = cumplirHoy(racha)
    if (nueva === racha) return false
    guardar(`asp_racha_${duenio}`, nueva)
    set({ racha: nueva })
    get().evaluar()
    return true
  },
  evaluar: () => {
    const { duenio, logros } = get()
    const c = contexto()
    if (!duenio || !c) return
    const ganados = logrosGanados(c)
    const nuevos = ganados.filter(id => !logros.includes(id))
    if (!nuevos.length) return
    const todos = [...logros, ...nuevos]
    guardar(`asp_logros_${duenio}`, todos)
    if (Date.now() < silencioHasta) set({ logros: todos })
    else set(s => ({ logros: todos, nuevos: [...s.nuevos, ...nuevos] }))
  },
  verNuevo: () => set(s => ({ nuevos: s.nuevos.slice(1) })),
  descartarNuevo: id => set(s => ({ nuevos: s.nuevos.filter(x => x !== id) })),
  refrescarStats: () => { useJuego.getState().repo.estadisticas().then(stats => { set({ stats }); get().evaluar() }).catch(() => undefined) },
}))

function contexto() {
  const { puntajes, perfil } = useJuego.getState()
  const { racha, stats } = useProgreso.getState()
  if (!perfil) return null
  return {
    puntajes, racha: rachaVigente(racha), rachaMejor: racha.mejor, diasCumplidos: racha.total,
    duelosGanados: stats?.duelos_ganados ?? 0, salas: stats?.salas ?? 0, partidas: stats?.partidas ?? 0,
  }
}

/** ¿Esta partida es el reto del día? (mismo nivel y misma semilla) */
export const esRetoDelDia = (nivelId: string, semilla: number | null) => {
  const r = retoDelDia()
  return r.nivel.id === nivelId && r.semilla === semilla
}

// Cada vez que cambian el perfil o los puntajes, se revisan los parches
useJuego.subscribe((s, prev) => {
  if (s.perfil?.id && s.perfil.id !== prev.perfil?.id) useProgreso.getState().cargar(s.perfil.id)
  else if (s.puntajes !== prev.puntajes) useProgreso.getState().evaluar()
  // Al salir de una sala o duelo, se actualizan las estadísticas (duelos ganados, salas jugadas)
  if (prev.sala && !s.sala) useProgreso.getState().refrescarStats()
})
