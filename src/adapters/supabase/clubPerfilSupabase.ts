import type { SupabaseClient } from '@supabase/supabase-js'
import type { ColorTrofeo, IconoTrofeo, PerfilClub, PiezaMuseo, PuertoClubPerfil, RedesClub, TipoPieza, Trofeo, TrofeosClub } from '../../application/puertos'

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => Promise<T>
const esUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const TIPOS: TipoPieza[] = ['polo', 'trofeo', 'parche', 'pin', 'foto', 'otro']
const RUTA = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/
const REDES = ['facebook', 'instagram', 'tiktok', 'youtube'] as const
const anio = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1900 && (v as number) <= 2100 ? v as number : null)

export function limpiarPieza(v: unknown): PiezaMuseo | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!esUuid(o.id) || !TIPOS.includes(o.tipo as TipoPieza)) return null
  return {
    id: o.id, tipo: o.tipo as TipoPieza, titulo: txt(o.titulo, 60), anio: anio(o.anio), campamento: txt(o.campamento, 60) || null,
    descripcion: txt(o.descripcion, 300) || null, ruta: typeof o.ruta === 'string' && RUTA.test(o.ruta) ? o.ruta : null,
    estado: o.estado === 'aprobada' || o.estado === 'rechazada' ? o.estado : 'pendiente',
  }
}

/** Achica la imagen a 1024 px como máximo y la vuelve a codificar: así se pierden los datos EXIF (ubicación GPS, etc.). */
async function prepararFoto(archivo: File): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(archivo.type)) throw new Error('FOTO_INVALIDA')
  if (archivo.size > 20 * 1024 * 1024) throw new Error('FOTO_GRANDE')
  const img = await createImageBitmap(archivo, { imageOrientation: 'from-image' }).catch(() => { throw new Error('FOTO_INVALIDA') })
  const k = Math.min(1, 1024 / Math.max(img.width, img.height))
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k))
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
  img.close()
  const codificar = (tipo: string, q: number) => new Promise<Blob | null>(r => cv.toBlob(r, tipo, q))
  for (const q of [0.82, 0.7, 0.55]) {
    const w = await codificar('image/webp', q)
    if (w && w.type === 'image/webp' && w.size <= 600 * 1024) return { blob: w, ext: 'webp' }
    const j = await codificar('image/jpeg', q)
    if (j && j.size <= 600 * 1024) return { blob: j, ext: 'jpg' }
  }
  throw new Error('FOTO_GRANDE')
}

const ICONOS: IconoTrofeo[] = ['copa', 'medalla', 'estrella', 'escudo', 'corona', 'llama']
const COLORES: ColorTrofeo[] = ['oro', 'plata', 'bronce', 'rojo', 'azul', 'verde']
function limpiarTrofeo(v: unknown): (Trofeo & Record<string, unknown>) | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!esUuid(o.id) || !ICONOS.includes(o.icono as IconoTrofeo) || !COLORES.includes(o.color as ColorTrofeo)) return null
  return { ...o, id: o.id, nombre: txt(o.nombre, 40), descripcion: txt(o.descripcion, 200) || null, icono: o.icono as IconoTrofeo, color: o.color as ColorTrofeo }
}

