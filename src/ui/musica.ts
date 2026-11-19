import { useJuego } from './estado'
import { contextoAudio } from './audioCtx'

/**
 * Música original del juego, compuesta y sintetizada aquí mismo (WebAudio).
 * No usa grabaciones ni canciones de terceros: no hay derechos de autor que pagar ni archivos que descargar.
 * Tres climas: aventura (mapa), juego (piezas), rápida (trivias y competencias) y solemne (ceremonias).
 */

export type Pista = 'mapa' | 'juego' | 'rapido' | 'solemne' | 'himno' | 'himno_epico' | 'himno_rapido' | 'himno_aventura' | 'himno_emotivo'
interface Tema {
  bpm: number
  acordes: string[]
  /** Cada compás: 8 corcheas. "-" alarga la nota anterior, "." es silencio. */
  melodia: string[]
  volMelodia: number
  lead: OscillatorType
  /** Brillo del lead (frecuencia del filtro): bajo = suave, alto = brillante. */
  brillo: number
  bajo: 'marcha' | 'galope' | 'largo'
  bateria: 'marcha' | 'rapida' | 'nada'
  pad: number
  reverb: number
  /** Melodía doblada a la octava (más majestuosa). */
  octava?: boolean
  /** El bajo baja a la quinta a mitad de compás (como el arreglo del himno). */
  quinta?: boolean
  /** Volumen de un arpegio de acompañamiento en corcheas (0 = sin arpegio). */
  arpegio?: number
  /** Melodía como piano: ataque rápido y se apaga sola. */
  piano?: boolean
  /** Tambores de marcha con redoble al final de cada frase (épico). */
  timbales?: boolean
}

// Himno de los Conquistadores (letra y música: Henry T. Bergh). Transcrito de la partitura que envió Eduardo,
// en La bemol mayor. Primer compás = anacrusa ("Con-"). Todas las versiones usan la misma melodía y armonía.
const HIMNO = {
  acordes: ['Ab', 'Ab', 'Ab', 'Ab', 'Db', 'Db', 'Bb', 'Eb', 'Ab', 'Ab', 'Ab', 'Ab', 'Db', 'Db', 'Ab', 'Eb', 'Ab'],
  melodia: [
    '. . . . . . Eb4 -',
    'Ab4 - G4 Ab4 G4 - F4 Eb4', 'C4 - - - C4 - Eb4 -', 'Ab4 - G4 Ab4 Bb4 - Ab4 -', 'Db4 - Eb4 - F4 - - -',
    'F4 F4 E4 F4 Gb4 - Ab4 -', 'Bb4 - - - Bb4 Ab4 G4 F4', 'Eb4 - E4 - F4 - Db4 -', 'C4 - - - - - Eb4 -',
    'Ab4 - G4 Ab4 G4 - F4 Eb4', 'C4 - - - - - Eb4 -', 'Ab4 - G4 Ab4 Bb4 - Ab4 -', 'F4 - - - - - F4 -',
    'Ab4 - Ab4 Ab4 Bb4 - Ab4 -', 'C5 - Ab4 - Db5 - - Bb4', 'Eb5 - - - G4 - - -', 'Ab4 - - - - - . .',
  ],
}

