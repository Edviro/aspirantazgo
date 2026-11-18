import { lazy, Suspense } from 'react'
import { useJuego } from './ui/estado'
import Intro from './ui/pantallas/Intro'

// Las pantallas con 3D se cargan aparte: la portada abre al instante incluso en celulares modestos.
const Acceso = lazy(() => import('./ui/pantallas/Acceso'))
const Editor = lazy(() => import('./ui/pantallas/Editor'))
const Mapa = lazy(() => import('./ui/pantallas/Mapa'))
const Juego = lazy(() => import('./ui/pantallas/Juego'))
const Ranking = lazy(() => import('./ui/pantallas/Ranking'))
const Legal = lazy(() => import('./ui/pantallas/Legal'))
const Director = lazy(() => import('./ui/pantallas/Director'))

function Cargando() {
  return <div className="pantalla cargando-pantalla"><div className="spinner" /></div>
}

export default function App() {
  const pantalla = useJuego(s => s.pantalla)
  return (
    <Suspense fallback={<Cargando />}>
      {pantalla === 'intro' && <Intro />}
      {pantalla === 'acceso' && <Acceso />}
      {pantalla === 'editor' && <Editor />}
      {pantalla === 'mapa' && <Mapa />}
      {pantalla === 'juego' && <Juego />}
      {pantalla === 'ranking' && <Ranking />}
      {pantalla === 'legal' && <Legal />}
      {pantalla === 'director' && <Director />}
    </Suspense>
  )
}
