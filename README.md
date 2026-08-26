# El Parce Grill — landing

Landing bilingüe para **El Parce Grill**, food truck de hamburguesas gourmet
colombianas en Utah y Temecula (CA). La pieza central es una secuencia de scroll
donde La Colombiana se desarma en sus ocho ingredientes, se etiqueta uno a uno y
vuelve a armarse dentro de la caja de la marca.

```bash
npm install
npm run assets   # procesa assets/ -> public/  (sólo si cambia el material bruto)
npm run dev      # http://localhost:3000 -> redirige a /es
```

## Stack

| | |
|---|---|
| Next.js 16 · App Router · TypeScript | dos rutas estáticas, `/es` y `/en` |
| Tailwind CSS v4 | tokens de marca en `src/app/globals.css` |
| GSAP 3.15 (ScrollTrigger, SplitText) | gratis y con todos los plugins desde la compra por Webflow |
| Lenis | scroll suave acoplado al tick de GSAP |
| sharp | pipeline de assets, sólo en build |
| Playwright | capturas de revisión y auditoría, sólo en desarrollo |

## Estructura

```
assets/            material bruto del cliente (fotos originales, logo, lámina de ingredientes)
scripts/
  build-assets.mjs  assets/ -> public/: recorta ingredientes, optimiza fotos, escribe manifiestos
  lib/cutout.mjs    recorte por saturación de los objetos fotografiados sobre negro
  shoot.mjs         capturas de la secuencia y de cada sección
  audit.mjs         Web Vitals + repaso de accesibilidad sobre el build de producción
  scrollperf.mjs    fluidez del scroll en móvil con la CPU estrangulada
  probe-*.mjs       diagnósticos: rejilla de la lámina, máscaras alfa, geometría del escenario
src/
  app/[lang]/       layout con metadata y JSON-LD por sede + página
  components/
    sections/       una sección por archivo; burger-sequence.tsx abre la página
    ui/             la caja en SVG, CTA, reveal
  lib/
    burger-timeline.ts  geometría y coreografía de la secuencia (aislada para poder afinarla)
    gsap.ts             registro de plugins y utilidades de movimiento
    dictionaries/       todo el copy, es.ts define la forma y en.ts se tipa contra ella
  data/site.ts      menú, sedes, contacto y enlaces
```

## El pipeline de assets

`npm run assets` convierte lo que hay en `assets/` en lo que sirve `public/`.
Lo único no evidente es el recorte de los ingredientes: la lámina es una rejilla
4×2 de ocho ingredientes fotografiados sobre fondo negro de estudio, y de ahí
salen los ocho PNG con alfa que la secuencia despliega en el aire.

La clave **no** es la luminancia. El fondo de la lámina tiene un degradado que
llega a lum ~116, muy por encima de las zonas oscuras del chimichurri o la
tocineta; lo que separa limpiamente es la **saturación**, porque el fondo nunca
pasa de sat 9 y toda la comida es cromática. La luminancia entra sólo como red
de seguridad para las partes pálidas. Después: cierre morfológico, relleno de
los huecos pequeños —los grandes se respetan, o el centro de los aros de cebolla
acabaría siendo un disco negro—, descarte de manchas y pluma en el borde.

Con el recorte hecho, cada capa se escala ×1.9 con Lanczos y un enfoque suave
—las celdas de la lámina miden ~460 px y en pantalla retina se pintan a más del
doble— y se le hornea la sombra proyectada. El manifiesto guarda `ratio`, el
ancho del elemento como múltiplo de BASE, porque tras el sobremuestreo y el
margen de la sombra los píxeles del archivo ya no sirven para el layout.

Cada ejecución deja dos hojas de revisión en `tmp/`: una sobre el carbón real
del sitio y otra sobre magenta, donde cualquier halo o hueco mal cerrado salta a
la vista.

```bash
node scripts/build-assets.mjs --only=ingredients   # ciclo corto para afinar el recorte
node scripts/probe-cutout.mjs                      # vuelca las máscaras alfa
```

## Revisar la secuencia

Con `npm run dev` levantado:

```bash
node scripts/shoot.mjs                       # 9 fotogramas del recorrido + cada sección
node scripts/shoot.mjs --vp=390x844          # móvil
node scripts/shoot.mjs --motion=reduce       # variante de movimiento reducido
node scripts/probe-stage.mjs --at=0          # rectángulos reales, para no medir a ojo
node scripts/audit.mjs --url=http://localhost:3001/es   # contra `next build && next start`
```