const TEMAS: Record<Pista, Tema> = {
  /** Solemne: órgano y eco de iglesia (ceremonias e inicio). */
  himno: { ...HIMNO, bpm: 84, lead: 'triangle', brillo: 2200, bajo: 'largo', bateria: 'nada', pad: 0.03, reverb: 0.5, volMelodia: 0.075, octava: true, quinta: true },
  /** Épico: metales, tambores de marcha y redoble (salas y duelos). */
  himno_epico: { ...HIMNO, bpm: 104, lead: 'sawtooth', brillo: 2400, bajo: 'marcha', bateria: 'nada', pad: 0.026, reverb: 0.3, volMelodia: 0.05, octava: true, timbales: true },
  /** Rápido: para trivias y competencias locas. */
  himno_rapido: { ...HIMNO, bpm: 156, lead: 'square', brillo: 3400, bajo: 'galope', bateria: 'rapida', pad: 0, reverb: 0.12, volMelodia: 0.03, arpegio: 0.018 },
  /** Aventura: marcha alegre para armar uniformes. */
  himno_aventura: { ...HIMNO, bpm: 112, lead: 'triangle', brillo: 2400, bajo: 'marcha', bateria: 'marcha', pad: 0.012, reverb: 0.2, volMelodia: 0.06, arpegio: 0.012 },
  /** Emotivo: piano suave y lento (logros y certificado). */
  himno_emotivo: { ...HIMNO, bpm: 66, lead: 'triangle', brillo: 1700, bajo: 'largo', bateria: 'nada', pad: 0.018, reverb: 0.6, volMelodia: 0.08, piano: true, quinta: true, arpegio: 0.016 },
  mapa: {
    bpm: 112, lead: 'square', brillo: 2600, bajo: 'marcha', bateria: 'marcha', pad: 0.012, reverb: 0.22, volMelodia: 0.03,
    acordes: ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'G', 'G', 'C', 'Am', 'D', 'G', 'Em', 'C', 'D'],
    melodia: [
      'B4 - G4 - D5 - - -', 'C5 - E5 - G5 - E5 -', 'D5 - F#5 - A5 - F#5 -', 'G5 - - - D5 - B4 -',
      'E5 - G5 - E5 - B4 -', 'C5 - E5 - D5 - C5 -', 'A4 - B4 - C5 - A4 -', 'G4 - - - . . D4 -',
      'G4 - A4 - B4 - D5 -', 'E5 - D5 - C5 - E5 -', 'C5 - B4 - A4 - C5 -', 'D5 - - - F#5 - A5 -',
      'G5 - F#5 - E5 - D5 -', 'E5 - D5 - B4 - G4 -', 'C5 - E5 - D5 - B4 -', 'A4 - - - D5 . D4 -',
    ],
  },
  juego: {
    bpm: 120, lead: 'triangle', brillo: 1800, bajo: 'marcha', bateria: 'marcha', pad: 0.01, reverb: 0.2, volMelodia: 0.05,
    acordes: ['D', 'G', 'A', 'D', 'Bm', 'G', 'A', 'D'],
    melodia: [
      'D5 . A4 . F#4 A4 D5 .', 'B4 . D5 . G5 . D5 .', 'C#5 . E5 . A5 . E5 .', 'F#5 . E5 D5 A4 . . .',
      'B4 . D5 . F#5 . D5 .', 'G4 . B4 . D5 . B4 .', 'A4 . C#5 . E5 . G5 .', 'F#5 . E5 . D5 . . .',
    ],
  },
  rapido: {
    bpm: 164, lead: 'square', brillo: 3200, bajo: 'galope', bateria: 'rapida', pad: 0, reverb: 0.12, volMelodia: 0.026,
    acordes: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'],
    melodia: [
      'A4 C5 E5 A5 E5 C5 A4 C5', 'F4 A4 C5 F5 C5 A4 F4 A4', 'G4 C5 E5 G5 E5 C5 G4 C5', 'B4 D5 G5 B5 G5 D5 B4 D5',
      'A5 - E5 - C5 - E5 -', 'F5 - C5 - A4 - C5 -', 'G5 - D5 - B4 - D5 -', 'G#5 - E5 - B4 - G#4 -',
    ],
  },
  solemne: {
    bpm: 66, lead: 'sine', brillo: 1400, bajo: 'largo', bateria: 'nada', pad: 0.034, reverb: 0.55, volMelodia: 0.05,
    acordes: ['C', 'F', 'C', 'G', 'Am', 'F', 'G', 'C'],
    melodia: [
      'E5 - - - G5 - - -', 'F5 - - - A5 - - -', 'G5 - - - E5 - C5 -', 'D5 - - - - - - -',
      'C5 - - - E5 - - -', 'F5 - - - A4 - - -', 'B4 - - - D5 - - -', 'C5 - - - - - - -',
    ],
  },
}

