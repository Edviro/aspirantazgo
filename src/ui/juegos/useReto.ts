import { useCallback, useRef } from 'react'
import { calcularPuntaje, type ResultadoReto } from '../../domain/puntuacion'
import type { Nivel } from '../../domain/niveles'
import type { ResultadoServidor } from '../../application/puertos'
import { useJuego } from '../estado'

export interface FinReto { resultado: ResultadoReto; servidor: ResultadoServidor | null; aviso?: string }

/**
 * Caso de uso "jugar un reto": cronometra, abre el intento en el servidor (que guarda la hora real)
 * y al final envía el puntaje para que el servidor lo valide.
 */
export function useReto(nivel: Nivel, desafio: boolean) {
  const t0 = useRef(0)
  const intento = useRef<Promise<string | null> | null>(null)
  const repo = useJuego(s => s.repo)

  const iniciar = useCallback(() => {
    t0.current = performance.now()
    intento.current = desafio ? repo.iniciarReto(nivel.id).catch(() => null) : Promise.resolve(null)
  }, [desafio, nivel.id, repo])

  const segundos = () => (performance.now() - t0.current) / 1000

  const terminar = useCallback(async (factores: number[], errores: number): Promise<FinReto> => {
    const resultado = calcularPuntaje(factores, errores, segundos(), nivel.parSeg)
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
  }, [desafio, nivel.parSeg, repo])

  return { iniciar, terminar, segundos }
}
