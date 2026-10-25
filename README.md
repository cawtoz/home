# Plano de casa · 2D y 3D

Vite + Three.js + TypeScript. Bun instala las dependencias y ejecuta los comandos.

```sh
bun install
bun run dev
```

Abrir la dirección local que imprime Vite. Para comprobar el proyecto:

```sh
bun test
bun run build
bun run preview
```

## Edición

- `src/plan.ts`: medidas compartidas por las dos vistas, en metros. `illustrative` contiene las alturas todavía no medidas.
- `src/model.ts`: geometría Three.js. X recorre el largo, Z apunta hacia abajo en el plano y Y es la altura.
- `src/plan2d.js`: dibujo SVG original, conectado a las mismas medidas.
- `src/main.ts`: cámara, iluminación y controles. Solo se renderiza cuando cambia la vista.
- `public/plano-base.html`: copia del plano anterior, como referencia histórica; no se actualiza automáticamente.
- `vista_3d.*`: la ilustración anterior, independiente del modelo interactivo.

## Medidas y supuestos

Se conserva la geometría del plano: 6,70 m de largo, dormitorio de 2,70 m con fondo de 2,00 a 2,20 m, recortes, medidas y posiciones de muebles. La escalera mide 0,60 × 1,70 m, con seis peldaños uniformes de 0,15 m; el más alto está junto a la pared inferior. El lado del clóset está 0,10 m por debajo del piso de la escalera.

El plano original usa ejes de muro para sus cotas. Se conserva ese criterio; el espesor gráfico equivale a 10/120 m, y aún no es una medición de obra. Los anchos de las dos ventanas se reparten por igual entre los tramos de muro medidos. Las alturas confirmadas son 0,79 m para el setup y 1,40 m para el clóset, medidas desde el piso de cada mueble. Las alturas de la cama, la mesa superior, antepechos y ventanas son provisionales.

La vista inicial corta todas las paredes a +0,90 m respecto del piso de la escalera. Al activar «Muros completos», las paredes altas llegan al techo, a +2,30 m. Los tres bordes de la base exterior mantienen su altura real de +0,90 m en ambas vistas. Desde el piso del clóset, que está a −0,10 m, esa base mide 1,00 m de altura. El techo se referencia provisionalmente al piso de la escalera; falta confirmar desde qué piso se midió.

## Controles

Arrastrar gira la cámara; rueda o pellizco acerca; clic derecho o gesto con dos dedos desplaza. Las teclas +/− y las flechas funcionan con el lienzo enfocado. Los botones permiten comparar con el plano 2D, mostrar muros completos, ocultar muebles y restablecer la cámara.



La base exterior se representa como un volumen sólido a +0,90 m, conectado con el peldaño más alto y los tres bordes bajos. Se rellena el exterior del recorte, una franja junto al borde inferior y el frente de las ventanas siguiendo la inclinación de su pared; su extensión es ilustrativa y no modifica la planta medida. Los bordes de ese volumen mantienen su altura también en la vista con muros cortados.




Las ventanas arrancan 0,18 m por encima de la base exterior (+1,08 m respecto del piso de la escalera). En la vista cortada a +0,90 m se ve el antepecho sólido; las ventanas aparecen al mostrar los muros completos.

