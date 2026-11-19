import { lazy, Suspense } from 'react'
import { useJuego } from './ui/estado'
import Intro from './ui/pantallas/Intro'
import { AvisosDuelo } from './ui/componentes/AvisosDuelo'
import { AvisoLogro } from './ui/componentes/AvisoLogro'
import { AyudaInstalar } from './ui/componentes/BotonInstalar'
import './ui/progreso'

// Las pantallas con 3D se cargan aparte: la portada abre al instante incluso en celulares modestos.
const Acceso = lazy(() => import('./ui/pantallas/Acceso'))
const Editor = lazy(() => import('./ui/pantallas/Editor'))
const Mapa = lazy(() => import('./ui/pantallas/Mapa'))
const Juego = lazy(() => import('./ui/pantallas/Juego'))
const Ranking = lazy(() => import('./ui/pantallas/Ranking'))
const Legal = lazy(() => import('./ui/pantallas/Legal'))
const Director = lazy(() => import('./ui/pantallas/Director'))
const Sala = lazy(() => import('./ui/pantallas/Sala'))
const Club = lazy(() => import('./ui/pantallas/Club'))
const Admin = lazy(() => import('./ui/pantallas/Admin'))
const Logros = lazy(() => import('./ui/pantallas/Logros'))

function Cargando() {
  return <div className="pantalla cargando-pantalla"><div className="spinner" /></div>
}

export default function App() {
  const pantalla = useJuego(s => s.pantalla)
  return (
    <div className="marco">
      <Suspense fallback={<Cargando />}>
        {pantalla === 'intro' && <Intro />}
        {pantalla === 'acceso' && <Acceso />}
        {pantalla === 'editor' && <Editor />}
        {pantalla === 'mapa' && <Mapa />}
        {pantalla === 'juego' && <Juego />}
        {pantalla === 'ranking' && <Ranking />}
        {pantalla === 'legal' && <Legal />}
        {pantalla === 'director' && <Director />}
        {pantalla === 'sala' && <Sala />}
        {pantalla === 'club' && <Club />}
        {pantalla === 'admin' && <Admin />}
        {pantalla === 'logros' && <Logros />}
      </Suspense>
      <AvisosDuelo />
      <AvisoLogro />
      <AyudaInstalar />
    </div>
  )
}
