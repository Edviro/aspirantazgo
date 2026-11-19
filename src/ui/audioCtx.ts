/**
 * Un solo AudioContext para música y efectos. Dos contextos abren dos salidas de audio en el celular
 * y compiten por el procesador (eso produce chasquidos). "balanced" usa un búfer algo más grande:
 * los efectos siguen sonando al instante y la música no se corta cuando el celular está ocupado.
 */
let ctx: AudioContext | null = null
export function contextoAudio(): AudioContext {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    try { ctx = new C({ latencyHint: 'balanced' }) } catch { ctx = new C() }
  }
  return ctx
}
export const hayAudio = () => ctx !== null
