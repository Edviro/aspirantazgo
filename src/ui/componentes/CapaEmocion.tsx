import { useEffect, useRef, useState } from 'react'
import { alEmocion, reiniciarCombo, sfx } from '../sonido'

interface Flotante { id: number; x: number; y: number; texto: string; tipo: 'bien' | 'mal' | 'top' }
interface Chispa { id: number; x: number; y: number; ang: number; dist: number; color: string }

const BIEN = ['¡Bien!', '¡Genial!', '¡Bravo!', '¡Exacto!', '¡Eso!']
const HITOS: Record<number, string> = { 3: '¡Combo!', 5: '¡En racha!', 8: '¡Imparable!', 12: '¡Leyenda!', 16: '¡Inspector total!' }
const COLORES = ['#FFC20E', '#FFFFFF', '#48CF7C', '#1F5FD1', '#D7242F']

/**
 * La capa de "emoción" de los niveles: textos que saltan donde tocaste, chispas, contador de combo,
 * sellos al encadenar aciertos y una sacudida cuando fallas. Escucha los mismos sonidos de acierto/error
 * que ya usan todos los juegos, así que funciona en todos sin tocar su lógica. No bloquea los toques.
 */
export function CapaEmocion() {
  const [flotantes, setFlotantes] = useState<Flotante[]>([])
  const [chispas, setChispas] = useState<Chispa[]>([])
  const [combo, setCombo] = useState(0)
  const [sello, setSello] = useState<{ id: number; texto: string } | null>({ id: 0, texto: '¡A jugar!' })
  const [roja, setRoja] = useState(0)
  const ultimo = useRef({ x: 0, y: 0, t: 0 })
  const sig = useRef(1)

  useEffect(() => {
    reiniciarCombo()
    const marcar = (e: PointerEvent) => { ultimo.current = { x: e.clientX, y: e.clientY, t: performance.now() } }
    window.addEventListener('pointerdown', marcar, true)
    window.addEventListener('pointerup', marcar, true)
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = setTimeout(() => setSello(s => (s?.id === 0 ? null : s)), 1100)

    const punto = () => {
      if (performance.now() - ultimo.current.t < 1500) return { x: ultimo.current.x, y: ultimo.current.y }
      const z = document.querySelector('.juego-zona')?.getBoundingClientRect()
      return z ? { x: z.left + z.width / 2, y: z.top + z.height * 0.4 } : { x: innerWidth / 2, y: innerHeight / 2 }
    }
    const quitar = <T extends { id: number }>(set: (f: (l: T[]) => T[]) => void, ids: number[], ms: number) =>
      setTimeout(() => set(l => l.filter(x => !ids.includes(x.id))), ms)

    const off = alEmocion((e, c) => {
      const p = punto()
      setCombo(c)
      if (e === 'mal') {
        const id = sig.current++
        setFlotantes(l => [...l.slice(-6), { id, ...p, texto: '¡Ups!', tipo: 'mal' }]); quitar(setFlotantes, [id], 900)
        setRoja(id)
        if (!quieto) document.querySelector('.juego-zona')?.animate(
          [{ transform: 'none' }, { transform: 'translateX(-9px) rotate(-.4deg)' }, { transform: 'translateX(8px) rotate(.4deg)' }, { transform: 'translateX(-5px)' }, { transform: 'none' }],
          { duration: 360, easing: 'ease-out' })
        return
      }
      const id = sig.current++
      const texto = e === 'perfecto' && c < 3 ? '¡Perfecto!' : c >= 3 ? `${BIEN[c % BIEN.length]} x${c}` : BIEN[c % BIEN.length]
      setFlotantes(l => [...l.slice(-6), { id, x: p.x, y: p.y, texto, tipo: 'bien' }]); quitar(setFlotantes, [id], 950)
      if (!quieto) {
        const n = Math.min(16, 7 + c)
        const nuevas = Array.from({ length: n }, (_, k) => ({ id: sig.current++, x: p.x, y: p.y, ang: (360 / n) * k + Math.random() * 20, dist: 40 + Math.random() * 46 + c * 2, color: COLORES[k % COLORES.length] }))
        setChispas(l => [...l.slice(-40), ...nuevas]); quitar(setChispas, nuevas.map(x => x.id), 700)
      }
      if (HITOS[c]) { setSello({ id, texto: HITOS[c] }); sfx.racha(); setTimeout(() => setSello(s => (s?.id === id ? null : s)), 1200) }
    })
    return () => { off(); clearTimeout(t0); window.removeEventListener('pointerdown', marcar, true); window.removeEventListener('pointerup', marcar, true) }
  }, [])

  return (
    <div className="capa-emocion" aria-hidden>
      {roja > 0 && <div className="emocion-rojo" key={roja} />}
      {combo >= 2 && (
        <div className={`emocion-combo ${combo >= 8 ? 'fuego' : combo >= 5 ? 'caliente' : ''}`} key={combo}>
          <small>combo</small><b>x{combo}</b>
        </div>
      )}
      {chispas.map(c => <i key={c.id} className="emocion-chispa" style={{ left: c.x, top: c.y, background: c.color, ['--a' as string]: `${c.ang}deg`, ['--d' as string]: `${c.dist}px` }} />)}
      {flotantes.map(f => <span key={f.id} className={`emocion-texto ${f.tipo}`} style={{ left: f.x, top: f.y }}>{f.texto}</span>)}
      {sello && <div className="emocion-sello" key={sello.id}><span>{sello.texto}</span></div>}
    </div>
  )
}
