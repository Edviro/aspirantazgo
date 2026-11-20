import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AvatarConfig } from '../../../application/puertos'
import { VERSICULOS, versiculoDelDia } from '../../../domain/biblia'
import type { Rango } from '../../../domain/tipos'
import { KH, KW, LUGAR, OTROS_SLEEPING, dibujarCarpa, dibujarSleeping } from '../../pixel/carpaPixel'
import { PixelAvatar } from '../../pixel/PixelAvatar'
import { rasguear, sfx } from '../../sonido'
import { menosMovimiento } from '../../transicion'
import { Boton } from '../Comunes'
import { CAMPEON_TXT, IconoItem } from './Iconos'

export interface Companero { id: string; apodo: string; avatar?: AvatarConfig; rango: Rango; durmiendo: boolean }
type Estado = 'despierto' | 'durmiendo' | 'amaneciendo'
const NOMBRE: Record<string, string> = {
  'obj-guitarra': 'Guitarra', 'obj-brujula': 'Brújula', 'obj-linterna': 'Linterna', 'obj-cantimplora': 'Cantimplora', 'obj-hamaca': 'Hamaca',
}
const ACORDES = [[196, 247, 294, 392, 494, 587], [220, 262, 330, 440, 523, 659], [147, 220, 294, 370, 440, 587], [165, 247, 330, 392, 494, 659]]

/**
 * Tu carpa por dentro: tu sleeping, tu mochila, tu Biblia, lo que compraste con ConquisCoins, tus parches, pines y
 * logros. Si te duermes aquí y cierras el juego, al volver amanece y sigues dentro de tu carpa.
 */
/** De noche (antes de las 5:30 o desde las 18:30) no amanece aunque te despiertes. */
const esDeNoche = (h: number) => h < 5.5 || h >= 18.5

