import { useEffect, useRef } from 'react'
import { ahora } from '../reloj'

/**
 * Llama a `alTerminar` cuando pasan `ms` de tiempo de JUEGO (la pausa no cuenta).
 * Se reinicia cada vez que cambia `clave` (p. ej. el número de pregunta); con `ms = null` no hace nada.
 */
export function useAutoAvance(ms: number | null, clave: unknown, alTerminar: () => void) {
  const cb = useRef(alTerminar)
  cb.current = alTerminar
  useEffect(() => {
    if (ms === null) return
    const inicio = ahora()
    let hecho = false
    const t = setInterval(() => {
      if (!hecho && ahora() - inicio >= ms) { hecho = true; clearInterval(t); cb.current() }
    }, 60)
    return () => clearInterval(t)
  }, [ms, clave])
}
