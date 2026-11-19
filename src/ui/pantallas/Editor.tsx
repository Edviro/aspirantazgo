import { useEffect, useState } from 'react'
import { useJuego } from '../estado'
import { mensajeError } from '../../application/errores'
import { Boton } from '../componentes/Comunes'
import { Campamento } from '../pixel/Campamento'
import { PixelAvatar } from '../pixel/PixelAvatar'
import { PELOS, PIELES } from '../pixel/dibujo'
import type { AvatarConfig } from '../../application/puertos'
import { ANIOS_MINIMOS, ORDEN_CLASES, aniosValidos, esAdulto, esGuiaMayor, type ClaseId, type Rango } from '../../domain/tipos'
import { FUNCIONES, NOMBRE_CLASE } from '../../domain/uniformes'
import { CARGOS_ADULTO, galonDeCargo } from '../../application/uniformeJugador'

const PEINADOS = {
  m: [{ v: 0, n: 'Corto' }, { v: 1, n: 'Puntas' }, { v: 2, n: 'Rapado' }],
  f: [{ v: 3, n: 'Trenzas' }, { v: 4, n: 'Cola' }, { v: 5, n: 'Suelto' }, { v: 6, n: 'Moño' }],
}
const RANGOS: [Rango, string][] = [
  ['conquistador', 'Conquistador'], ['lider', 'Líder'], ['guia_mayor', 'Guía Mayor'], ['gm_master', 'GM Máster'], ['gm_master_avanzado', 'GM Máster Avanzado'],
]
/** Alto del personaje en múltiplos de 64 px (escala entera: el pixel art se ve nítido). */
function altoAvatar() {
  const w = window.innerWidth, h = window.innerHeight
  if (w > h && w >= 640) return h >= 860 ? 448 : h >= 700 ? 384 : h >= 560 ? 320 : h >= 440 ? 256 : 192
  return Math.max(128, Math.min(256, Math.floor((h * 0.4 - 40) / 64) * 64))
}
function useAltoAvatar() {
  const [alto, setAlto] = useState(altoAvatar)
  useEffect(() => {
    const f = () => setAlto(altoAvatar())
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return alto
}

/** Solo letras, números y espacios: nada de datos de contacto. */
const limpiar = (s: string) => s.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü ]/g, '').slice(0, 14).toUpperCase()

