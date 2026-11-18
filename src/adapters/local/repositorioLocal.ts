import type { Alcance, AvatarConfig, FilaRanking, Perfil, RepositorioJuego } from '../../application/puertos'

/**
 * Adaptador de "modo práctica": todo queda en este dispositivo. Sin cuenta, sin servidor, sin ranking público.
 * También permite jugar sin conexión.
 */
const K = { perfil: 'asp_local_perfil', puntos: 'asp_local_puntos', intentos: 'asp_local_intentos' }

const leer = <T>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d } catch { return d } }
const escribir = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

const memoria: Record<string, number> = {}

export class RepositorioLocal implements RepositorioJuego {
  readonly enLinea = false

  async sesionActual() { return leer<Perfil | null>(K.perfil, null) }
  async adultoSinClub() { return null }

  async iniciarPractica(apodo: string): Promise<Perfil> {
    const p: Perfil = {
      id: 'local', apodo, rango: 'conquistador', grupo_edad: 'menor', avatar: {},
      club: { nombre: 'Modo práctica', codigo: '------', ciudad: '—', campo: '—', pais: 'PE' },
    }
    escribir(K.perfil, p)
    return p
  }

  async unirseNino(): Promise<Perfil> { throw new Error('Sin conexión') }
  async entrarNino(): Promise<Perfil> { throw new Error('Sin conexión') }
  async enviarEnlaceAdulto() { throw new Error('Sin conexión') }
  async crearClub(): Promise<Perfil> { throw new Error('Sin conexión') }
  async unirseAdulto(): Promise<Perfil> { throw new Error('Sin conexión') }

  async guardarAvatar(a: AvatarConfig) {
    const p = leer<Perfil | null>(K.perfil, null)
    if (p) escribir(K.perfil, { ...p, avatar: a })
  }

  async iniciarReto(reto: string) {
    const id = reto + ':' + Date.now()
    memoria[id] = Date.now()
    return id
  }

  async terminarReto(intento: string, puntaje: number) {
    const reto = intento.split(':')[0]
    const puntos = leer<Record<string, number>>(K.puntos, {})
    const mejor = Math.max(puntos[reto] ?? 0, puntaje)
    puntos[reto] = mejor
    escribir(K.puntos, puntos)
    return { puntaje, mejor, puesto: 1 }
  }

  async misPuntajes() { return leer<Record<string, number>>(K.puntos, {}) }

  async ranking(alcance: Alcance): Promise<FilaRanking[]> {
    const p = leer<Perfil | null>(K.perfil, null)
    if (!p || alcance !== 'jugador') return []
    const total = Object.values(leer<Record<string, number>>(K.puntos, {})).reduce((a, b) => a + b, 0)
    return [{ posicion: 1, nombre: p.apodo, detalle: 'Modo práctica', pais: p.club.pais, puntos: total, jugadores: 1, avatar: p.avatar, rango: p.rango }]
  }

  async miembrosClub() { return [] }
  async borrarMiembro() { /* no aplica */ }
  async borrarMisDatos() { Object.values(K).forEach(k => { try { localStorage.removeItem(k) } catch { /* */ } }) }
  async salir() { try { localStorage.removeItem(K.perfil) } catch { /* */ } }
}
