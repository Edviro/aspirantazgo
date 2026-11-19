# Guía: cuentas con correo y con Google (Supabase Auth)

El juego ya tiene el código listo para entrar con **correo y contraseña** o con **Google**. Solo falta activar
y configurar lo siguiente en los paneles de Supabase y Google. Los Conquistadores (menores) **no** usan correo:
entran con el código del club, un apodo y un PIN, como siempre.

Proyecto de Supabase: `jlvmwirdohfkllmkihwc` · Sitio: `https://aspirantazgo.vercel.app`

## 1. Correo y contraseña

1. Supabase → **Authentication → Sign In / Providers → Email**: activado.
2. Deja **Confirm email** activado (así nadie usa un correo ajeno).
3. **Minimum password length**: 8. En *Password requirements* elige "letras y números".
4. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://aspirantazgo.vercel.app`
   - **Redirect URLs** (agrega las dos):
     - `https://aspirantazgo.vercel.app/**`
     - `http://localhost:5173/**` (solo para probar en tu PC)

## 2. Enviar los correos con Gmail (obligatorio para el registro con correo)

Vercel solo publica la página: **no envía correos**. Y el correo que trae Supabase de fábrica **solo llega a los
miembros de tu equipo de Supabase** (cualquier otro líder recibe el error *Email address not authorized*).
Por eso hay que conectar un correo propio. Con Gmail es gratis y no necesitas otro servicio.

**Recomendado:** crea una cuenta de Gmail solo para el juego (por ejemplo `aspirantazgo.juego@gmail.com`) en vez de usar
tu correo personal. Los correos saldrán desde esa dirección.

**En esa cuenta de Google:**

1. Entra a `myaccount.google.com/security` y activa la **Verificación en dos pasos** (sin esto no aparece la opción siguiente).
2. Entra a `myaccount.google.com/apppasswords`, escribe un nombre como "Supabase Aspirantazgo" y toca **Crear**.
3. Google te muestra una **contraseña de aplicación** de 16 letras. Cópiala (solo se muestra una vez).
   Si algún día cambias la contraseña de esa cuenta de Gmail, esta clave deja de funcionar y hay que crear otra.

**En Supabase → Authentication → Emails → SMTP Settings:** activa *Enable Custom SMTP* y llena:

| Campo | Valor |
|---|---|
| Sender email | la dirección de Gmail del juego |
| Sender name | `Aspirantazgo` |
| Host | `smtp.gmail.com` |
| Port number | `465` |
| Username | la misma dirección de Gmail |
| Password | la contraseña de aplicación de 16 letras (sin espacios) |

Guarda. Luego, en **Authentication → Rate Limits**, sube *Rate limit for sending emails* (Supabase lo deja en 30 por hora al
conectar un correo propio); 100 por hora es un buen valor.

**Límite de Gmail:** una cuenta gratuita envía hasta **500 correos al día** (Google Workspace, 2.000). Cada líder usa uno al
crear su cuenta y otro si olvida su contraseña, así que alcanza de sobra. Para un evento grande, pide que entren con
**Continuar con Google**: así no se envía ningún correo.

**Plantillas:** en **Authentication → Emails → Templates** traduce al español los asuntos y textos de *Confirm signup* y
*Reset password*. Mantén los mensajes cortos y sin imágenes para que no caigan en spam.

## 3. Entrar con Google

**En Google Cloud Console** (`console.cloud.google.com`):

1. Crea un proyecto (por ejemplo "Aspirantazgo").
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre "Aspirantazgo",
   tu correo de soporte, y en *Dominios autorizados* agrega `supabase.co` y `vercel.app`. Publica la app (estado "En producción").
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo *Aplicación web*:
   - **Orígenes de JavaScript autorizados**: `https://aspirantazgo.vercel.app`
   - **URI de redireccionamiento autorizados**: `https://jlvmwirdohfkllmkihwc.supabase.co/auth/v1/callback`
4. Copia el **ID de cliente** y el **Secreto del cliente**.

**En Supabase**:

5. **Authentication → Sign In / Providers → Google**: actívalo, pega el ID de cliente y el secreto, y guarda.

Listo: el botón "Continuar con Google" de la pantalla de líderes ya funciona.

## 4. Tu cuenta de superadministrador

No hay que tocar nada: la base de datos convierte en superadmin, de forma automática, a la cuenta
`eduv0977@gmail.com` **en cuanto su correo queda confirmado** (con Google se confirma solo).
Entra con ese correo, completa tu registro de club y en el menú del mapa verás **Panel de administrador**.
El permiso lo revisa el servidor en cada acción; ocultar o mostrar el botón no da acceso a nadie más.

## 5. Variables en Vercel

En Vercel → *Settings → Environment Variables* deben existir solo estas dos:

- `VITE_SUPABASE_URL` = `https://jlvmwirdohfkllmkihwc.supabase.co`
- `VITE_SUPABASE_KEY` = la clave **publishable / anon** (es pública por diseño; la protección está en las reglas del servidor)

**Nunca** pongas la clave `service_role` (o `secret`) en Vercel ni en el código: esa clave salta todas las reglas.

## 6. Seguridad extra (opcional)

- **Authentication → Attack Protection**: activa *Leaked password protection* si tu plan lo permite y un CAPTCHA (hCaptcha o Turnstile) si ves registros falsos.
- **Authentication → Rate Limits**: deja los límites por defecto o bájalos.
