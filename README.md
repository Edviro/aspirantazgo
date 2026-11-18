# Aspirantazgo

Juego web en 3D para aprender el programa de Conquistadores. Primer mundo: **Isla del Uniforme** (26 niveles en 2 islas).

Desarrollado por **Eduardo Villanueva**.

## Qué incluye

**Isla del Aspirantazgo**, 10 niveles hasta recibir la pañoleta:
bienvenida al club, significado del emblema, Maranata y posición para el voto, armar el voto, la Ley en orden, unir lema/blanco/objetivo, ideales en verdadero o falso, la Palabra (buscar el texto en la Biblia), examen del aspirante y la **ceremonia 3D**: la pañoleta baja hasta tu personaje y queda puesta en todo el juego.
Los textos de los ideales están en `src/domain/aspirantazgo.ts`: verifícalos con la versión oficial de tu División.
Prompts para el arte de esta isla: `PROMPTS_ASPIRANTAZGO.md`.

**Isla del Uniforme**, 16 niveles basados en el Manual de Uniformes de la DSA:

| # | Nivel | Tipo |
|---|---|---|
| 1 | Lluvia de insignias | Arcade: atrapar solo lo que pide la consigna |
| 2 | Viste al Conquistador | Armar el uniforme completo, con piezas trampa |
| 3–4 | Mangas al centímetro | Precisión desde la costura del hombro |
| 5 | Ordena la investidura | Orden de clases, colores y divisa correcta |
| 6 | Los bolsillos | Clases en orden, avanzadas a 0,5 cm, excelencia, función |
| 7 | La banda | Bandera a 6 cm, especialidades, C2 |
| 8 | Inspector | Encontrar errores sembrados al azar |
| 9 | ¿Verdadero o falso? | Trivia rápida con rachas |
| 10 | La bandera del club | 128 × 90 cm, cuatro partes, C1 de 30 × 30 |
| 11 | El banderín de unidad | Franja azul, C1, diseño y nombres |
| 12 | Uniforme de líder | Divisa blanca sin estrella, cargo, estrella de servicio |
| 13 | Guía Mayor | Divisa con estrella, LC1, pañoleta GM |
| 14 | Máster y Máster Avanzado | LC2/LC3 en lugar del C2 y botones de liderazgo |
| 15 | Gran trivia | Preguntas del manual |
| 16 | Revista de líderes | Jefe final |

- **Dificultad** Fácil (con pistas, x0,6), Medio (x1) y Leyenda (sin números en la regla, más trampas, menos tiempo, x1,5). El servidor aplica el mismo multiplicador.
- **Imán**: la pieza se engancha al lugar correcto más cercano, así no falla "por milímetros".
- **Salas en vivo** (Supabase Realtime): el líder crea una sala con código de 4 letras, elige nivel y dificultad, y ve la carrera de todos en tiempo real. Todos reciben la misma semilla (mismos errores y preguntas).
- Rankings por jugador, club, ciudad, Campo y país, con podio 3D.
- Para cambiar los dibujos por los oficiales, ver `ASSETS.md`.

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
