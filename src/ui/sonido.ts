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

// ---- Emoción: cada acierto/error avisa a la capa visual (combo, chispas, sacudida) ----
export type Emocion = 'bien' | 'perfecto' | 'mal'
const oyentes = new Set<(e: Emocion, combo: number) => void>()
let combo = 0, comboMax = 0, fallos = 0
/** Escucha aciertos y errores; devuelve la función para dejar de escuchar. */
export function alEmocion(f: (e: Emocion, combo: number) => void) { oyentes.add(f); return () => { oyentes.delete(f) } }
export const reiniciarCombo = () => { combo = 0; comboMax = 0; fallos = 0 }
/** Mejor racha de aciertos y fallos de la partida actual (para las medallas). */
export const rachaDePartida = () => ({ comboMax, fallos })
function emitir(e: Emocion) {
  combo = e === 'mal' ? 0 : combo + 1
  comboMax = Math.max(comboMax, combo)
  if (e === 'mal') fallos++
  oyentes.forEach(f => { try { f(e, combo) } catch { /* */ } })
}
/** Con cada acierto seguido, el sonido sube un poquito de tono (como en los juegos de arcade). */
const subir = () => 1 + Math.min(combo, 10) * 0.035

export const sfx = {
  tomar: () => tono(520, 0.06, 'triangle', 0.06),
  bien: () => { const k = subir(); tono(660 * k, 0.1, 'triangle'); tono(990 * k, 0.16, 'triangle', 0.1, 0.07); emitir('bien') },
  perfecto: () => { const k = subir(); tono(784 * k, 0.1, 'square', 0.06); tono(1047 * k, 0.1, 'square', 0.06, 0.08); tono(1319 * k, 0.22, 'square', 0.06, 0.16); emitir('perfecto') },
  mal: () => { tono(200, 0.18, 'sawtooth', 0.07); tono(150, 0.22, 'sawtooth', 0.05, 0.08); vibrar(80); emitir('mal') },
  /** Llega un mensaje en la isla */
  burbuja: () => { tono(740, 0.06, 'sine', 0.07); tono(1110, 0.09, 'sine', 0.06, 0.06) },
  /** Reloj que se acaba */
  tic: () => tono(1600, 0.03, 'square', 0.035),
  /** Hito de combo */
  racha: () => [988, 1319, 1760].forEach((f, i) => tono(f, 0.1, 'square', 0.05, i * 0.05)),
  click: () => tono(880, 0.04, 'sine', 0.05),
  victoria: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.22, 'triangle', 0.1, i * 0.11)),
  /** Letrero nuevo (lluvia): campanita de dos tonos */
  aviso: () => { tono(1175, 0.12, 'triangle', 0.09); tono(1568, 0.22, 'triangle', 0.09, 0.12) },
  /** ¡Nivel completado! */
  nivel: () => {
    [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.16, 'square', 0.05, i * 0.1))
    tono(1047, 0.5, 'square', 0.05, 0.45); tono(1319, 0.5, 'triangle', 0.07, 0.45); tono(784, 0.5, 'triangle', 0.06, 0.45)
  },
  desbloqueo: () => [880, 1109, 1319, 1760].forEach((f, i) => tono(f, 0.12, 'triangle', 0.07, i * 0.06)),
  zas: () => { tono(1400, 0.05, 'square', 0.04); tono(700, 0.09, 'triangle', 0.08, 0.03) },
  trompeta: () => [392, 523, 659, 784].forEach((f, i) => tono(f, i === 3 ? 0.45 : 0.14, 'sawtooth', 0.05, i * 0.15)),
}
