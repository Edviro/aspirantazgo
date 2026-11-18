import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Alcance, AvatarConfig, DatosClub, FilaRanking, Perfil, RepositorioJuego, ResultadoServidor } from '../../application/puertos'
import type { Dificultad, Rango } from '../../domain/tipos'
import { SalasSupabase } from './salasSupabase'

const CLAVE_TOKEN = 'asp_token'

const leerToken = () => { try { return localStorage.getItem(CLAVE_TOKEN) } catch { return null } }
const guardarToken = (t: string | null) => {
  try { if (t) localStorage.setItem(CLAVE_TOKEN, t); else localStorage.removeItem(CLAVE_TOKEN) } catch { /* sin almacenamiento */ }
}

/** Adaptador de salida: toda la comunicación con Supabase pasa por funciones RPC validadas en el servidor. */
export class RepositorioSupabase implements RepositorioJuego {
  readonly enLinea = true
  readonly salas: SalasSupabase
  private sb: SupabaseClient

  constructor(url: string, clave: string) {
    this.sb = createClient(url, clave, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } })
    this.salas = new SalasSupabase(this.sb)
  }

  private async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await this.sb.rpc(fn, args)
    if (error) throw new Error(error.message)
    return data as T
  }

  private get token() { return leerToken() }

  async sesionActual(): Promise<Perfil | null> {
    if (this.token) {
      try { return await this.rpc<Perfil>('mi_perfil', { p_token: this.token }) } catch { guardarToken(null) }
    }
    const { data } = await this.sb.auth.getSession()
    if (!data.session) return null
    try { return await this.rpc<Perfil>('mi_perfil', { p_token: null }) } catch { return null }
  }

  async adultoSinClub(): Promise<string | null> {
    const { data } = await this.sb.auth.getSession()
    if (!data.session) return null
    try { await this.rpc('mi_perfil', { p_token: null }); return null } catch { return data.session.user.email ?? 'adulto' }
  }

  async unirseNino(codigo: string, apodo: string, pin: string) {
    const r = await this.rpc<{ token: string; perfil: Perfil }>('unirse_nino', { p_codigo: codigo, p_apodo: apodo, p_pin: pin })
    guardarToken(r.token)
    return r.perfil
  }

  async entrarNino(codigo: string, apodo: string, pin: string) {
    const r = await this.rpc<{ token: string; perfil: Perfil }>('entrar_nino', { p_codigo: codigo, p_apodo: apodo, p_pin: pin })
    guardarToken(r.token)
    return r.perfil
  }

  async enviarEnlaceAdulto(email: string) {
    const { error } = await this.sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) throw new Error(error.message)
  }

  crearClub(d: DatosClub) {
    return this.rpc<Perfil>('crear_club', {
      p_nombre: d.nombre, p_ciudad: d.ciudad, p_campo: d.campo, p_union: d.union, p_pais: d.pais,
      p_apodo: d.apodo, p_rango: d.rango, p_acepta: d.acepta, p_autoriza_padres: d.autorizaPadres,
    })
  }

  unirseAdulto(codigo: string, apodo: string, rango: Rango, acepta: boolean) {
    return this.rpc<Perfil>('unirse_adulto', { p_codigo: codigo, p_apodo: apodo, p_rango: rango, p_acepta: acepta })
  }

  async guardarAvatar(a: AvatarConfig) { await this.rpc('guardar_avatar', { p_token: this.token, p_avatar: a }) }

  iniciarReto(reto: string, dificultad: Dificultad) { return this.rpc<string>('iniciar_reto', { p_token: this.token, p_reto: reto, p_dificultad: dificultad }) }

  terminarReto(intento: string, puntaje: number) {
    return this.rpc<ResultadoServidor>('terminar_reto', { p_token: this.token, p_intento: intento, p_puntaje: puntaje })
  }

  misPuntajes() { return this.rpc<Record<string, number>>('mis_puntajes', { p_token: this.token }) }

  ranking(alcance: Alcance, pais?: string) {
    return this.rpc<FilaRanking[]>('ranking', { p_alcance: alcance, p_pais: pais ?? null, p_limite: 50 })
  }

  miembrosClub() { return this.rpc<{ apodo: string; rango: string; grupo_edad: string; puntos: number }[]>('miembros_de_mi_club') }

  async borrarMiembro(apodo: string) { await this.rpc('borrar_jugador_de_mi_club', { p_apodo: apodo }) }

  async borrarMisDatos() {
    await this.rpc('borrar_mis_datos', { p_token: this.token })
    await this.salir()
  }

  async salir() {
    guardarToken(null)
    await this.sb.auth.signOut().catch(() => undefined)
  }
}
