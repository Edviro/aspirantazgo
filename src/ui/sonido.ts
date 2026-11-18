import { useJuego } from './estado'

// Efectos sintetizados con WebAudio: cero archivos de audio que descargar.
let ctx: AudioContext | null = null
const audio = () => (ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)())

function tono(freq: number, dur: number, tipo: OscillatorType = 'sine', vol = 0.12, delay = 0) {
  if (!useJuego.getState().sonido) return
  try {
    const a = audio()
    const o = a.createOscillator(), g = a.createGain()
    o.type = tipo
    o.frequency.setValueAtTime(freq, a.currentTime + delay)
    g.gain.setValueAtTime(0, a.currentTime + delay)
    g.gain.linearRampToValueAtTime(vol, a.currentTime + delay + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delay + dur)
    o.connect(g).connect(a.destination)
    o.start(a.currentTime + delay)
    o.stop(a.currentTime + delay + dur + 0.02)
  } catch { /* sin audio */ }
}

const vibrar = (p: number | number[]) => { try { navigator.vibrate?.(p) } catch { /* */ } }

export const sfx = {
  tomar: () => tono(520, 0.06, 'triangle', 0.06),
  bien: () => { tono(660, 0.1, 'triangle'); tono(990, 0.16, 'triangle', 0.1, 0.07) },
  perfecto: () => { tono(784, 0.1, 'square', 0.06); tono(1047, 0.1, 'square', 0.06, 0.08); tono(1319, 0.22, 'square', 0.06, 0.16) },
  mal: () => { tono(200, 0.18, 'sawtooth', 0.07); vibrar(80) },
  click: () => tono(880, 0.04, 'sine', 0.05),
  victoria: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.22, 'triangle', 0.1, i * 0.11)),
  trompeta: () => [392, 523, 659, 784].forEach((f, i) => tono(f, i === 3 ? 0.45 : 0.14, 'sawtooth', 0.05, i * 0.15)),
}
