import { mensajeError } from '../application/errores'
import { leerSalaPendiente, olvidarSalaPendiente } from './componentes/CodigoQR'
import { useJuego } from './estado'

/**
 * Llegó con el QR o el enlace de una sala (como Quizizz): si ya tiene cuenta entra directo a la sala.
 * - 'sin': no hay sala pendiente (o no hay sesión).
 * - 'otra': es invitado de OTRA sala: su acceso no sirve aquí, debe entrar de nuevo como invitado.
 * - 'ok': ya está en la sala.
 * - cualquier otro texto: el error para mostrar (la sala se cerró, está llena…).
 */
export async function entrarSalaPendiente(): Promise<'sin' | 'otra' | 'ok' | string> {
  const cod = leerSalaPendiente()
  const s = useJuego.getState()
  if (!cod || !s.perfil || !s.repo.salas) return 'sin'
  if (s.perfil.invitado) {
    let mia: string | null = null
    try { mia = sessionStorage.getItem('asp_sala_invitado') } catch { /* */ }
    if (mia !== cod) return 'otra'
  }
  try {
    await s.abrirSala(cod)
    olvidarSalaPendiente()
    return 'ok'
  } catch (e) {
    olvidarSalaPendiente()
    return mensajeError(e)
  }
}
