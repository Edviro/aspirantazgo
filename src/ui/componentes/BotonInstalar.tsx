import { useInstalar } from '../instalar'
import { Boton } from './Comunes'

/** "Descargar al celular": instala el juego como app (ícono en la pantalla de inicio, abre a pantalla completa). */
export function BotonInstalar({ variante = 'boton' }: { variante?: 'boton' | 'menu' }) {
  const { instalar, evento, instalada, ios } = useInstalar()
  // En celular siempre se ofrece: si el navegador no trae su propio aviso, se muestran los pasos
  if (instalada || (!evento && !ios && !/android|mobile/i.test(navigator.userAgent))) return null
  return variante === 'menu'
    ? <button onClick={() => { void instalar() }}>📲 Instalar en el celular</button>
    : <Boton tipo="azul" className="boton-instalar" onClick={() => { void instalar() }}>📲 Descargar al celular</Boton>
}

/** Pasos para iPhone (Safari no muestra un botón de instalar). */
export function AyudaInstalar() {
  const { verAyuda, cerrarAyuda, ios } = useInstalar()
  if (!verAyuda) return null
  return (
    <div className="velo" onClick={cerrarAyuda}>
      <div className="resultado pop ayuda-instalar" role="dialog" aria-modal="true" aria-label="Cómo instalar el juego" onClick={e => e.stopPropagation()}>
        <h2>Instálalo en tu celular</h2>
        {ios ? (
          <ol>
            <li>Abre esta página en <b>Safari</b>.</li>
            <li>Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
            <li>Elige <b>“Agregar a inicio”</b> y luego <b>Agregar</b>.</li>
          </ol>
        ) : (
          <ol>
            <li>Toca los <b>tres puntitos</b> del navegador (arriba o abajo a la derecha).</li>
            <li>Elige <b>“Instalar aplicación”</b> o <b>“Agregar a pantalla principal”</b>.</li>
            <li>Busca el ícono de Aspirantazgo en tu celular.</li>
          </ol>
        )}
        <p className="nota">Así abre a pantalla completa, más rápido y aunque la señal sea mala.</p>
        <Boton onClick={cerrarAyuda}>Entendido</Boton>
      </div>
    </div>
  )
}
