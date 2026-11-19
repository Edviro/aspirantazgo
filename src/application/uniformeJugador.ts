import type { AvatarConfig } from './puertos'
import type { ClaseId, Galon, PerfilUniforme, Rango } from '../domain/tipos'
import { ORDEN_CLASES, esAdulto, aniosValidos, esGuiaMayor } from '../domain/tipos'
import { avanzadasValidas } from '../domain/uniformes'

/** Cargos directivos que llevan galón, y el galón que les corresponde (Manual de Uniformes). */
export const CARGO_GALON: Record<string, Galon> = {
  'DIRECTOR': 'director',        // emblema C5 plateado
  'DISTRITAL': 'distrital',      // una tira plateada
  'REGIONAL': 'regional',        // dos tiras plateadas
  'DEPARTAMENTAL': 'departamental', // dos tiras doradas (Asociación/Misión)
}
/** Cargos que puede elegir un adulto (club y campo). Solo algunos llevan galón. */
export const CARGOS_ADULTO = ['CONSEJERO', 'INSTRUCTOR', 'SECRETARIO', 'TESORERO', 'CAPELLÁN', 'DIRECTOR', 'DIR. ASOCIADO', 'DISTRITAL', 'REGIONAL', 'DEPARTAMENTAL']
/** El galón sale del cargo, no se elige aparte. */
export const galonDeCargo = (cargo?: string): Galon => CARGO_GALON[(cargo ?? '').toUpperCase()] ?? 'ninguno'

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
    estrellaAnios: esAdulto(rango) ? aniosValidos(rango, u.anios) : undefined,
    nombre: a.nombreTira || apodo,
    club: club === 'Modo práctica' ? 'CLUB CONQUIS' : club,
    // El galón se deriva del cargo directivo; no se elige por separado.
    galon: esAdulto(rango) ? galonDeCargo(u.cargo) : 'ninguno',
  }
}

/** El torzal (Perú: blanco y rojo) lo usan los líderes/directivos de 16 a más; los conquistadores no. */
export const llevaTorzal = (p: PerfilUniforme) => esAdulto(p.rango)
