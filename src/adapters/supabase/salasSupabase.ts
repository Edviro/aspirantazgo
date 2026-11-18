import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { ConexionSala, EventosSala, InicioRonda, JugadorSala, ProgresoSala, PuertoSalas } from '../../application/puertos'

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

/**
 * Salas en vivo con Supabase Realtime: "presence" para saber quién está conectado
 * y "broadcast" para el inicio de cada ronda y el avance de cada jugador.
 * No se guarda nada en la base de datos: la sala existe mientras el anfitrión la tenga abierta.
 */
export class SalasSupabase implements PuertoSalas {
  private sb: SupabaseClient
  constructor(sb: SupabaseClient) { this.sb = sb }

  nuevoCodigo() {
    return Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('')
  }

  conectar(codigo: string, yo: JugadorSala, ev: EventosSala): Promise<ConexionSala> {
    const nombre = 'sala-' + codigo.toUpperCase()
    const canal: RealtimeChannel = this.sb.channel(nombre, { config: { presence: { key: yo.id }, broadcast: { self: true } } })

    canal.on('presence', { event: 'sync' }, () => {
      const estado = canal.presenceState<JugadorSala>()
      const lista = Object.values(estado).map(v => v[0]).filter(Boolean)
      ev.onJugadores?.(lista)
    })
    canal.on('broadcast', { event: 'inicio' }, ({ payload }) => ev.onInicio?.(payload as InicioRonda))
    canal.on('broadcast', { event: 'progreso' }, ({ payload }) => ev.onProgreso?.(payload as ProgresoSala))
    canal.on('broadcast', { event: 'cerrada' }, () => ev.onCerrada?.())

    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('SALA_SIN_CONEXION')), 10000)
      canal.subscribe(async estado => {
        if (estado === 'SUBSCRIBED') {
          clearTimeout(t)
          await canal.track(yo)
          resolve({
            codigo: codigo.toUpperCase(),
            iniciarRonda: async r => { await canal.send({ type: 'broadcast', event: 'inicio', payload: r }) },
            enviarProgreso: async p => { await canal.send({ type: 'broadcast', event: 'progreso', payload: p }) },
            cerrar: async () => { await canal.send({ type: 'broadcast', event: 'cerrada', payload: {} }); await this.sb.removeChannel(canal) },
            salir: async () => { await canal.untrack(); await this.sb.removeChannel(canal) },
          })
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
          clearTimeout(t)
          reject(new Error('SALA_SIN_CONEXION'))
        }
      })
    })
  }
}
