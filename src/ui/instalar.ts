import { create } from 'zustand'

/**
 * Instalar el juego en el celular (PWA). Android/Brave/Chrome avisan con "beforeinstallprompt" y
 * nosotros mostramos el botón; en iPhone no existe ese aviso, así que se explica cómo hacerlo a mano.
 */
interface EventoInstalar extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const instalada = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

interface Instalacion {
  evento: EventoInstalar | null
  instalada: boolean
  ios: boolean
  verAyuda: boolean
  /** Botón visible: hay aviso del navegador, o es iPhone sin instalar (se muestran los pasos). */
  disponible: () => boolean
  instalar: () => Promise<void>
  cerrarAyuda: () => void
}

export const useInstalar = create<Instalacion>((set, get) => ({
  evento: null,
  instalada: instalada(),
  ios: esIOS(),
  verAyuda: false,
  disponible: () => !get().instalada && (!!get().evento || get().ios),
  instalar: async () => {
    const e = get().evento
    if (!e) { set({ verAyuda: true }); return }
    await e.prompt()
    const r = await e.userChoice.catch(() => ({ outcome: 'dismissed' as const }))
    set({ evento: null, instalada: r.outcome === 'accepted' })
  },
  cerrarAyuda: () => set({ verAyuda: false }),
}))

/** Se llama al arrancar: el aviso del navegador llega una sola vez y hay que guardarlo. */
export function escucharInstalacion() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); useInstalar.setState({ evento: e as EventoInstalar }) })
  window.addEventListener('appinstalled', () => useInstalar.setState({ evento: null, instalada: true }))
}