export default function Editor() {
  const { perfil, repo, setPerfil, ir, hub } = useJuego()
  const [a, setA] = useState<AvatarConfig>(() => {
    const base: AvatarConfig = { genero: 'm', piel: 2, pelo: 0, colorPelo: 0, ...(perfil?.avatar ?? {}) }
    const validos = PEINADOS[base.genero === 'f' ? 'f' : 'm'].map(x => x.v)
    return validos.includes(base.pelo ?? -1) ? base : { ...base, pelo: validos[0] }
  })
  const [rango, setRango] = useState<Rango>(perfil?.rango ?? 'conquistador')
  const [pestana, setPestana] = useState<'look' | 'uniforme'>('look')
  const alto = useAltoAvatar()
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')
  if (!perfil) return null
  const practica = perfil.id === 'local'
  const puedeRango = practica || perfil.grupo_edad === 'adulto'
  const rangos = practica ? RANGOS : RANGOS.filter(([r]) => r !== 'conquistador')
  const u = a.uniforme ?? {}
  const gm = esGuiaMayor(rango), adulto = esAdulto(rango)
  const regulares = (gm ? [...ORDEN_CLASES] : u.regulares ? u.regulares : rango === 'conquistador' ? ['amigo'] : [...ORDEN_CLASES]) as ClaseId[]
  const avanzadas = (u.avanzadas ?? []).filter(c => regulares.includes(c as ClaseId))
  const setU = (cambios: Partial<NonNullable<AvatarConfig['uniforme']>>) => setA({ ...a, uniforme: { ...u, regulares, avanzadas, ...cambios } })

  const toggleRegular = (c: ClaseId) => {
    if (gm) return
    // Las clases se cursan en orden: marcar una incluye todas las anteriores; quitarla quita las siguientes.
    const i = ORDEN_CLASES.indexOf(c)
    const tiene = regulares.includes(c)
    const nuevas = ORDEN_CLASES.slice(0, tiene ? i : i + 1)
    // Con cualquier clase ya recibiste tu pañoleta (es el primer paso para clases y especialidades)
    setA({ ...a, ...(nuevas.length ? { panoleta: true } : {}), uniforme: { ...u, regulares: nuevas, avanzadas: avanzadas.filter(x => nuevas.includes(x as ClaseId)) } })
  }
  const toggleAvanzada = (c: ClaseId) => {
    if (!regulares.includes(c)) { setAviso(`Primero la regular: para la avanzada de ${NOMBRE_CLASE[c]} necesitas la clase ${NOMBRE_CLASE[c]}.`); return }
    setAviso('')
    setU({ avanzadas: avanzadas.includes(c) ? avanzadas.filter(x => x !== c) : ORDEN_CLASES.filter(x => x === c || avanzadas.includes(x)) })
  }

  const guardar = async () => {
    setGuardando(true)
    // Años de servicio siempre coherentes con el nivel de liderazgo (mín. 2; Máster 4; Máster Avanzado 7)
    const final: AvatarConfig = adulto ? { ...a, uniforme: { ...a.uniforme, anios: aniosValidos(rango, a.uniforme?.anios) } } : a
    try {
      if (rango !== perfil.rango && puedeRango) await repo.cambiarRango(rango)
      await repo.guardarAvatar(final)
    } catch (e) {
      // Antes este error se ignoraba y el personaje quedaba vacío en el servidor: ahora se avisa y no se sale
      setAviso(`No se pudo guardar tu personaje: ${mensajeError(e)}`)
      setGuardando(false)
      return
    }
    setPerfil({ ...perfil, avatar: final, rango, grupo_edad: practica ? (rango === 'conquistador' ? 'menor' : 'adulto') : perfil.grupo_edad })
    setGuardando(false)
    ir(hub)
  }

  return (
    <div className="pantalla editor">
      <div className="editor-escena">
        <Campamento />
        <div className="editor-nombre"><b>{a.nombreTira || perfil.apodo}</b><small>{perfil.club.nombre}{a.unidad ? `, unidad ${a.unidad}` : ''}</small></div>
        <div className="pixel-tarima"><PixelAvatar a={a} rango={rango} animo="saluda" alto={alto} /></div>
      </div>
      <div className="editor-panel pop">
        <div className="tabs-editor" role="tablist">
          <button role="tab" aria-selected={pestana === 'look'} className={pestana === 'look' ? 'on' : ''} onClick={() => setPestana('look')}>Personaje</button>
          <button role="tab" aria-selected={pestana === 'uniforme'} className={pestana === 'uniforme' ? 'on' : ''} onClick={() => setPestana('uniforme')}>Mi uniforme</button>
        </div>
        <div className="editor-scroll">
          {pestana === 'look' ? (<>
            <div className="opcion">
              <span>Personaje</span>
              <div className="chips">
                <button className={a.genero !== 'f' ? 'on' : ''} onClick={() => setA({ ...a, genero: 'm', pelo: 0 })}>Chico</button>
                <button className={a.genero === 'f' ? 'on' : ''} onClick={() => setA({ ...a, genero: 'f', pelo: 3 })}>Chica</button>
              </div>
            </div>
            <div className="opcion">
              <span>Tono de piel</span>
              <div className="colores">{PIELES.map((c, i) => <button key={c} aria-label={`Tono ${i + 1}`} className={a.piel === i ? 'on' : ''} style={{ background: c }} onClick={() => setA({ ...a, piel: i })} />)}</div>
            </div>
            <div className="opcion">
              <span>Peinado</span>
              <div className="chips">{PEINADOS[a.genero === 'f' ? 'f' : 'm'].map(x => <button key={x.v} className={a.pelo === x.v ? 'on' : ''} onClick={() => setA({ ...a, pelo: x.v })}>{x.n}</button>)}</div>
            </div>
            <div className="opcion">
              <span>Color de pelo</span>
              <div className="colores">{PELOS.map((c, i) => <button key={c} aria-label={`Color ${i + 1}`} className={a.colorPelo === i ? 'on' : ''} style={{ background: c }} onClick={() => setA({ ...a, colorPelo: i })} />)}</div>
            </div>
          </>) : (<>
            {puedeRango && (
              <div className="opcion">
                <span>Nivel de liderazgo</span>
                <div className="chips">{rangos.map(([r, n]) => <button key={r} className={rango === r ? 'on' : ''} onClick={() => setRango(r)}>{n}</button>)}</div>
              </div>
            )}
            <div className="opcion">
              <span>Tira del nombre y unidad</span>
              <div className="campos-uni">
                <label>En la tira<input value={a.nombreTira ?? ''} placeholder={perfil.apodo.toUpperCase()} maxLength={14} onChange={e => setA({ ...a, nombreTira: limpiar(e.target.value) })} /></label>
                <label>Mi unidad<input value={a.unidad ?? ''} placeholder="HALCONES" maxLength={14} onChange={e => setA({ ...a, unidad: limpiar(e.target.value) })} /></label>
              </div>
              {!adulto && <small className="nota">Usa tu apodo o tu primer nombre. Nunca tu apellido, teléfono ni dirección.</small>}
            </div>
            <div className="opcion">
              <span>Clases regulares {gm && <em>(un Guía Mayor ya las tiene todas)</em>}</span>
              <div className="chips clases">{ORDEN_CLASES.map(c => <button key={c} disabled={gm} className={regulares.includes(c) ? 'on' : ''} onClick={() => toggleRegular(c)}>{NOMBRE_CLASE[c]}</button>)}</div>
            </div>
            <div className="opcion">
              <span>Clases avanzadas</span>
              <div className="chips clases">{ORDEN_CLASES.map(c => (
                <button key={c} className={`${avanzadas.includes(c) ? 'on' : ''} ${regulares.includes(c) ? '' : 'apagada'}`} aria-disabled={!regulares.includes(c)} onClick={() => toggleAvanzada(c)}>{NOMBRE_CLASE[c]}</button>
              ))}</div>
              {aviso && <small className="nota aviso">{aviso}</small>}
            </div>
            <div className="opcion">
              <span>{adulto ? 'Cargo' : 'Función en la unidad'}</span>
              <div className="chips">
                {!adulto && <button className={!u.cargo ? 'on' : ''} onClick={() => setU({ cargo: undefined })}>Ninguna</button>}
                {(adulto ? CARGOS_ADULTO : FUNCIONES).map(c => <button key={c} className={(u.cargo ?? (adulto ? (rango === 'lider' ? 'CONSEJERO' : 'DIRECTOR') : '')) === c ? 'on' : ''} onClick={() => setU({ cargo: c })}>{c.charAt(0) + c.slice(1).toLowerCase()}</button>)}
              </div>
              {adulto && galonDeCargo(u.cargo ?? (rango === 'lider' ? 'CONSEJERO' : 'DIRECTOR')) !== 'ninguno' && (
                <small className="nota">Con este cargo llevas galón en el hombro (se coloca solo, según el manual).</small>
              )}
            </div>
            {adulto && (
              <div className="opcion">
                <span>Años de servicio (estrella)</span>
                <div className="chips">{[2, 3, 4, 5, 7, 10, 15, 20, 25].filter(n => n >= ANIOS_MINIMOS[rango]).map(n => <button key={n} className={aniosValidos(rango, u.anios) === n ? 'on' : ''} onClick={() => setU({ anios: n })}>{n}</button>)}</div>
                {ANIOS_MINIMOS[rango] > 2 && <small className="nota">{rango === 'gm_master' ? 'Un Máster tiene como mínimo 4 años de servicio.' : 'Un Máster Avanzado tiene como mínimo 7 años de servicio.'}</small>}
              </div>
            )}
            <div className="opcion">
              <span>Otros distintivos</span>
              <div className="chips">
                {adulto
                  ? <button className="on" disabled title="Todo líder de 16 a más es bautizado">Bautizado ✓</button>
                  : <button className={u.bautismo !== false ? 'on' : ''} onClick={() => setU({ bautismo: u.bautismo === false })}>Bautismo</button>}
                <button className={u.excelencia ? 'on' : ''} onClick={() => setU({ excelencia: !u.excelencia })}>Barra de excelencia</button>
                {rango === 'conquistador' && (regulares.length > 0
                  ? <button className="on" disabled title="Con una clase ya recibiste tu pañoleta">Pañoleta ✓</button>
                  : <button className={a.panoleta !== false ? 'on' : ''} onClick={() => setA({ ...a, panoleta: a.panoleta === false })}>Pañoleta</button>)}
              </div>
            </div>
          </>)}
        </div>
        {aviso && pestana === 'look' && <small className="nota aviso" role="alert">{aviso}</small>}
        <Boton onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : '¡Listo, al mapa!'}</Boton>
      </div>
    </div>
  )
}
