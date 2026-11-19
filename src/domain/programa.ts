import type { TipoParte } from '../application/puertos'

/** Nombres de las partes de un culto o programa del escenario. */
export const TIPO_PARTE: Record<TipoParte, string> = {
  bienvenida: 'Bienvenida', himno: 'Himno', oracion: 'Oración', lectura: 'Lectura bíblica', mensaje: 'Mensaje',
  especial: 'Número especial', anuncios: 'Anuncios', despedida: 'Despedida',
}
