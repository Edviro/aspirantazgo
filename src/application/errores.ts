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
  SALA_SIN_CONEXION: 'No se pudo conectar a la sala. Revisa el código y tu internet.',
  SALA_NO_EXISTE: 'Esa sala no existe o ya se cerró. Revisa el código.',
  SALA_LLENA: 'La sala ya está llena.',
  SOLO_LIDERES: 'Solo los líderes pueden hacer esto.',
  SESION_NO_APROBADA: 'Para abrir una sala necesitas una sesión aprobada. Solicítala en el Panel del club.',
  FUERA_DE_HORARIO: 'Tu sesión aprobada todavía no empieza (puedes abrirla 30 minutos antes).',
  DEMASIADAS_SALAS: 'Abriste muchas salas hoy. Inténtalo mañana.',
  RIVAL_INVALIDO: 'No se puede retar a ese jugador ahora.',
  DEMASIADOS_DUELOS: 'Enviaste muchos retos. Espera un rato.',
  CUENTA_SUSPENDIDA: 'Esta cuenta está suspendida. Habla con tu líder.',
  NO_AUTORIZADO: 'No tienes permiso para esto.',
  CLUB_YA_EXISTE: 'Ese club ya está registrado en tu asociación o misión. Búscalo en la lista.',
  CAMPO_INVALIDO: 'Elige tu asociación o misión.',
  ELIGE_CLUB: 'Elige tu club de la lista o regístralo.',
  YA_REGISTRADO: 'Esta cuenta ya pertenece a un club.',
  TEXTO_INVALIDO: 'Usa solo letras, números y espacios.',
  FECHA_INVALIDA: 'Elige una fecha futura (máximo 6 meses).',
  DEMASIADAS_SOLICITUDES: 'Ya tienes 5 solicitudes pendientes. Espera la respuesta.',
  APODO_CORTO: 'El apodo debe tener de 3 a 16 letras o números.',
  APODO_CON_DATOS: 'El apodo no puede tener teléfonos, correos ni enlaces.',
  CORREO_INVALIDO: 'Escribe un correo válido.',
  CLAVE_DEBIL: 'La contraseña necesita al menos 8 caracteres, con letras y números.',
  SIN_CONEXION: 'Sin conexión. Revisa tu internet.',
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Primero confirma tu correo: abre el enlace que te enviamos.',
  'User already registered': 'Ya existe una cuenta con ese correo. Entra o recupera tu contraseña.',
  'provider is not enabled': 'El ingreso con Google todavía no está activado. Usa tu correo por ahora.',
  'Password should be': 'La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.',
  'rate limit': 'Demasiados intentos. Espera unos minutos.',
  'For security purposes': 'Por seguridad, espera un minuto antes de volver a intentarlo.',
}

export function mensajeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)
  for (const k of Object.keys(MENSAJES)) if (raw.includes(k)) return MENSAJES[k]
  if (/apodo|players_apodo_check/.test(raw)) return 'El apodo debe tener de 3 a 16 letras o números.'
  if (/fetch|network|Failed/i.test(raw)) return 'Sin conexión. Revisa tu internet.'
  return 'Algo salió mal. Inténtalo otra vez.'
}
