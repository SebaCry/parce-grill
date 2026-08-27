"use client";

import { useRef } from "react";
import Image from "next/image";
import LAYERS from "@/data/burger-layers.json";
import { BoxBack, BoxFront, BoxLid } from "@/components/ui/burger-box";
import { CtaLink } from "@/components/ui/cta";
import {
  gsap,
  ScrollTrigger,
  SplitText,
  useGSAP,
  prefersReducedMotion,
  promoteWhileActive,
} from "@/lib/gsap";
import {
  buildBurgerTimeline,
  measureStage,
  SCROLL_LENGTH_VH,
  type LayerRefs,
} from "@/lib/burger-timeline";
import type { Dictionary, Locale } from "@/lib/i18n";
import { SITE } from "@/data/site";

type Props = { dict: Dictionary; lang: Locale };

/**
 * La secuencia de La Colombiana. Es lo primero que ve el visitante: la
 * hamburguesa ya armada ocupa la apertura, y el titular de la marca vive dentro
 * de esta misma sección en vez de en un hero aparte con una foto.
 *
 * Las capas llegan del manifiesto ordenadas de abajo hacia arriba (índice 0 =
 * base) y se pintan en ese orden, de modo que el apilamiento natural del DOM
 * hace de z-index sin declarar ninguno.
 */
