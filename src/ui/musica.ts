import { useJuego } from './estado'

/**
 * Música original del juego, compuesta y sintetizada aquí mismo (WebAudio).
 * No usa grabaciones ni canciones de terceros: no hay derechos de autor que pagar ni archivos que descargar.
 * Estilo: marcha de campamento con progresiones de himno (I–IV–V–I), en sonido de 8 bits.
 */

type Pista = 'mapa' | 'juego'
interface Tema { bpm: number; acordes: string[]; melodia: string[]; volMelodia: number }

// Cada compás: 8 corcheas. "-" alarga la nota anterior, "." es silencio.
const TEMAS: Record<Pista, Tema> = {
  mapa: {
    bpm: 112,
    acordes: ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G', 'C', 'Am', 'D', 'G', 'Em', 'C', 'D'],
    melodia: [
      'B4 - G4 - D5 - - -', 'C5 - E5 - G5 - E5 -', 'D5 - F#5 - A5 - F#5 -', 'G5 - - - D5 - B4 -',
      'E5 - G5 - E5 - B4 -', 'C5 - E5 - D5 - C5 -', 'A4 - B4 - C5 - A4 -', 'G4 - - - . . D4 -',
      'G4 - A4 - B4 - D5 -', 'E5 - D5 - C5 - E5 -', 'C5 - B4 - A4 - C5 -', 'D5 - - - F#5 - A5 -',
      'G5 - F#5 - E5 - D5 -', 'E5 - D5 - B4 - G4 -', 'C5 - E5 - D5 - B4 -', 'A4 - - - D5 . D4 -',
    ],
    volMelodia: 0.032,
  },
  juego: {
    bpm: 132,
    acordes: ['D', 'G', 'A', 'D', 'Bm', 'G', 'A', 'D'],
    melodia: [
      'D5 . A4 . F#4 A4 D5 .', 'B4 . D5 . G5 . D5 .', 'C#5 . E5 . A5 . E5 .', 'F#5 . E5 D5 A4 . . .',
      'B4 . D5 . F#5 . D5 .', 'G4 . B4 . D5 . B4 .', 'A4 . C#5 . E5 . G5 .', 'F#5 . E5 . D5 . . .',
    ],
    volMelodia: 0.022,
  },
}

const NOTAS: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
const freq = (n: string) => {
  const m = n.match(/^([A-G]#?)(\d)$/)
  if (!m) return 0
  const midi = NOTAS[m[1]] + (Number(m[2]) + 1) * 12
  return 440 * Math.pow(2, (midi - 69) / 12)
}
const RAIZ: Record<string, [string, string]> = {
  G: ['G2', 'D3'], C: ['C3', 'G2'], D: ['D3', 'A2'], Em: ['E2', 'B2'], Am: ['A2', 'E3'], A: ['A2', 'E3'], Bm: ['B2', 'F#3'],
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let ruido: AudioBuffer | null = null
let actual: Pista | null = null
let paso = 0
let siguienteT = 0
let timer = 0

function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination)
    ruido = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
    const d = ruido.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return ctx
}

function nota(f: number, t: number, dur: number, tipo: OscillatorType, vol: number) {
  if (!ctx || !master || !f) return
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = tipo; o.frequency.setValueAtTime(f, t)
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.05)); g.gain.linearRampToValueAtTime(0, t + dur)
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02)
}

function golpe(t: number, tipo: 'bombo' | 'caja' | 'plato') {
  if (!ctx || !master || !ruido) return
  if (tipo === 'bombo') {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    g.gain.setValueAtTime(0.11, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.16)
    return
  }
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter()
  s.buffer = ruido; f.type = tipo === 'caja' ? 'bandpass' : 'highpass'; f.frequency.value = tipo === 'caja' ? 1800 : 7000
  const v = tipo === 'caja' ? 0.05 : 0.014, d = tipo === 'caja' ? 0.1 : 0.03
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d)
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + d + 0.02)
}

function programar() {
  if (!ctx || !actual) return
  const tema = TEMAS[actual]
  const corchea = 60 / tema.bpm / 2
  const pasos = tema.melodia.map(c => c.split(' '))
  const total = pasos.length * 8
  while (siguienteT < ctx.currentTime + 0.25) {
    const compas = Math.floor(paso / 8) % pasos.length, k = paso % 8
    const sim = pasos[compas][k]
    if (sim !== '-' && sim !== '.') {
      let largo = 1
      while (k + largo < 8 && pasos[compas][k + largo] === '-') largo++
      nota(freq(sim), siguienteT, largo * corchea * 0.92, 'square', tema.volMelodia)
    }
    const [r, q] = RAIZ[tema.acordes[compas % tema.acordes.length]] ?? RAIZ.G
    if (k % 2 === 0) nota(freq(k % 4 === 0 ? r : q), siguienteT, corchea * 0.9, 'triangle', 0.075)
    if (k === 0 || k === 4) golpe(siguienteT, 'bombo')
    if (k === 2 || k === 6) golpe(siguienteT, 'caja')
    if (k % 2 === 1) golpe(siguienteT, 'plato')
    siguienteT += corchea
    paso = (paso + 1) % total
  }
}

function fundido(destino: number, seg: number) {
  if (!ctx || !master) return
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
  master.gain.linearRampToValueAtTime(destino, ctx.currentTime + seg)
}

const permitida = () => useJuego.getState().musica && !useJuego.getState().pausado

/** Cambia la pista de fondo (null = silencio). Solo suena después de un toque del usuario. */
export function musica(p: Pista | null) {
  if (p === actual && timer) { fundido(permitida() ? 1 : 0, 0.4); return }
  actual = p
  clearInterval(timer); timer = 0
  if (!p) { fundido(0, 0.4); return }
  try {
    const a = audio()
    if (a.state === 'suspended') a.resume().catch(() => undefined)
    paso = 0; siguienteT = a.currentTime + 0.1
    timer = window.setInterval(programar, 50)
    fundido(permitida() ? 1 : 0, 0.8)
  } catch { /* sin audio */ }
}

// Silenciar o pausar al instante cuando cambia la preferencia o se pausa el juego
useJuego.subscribe((s, prev) => {
  if (s.musica !== prev.musica || s.pausado !== prev.pausado) fundido(s.musica && !s.pausado && actual ? 1 : 0, 0.25)
})
document.addEventListener('visibilitychange', () => fundido(!document.hidden && permitida() && actual ? 1 : 0, 0.2))
document.addEventListener('pointerdown', () => { if (ctx && ctx.state === 'suspended' && actual) ctx.resume().catch(() => undefined) })
