import type { MedallaId } from '../../domain/medallas'
import { useCallback, useRef } from 'react'
import { calcularPuntaje, type ResultadoReto } from '../../domain/puntuacion'
import { DIFICULTADES } from '../../domain/dificultad'
import type { Nivel } from '../../domain/niveles'
import type { Dificultad } from '../../domain/tipos'
import type { ResultadoServidor } from '../../application/puertos'
import { useJuego } from '../estado'
import { ahora, reanudar } from '../reloj'

export interface FinReto {
  resultado: ResultadoReto; servidor: ResultadoServidor | null; aviso?: string
  /** Racha si esta partida cumplió el reto del día. */ diario?: number
  /** Medallas de esta partida y cuáles son nuevas. */ medallas?: { ganadas: MedallaId[]; nuevas: MedallaId[] }
}

/**
 * Caso de uso "jugar un reto": cronometra, abre el intento en el servidor (que guarda la hora real)
 * y al final envía el puntaje para que el servidor lo valide. En una sala, avisa el resultado a todos.
 */
export function useReto(nivel: Nivel, desafio: boolean, dificultad: Dificultad) {
  const t0 = useRef(0)
  const intento = useRef<Promise<string | null> | null>(null)
  const repo = useJuego(s => s.repo)
  const reglas = DIFICULTADES[dificultad]

  const iniciar = useCallback(() => {
    reanudar()
    t0.current = ahora()
    const sala = useJuego.getState().sala
    const codigoSala = sala && sala.rol === 'jugador' && sala.ronda ? sala.conexion.codigo : null
    intento.current = desafio ? repo.iniciarReto(nivel.id, dificultad, codigoSala).catch(() => null) : Promise.resolve(null)
    useJuego.getState().reportarProgreso(0)
  }, [desafio, nivel.id, repo, dificultad])

  const segundos = () => (ahora() - t0.current) / 1000

  const terminar = useCallback(async (factores: number[], errores: number): Promise<FinReto> => {
    const seg = segundos()
    const resultado = calcularPuntaje(factores, errores, seg, nivel.parSeg * reglas.tiempo, desafio ? reglas.multiplicador : 1)
    useJuego.getState().reportarProgreso(1, resultado.puntaje, Math.round(seg))
    if (!desafio) return { resultado, servidor: null }
    const id = await intento.current
    if (!id) return { resultado, servidor: null, aviso: 'No se pudo guardar este intento (sin conexión).' }
    try {
      const servidor = await repo.terminarReto(id, resultado.puntaje)
      await useJuego.getState().refrescarPuntajes()
      return { resultado, servidor }
    } catch {
      return { resultado, servidor: null, aviso: 'El servidor no validó este intento. ¡Inténtalo otra vez!' }
    }
  }, [desafio, nivel.parSeg, repo, reglas])

  return { iniciar, terminar, segundos }
}