export function Carpa({ yo, color, club, items, aprobados, campeon, racha, companeros, inicio, horasDormidas, oscuridad, hora, onDormir, onDespertar, onSalir }: {
  yo: { id: string; apodo: string; avatar: AvatarConfig; rango: Rango }; color: string; club: string
  items: string[]; aprobados: number; campeon: string[]; racha: number; companeros: Companero[]
  inicio: Estado; horasDormidas?: number; oscuridad: number; hora: number
  onDormir: () => void; onDespertar: () => void; onSalir: () => void
}) {
  const [estado, setEstado] = useState<Estado>(inicio)
  const [luzOn, setLuzOn] = useState(true)
  const [dialogo, setDialogo] = useState<'biblia' | 'brujula' | 'mochila' | null>(null)
  const [verso, setVerso] = useState(() => (inicio === 'amaneciendo' ? VERSICULOS.find(v => v.tema === 'despertar')! : inicio === 'durmiendo' ? VERSICULOS.find(v => v.tema === 'dormir')! : versiculoDelDia()))
  const [nota, setNota] = useState<string | null>(inicio === 'durmiendo' ? 'Sigues durmiendo en tu carpa: todavía no amanece (amanece a las 5:30).' : null)
  const noche = esDeNoche(hora)
  const [saliendo, setSaliendo] = useState(false)
  const tengo = new Set(items)
  const pines = items.filter(i => i.startsWith('pin-')), parches = items.filter(i => i.startsWith('parche-'))
  const objetos = items.filter(i => i.startsWith('obj-'))

  // Escala
  const marco = useRef<HTMLDivElement>(null)
  const [s, setS] = useState(2)
  useLayoutEffect(() => {
    const el = marco.current
    if (!el) return
    const medir = () => { const k = Math.min(el.clientWidth / (KW - 30), el.clientHeight / KH); setS(k >= 2 ? Math.floor(k * 2) / 2 : Math.max(1, k)) }
    medir()
    const ro = new ResizeObserver(medir); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Lona y sleepings
  const fondo = useRef<HTMLCanvasElement>(null), camas = useRef<HTMLCanvasElement>(null)
  const claveItems = items.join(',')
  useEffect(() => { const cv = fondo.current; if (cv) { cv.width = KW; cv.height = KH; dibujarCarpa(cv.getContext('2d')!, { color, tengo }) } }, [color, claveItems]) // eslint-disable-line react-hooks/exhaustive-deps
  const claveCamas = `${estado}|${companeros.map(c => c.id + c.durmiendo).join(',')}`
  useEffect(() => {
    const cv = camas.current
    if (!cv) return
    cv.width = KW; cv.height = KH
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, KW, KH)
    companeros.slice(0, 3).forEach((c, i) => dibujarSleeping(ctx, OTROS_SLEEPING[i], ['#1F4FB8', '#1E9A4B', '#7A1F3D'][i], c.durmiendo ? c.avatar ?? {} : null))
    dibujarSleeping(ctx, LUGAR.sleeping, '#E8771E', estado !== 'despierto' ? yo.avatar : null)
    // la Biblia sobre el sleeping
    const { x, y } = LUGAR.biblia
    ctx.fillStyle = '#1E140C'; ctx.fillRect(x, y, 16, 10); ctx.fillStyle = '#3a2a6a'; ctx.fillRect(x + 1, y + 1, 14, 8); ctx.fillStyle = '#F2B90F'; ctx.fillRect(x + 7, y + 2, 2, 6); ctx.fillRect(x + 5, y + 4, 6, 1)
  }, [claveCamas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Si te quedaste durmiendo y llega el amanecer (5:30), despiertas con el sol
  const nochePrev = useRef(noche)
  useEffect(() => {
    if (nochePrev.current && !noche && estado === 'durmiendo') despertar()
    nochePrev.current = noche
  }, [noche]) // eslint-disable-line react-hooks/exhaustive-deps

  // Amanecer: la luz entra poco a poco por la lona
  useEffect(() => {
    if (estado !== 'amaneciendo') return
    sfx.aviso()
    const t = setTimeout(() => setEstado('despierto'), menosMovimiento() ? 400 : 3600)
    return () => clearTimeout(t)
  }, [estado])

  const dormir = () => { setNota(null); setDialogo(null); setEstado('durmiendo'); setVerso(VERSICULOS.find(v => v.tema === 'dormir')!); onDormir() }
  const despertar = () => {
    onDespertar()
    // Si todavía es de noche, te levantas a oscuras (no amanece de mentira); si ya es de día, entra la luz del sol
    if (noche) { setEstado('despierto'); setLuzOn(true); setNota('Todavía es de noche: afuera brillan las estrellas. Prende tu linterna o vuelve a dormir; amanece a las 5:30.'); return }
    setNota(null); setEstado('amaneciendo'); setVerso(VERSICULOS.find(v => v.tema === 'despertar')!)
  }
  const salir = () => { if (menosMovimiento()) { onSalir(); return } setSaliendo(true); sfx.zas(); setTimeout(onSalir, 380) }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (dialogo) setDialogo(null); else if (estado === 'despierto') salir() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (r: { x: number; y: number; w: number; h: number }) => ({ left: r.x * s, top: r.y * s, width: r.w * s, height: r.h * s })
  // De noche siempre hay una lamparita: con linterna se ve casi como de día
  const oscuro = estado === 'durmiendo' ? 0.82 : estado === 'amaneciendo' ? 0 : Math.max(0, oscuridad * (luzOn && tengo.has('obj-linterna') ? 0.25 : 0.62))

  return (
    <div className={`carpa ${saliendo ? 'saliendo' : ''}`} role="dialog" aria-modal="true" aria-label="Dentro de tu carpa">
      <header className="culto-barra">
        {estado === 'despierto' ? (
          <button className="icono" onClick={salir} aria-label="Salir de la carpa">
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : <span className="icono" aria-hidden>{estado === 'durmiendo' ? '🌙' : '🌅'}</span>}
        <div className="culto-titulo"><small>{club}</small><strong>{estado === 'durmiendo' ? 'Durmiendo…' : estado === 'amaneciendo' ? '¡Amaneció!' : `La carpa de ${yo.apodo}`}</strong></div>
      </header>

      <div className="culto-marco" ref={marco}>
        <div className={`carpa-escena ${menosMovimiento() ? '' : 'entrando'}`} style={{ width: KW * s, height: KH * s }}>
          <canvas ref={fondo} className="culto-capa" aria-hidden />
          <canvas ref={camas} className="culto-capa" style={{ zIndex: 2 }} aria-hidden />
          {/* Parches en el banderín y pines en la banda */}
          <div className="carpa-parches" style={pos(LUGAR.parches)}>{parches.length ? parches.slice(0, 9).map(p => <IconoItem key={p} id={p} alto={11 * s} />) : <small>Tus parches</small>}</div>
          <div className="carpa-pines" style={pos(LUGAR.pines)}>{pines.length ? pines.slice(0, 9).map(p => <IconoItem key={p} id={p} alto={9 * s} />) : <small>Tus pines</small>}</div>
          <div className="carpa-logros" style={{ ...pos(LUGAR.logros), fontSize: Math.max(8, 4.2 * s) }}>
            <b>✅ {aprobados}</b><span>{aprobados === 1 ? 'nivel' : 'niveles'}</span>
            {racha > 1 && <span>🔥 {racha} días</span>}
            {campeon[0] && <span className="campeon">{CAMPEON_TXT[campeon[0]]}</span>}
          </div>
          {estado === 'despierto' && (
            <div className="carpa-yo" style={{ left: 100 * s, top: (136 - 46) * s, width: 34.5 * s, height: 46 * s }}>
              <PixelAvatar a={yo.avatar} rango={yo.rango} animo="idle" alto={46 * s} />
            </div>
          )}
          <div className="carpa-oscuro" style={{ opacity: oscuro }} aria-hidden />
          {tengo.has('obj-linterna') && luzOn && estado === 'despierto' && oscuridad > 0.2 && <div className="carpa-luz" style={{ left: 60 * s, top: 0, width: 120 * s, height: 130 * s }} aria-hidden />}
          {estado === 'amaneciendo' && <div className="carpa-amanecer" aria-hidden />}
          {estado === 'durmiendo' && <div className="carpa-zzz" style={{ left: (LUGAR.sleeping.x + 14) * s, top: (LUGAR.sleeping.y - 18) * s }} aria-hidden><i>z</i><i>Z</i><i>z</i></div>}

          {/* Cosas que se pueden tocar */}
          {estado === 'despierto' && <>
            <button className="carpa-cosa" style={pos(LUGAR.biblia)} onClick={() => { sfx.click(); setDialogo('biblia') }} aria-label="Leer mi Biblia" />
            <button className="carpa-cosa" style={pos(LUGAR.sleeping)} onClick={dormir} aria-label="Dormir en mi sleeping" />
            <button className="carpa-cosa" style={pos(LUGAR.mochila)} onClick={() => { sfx.click(); setDialogo('mochila') }} aria-label="Abrir mi mochila" />
            {tengo.has('obj-guitarra') && <button className="carpa-cosa" style={pos(LUGAR.guitarra)} onClick={() => rasguear(ACORDES[Math.floor(Math.random() * ACORDES.length)])} aria-label="Tocar la guitarra" />}
            {tengo.has('obj-brujula') && <button className="carpa-cosa" style={pos(LUGAR.brujula)} onClick={() => { sfx.click(); setDialogo('brujula') }} aria-label="Ver la brújula" />}
            {tengo.has('obj-linterna') && <button className="carpa-cosa" style={pos(LUGAR.linterna)} onClick={() => { sfx.tic(); setLuzOn(v => !v) }} aria-label={luzOn ? 'Apagar la linterna' : 'Prender la linterna'} />}
          </>}
        </div>
      </div>

      <section className="culto-panel carpa-panel">
        {nota && <p className="carpa-nota" role="status">🌙 {nota}</p>}
        {estado === 'durmiendo' ? (
          <>
            <p className="carpa-verso">«{verso.texto}» <small>{verso.ref}</small></p>
            <p className="nota">Puedes cerrar el juego: tu personaje se queda durmiendo en tu carpa y, cuando vuelvas, amanece aquí.</p>
            <Boton onClick={despertar}>{noche ? 'Levantarme (aún es de noche)' : 'Despertar'}</Boton>
          </>
        ) : estado === 'amaneciendo' ? (
          <>
            <p className="carpa-buenos">☀️ ¡Buenos días, {yo.apodo}!{horasDormidas && horasDormidas >= 1 ? ` Dormiste ${Math.round(horasDormidas)} ${Math.round(horasDormidas) === 1 ? 'hora' : 'horas'} en tu carpa.` : ''}</p>
            <p className="carpa-verso">«{verso.texto}» <small>{verso.ref}</small></p>
          </>
        ) : (
          <>
            <p className="nota">Toca tus cosas: la Biblia para leer, el sleeping para dormir, la mochila para ver lo que llevas{tengo.has('obj-guitarra') ? ' y la guitarra para tocar' : ''}.</p>
            <div className="fila-botones">
              <Boton tipo="fantasma" onClick={() => setDialogo('biblia')}>📖 Mi Biblia</Boton>
              <Boton tipo="azul" onClick={dormir}>🌙 Dormir</Boton>
              <Boton onClick={salir}>Salir de la carpa</Boton>
            </div>
            {objetos.length === 0 && <p className="nota">En la tienda del campamento hay guitarra, brújula, linterna, cantimplora y hamaca para tu carpa.</p>}
          </>
        )}
      </section>

      {dialogo === 'biblia' && (
        <div className="velo" onClick={() => setDialogo(null)}>
          <div className="resultado pop biblia" role="dialog" aria-modal="true" aria-label="Mi Biblia" onClick={e => e.stopPropagation()}>
            <h2>📖 Mi Biblia</h2>
            <div className="biblia-hoja">
              <p>«{verso.texto}»</p>
              <small>{verso.ref} (RVR1960)</small>
            </div>
            <div className="biblia-lista">
              {VERSICULOS.map(v => <button key={v.ref} className={v.ref === verso.ref ? 'on' : ''} onClick={() => { sfx.tic(); setVerso(v) }}>{v.ref}</button>)}
            </div>
            <p className="nota">Pronto: la lectura de cada día del año bíblico.</p>
            <div className="fila-botones">
              <a className="btn btn-fantasma" href="https://www.biblegateway.com/versions/Reina-Valera-1960-RVR1960-Biblia/" target="_blank" rel="noopener noreferrer">Leer la Biblia completa</a>
              <Boton onClick={() => setDialogo(null)}>Cerrar</Boton>
            </div>
          </div>
        </div>
      )}
      {dialogo === 'mochila' && (
        <div className="velo" onClick={() => setDialogo(null)}>
          <div className="resultado pop" role="dialog" aria-modal="true" aria-label="Mi mochila" onClick={e => e.stopPropagation()}>
            <h2>🎒 Mi mochila</h2>
            <ul className="mochila">
              <li><IconoItem id="pin-biblia" alto={28} /><span>Biblia</span></li>
              {objetos.map(o => <li key={o}><IconoItem id={o} alto={28} /><span>{NOMBRE[o] ?? o}</span></li>)}
              {[...parches, ...pines].map(o => <li key={o}><IconoItem id={o} alto={28} /><span>{o.startsWith('pin-') ? 'Pin' : 'Parche'}</span></li>)}
            </ul>
            <div className="fila-botones"><Boton onClick={() => setDialogo(null)}>Cerrar</Boton></div>
          </div>
        </div>
      )}
      {dialogo === 'brujula' && (
        <div className="velo" onClick={() => setDialogo(null)}>
          <div className="resultado pop brujula-dialogo" role="dialog" aria-modal="true" aria-label="Brújula" onClick={e => e.stopPropagation()}>
            <h2>🧭 Brújula</h2>
            <svg viewBox="0 0 120 120" width="150" height="150" aria-hidden>
              <circle cx="60" cy="60" r="54" fill="#F3F1EA" stroke="#1E140C" strokeWidth="5" />
              {['N', 'E', 'S', 'O'].map((t, i) => <text key={t} x={60 + Math.sin(i * Math.PI / 2) * 40} y={64 - Math.cos(i * Math.PI / 2) * 40} textAnchor="middle" fontWeight="900" fontSize="14" fill="#1E140C">{t}</text>)}
              <g className="aguja"><path d="M60 18l8 42H52z" fill="#D7242F" /><path d="M60 102l-8-42h16z" fill="#1F4FB8" /></g>
              <circle cx="60" cy="60" r="5" fill="#1E140C" />
            </svg>
            <p>El norte apunta al muelle, donde está el barco a los campamentos. La plaza queda al centro de la isla y el Fuego del Consejo, al sur.</p>
            <div className="fila-botones"><Boton onClick={() => setDialogo(null)}>Cerrar</Boton></div>
          </div>
        </div>
      )}
    </div>
  )
}