La secuencia **abre la página**: no hay hero de foto por delante, la hamburguesa
armada es lo primero que se ve y esta sección contiene el `h1` de la marca. La
coreografía vive entera en `src/lib/burger-timeline.ts`, en múltiplos del ancho
de la hamburguesa y de la altura de la ventana:

```
0.00 → 0.15  apertura    el titular y los botones se retiran; la hamburguesa,
                         ya armada, avanza hacia la cámara
0.15 → 0.43  explosión   las ocho capas se separan y el grupo se aleja
0.43 → 0.62  etiquetas   entra el nombre de cada ingrediente
0.62 → 0.80  reapilado   salen las etiquetas y las capas vuelven a juntarse
0.80 → 1.00  encajado    sube la caja, la torre entra y la tapa cierra
```

Tres cosas que conviene saber antes de tocarla:

- **GSAP reescribe `transform` entero.** Cualquier elemento que anime `y` no
  puede centrarse con `-translate-1/2` de Tailwind: hay que hacerlo con
  `xPercent/yPercent` desde GSAP. Costó un rato la primera vez.
- **La caja son tres SVG con el mismo `viewBox`**, no uno. La hamburguesa se
  pinta entre el fondo y la pared frontal, y por eso al bajar entra de verdad en
  la caja en vez de desvanecerse.
- **Nada de filtros CSS sobre las capas.** Ver la sección siguiente.

## Rendimiento en móvil

El scroll iba a 30 fps en un móvil de gama media, con el 61 % de los fotogramas
fuera de presupuesto. Medido con `scrollperf.mjs`, el culpable era uno solo:
`filter: drop-shadow()` sobre las ocho capas. El navegador vuelve a rasterizar
el filtro cada vez que la capa se transforma, y aquí son ocho moviéndose a la
vez. Quitarlo bastaba para pasar a 60 fps limpios.

La sombra no se perdió: está **horneada en el propio WebP** por
`bakeShadow()`, generada desde el canal alfa del recorte. Cuesta cero en tiempo
de ejecución.

En el mismo repaso se retiraron otras tres cosas que se pagan por fotograma:
el `mix-blend-mode` del grano —una capa fija a pantalla completa con modo de
fusión obliga a recomponer el documento entero—, el `backdrop-filter` de la
barra fija en punteros gruesos, y el `blur` sobre la brasa de fondo, que ya era
un degradado suave. Lenis tampoco se monta en táctil: existe para arreglar la
rueda del ratón, mientras que la inercia del scroll táctil ya la resuelve el
sistema en el compositor.

```
                mediana        p95       tirones >32ms
antes           33.3 ms        50.1 ms   60.9 %
después         16.7 ms        16.8 ms    0.8 %
```

```bash
node scripts/scrollperf.mjs --cpu=4                  # medir
node scripts/scrollperf.mjs --cpu=4 --kill=shadow    # atribuir el coste a un sospechoso
```

## Accesibilidad

Con `prefers-reduced-motion: reduce` no hay versión mutilada de la animación: la
secuencia se sustituye por una ficha de producto con los ocho ingredientes y sus
nombres, y la historia pasa de scroll horizontal a columna —si no, sus dos
últimos paneles quedarían fuera de pantalla sin forma de alcanzarlos. Lenis no
se monta y ninguna timeline se construye.

## Pendiente de confirmar con el cliente

Marcado en `src/data/site.ts` con `verified: false` y comentarios `PENDIENTE`:

1. **Dirección y horario del truck en Utah.** Hoy la sede aparece sin dirección
   y con "horario por confirmar" a propósito: es preferible a inventar una
   dirección que mande a alguien a la esquina equivocada.
2. **Enlace directo a su tienda en DoorDash.** Ahora apunta a la búsqueda.
3. **Precios.** La carta va deliberadamente sin ellos —el menú cambia por plaza
   y un precio desactualizado cuesta más credibilidad de la que gana— pero si
   quieren mostrarlos, el sitio es `MENU` en `src/data/site.ts`.
4. **Dominio real** en `SITE.url`: alimenta canonical, Open Graph y JSON-LD.
5. **Logo vectorial (SVG/AI).** El actual es el PNG de su avatar de Instagram,
   suficiente a los tamaños en que se usa pero no para impresión ni para crecer.

Los nombres de la carta (`La Clásica`, `La Desmechada`, `La de Pollo`) están
deducidos de sus fotos: conviene que los confirmen o los cambien por los reales.

## Deploy

Vercel. Las dos rutas son estáticas y `/` redirige a `/es` desde
`next.config.ts`. No hay variables de entorno.
