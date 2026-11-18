const MENSAJES: Record<string, string> = {
  CLUB_NO_EXISTE: 'Ese código de club no existe. Pídele el código a tu líder.',
  APODO_OCUPADO: 'Ese apodo ya está en uso en tu club. Prueba con otro.',
  PIN_INVALIDO: 'El PIN debe tener 4 números.',
  DATOS_INCORRECTOS: 'Código, apodo o PIN incorrectos.',
  BLOQUEADO: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.',
  CLUB_LLENO: 'Este club ya llegó al máximo de jugadores.',
  SESION_INVALIDA: 'Tu sesión venció. Vuelve a entrar.',
  REQUIERE_CUENTA: 'Primero entra con tu correo.',
  FALTA_CONSENTIMIENTO: 'Debes aceptar los términos y confirmar la autorización de los padres.',
  LIMITE_CLUBES: 'Ya creaste el máximo de clubes con esta cuenta.',
  TIEMPO_INVALIDO: 'Ese intento no se pudo validar. ¡Juega de nuevo!',
  DEMASIADOS_INTENTOS: 'Vas muy rápido. Espera un momento.',
  RANGO_INVALIDO: 'Elige un rango válido.',
}

export function mensajeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)
  for (const k of Object.keys(MENSAJES)) if (raw.includes(k)) return MENSAJES[k]
  if (/apodo|players_apodo_check/.test(raw)) return 'El apodo debe tener de 3 a 16 letras o números.'
  if (/fetch|network|Failed/i.test(raw)) return 'Sin conexión. Revisa tu internet.'
  return 'Algo salió mal. Inténtalo otra vez.'
}
