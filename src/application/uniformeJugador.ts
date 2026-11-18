import type { AvatarConfig } from './puertos'
import type { ClaseId, Galon, PerfilUniforme, Rango } from '../domain/tipos'
import { ORDEN_CLASES, esAdulto, esGuiaMayor } from '../domain/tipos'
import { avanzadasValidas } from '../domain/uniformes'

/** El uniforme que viste el personaje de un jugador, según su rango y lo que configuró. */
export function uniformeDeJugador(rango: Rango, a: AvatarConfig, apodo: string, club: string): PerfilUniforme {
  const u = a.uniforme ?? {}
  const porDefecto: ClaseId[] = rango === 'conquistador' ? ['amigo'] : [...ORDEN_CLASES]
  const regulares = (u.regulares?.length ? ORDEN_CLASES.filter(c => u.regulares!.includes(c)) : porDefecto)
  const gm = esGuiaMayor(rango)
  return {
    rango,
    clasesRegulares: gm ? [...ORDEN_CLASES] : regulares,
    clasesAvanzadas: avanzadasValidas(gm ? [...ORDEN_CLASES] : regulares, (u.avanzadas ?? []) as ClaseId[]),
    excelencia: !!u.excelencia,
    // Manual: todo líder de 16 a más (y todo Guía Mayor) es bautizado; para menores es opcional.
    bautismo: esAdulto(rango) ? true : (u.bautismo ?? true),
    cargo: esAdulto(rango) ? (u.cargo || (rango === 'lider' ? 'CONSEJERO' : 'DIRECTOR')) : undefined,
    funcion: !esAdulto(rango) && u.cargo ? u.cargo : undefined,
    estrellaAnios: esAdulto(rango) ? Math.max(1, u.anios ?? 1) : undefined,
    nombre: a.nombreTira || apodo,
    club: club === 'Modo práctica' ? 'CLUB CONQUIS' : club,
    galon: (u.galon ?? 'ninguno') as Galon,
  }
}

/** El torzal (Perú: blanco y rojo) lo usan los líderes/directivos de 16 a más; los conquistadores no. */
export const llevaTorzal = (p: PerfilUniforme) => esAdulto(p.rango)
