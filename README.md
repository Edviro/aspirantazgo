# Aspirantazgo

Juego web en 3D para aprender el programa de Conquistadores. Primer mundo: **Isla del Uniforme** (11 niveles basados en el Manual de Uniformes de la DSA).

Desarrollado por **Eduardo Villanueva**.

## Qué incluye

| Nivel | Tipo | Qué se aprende |
|---|---|---|
| 1. Viste al Conquistador | Armar | Uniforme completo 10–15 años, con piezas trampa |
| 2–3. Mangas al centímetro | Precisión | Medidas exactas desde la costura del hombro |
| 4. Los bolsillos | Armar | Clases en orden de investidura, avanzadas a 0,5 cm, excelencia, función |
| 5. La banda | Precisión | Bandera a 6 cm, especialidades, C2 |
| 6. Inspector | Buscar errores | 4 errores sembrados al azar |
| 7. Quiz relámpago | Preguntas | 10 preguntas del manual contra reloj |
| 8. Uniforme de líder | Armar | Divisa blanca **sin** estrella, cargo, estrella de servicio |
| 9. Guía Mayor | Armar | Divisa blanca **con** estrella, botón LC1, pañoleta GM |
| 10. Máster / Máster Avanzado | Armar | Botones de liderazgo, el mayor grado a la derecha |
| 11. Revista de líderes | Buscar errores | Jefe final, 5 errores |

Cada nivel tiene **Práctica** (pistas, no cuenta) y **Desafío** (cuenta para el ranking y desbloquea el siguiente con 400+ puntos).
Rankings por jugador, club, ciudad, Campo y país, con podio 3D.

## Arquitectura (hexagonal)

```
src/
  domain/        Reglas puras: medidas del manual, uniforme correcto por rango, puntuación, errores del inspector, quiz
  application/   Puertos (interfaces) y mensajes de error. La UI solo conoce estos contratos.
  adapters/
    supabase/    Adaptador en línea: todo pasa por funciones RPC validadas en el servidor
    local/       Adaptador "modo práctica": sin cuenta, todo en el dispositivo
    contenedor.ts  Raíz de composición: único lugar que elige el adaptador
  ui/            React + React Three Fiber (pantallas, minijuegos, escenas 3D)
```

Para agregar un mundo nuevo (Aspirantazgo, Clases, Especialidades): define sus niveles en `domain/`, añade sus retos en la tabla `challenges` y márcalo `abierto: true` en `MUNDOS`.

## Backend (Supabase, proyecto `aspirantazgo`, región São Paulo)

- Tablas con RLS activado y **sin acceso directo**: el cliente solo llama funciones RPC.
- Niños: código de club + apodo + PIN (hash bcrypt), bloqueo de 15 min tras 5 intentos fallidos, sin correo.
- Adultos: enlace mágico por correo (Supabase Auth).
- Puntajes: el servidor registra la hora de inicio, rechaza tiempos imposibles y limita el puntaje a 1000.
- Limpieza diaria con `pg_cron`: intentos > 7 días, sesiones vencidas y cuentas inactivas > 24 meses.

Para traer las migraciones al repo: `supabase link --project-ref jlvmwirdohfkllmkihwc && supabase db pull`.

### Pasos pendientes en el panel de Supabase
1. **Authentication → URL Configuration**: pon como *Site URL* tu dominio final y agrégalo en *Redirect URLs* (si no, el enlace mágico de los líderes redirige a `localhost`).
2. **Authentication → SMTP**: el correo por defecto de Supabase envía pocos mensajes por hora; para producción configura un SMTP propio (p. ej. Resend o Brevo, ambos tienen plan gratis).
3. El plan gratis pausa el proyecto tras 7 días sin uso: si solo se juega los sábados, conviene un ping semanal.

## Desarrollo

```bash
npm install
cp .env.example .env   # URL y clave publicable de Supabase
npm run dev
npm run build          # genera dist/
```

## Despliegue en Cloudflare Pages
- Build command: `npm run build` · Output: `dist`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`

## Antes de publicar
- Cambia el correo de contacto en `src/config.ts`.
- Haz revisar la Política de privacidad y los Términos por un abogado.
- Pide autorización a tu Campo/Unión para el uso de los emblemas en un juego público.
- Reemplaza los distintivos dibujados como aproximación (C2, LC1–LC3, bautismo, Campo) por los archivos oficiales.