export function BurgerSequence({ dict, lang }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const boxBackRef = useRef<SVGSVGElement>(null);
  const boxFrontRef = useRef<SVGSVGElement>(null);
  const boxLidRef = useRef<SVGSVGElement>(null);
  const layerRefs = useRef<Map<string, HTMLElement>>(new Map());
  const labelRefs = useRef<Map<string, HTMLElement>>(new Map());

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const stage = stageRef.current;
      const group = groupRef.current;
      const back = boxBackRef.current;
      const front = boxFrontRef.current;
      const lid = boxLidRef.current;
      if (!stage || !group || !back || !front || !lid) return;

      // Entrada del titular. Va fuera de `matchMedia` porque se reproduce una
      // sola vez al cargar y no depende del breakpoint.
      let split: SplitText | undefined;
      if (titleRef.current) {
        split = SplitText.create(titleRef.current, {
          type: "chars,lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.chars, {
              yPercent: 115,
              duration: 1.1,
              ease: "power4.out",
              stagger: 0.018,
            }),
        });
      }

      const layers: LayerRefs[] = LAYERS.map((l) => ({
        id: l.id,
        el: layerRefs.current.get(l.id)!,
        label: labelRefs.current.get(l.id) ?? null,
      })).filter((l) => l.el);

      // `matchMedia` reconstruye la timeline en cada salto de breakpoint y
      // limpia la anterior. Sin él, girar el móvil deja las capas congeladas en
      // coordenadas calculadas para la orientación anterior.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 0px)", () => {
        const metrics = measureStage(stage.clientWidth, stage.clientHeight);

        // Los tamaños se fijan en px aquí y no en CSS: cada capa conserva la
        // proporción con la que se fotografió, y la caja se dimensiona contra la
        // misma unidad. `ratio` viene del manifiesto porque el archivo está
        // sobremuestreado y lleva margen para la sombra horneada: sus píxeles ya
        // no valen para calcular el layout.
        for (const layer of LAYERS) {
          const el = layerRefs.current.get(layer.id);
          if (el) el.style.width = `${layer.ratio * metrics.base}px`;
        }
        for (const svg of [back, front, lid]) {
          svg.style.width = `${metrics.boxWidth}px`;
        }

        const timeline = buildBurgerTimeline({
          gsap,
          layers,
          group,
          boxBack: back,
          boxFront: front,
          boxLid: lid,
          intro: introRef.current!,
          actions: actionsRef.current!,
          caption: captionRef.current!,
          outro: outroRef.current!,
          hint: hintRef.current,
          metrics,
        });

        const trigger = ScrollTrigger.create({
          animation: timeline,
          trigger: rootRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: metrics.scrub,
          ...promoteWhileActive([group, ...layers.map((l) => l.el)]),
        });

        return () => {
          trigger.kill();
          timeline.kill();
        };
      });

      return () => {
        mm.revert();
        split?.revert();
      };
    },
    { scope: rootRef },
  );

  // Sin `-translate-1/2`: el centrado lo hace GSAP con `xPercent/yPercent`
  // (ver burger-timeline.ts). `opacity-0` evita el destello del primer frame,
  // antes de que la timeline tome el control.
  const boxClass = "absolute top-1/2 left-1/2 h-auto opacity-0";

  // El `id` cuelga del contenedor y no de la sección animada: con movimiento
  // reducido esa sección está oculta, y un enlace del menú que apunte a un
  // elemento con `display:none` no lleva a ninguna parte.
  return (
    <div id="la-colombiana">
      <section
        ref={rootRef}
        className="relative motion-reduce:hidden"
        style={{ height: `${SCROLL_LENGTH_VH}svh` }}
      >
        <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden">
          {/* Brasa de fondo. Es un degradado radial sin `blur`: el filtro sobre
              una caja de 120vmin costaba fotogramas en móvil y el degradado ya
              es suave por definición. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,77,28,0.22) 0%, rgba(255,120,40,0.10) 26%, rgba(255,206,0,0.05) 46%, transparent 70%)",
            }}
          />

          {/* El desplazamiento arranca en la altura de la barra fija (h-16 / h-20):
              anclado a un porcentaje puro, el cintillo quedaba por debajo del
              header y se perdía. */}
          <div
            ref={introRef}
            className="gutter absolute inset-x-0 top-[calc(4rem+3svh)] z-40 text-center md:top-[calc(5rem+3svh)]"
          >
            <p className="eyebrow flex items-center justify-center gap-3">
              <span
                className="flag-edge inline-block h-[3px] w-10 shrink-0 rounded-full"
                aria-hidden="true"
              />
              {dict.hero.eyebrow}
            </p>
            <h1 ref={titleRef} className="mt-5 text-(length:--step-hero)">
              {dict.hero.title.map((line, i) => (
                <span key={line} className="block">
                  {i === dict.hero.title.length - 1 ? (
                    <span className="text-amarillo">{line}</span>
                  ) : (
                    line
                  )}
                </span>
              ))}
            </h1>
          </div>

          {/* Orden de pintado = orden de profundidad. La hamburguesa queda entre
              el fondo de la caja y su pared frontal, y por eso al bajar se mete
              dentro en lugar de desvanecerse. */}
          <BoxBack ref={boxBackRef} className={`${boxClass} z-0`} />

          <div ref={groupRef} className="absolute inset-0 z-10">
            {LAYERS.map((layer) => (
              <Image
                key={layer.id}
                ref={(el) => {
                  if (el) layerRefs.current.set(layer.id, el);
                }}
                src={layer.src}
                alt=""
                width={layer.width}
                height={layer.height}
                // Las dos primeras capas se ven en el primer fotograma, así que
                // van con prioridad; el resto en `eager` para no competir con
                // ellas en la carga inicial.
                priority={layer.stack >= 6}
                loading={layer.stack >= 6 ? undefined : "eager"}
                sizes="(min-width: 768px) 32vw, 72vw"
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 h-auto max-w-none select-none"
              />
            ))}
          </div>

          <BoxFront ref={boxFrontRef} className={`${boxClass} z-20`} />
          <BoxLid ref={boxLidRef} className={`${boxClass} z-30`} />

          {/* Rótulo de la fase de despiece. Entra cuando el titular ya se ha ido
              y las capas están separadas. */}
          {/* En pantalla ancha va arriba a la izquierda, en la banda que deja
              libre la torre. En compacto no cabe ahí —la torre arranca casi
              pegada al header— así que baja al pie. */}
          <div
            ref={captionRef}
            className="gutter absolute inset-x-0 bottom-[6svh] z-40 text-center opacity-0 sm:inset-x-auto sm:top-[14svh] sm:bottom-auto sm:left-0 sm:text-left"
          >
            <p className="eyebrow">{dict.burger.eyebrow}</p>
            <p className="mt-3 font-display text-(length:--step-title) uppercase">
              {dict.burger.title.map((line, i) => (
                <span key={line} className="block">
                  {i === 1 ? <span className="text-amarillo">{line}</span> : line}
                </span>
              ))}
            </p>
          </div>

          {/* Etiquetas. Cada una se ancla por JS a la altura EN PANTALLA de su
              ingrediente; aquí sólo se declara la columna. */}
          <ul
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-[48%] z-40 sm:left-[52%] lg:left-[56%]"
          >
            {LAYERS.map((layer) => (
              <li
                key={layer.id}
                ref={(el) => {
                  if (el) labelRefs.current.set(layer.id, el);
                }}
                className="absolute top-1/2 left-0 flex items-center gap-2 whitespace-nowrap sm:gap-4"
              >
                <span className="h-px w-[3vw] bg-linear-to-r from-ember/0 to-ember sm:w-[5vw]" />
                <span className="font-display text-[clamp(0.72rem,1.6vw,1.25rem)] tracking-tight">
                  {layer.label[lang]}
                </span>
              </li>
            ))}
          </ul>

          <div ref={outroRef} className="gutter absolute inset-x-0 bottom-[7svh] z-40 text-center">
            <p className="font-display text-(length:--step-title) uppercase">
              {dict.burger.outroTitle.map((line, i) => (
                <span key={line} className="block">
                  {i === 1 ? <span className="text-amarillo">{line}</span> : line}
                </span>
              ))}
            </p>
            <p className="mx-auto mt-4 max-w-sm text-sm text-humo">{dict.burger.outroLead}</p>
            <CtaLink href={SITE.doordash} external className="mt-6">
              {dict.burger.cta}
            </CtaLink>
          </div>

          {/* La bajada vive abajo, junto a los botones, y no debajo del titular:
              arriba le robaba al producto la franja central de la pantalla y el
              pan acababa solapando el párrafo. */}
          <div
            ref={actionsRef}
            className="gutter absolute inset-x-0 bottom-[7svh] z-40 text-center"
          >
            <p className="mx-auto max-w-xl text-(length:--step-lead) leading-snug text-hueso/75">
              {dict.hero.lead}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <CtaLink href={SITE.doordash} external>
                {dict.hero.cta}
              </CtaLink>
              <CtaLink href="#carta" variant="ghost">
                {dict.hero.ctaSecondary}
              </CtaLink>
            </div>
          </div>

          <div ref={hintRef} className="eyebrow absolute inset-x-0 bottom-[2svh] z-40 text-center">
            {dict.hero.scroll}
          </div>
        </div>
      </section>

      {/* Con movimiento reducido no hay coreografía que degradar: la misma
          información se entrega como ficha de producto, no como una versión
          mutilada de la animación. */}
      <section className="gutter hidden py-24 motion-reduce:block">
        <p className="eyebrow">{dict.hero.eyebrow}</p>
        <h1 className="mt-4 text-(length:--step-hero)">{dict.hero.title.join(" ")}</h1>
        <p className="mt-5 max-w-xl text-(length:--step-lead) text-hueso/75">{dict.hero.lead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaLink href={SITE.doordash} external>
            {dict.hero.cta}
          </CtaLink>
          <CtaLink href="#carta" variant="ghost">
            {dict.hero.ctaSecondary}
          </CtaLink>
        </div>

        <p className="eyebrow mt-20">{dict.burger.eyebrow}</p>
        <p className="mt-3 font-display text-(length:--step-display) uppercase">
          {dict.burger.title.join(" ")}
        </p>
        <p className="mt-4 max-w-md text-(length:--step-lead) text-humo">
          {dict.burger.staticNote}
        </p>
        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {[...LAYERS].reverse().map((layer) => (
            <li key={layer.id} className="text-center">
              <Image
                src={layer.src}
                alt=""
                width={layer.width}
                height={layer.height}
                sizes="(min-width: 640px) 22vw, 45vw"
                className="mx-auto h-auto w-full max-w-[210px]"
              />
              <span className="mt-3 block font-display text-sm tracking-tight">
                {layer.label[lang]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
