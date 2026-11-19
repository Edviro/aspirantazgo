import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource/bangers/latin-400.css'
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/archivo-black/latin-400.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import '@fontsource/nunito/latin-900.css'
import './styles.css'
import { salaDelEnlace } from './ui/componentes/CodigoQR'
salaDelEnlace() // guarda el código de sala del enlace/QR antes de que se pierda en el inicio de sesión
import { precargarOficiales } from './assetsOficiales'
import { escucharInstalacion } from './ui/instalar'
import { registerSW } from 'virtual:pwa-register'
import { useJuego } from './ui/estado'

escucharInstalacion()

// Versión nueva publicada: el service worker nuevo toma el control y la app recarga sola, pero NUNCA
// en medio de una partida o sala (solo en la portada, el mapa o el acceso). Se revisa cada 20 minutos.
let hayVersionNueva = false
const habiaControl = !!navigator.serviceWorker?.controller
registerSW({
  immediate: true,
  onRegisteredSW(_url, r) { if (r) setInterval(() => { r.update().catch(() => undefined) }, 20 * 60 * 1000) },
})
navigator.serviceWorker?.addEventListener('controllerchange', () => { if (habiaControl) { hayVersionNueva = true; aplicarSiSeguro() } })
function aplicarSiSeguro() {
  const s = useJuego.getState()
  if (hayVersionNueva && !s.sala && ['intro', 'mapa', 'acceso', 'campamentos'].includes(s.pantalla)) { hayVersionNueva = false; location.reload() }
}
useJuego.subscribe(aplicarSiSeguro)
// Si una parte del juego ya no existe en el servidor (se publicó una versión nueva), se recarga en vez de fallar
window.addEventListener('vite:preloadError', e => { e.preventDefault(); location.reload() })

// Los emblemas oficiales se bajan una vez y quedan listos para el 2D y las texturas del 3D.
precargarOficiales()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
