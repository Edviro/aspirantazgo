import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { precargarOficiales } from './assetsOficiales'

// Los emblemas oficiales se bajan una vez y quedan listos para el 2D y las texturas del 3D.
precargarOficiales()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
