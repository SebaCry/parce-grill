import type { gsap as GSAP } from "gsap";

/**
 * Geometría y coreografía de la secuencia de La Colombiana.
 *
 * Vive fuera del componente porque afinar una animación de scroll son treinta
 * iteraciones sobre los mismos ocho números, y no hace falta releer JSX para
 * cada una.
 *
 * Las distancias van en múltiplos de BASE (el ancho de referencia de la
 * hamburguesa) o de la altura del escenario. BASE se deriva del contenedor al
 * montar, así que la coreografía es idéntica en un portátil y en un móvil:
 * cambia la escala, nunca las proporciones.
 */

/** Ancho de celda de la lámina original: convierte px de la foto a unidades BASE. */
export const SOURCE_CELL = 544;

/** Altura total del recorrido con pin, en múltiplos de la altura de la ventana. */
export const SCROLL_LENGTH_VH = 420;

/**
 * Desplazamiento vertical de cada capa con la hamburguesa armada, en unidades
 * BASE desde el centro. Son valores medidos a ojo contra la foto real: las ocho
 * piezas se fotografiaron por separado, así que no hay fórmula que las apile —
 * sólo un solape lo bastante generoso para que la silueta lea como hamburguesa
 * antes de separarse.
 */
export const CLOSED_OFFSET: Record<string, number> = {
  "bun-bottom": 0.3,
  papas: 0.19,
  patty: 0.08,
  bacon: -0.01,
  chimichurri: -0.08,
  onion: -0.14,
  greens: -0.22,
  "bun-top": -0.38,
};

/** Inclinación de reposo. Rompe la simetría de fotomontaje sin llamar la atención. */
export const REST_TILT: Record<string, number> = {
  "bun-bottom": -1.2,
  papas: 1.8,
  patty: -0.9,
  bacon: 2.4,
  chimichurri: -1.6,
  onion: 1.1,
  greens: -2.1,
  "bun-top": 0.8,
};

export type StageMetrics = {
  height: number;
  /** Ancho de referencia de la hamburguesa, en px. */
  base: number;
  /** Separación entre capas contiguas al explotar, en px. */
  spacing: number;
  /** Escala del grupo con la hamburguesa abierta: la cámara retrocede. */
  openScale: number;
  /** Escala al entrar en la caja: un punto más lejos todavía. */
  boxedScale: number;
  /** Desplazamiento horizontal al abrirse, para dejar sitio a las etiquetas. */
  openShiftX: number;
  /** Ancho de los tres SVG de la caja, en px. */
  boxWidth: number;
  /** Altura a la que descansa la caja, medida desde el centro del escenario. */
  boxRestY: number;
  /** Altura final del grupo de capas: la torre queda encajada en la boca. */
  boxedGroupY: number;
};

/**
 * BASE se limita por ancho y por alto a la vez. Sin el tope por ancho, una
 * ventana apaisada y baja produce una hamburguesa que se sale por los lados;
 * sin el tope por alto, la torre abierta no cabe en vertical.
 */
export function measureStage(width: number, height: number): StageMetrics {
  const isCompact = width < 768;
  const base = Math.min(height * 0.4, width * (isCompact ? 0.62 : 0.5));
  const openScale = isCompact ? 0.62 : 0.7;
  // La caja descansa apenas por debajo del centro. Más abajo se comía el
  // titular de cierre y el botón; más arriba dejaba la composición desfondada.
  const boxRestY = height * 0.02;

  return {
    height,
    base,
    spacing: base * 0.33,
    openScale,
    boxedScale: openScale * 0.8,
    // La torre se corre a la izquierda y las etiquetas ocupan la derecha. En
    // compacto el desplazamiento es MAYOR en proporción, no menor: los nombres
    // largos ("Carne 100% res + cheddar") necesitan todo el ancho que quede.
    openShiftX: isCompact ? -width * 0.14 : -width * 0.11,
    boxWidth: base * 1.25,
    boxRestY,
    // La torre baja hasta quedar justo a ras del canto de la tapa: si se queda
    // más arriba, la tapa cierra por debajo de la hamburguesa y se ve flotando
    // sobre una caja ya cerrada.
    boxedGroupY: boxRestY + height * 0.06,
  };
}

export type LayerRefs = {
  id: string;
  el: HTMLElement;
  label: HTMLElement | null;
};

export type BuildArgs = {
  gsap: typeof GSAP;
  layers: LayerRefs[];
  group: HTMLElement;
  /** SVG, no HTML: la caja está dibujada, no recortada de la foto. */
  boxBack: Element;
  boxFront: Element;
  boxLid: Element;
  intro: HTMLElement;
  outro: HTMLElement;
  hint: HTMLElement | null;
  metrics: StageMetrics;
};

/**
 * Construye la timeline completa. El scroll no dispara eventos: mapea progreso
 * a estado, así que recorrerla hacia atrás devuelve exactamente el mismo
 * fotograma que hacia adelante.
 *
 *   0.00 → 0.16  entrada     el titular se retira y la hamburguesa sube a plano
 *   0.16 → 0.44  explosión   las ocho capas se separan y el grupo se aleja
 *   0.44 → 0.62  etiquetas   entra el nombre de cada ingrediente
 *   0.62 → 0.80  reapilado   salen las etiquetas y las capas vuelven a juntarse
 *   0.80 → 1.00  encajado    sube la caja, la torre entra y la tapa cierra
 */
