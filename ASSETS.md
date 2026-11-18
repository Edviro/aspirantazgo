# Assets de Aspirantazgo

Todo lo que el juego necesita para verse con tus diseños. Cuando llegue cada archivo, reemplaza al dibujo aproximado en todo el juego (tablero, bandeja, mapa 3D y personaje).

## Cómo exportarlos

**Formato**
- **SVG** para todo lo plano: emblemas, botones, tiras, divisas, banderas.
- **PNG** solo para lo ilustrado: personajes y pañoletas con pliegues. Fondo transparente, 1024 px en el lado mayor.

**Desde Illustrator:** Exportar para pantallas → SVG.
- Estilo: *Atributos de presentación*.
- Fuentes: *Convertir a contornos*.
- Desmarca *Adaptable*.
- Una mesa de trabajo por pieza, ajustada al borde, sin márgenes ni sombras.

**Reglas**
- **Respeta la proporción** de la columna "Proporción (cm)". El juego coloca cada pieza a su tamaño real del manual; si la proporción no coincide, se deforma.
- **Tiras sin texto.** Mándalas vacías. El juego escribe el nombre del club, el cargo o el apodo con la fuente correcta y los achica para que entren.
- **Nombres de archivo** exactamente como en la tabla, en minúsculas y sin tildes.

## Prioridad 1: el uniforme (sin esto el juego no puede verse oficial)

### Emblemas
| Archivo | Qué es | Proporción (cm) | Dónde se usa |
|---|---|---|---|
| `c1.svg` | Emblema C1 con "CONQUISTADORES" y "CLUB" | 7,2 × 7,5 | Manga derecha, bandera, banderín |
| `c2-caqui.svg` | C2 con fondo caqui | 6,4 × 5 (óvalo) | Manga izquierda (10–15 años), banda |
| `c2-blanco.svg` | C2 con fondo blanco | 6,4 × 5 | Manga izquierda (16+), pañoleta 16+ |
| `c3.svg` | C3, triángulo sin inscripción | 1 × 1 | Hebilla, sujetador, pañoleta |
| `c4.svg` | C4 con el mapa de Sudamérica | 1 × 1 | Portada y pantalla de carga |
| `c5.svg` | C5 en un solo color | 1 × 1 | Dentro de botones de clase, función, galón |
| `lc1.svg` | LC1 Guía Mayor | 1 × 1 | Pañoleta GM, sujetador GM |
| `lc2.svg` | LC2 Guía Mayor Máster | 6,4 × 5 | Manga izquierda del Máster (reemplaza al C2) |
| `lc3.svg` | LC3 Máster Avanzado | 6,4 × 5 | Manga izquierda del Máster Avanzado |
| `lc4.svg` | LC4 actividades de Guías Mayores | 1 × 1 | Opcional, para la zona de líderes |
| `campo.svg` | Emblema del Campo (tu Asociación/Misión) | 7,5 × 5,5 | Manga izquierda |
| `bautismo.svg` | Distintivo de bautismo | 2 × 2 | Solapa del bolsillo derecho |

### Clases regulares
| Archivo | Qué es | Proporción (cm) |
|---|---|---|
| `boton-amigo.svg` … `boton-guia.svg` (6) | Distintivo metálico redondo de cada clase | 1,6 × 1,6 |
| `triangulo-amigo.svg` … `triangulo-guia.svg` (6) | Triángulo de color de cada clase (los que mandaste, en grande) | 1 × 1,1 |
| `tira-clase-amigo.svg` … `tira-clase-guia.svg` (6) | Tira de clase en ejecución (caqui con borde rojo, vacía) | 5 × 1,2 |

Los seis archivos de cada grupo son: amigo, companero, explorador, pionero, excursionista y guia.

### Clases avanzadas
| Archivo | Qué es | Proporción (cm) |
|---|---|---|
| `avanzada-amigo.svg` … `avanzada-guia.svg` (6) | Barra de tres cuadrados (laterales del color de la clase, centro amarillo) | 2,4 × 0,8 |

### Liderazgo
| Archivo | Qué es | Proporción (cm) |
|---|---|---|
| `pin-gm.svg` | Botón/pin de Guía Mayor (LC1) | 1,7 × 1,7 |
| `pin-master.svg` | Botón/pin de Guía Mayor Máster (LC2, plateado) | 1,7 × 1,7 |
| `pin-master-avanzado.svg` | Botón/pin de Máster Avanzado (LC3, dorado) | 1,7 × 1,7 |
| `excelencia.svg` | Insignia de excelencia | 3,6 × 0,9 |
| `estrella-servicio.svg` | Estrella roja con borde amarillo, **sin número** | 3 × 3 |

### Divisas
Elige **una** de las dos opciones.

**Opción A (recomendada): por piezas.** El juego arma cualquier combinación de clases, para niños y para líderes con las clases que tengan.
- `divisa-base-caqui.svg`: rectángulo terminado en "V", vacío (4 × 4,6).
- `divisa-base-blanca.svg`: lo mismo en blanco, para líder sin estrella (4 × 4,6).
- `divisa-base-gm.svg`: la blanca alta con la estrella (4 × 8,5).
- `chevron-amigo.svg` … `chevron-guia.svg` (6): solo la "V" de cada color, del ancho de la divisa.

