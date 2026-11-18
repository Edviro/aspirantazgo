import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { PiezaSVG } from '../componentes/Insignias'
import { PANEL } from '../../domain/uniformes'
import type { Colocacion, Galon, PanelId } from '../../domain/tipos'
import { precargarOficiales, urlAsset } from '../../assetsOficiales'

const cache = new Map<string, Promise<THREE.Texture>>()

/** Igual que renderToStaticMarkup, pero con el React del cliente (evita sumar react-dom/server al juego). */
function aMarcado(el: ReturnType<typeof createElement>): string {
  const div = document.createElement('div')
  const raiz = createRoot(div)
  flushSync(() => raiz.render(el))
  const html = div.innerHTML
  raiz.unmount()
  return html
}

function svgATextura(svg: string, ancho: number, alto: number): Promise<THREE.Texture> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = ancho; c.height = alto
      c.getContext('2d')!.drawImage(img, 0, 0, ancho, alto)
      URL.revokeObjectURL(url)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      resolve(t)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(new THREE.Texture()) }
    img.src = url
  })
}

/**
 * Dibuja las piezas de un panel (manga o pecho) en una textura transparente.
 * Usa exactamente el mismo dibujo y las mismas medidas del juego 2D, así el personaje 3D
 * lleva el uniforme correcto para su rango y sus clases.
 */
export async function texturaPanel(panel: PanelId, piezas: Colocacion[], pxPorCm = 22): Promise<THREE.Texture> {
  await precargarOficiales()
  const { w, h } = PANEL[panel]
  const hijos = piezas.filter(c => c.panel === panel).map((c, i) =>
    createElement('g', { key: i, transform: `translate(${c.x},${c.y})` }, createElement(PiezaSVG, { p: c.pieza })))
  const svg = aMarcado(createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${w} ${h}`, width: w * pxPorCm, height: h * pxPorCm,
  }, hijos))
  const clave = panel + ':' + svg.length + ':' + hash(svg)
  if (!cache.has(clave)) cache.set(clave, svgATextura(svg, Math.round(w * pxPorCm), Math.round(h * pxPorCm)))
  return cache.get(clave)!
}

/** Una imagen suelta (hebilla, sujetador) como textura. */
export async function texturaAsset(clave: string, px = 256): Promise<THREE.Texture> {
  await precargarOficiales()
  const k = 'asset:' + clave
  if (!cache.has(k)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${px}" height="${px}" viewBox="0 0 1 1"><image href="${urlAsset(clave)}" x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid meet"/></svg>`
    cache.set(k, svgATextura(svg, px, px))
  }
  return cache.get(k)!
}

/** Galón del hombro según el nivel en que actúa (Manual de Uniformes, uniforme de gala). */
export async function texturaGalon(galon: Galon): Promise<THREE.Texture> {
  await precargarOficiales()
  const k = 'galon:' + galon
  if (!cache.has(k)) {
    const plata = '#D9DEE5', oro = '#F2C230'
    const tiras = galon === 'distrital' ? [plata] : galon === 'regional' ? [plata, plata] : galon === 'departamental' ? [oro, oro] : []
    const cuerpo = galon === 'director'
      ? `<image href="${urlAsset('c5')}" x="30" y="4" width="40" height="32" style="filter:brightness(1.6)"/>`
      : tiras.map((c, i) => `<rect x="${44 + i * 12}" y="4" width="7" height="32" fill="${c}" stroke="#888" stroke-width="0.5"/>`).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="160" viewBox="0 0 100 40"><rect width="100" height="40" rx="6" fill="#0E4B45"/>${cuerpo}</svg>`
    cache.set(k, svgATextura(svg, 400, 160))
  }
  return cache.get(k)!
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