const NOTAS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
const midiDe = (n: string) => { const m = n.match(/^([A-G][#b]?)(\d)$/); return m ? NOTAS[m[1]] + (Number(m[2]) + 1) * 12 : 0 }
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)
/** Notas de un acorde (fundamental, tercera, quinta) en una octava. */
function acorde(nombre: string, octava: number) {
  const menor = /m$/.test(nombre)
  const raiz = NOTAS[menor ? nombre.slice(0, -1) : nombre] + (octava + 1) * 12
  return [raiz, raiz + (menor ? 3 : 4), raiz + 7]
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let seco: GainNode | null = null
let humedo: GainNode | null = null
let ruido: AudioBuffer | null = null
let actual: Pista | null = null
let paso = 0
let siguienteT = 0
let timer = 0

function audio() {
  if (!ctx) {
    ctx = contextoAudio()
    // Cadena: voces → (seco + eco) → compresor → volumen general
    master = ctx.createGain(); master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25
    comp.connect(master).connect(ctx.destination)
    seco = ctx.createGain(); seco.connect(comp)
    humedo = ctx.createGain(); humedo.gain.value = 0.25
    // Eco de sala liviano: dos retardos con realimentación y filtro (antes era un "convolver" de 2,6 s,
    // muy pesado para celulares sencillos: era lo que producía chasquidos en la música)
    for (const [seg, fb] of [[0.137, 0.42], [0.211, 0.36]] as const) {
      const d = ctx.createDelay(1), r = ctx.createGain(), f = ctx.createBiquadFilter()
      d.delayTime.value = seg; r.gain.value = fb; f.type = 'lowpass'; f.frequency.value = 2200
      seco.connect(d); d.connect(f).connect(r).connect(d); f.connect(humedo)
    }
    humedo.connect(comp)
    ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate)
    const d = ruido.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return ctx
}

function voz(f: number, t: number, dur: number, tipo: OscillatorType, vol: number, brillo: number, ataque = 0.01, detune = 0, piano = false) {
  if (!ctx || !seco || !f) return
  const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter()
  o.type = tipo; o.frequency.setValueAtTime(f, t); o.detune.value = detune
  fl.type = 'lowpass'; fl.frequency.value = brillo; fl.Q.value = 0.7
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + ataque)
  if (piano) { g.gain.exponentialRampToValueAtTime(vol * 0.25, t + Math.min(dur, 0.9)); g.gain.linearRampToValueAtTime(0, t + dur + 0.25) }
  else { g.gain.setValueAtTime(vol, t + Math.max(ataque, dur - 0.08)); g.gain.linearRampToValueAtTime(0, t + dur) }
  o.connect(fl).connect(g).connect(seco); o.start(t); o.stop(t + dur + (piano ? 0.3 : 0.05))
}

function golpe(t: number, tipo: 'bombo' | 'caja' | 'plato', fuerza = 1) {
  if (!ctx || !seco || !ruido) return
  if (tipo === 'bombo') {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    g.gain.setValueAtTime(0.12 * fuerza, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    o.connect(g).connect(seco); o.start(t); o.stop(t + 0.17)
    return
  }
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter()
  s.buffer = ruido; f.type = tipo === 'caja' ? 'bandpass' : 'highpass'; f.frequency.value = tipo === 'caja' ? 1700 : 7500
  const v = (tipo === 'caja' ? 0.05 : 0.012) * fuerza, d = tipo === 'caja' ? 0.11 : 0.03
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d)
  s.connect(f).connect(g).connect(seco); s.start(t); s.stop(t + d + 0.02)
}

function programar() {
  if (!ctx || !actual) return
  const tema = TEMAS[actual]
  const corchea = 60 / tema.bpm / 2
  const pasos = tema.melodia.map(c => c.split(' '))
  const total = pasos.length * 8
  // Si el celular estuvo ocupado y nos atrasamos, se salta lo perdido en vez de tocarlo todo junto (eso suena a chasquido)
  if (siguienteT < ctx.currentTime + 0.02) siguienteT = ctx.currentTime + 0.06
  while (siguienteT < ctx.currentTime + 0.5) {
    const compas = Math.floor(paso / 8) % pasos.length, k = paso % 8
    const sim = pasos[compas][k]
    const nombre = tema.acordes[compas % tema.acordes.length]
    const notas = acorde(nombre, 3)
    // Melodía (con una segunda voz apenas desafinada: suena más llena, menos "robot")
    if (sim !== '-' && sim !== '.') {
      let largo = 1
      while (k + largo < 8 && pasos[compas][k + largo] === '-') largo++
      const dur = largo * corchea * (tema.bateria === 'nada' ? 1 : 0.9)
      const at = tema.piano ? 0.005 : tema.bateria === 'nada' && !tema.timbales ? 0.12 : tema.lead === 'sawtooth' ? 0.04 : 0.01
      voz(hz(midiDe(sim)), siguienteT, dur, tema.lead, tema.volMelodia, tema.brillo, at, 0, tema.piano)
      if (tema.lead === 'triangle' || tema.lead === 'sine') voz(hz(midiDe(sim)), siguienteT, dur, tema.lead, tema.volMelodia * 0.45, tema.brillo * 0.8, at + 0.01, 7, tema.piano)
      if (tema.octava) voz(hz(midiDe(sim) + 12), siguienteT, dur, 'sine', tema.volMelodia * 0.35, 3000, 0.03)
    }
    // Colchón de acordes (órgano suave)
    if (tema.pad && k === 0) for (const n of notas) voz(hz(n + 12), siguienteT, corchea * 8, 'sawtooth', tema.pad, 900, 0.35, n % 2 ? -6 : 6)
    // Bajo
    if (tema.bajo === 'marcha' && k % 2 === 0) voz(hz(k % 4 === 0 ? notas[0] - 12 : notas[2] - 12), siguienteT, corchea * 0.9, 'triangle', 0.08, 1200)
    if (tema.bajo === 'galope') voz(hz(notas[0] - 12 + (k % 4 === 3 ? 12 : 0)), siguienteT, corchea * 0.7, 'triangle', 0.07, 1400)
    if (tema.bajo === 'largo' && k === 0) voz(hz(notas[0] - 12), siguienteT, corchea * (tema.quinta ? 4 : 8), 'sine', 0.09, 600, 0.2)
    if (tema.bajo === 'largo' && k === 4 && tema.quinta) voz(hz(notas[2] - 24), siguienteT, corchea * 4, 'sine', 0.08, 600, 0.2)
    // Arpegio de acompañamiento (sube y baja por el acorde)
    if (tema.arpegio && compas > 0) { const orden = [0, 1, 2, 1]; voz(hz(notas[orden[k % 4]] + 12), siguienteT, corchea * 0.85, 'triangle', tema.arpegio, 2000, 0.005, 0, true) }
    // Timbales de marcha con redoble al cerrar cada frase de 4 compases
    if (tema.timbales) {
      if (k === 0 || k === 4) golpe(siguienteT, 'bombo', 1.3)
      if (k === 2 || k === 6) golpe(siguienteT, 'caja', 0.9)
      if (compas % 4 === 0 && k >= 6) { golpe(siguienteT, 'caja', 0.7); golpe(siguienteT + corchea / 2, 'caja', 0.8) }
    }
    // Batería
    if (tema.bateria === 'marcha') {
      if (k === 0 || k === 4) golpe(siguienteT, 'bombo')
      if (k === 2 || k === 6) golpe(siguienteT, 'caja')
      if (k % 2 === 1) golpe(siguienteT, 'plato')
    } else if (tema.bateria === 'rapida') {
      if (k % 2 === 0) golpe(siguienteT, 'bombo', 0.9)
      if (k === 2 || k === 6) golpe(siguienteT, 'caja')
      golpe(siguienteT, 'plato', 0.8)
    }
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
    if (humedo) humedo.gain.value = TEMAS[p].reverb * 0.6
    paso = 0; siguienteT = a.currentTime + 0.12
    timer = window.setInterval(programar, 100)
    fundido(permitida() ? 1 : 0, p === 'solemne' || p === 'himno' || p === 'himno_emotivo' ? 2 : 0.8)
  } catch { /* sin audio */ }
}

/** Qué pista va con cada tipo de nivel: competencias rápidas, piezas tranquilas, ceremonias solemnes. */
export function pistaDeNivel(tipo: string): Pista {
  if (tipo === 'ceremonia') return 'himno'
  if (tipo === 'quiz' || tipo === 'vf' || tipo === 'lluvia' || tipo === 'frase' || tipo === 'parejas') return 'himno_rapido'
  return 'himno_aventura'
}

// Silenciar o pausar al instante cuando cambia la preferencia o se pausa el juego
useJuego.subscribe((s, prev) => {
  if (s.musica !== prev.musica || s.pausado !== prev.pausado) fundido(s.musica && !s.pausado && actual ? 1 : 0, 0.25)
})
// En segundo plano el audio se suspende (no gasta batería ni procesador); al volver, sigue sin saltos
document.addEventListener('visibilitychange', () => {
  if (!ctx) return
  if (document.hidden) { fundido(0, 0.1); setTimeout(() => { if (document.hidden) ctx?.suspend().catch(() => undefined) }, 150) }
  else ctx.resume().then(() => { siguienteT = Math.max(siguienteT, (ctx?.currentTime ?? 0) + 0.06); fundido(permitida() && actual ? 1 : 0, 0.3) }).catch(() => undefined)
})
document.addEventListener('pointerdown', () => { if (ctx && ctx.state === 'suspended' && actual) ctx.resume().catch(() => undefined) })