**Opción B: completas.**
- `divisa-conquistador-1.svg` … `divisa-conquistador-6.svg`: de "Amigo" hasta "Amigo a Guía".
- `divisa-lider.svg`.
- `divisa-gm.svg`.

### Tiras (vacías, sin texto)
| Archivo | Proporción (cm) |
|---|---|
| `tira-club.svg` (curva roja, borde amarillo) | 10 × 5 |
| `tira-campo.svg` (curva, para líderes del Campo) | 10 × 5 |
| `tira-cargo.svg` | 7,5 × 2 |
| `tira-funcion.svg` (con el C5 a la izquierda) | 6,5 × 1,4 |
| `tira-nombre-caqui.svg` (fondo caqui, borde verde) | 8 × 1,6 |
| `tira-nombre-blanca.svg` (fondo blanco, borde verde) | 8 × 1,6 |

### Pañoletas y accesorios
| Archivo | Qué es |
|---|---|
| `panoleta-conquistador.png` | Pañoleta 10–15 años, **vista de frente puesta en el cuello**: el triángulo atrás y las dos puntas adelante |
| `panoleta-16.png` | Igual, con el C2 de fondo blanco |
| `panoleta-gm.png` | Pañoleta de Guía Mayor (borde rojo, LC1, cintas de clases) |
| `sujetador-conquistador.svg`, `sujetador-gm.svg` | Solo el sujetador, de frente |
| `correa.svg` | Correa verde petróleo con hebilla C3, recta (34 × 2,6) |
| `torzal-peru.svg` | Torzal rojo y blanco (opcional) |
| `galon-director.svg` | Galón de director (opcional) |

## Prioridad 2: camisas y banda (el "lienzo" donde se juega)

Hoy son dibujos míos. Con los tuyos, el tablero se verá como tus láminas del manual. Dibuja **a escala**, con 1 cm del manual = 10 unidades en Illustrator.

| Archivo | Medida de la mesa de trabajo | Notas |
|---|---|---|
| `camisa-caqui-pecho.svg` | 500 × 420 | Frente con cuello, botones y los dos bolsillos con tapa. La tapa empieza a 160 desde arriba, mide 40 de alto y 120 de ancho. Bolsillo derecho de quien la viste en x = 80; izquierdo en x = 300. |
| `camisa-caqui-manga.svg` | 200 × 260 | Manga corta con la costura del hombro arriba (y = 0) y el dobladillo de 26 abajo. Sirve para las dos mangas. |
| `camisa-blanca-pecho.svg`, `camisa-blanca-manga.svg` | Igual | Para líderes, GM y Máster |
| `banda-frente.svg` | 120 × 600 | Tramo delantero de la banda verde, con la costura del hombro arriba |

## Prioridad 3: bandera, banderín y especialidades

| Archivo | Qué es |
|---|---|
| `bandera-oficial.svg` | Bandera de 128 × 90 con las cuatro partes y el C1, **sin** el nombre del club |
| `banderin-plantilla.svg` | Banderín de 55 × 36 con la franja azul y el C1, **sin** diseño ni nombres |
| `unidad-1.svg`, `unidad-2.svg`, `unidad-3.svg` | Dos o tres diseños de unidad de ejemplo (12,5 × 12,5) |

**Especialidades:** por ahora van **sin ícono**, solo con color. Para que el color sea el oficial, mándame este dato (texto, no imagen):
- La lista de categorías de especialidades.
- El color de fondo y de borde de cada categoría.

Más adelante, si quieres las especialidades reales, serán un SVG circular por especialidad (`esp-nombre.svg`).

## Prioridad 4: personaje y personalización de líderes

El personaje 3D usa las mismas piezas de arriba, en pequeño, sobre la camisa. Para que se vea bien personalizado (Líder, GM, Máster y Máster Avanzado) no hace falta nada más que las prioridades 1 y 2.

Opcional, para un acabado superior:
- [ ] `personaje-base-chico.glb` y `personaje-base-chica.glb`: modelo en Blender, riggeado con Mixamo, en T-pose, de menos de 5 MB cada uno.

## Prioridad 5: mundo y marca
| Archivo | Qué es |
|---|---|
| `logo-juego.svg` o `.png` | Logo final "Aspirantazgo" (el de alas con el nombre) |
| `isla-uniforme.svg` | Ícono de cada isla, cuadrado y simple. Hay que hacer uno por isla (son 7 en total). |
| `isla-aspirantazgo.svg` | |
| `isla-regulares.svg` | |
| `isla-especialidades.svg` | |
| `isla-avanzadas.svg` | |
| `isla-historia.svg` | |
| `isla-ideales.svg` | |
| Personajes en PNG (opcional) | Aspirante sin pañoleta, líder con camisa blanca y poses de reacción (celebrando, pensando), para los diálogos |

## Datos (texto, no imágenes)
- [ ] Nombre exacto de tu Campo, Unión y región, para el emblema y los ejemplos.
- [ ] Categorías de especialidades con sus colores.
- [ ] Para la isla **Ideales**: voto, ley, lema, blanco, objetivo y canto, en la versión oficial que usan en tu División.
- [ ] Para la isla **Historia**: los datos y fechas que quieras que aprendan.