export function crearClubPerfil(sb: SupabaseClient, rpc: Rpc, token: () => string | null): PuertoClubPerfil {
  const urls = new Map<string, { url: string; vence: number }>()
  return {
    async trofeos(): Promise<TrofeosClub> {
      const r = await rpc<unknown>('trofeos_club', { p_token: token() })
      const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>
      const trofeos = (Array.isArray(o.trofeos) ? o.trofeos : []).slice(0, 100).map(limpiarTrofeo).filter((t): t is NonNullable<typeof t> => !!t).map(t => ({
        id: t.id, nombre: t.nombre, descripcion: t.descripcion, icono: t.icono, color: t.color,
        entregas: (Array.isArray(t.entregas) ? t.entregas : []).slice(0, 300).map(x => x as Record<string, unknown>).filter(x => esUuid(x.id))
          .map(x => ({ id: x.id as string, a: txt(x.a, 40), motivo: txt(x.motivo, 120) || null, fecha: txt(x.fecha, 40) })),
      }))
      const mios = (Array.isArray(o.mios) ? o.mios : []).slice(0, 200).map(limpiarTrofeo).filter((t): t is NonNullable<typeof t> => !!t)
        .map(t => ({ id: t.id, nombre: t.nombre, descripcion: t.descripcion, icono: t.icono, color: t.color, motivo: txt(t.motivo, 120) || null, fecha: txt(t.fecha, 40), unidad: t.unidad === true }))
      return { soy_director: o.soy_director === true, trofeos, mios }
    },
    async crearTrofeo(t) { await rpc('trofeo_crear', { p_nombre: t.nombre, p_descripcion: t.descripcion, p_icono: t.icono, p_color: t.color }) },
    async entregarTrofeo(trofeo, a, motivo) {
      if (!esUuid(trofeo) || (a.jugador && !esUuid(a.jugador)) || (a.unidad && !esUuid(a.unidad))) throw new Error('DATOS_INVALIDOS')
      await rpc('trofeo_entregar', { p_trofeo: trofeo, p_player: a.jugador ?? null, p_unidad: a.unidad ?? null, p_motivo: motivo })
    },
    async borrarTrofeo(trofeo, entrega) { await rpc('trofeo_borrar', { p_trofeo: trofeo, p_entrega: entrega ?? null }) },
    async perfil(club) {
      const r = await rpc<unknown>('club_perfil', { p_token: token(), p_club: club ?? null })
      if (!r || typeof r !== 'object') throw new Error('DATOS_INVALIDOS')
      const o = r as Record<string, unknown>
      if (!esUuid(o.id)) throw new Error('DATOS_INVALIDOS')
      const red = (o.redes && typeof o.redes === 'object' ? o.redes : {}) as Record<string, unknown>
      const redes: RedesClub = {}
      for (const k of REDES) if (typeof red[k] === 'string' && /^[A-Za-z0-9._-]{2,60}$/.test(red[k] as string)) redes[k] = red[k] as string
      const resultado: PerfilClub = {
        id: o.id, nombre: txt(o.nombre, 80), ciudad: txt(o.ciudad, 60) || null, campo: txt(o.campo, 90) || null, union: txt(o.union, 80) || null,
        pais: typeof o.pais === 'string' && /^[A-Z]{2}$/.test(o.pais) ? o.pais : null, bandera: typeof o.bandera === 'string' ? o.bandera : null,
        fundacion: anio(o.fundacion), historia: txt(o.historia, 6000) || null, redes, soy_director: o.soy_director === true,
        miembros: Number(o.miembros) || 0, unidades: Number(o.unidades) || 0,
        piezas: (Array.isArray(o.piezas) ? o.piezas : []).slice(0, 300).map(limpiarPieza).filter((p): p is PiezaMuseo => !!p),
      }
      return resultado
    },
    async editar(fundacion, historia, redes) { await rpc('club_editar', { p_fundacion: fundacion, p_historia: historia, p_redes: redes }) },
    async subirFoto(clubId, archivo) {
      if (!esUuid(clubId)) throw new Error('NO_AUTORIZADO')
      const { blob, ext } = await prepararFoto(archivo)
      const ruta = `${clubId}/${crypto.randomUUID()}.${ext}`
      const { error } = await sb.storage.from('museo').upload(ruta, blob, { contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg', upsert: false, cacheControl: '3600' })
      if (error) throw new Error(/row-level security|unauthorized|403/i.test(error.message) ? 'NO_AUTORIZADO' : 'FOTO_NO_SUBIO')
      return ruta
    },
    async agregar(p) {
      await rpc('museo_agregar', { p_tipo: p.tipo, p_titulo: p.titulo, p_anio: p.anio, p_campamento: p.campamento, p_descripcion: p.descripcion, p_ruta: p.ruta })
    },
    async borrar(id) {
      const ruta = await rpc<string | null>('museo_borrar', { p_id: id })
      if (typeof ruta === 'string' && RUTA.test(ruta)) await sb.storage.from('museo').remove([ruta]).catch(() => undefined)
    },
    async urlFoto(ruta) {
      if (!RUTA.test(ruta)) return null
      const c = urls.get(ruta)
      if (c && c.vence > Date.now()) return c.url
      const { data, error } = await sb.storage.from('museo').createSignedUrl(ruta, 3600)
      if (error || !data?.signedUrl) return null
      urls.set(ruta, { url: data.signedUrl, vence: Date.now() + 50 * 60000 })
      return data.signedUrl
    },
  }
}
