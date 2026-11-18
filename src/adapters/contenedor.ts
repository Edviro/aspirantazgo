import type { RepositorioJuego } from '../application/puertos'
import { RepositorioLocal } from './local/repositorioLocal'
import { RepositorioSupabase } from './supabase/repositorioSupabase'

/** Raíz de composición: aquí (y solo aquí) se decide qué adaptador usa el juego. */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const clave = import.meta.env.VITE_SUPABASE_KEY as string | undefined

export const repoLocal = new RepositorioLocal()
export const repoEnLinea: RepositorioJuego | null = url && clave ? new RepositorioSupabase(url, clave) : null

const CLAVE_MODO = 'asp_modo'
export type Modo = 'en_linea' | 'practica'

export function modoGuardado(): Modo | null {
  try { return (localStorage.getItem(CLAVE_MODO) as Modo) || null } catch { return null }
}
export function guardarModo(m: Modo | null) {
  try { if (m) localStorage.setItem(CLAVE_MODO, m); else localStorage.removeItem(CLAVE_MODO) } catch { /* */ }
}
export function repoPara(m: Modo): RepositorioJuego {
  return m === 'en_linea' && repoEnLinea ? repoEnLinea : repoLocal
}
