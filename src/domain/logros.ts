import { APROBADO, estrellasDeMejor } from './puntuacion'
import { MUNDO_UNIFORMES } from './niveles'

export interface ContextoLogros {
  puntajes: Record<string, number>
  racha: number
  rachaMejor: number
  diasCumplidos: number
  duelosGanados: number
  salas: number
  partidas: number
  /** Medallas de nivel ganadas (sin errores, combo, leyenda). */
  medallas?: number
  /** Medallas ganadas solo en los niveles de la Isla del Uniforme. */
  medallasIsla?: number
}

export type Figura = 'medalla' | 'estrella' | 'escudo' | 'llama' | 'espadas' | 'corona' | 'manga' | 'carta' | 'brujula' | 'tienda' | 'trofeo' | 'panoleta' | 'rayo'

export interface Logro { id: string; nombre: string; como: string; color: string; figura: Figura; cumple: (c: ContextoLogros) => boolean }

const aprobados = (c: ContextoLogros) => Object.values(c.puntajes).filter(p => p >= APROBADO).length
const conTres = (c: ContextoLogros) => Object.values(c.puntajes).filter(p => estrellasDeMejor(p) === 3).length
const tres = (c: ContextoLogros, id: string) => estrellasDeMejor(c.puntajes[id] ?? 0) === 3

/** Parches que se ganan jugando. Se calculan con datos que ya guarda el juego. */
export const LOGROS: Logro[] = [
  { id: 'primer-paso', nombre: 'Primer paso', como: 'Aprueba tu primer desafío.', color: '#2C6BE0', figura: 'brujula', cumple: c => aprobados(c) >= 1 },
  { id: 'tres-estrellas', nombre: 'Impecable', como: 'Consigue 3 estrellas en un nivel.', color: '#FFC20E', figura: 'estrella', cumple: c => conTres(c) >= 1 },
  { id: 'perfeccionista', nombre: 'Perfeccionista', como: 'Consigue 3 estrellas en 5 niveles.', color: '#D7242F', figura: 'corona', cumple: c => conTres(c) >= 5 },
  { id: 'mangas', nombre: 'Mangas de manual', como: '3 estrellas en la manga derecha y en la izquierda.', color: '#0E4B45', figura: 'manga', cumple: c => tres(c, 'u02-manga-derecha') && tres(c, 'u03-manga-izquierda') },
  { id: 'memoria', nombre: 'Memoria de águila', como: '3 estrellas en Memoria del uniforme.', color: '#7A1F3D', figura: 'carta', cumple: c => tres(c, 'u17-memoria') },
  { id: 'leyenda', nombre: 'Leyenda', como: 'Aprueba un nivel en dificultad Leyenda.', color: '#1E140C', figura: 'rayo', cumple: c => Object.values(c.puntajes).some(p => p > 1000) },
  { id: 'isla', nombre: 'Isla del Uniforme', como: 'Aprueba todos los niveles de la isla.', color: '#2FB463', figura: 'escudo', cumple: c => MUNDO_UNIFORMES.niveles.every(n => (c.puntajes[n.id] ?? 0) >= APROBADO) },
  { id: 'racha-3', nombre: 'Constante', como: 'Cumple el reto del día 3 días seguidos.', color: '#F08A00', figura: 'llama', cumple: c => c.rachaMejor >= 3 },
  { id: 'racha-7', nombre: 'Fuego de campamento', como: 'Cumple el reto del día 7 días seguidos.', color: '#D7242F', figura: 'llama', cumple: c => c.rachaMejor >= 7 },
  { id: 'en-equipo', nombre: 'En equipo', como: 'Juega una sala en vivo con tu club.', color: '#5B3FA8', figura: 'tienda', cumple: c => c.salas >= 1 },
  { id: 'duelista', nombre: 'Duelista', como: 'Gana tu primer duelo.', color: '#C0392B', figura: 'espadas', cumple: c => c.duelosGanados >= 1 },
  { id: 'campeon', nombre: 'Campeón', como: 'Gana 10 duelos.', color: '#B8860B', figura: 'trofeo', cumple: c => c.duelosGanados >= 10 },
  { id: 'medallas-10', nombre: 'Coleccionista', como: 'Gana 10 medallas de nivel.', color: '#0F7C8C', figura: 'medalla', cumple: c => (c.medallas ?? 0) >= 10 },
  { id: 'medallas-todas', nombre: 'Inspector total', como: 'Gana las 3 medallas en todos los niveles de la isla.', color: '#B8860B', figura: 'medalla', cumple: c => (c.medallasIsla ?? 0) >= MUNDO_UNIFORMES.niveles.length * 3 },
  { id: 'veterano', nombre: 'Veterano', como: 'Termina 50 partidas.', color: '#4A5470', figura: 'panoleta', cumple: c => c.partidas >= 50 },
]

export const logrosGanados = (c: ContextoLogros) => LOGROS.filter(l => l.cumple(c)).map(l => l.id)
