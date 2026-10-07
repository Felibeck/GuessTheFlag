# GuessTheFlag: design brief

Animation mode: non-animated (es un juego, no una web de scroll; elección del proyecto)

## Concepto
Las banderas son lo único con color. Todo lo demás es una sala de proyección
oscura y neutra: la bandera aparece como un mosaico de partículas que reacciona
al cursor, estalla al acertar y se recompone en la siguiente. La luz ambiente de
la página toma el color medio de la bandera en pantalla.

## Tokens
- Fondo `#0c0d10` (zinc frío, nunca negro puro), superficie `#15171c`, `#1c1f26`
- Texto `#eceef2`, secundario `#8a8f9a`, líneas `rgba(255,255,255,0.08)`
- Acento único `#e9d37b` (amarillo señal, saturación < 80%)
- Tipografía: Geist (titulares y UI) + Geist Mono (cifras: puntos, tiempo, ranking)
- Esquinas: contenedores 20px, todo lo interactivo en píldora

## Tier-1 (wow-catalog)
C2, particle dissolve: la bandera muestreada en una rejilla de partículas con
física de muelle. Cursor = repulsión. Acierto = explosión y recomposición en la
nueva bandera. Fallo = temblor. Reduced motion: la bandera se dibuja estática.

## Pantallas
1. Inicio: titular + reglas + "Nueva partida" a la izquierda, bandera viva a la
   derecha (rota sola cada pocos segundos). Ranking debajo.
2. Partida: barra de tiempo bajo la navegación, marcador, bandera a gran tamaño,
   barra de respuesta tipo prompt abajo.
3. Resultado: puntuación grande, aciertos y fallos, guardar nombre, ranking.

## Botones (cada uno con su propia identidad)
- Nueva partida: visor con esquinas que se cierran sobre la etiqueta.
- Adivinar: sello, al pulsar se hunde y se inclina.
- Pasar: la etiqueta se desliza y revela su coste ("−1 punto").
- Guardar: segmento acoplado a la píldora del nombre.

## Copy
Sin rayas (em dash), sin etiquetas en mayúsculas sobre titulares, frases cortas.
