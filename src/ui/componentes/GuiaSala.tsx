import { useState } from 'react'
import { Boton } from './Comunes'

const PASOS: { t: string; d: string }[] = [
  { t: 'Abre la sala', d: 'Desde el Panel del líder (o el de administrador) toca «Abrir sala». Sale un código de 5 letras y un QR. La sala dura 4 horas.' },
  { t: 'Proyecta el QR', d: 'Toca «Proyectar QR» para verlo en pantalla completa en el proyector o la TV. Los chicos lo escanean con la cámara del celular y se abre el juego en la sala.' },
  { t: 'Ellos entran', d: 'Quien tiene cuenta entra con su cuenta y suma a su personaje. Quien no tiene, entra como invitado: solo su nombre y su club, como en Quizizz. Verás la lista de conectados en vivo.' },
  { t: 'Arma las dinámicas', d: 'Elige el campamento y el nivel, y agrégalos a la lista (hasta 10). La dificultad la eliges tú.' },
  { t: 'Empieza con una práctica', d: '«Ronda de práctica» es para que aprendan a jugar: todos juegan el mismo nivel, ves su avance, pero no suma puntos.' },
  { t: 'Juega y mira la carrera', d: 'Al empezar, todos ven una cuenta 3-2-1 y juegan el mismo reto a la vez. Ves en vivo cuánto avanza cada uno y su puntaje cuando termina.' },
  { t: 'Podio y total', d: 'Cuando todos terminan sale el podio de la ronda (verificado por el servidor). Al final, el puntaje total suma todas las dinámicas: ese es el ganador del curso.' },
]

/** Guía rápida para el líder: cómo usar una sala en vivo (antes de abrirla o durante). */
export function GuiaSala({ onCerrar }: { onCerrar: () => void }) {
  const [i, setI] = useState(0)
  const p = PASOS[i]
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="resultado pop guia-sala" role="dialog" aria-modal="true" aria-labelledby="guia-titulo" onClick={e => e.stopPropagation()}>
        <h2 id="guia-titulo">Cómo funciona una sala</h2>
        <ol className="guia-puntos" aria-label="Pasos">
          {PASOS.map((x, k) => <li key={x.t}><button className={k === i ? 'on' : k < i ? 'hecho' : ''} onClick={() => setI(k)} aria-label={`Paso ${k + 1}: ${x.t}`} aria-current={k === i ? 'step' : undefined}>{k + 1}</button></li>)}
        </ol>
        <div className="guia-paso" aria-live="polite">
          <h3>{p.t}</h3>
          <p>{p.d}</p>
        </div>
        <div className="fila-botones">
          {i > 0 ? <Boton tipo="fantasma" onClick={() => setI(i - 1)}>Atrás</Boton> : <Boton tipo="fantasma" onClick={onCerrar}>Cerrar</Boton>}
          {i < PASOS.length - 1 ? <Boton onClick={() => setI(i + 1)}>Siguiente</Boton> : <Boton onClick={onCerrar}>¡Entendido!</Boton>}
        </div>
      </div>
    </div>
  )
}

/** Enlace «¿Cómo funciona una sala?» que abre la guía. */
export function EnlaceGuiaSala() {
  const [ver, setVer] = useState(false)
  return (
    <>
      <button type="button" className="enlace" onClick={() => setVer(true)}>¿Cómo funciona una sala? Ver guía</button>
      {ver && <GuiaSala onCerrar={() => setVer(false)} />}
    </>
  )
}