export function buildBurgerTimeline({
  gsap,
  layers,
  group,
  boxBack,
  boxFront,
  boxLid,
  intro,
  outro,
  hint,
  metrics,
}: BuildArgs) {
  const { base, height, spacing, openScale, openShiftX, boxRestY, boxedGroupY, boxedScale } =
    metrics;
  const mid = (layers.length - 1) / 2;
  const openY = (i: number) => (mid - i) * spacing;

  const tl = gsap.timeline({ defaults: { ease: "none" } });

  // --- Estado inicial -----------------------------------------------------
  // La hamburguesa arranca fuera de plano por abajo: el titular necesita la
  // pantalla entera, y su entrada da a la sección un primer gesto propio.
  gsap.set(group, { scale: 0.9, x: 0, y: height * 0.62, transformOrigin: "50% 50%" });
  gsap.set(
    layers.map((l) => l.el),
    { xPercent: -50, yPercent: -50, autoAlpha: 1 },
  );
  for (const { el, id } of layers) {
    gsap.set(el, { y: CLOSED_OFFSET[id] * base, rotate: REST_TILT[id] ?? 0 });
  }
  for (const { label } of layers) {
    if (label) gsap.set(label, { autoAlpha: 0, x: 40, y: 0, yPercent: -50 });
  }
  // Las tres piezas de la caja se centran con `xPercent/yPercent` y NO con las
  // clases `-translate-1/2` de Tailwind: GSAP reescribe la propiedad
  // `transform` entera al animar `y`, así que cualquier centrado declarado en
  // CSS se pierde en cuanto arranca la timeline.
  gsap.set([boxBack, boxFront, boxLid], { xPercent: -50, yPercent: -50 });
  gsap.set([boxBack, boxFront], { autoAlpha: 0, y: height * 0.75 });
  gsap.set(boxLid, { autoAlpha: 0, y: boxRestY - height * 0.7, rotate: -9 });
  gsap.set(outro, { autoAlpha: 0, y: 40 });

  // --- 0.00 → 0.16 · entrada ---------------------------------------------
  tl.to(intro, { autoAlpha: 0, y: -80, duration: 0.13 }, 0.02);
  if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.07 }, 0);
  tl.to(group, { y: 0, scale: 1, duration: 0.16, ease: "power2.out" }, 0);

  // --- 0.16 → 0.44 · explosión -------------------------------------------
  // El stagger va de fuera hacia dentro: el pan de arriba y la base arrancan
  // primero y llegan más lejos, que es como se abre de verdad.
  layers.forEach(({ el, id }, i) => {
    const fromCentre = Math.abs(mid - i) / mid;
    tl.to(
      el,
      {
        y: openY(i),
        rotate: (REST_TILT[id] ?? 0) * 2.2,
        duration: 0.28,
        ease: "power3.out",
      },
      0.16 + (1 - fromCentre) * 0.05,
    );
  });
  tl.to(group, { scale: openScale, x: openShiftX, duration: 0.28, ease: "power2.inOut" }, 0.16);

  // --- 0.44 → 0.62 · etiquetas -------------------------------------------
  // Cada etiqueta se ancla a la altura EN PANTALLA de su capa. Las etiquetas
  // viven fuera del grupo transformado (si viajaran dentro heredarían la escala
  // y el texto perdería nitidez), así que hay que aplicarles la escala a mano.
  layers.forEach(({ label }, i) => {
    if (!label) return;
    gsap.set(label, { y: openY(i) * openScale });
    tl.to(
      label,
      { autoAlpha: 1, x: 0, duration: 0.1, ease: "power2.out" },
      0.44 + (layers.length - 1 - i) * 0.014,
    );
  });

  // --- 0.62 → 0.80 · reapilado -------------------------------------------
  layers.forEach(({ label }) => {
    if (!label) return;
    tl.to(label, { autoAlpha: 0, x: -24, duration: 0.06, ease: "power2.in" }, 0.62);
  });
  layers.forEach(({ el, id }, i) => {
    tl.to(
      el,
      {
        // Se reapila más apretada que al principio: dentro de la caja no cabe
        // con la misma separación con la que se sirve en el plato.
        y: CLOSED_OFFSET[id] * base * 0.55,
        rotate: REST_TILT[id] ?? 0,
        duration: 0.16,
        ease: "power2.inOut",
      },
      0.66 + i * 0.006,
    );
  });
  tl.to(group, { x: 0, duration: 0.16, ease: "power2.inOut" }, 0.66);

  // --- 0.80 → 1.00 · encajado --------------------------------------------
  // Los tres tiempos van encadenados, no solapados: la caja llega primero, la
  // torre entra después y sólo entonces baja la tapa. Solapándolos, la tapa
  // cerraba mientras la hamburguesa seguía cayendo.
  tl.to([boxBack, boxFront], { autoAlpha: 1, y: boxRestY, duration: 0.09, ease: "power2.out" }, 0.78);
  // La pared frontal se dibuja POR ENCIMA de las capas, así que la mitad
  // inferior de la torre desaparece tras el borde sola: no hay que desvanecer
  // nada, entra de verdad en la caja.
  tl.to(group, { y: boxedGroupY, scale: boxedScale, duration: 0.09, ease: "power2.in" }, 0.87);
  tl.to(boxLid, { autoAlpha: 1, duration: 0.02 }, 0.93);
  tl.to(boxLid, { y: boxRestY, rotate: 0, duration: 0.07, ease: "power3.out" }, 0.93);
  // La torre es más alta que la caja, así que la base y su sombra asoman por
  // debajo. Se apagan cuando la tapa ya las cubre: a esa altura del recorrido
  // nadie las ve desaparecer, y la caja cerrada queda limpia.
  tl.to(
    layers.map((l) => l.el),
    { autoAlpha: 0, duration: 0.02 },
    0.97,
  );
  tl.to(outro, { autoAlpha: 1, y: 0, duration: 0.07, ease: "power2.out" }, 0.92);

  return tl;
}
