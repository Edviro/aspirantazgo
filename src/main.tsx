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
import { precargarOficiales } from './assetsOficiales'

// Los emblemas oficiales se bajan una vez y quedan listos para el 2D y las texturas del 3D.
precargarOficiales()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
