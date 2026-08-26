"use client";

import { useRef } from "react";
import Image from "next/image";
import LAYERS from "@/data/burger-layers.json";
import { BoxBack, BoxFront, BoxLid } from "@/components/ui/burger-box";
import { CtaLink } from "@/components/ui/cta";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion, promoteWhileActive } from "@/lib/gsap";
import {
  buildBurgerTimeline,
  measureStage,
  SOURCE_CELL,
  SCROLL_LENGTH_VH,
  type LayerRefs,
} from "@/lib/burger-timeline";
import type { Dictionary, Locale } from "@/lib/i18n";
import { SITE } from "@/data/site";

type Props = { dict: Dictionary; lang: Locale };

/**
 * Las capas llegan del manifiesto ordenadas de abajo hacia arriba (índice 0 =
 * base). Se pintan en ese mismo orden para que el apilamiento natural del DOM
 * haga de z-index sin declarar ninguno.
 */
export function BurgerSequence({ dict, lang }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
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
        // proporción con la que se fotografió, referida al ancho de celda, y la
        // caja se dimensiona contra esa misma unidad.
        for (const layer of LAYERS) {
          const el = layerRefs.current.get(layer.id);
          if (el) el.style.width = `${(layer.width / SOURCE_CELL) * metrics.base}px`;
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
          outro: outroRef.current!,
          hint: hintRef.current,
          metrics,
        });

        const trigger = ScrollTrigger.create({
          animation: timeline,
          trigger: rootRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          ...promoteWhileActive([group, ...layers.map((l) => l.el)]),
        });

        return () => {
          trigger.kill();
          timeline.kill();
        };
      });

      return () => mm.revert();
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
        aria-label={dict.burger.eyebrow}
        className="relative motion-reduce:hidden"
        style={{ height: `${SCROLL_LENGTH_VH}svh` }}
      >
        <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden">
          {/* Brasa de fondo: da profundidad y justifica el reflejo que cada
              ingrediente trae de la mesa del estudio. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,77,28,0.20) 0%, rgba(255,206,0,0.07) 38%, transparent 68%)",
            }}
          />

          <div ref={introRef} className="gutter absolute inset-x-0 top-[16svh] z-40 text-center">
            <p className="eyebrow">{dict.burger.eyebrow}</p>
            <h2 className="mt-4 text-(length:--step-display)">
              {dict.burger.title.map((line, i) => (
                <span key={line} className="block">
                  {i === 1 ? <span className="text-amarillo">{line}</span> : line}
                </span>
              ))}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-(length:--step-lead) text-humo">
              {dict.burger.lead}
            </p>
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
                // `eager` sin `priority`: las ocho capas son el contenido de la
                // sección y no pueden llegar tarde, pero tampoco deben
                // precargarse por delante de la foto del hero, que es el LCP.
                loading="eager"
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 h-auto max-w-none select-none"
                style={{ filter: "drop-shadow(0 26px 34px rgba(0,0,0,0.55))" }}
              />
            ))}
          </div>

          <BoxFront ref={boxFrontRef} className={`${boxClass} z-20`} />
          <BoxLid ref={boxLidRef} className={`${boxClass} z-30`} />

          {/* Etiquetas. Cada una se ancla por JS a la altura EN PANTALLA de su
              ingrediente; aquí sólo se declara la columna. */}
          <ul
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-[44%] z-40 sm:left-[52%] lg:left-[56%]"
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
            <h2 className="text-(length:--step-title)">
              {dict.burger.outroTitle.map((line, i) => (
                <span key={line} className="block">
                  {i === 1 ? <span className="text-amarillo">{line}</span> : line}
                </span>
              ))}
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm text-humo">{dict.burger.outroLead}</p>
            <CtaLink href={SITE.doordash} external className="mt-6">
              {dict.burger.cta}
            </CtaLink>
          </div>

          {/* Pegado al margen izquierdo, no centrado: la hamburguesa entra por
              abajo justo por el centro y se comía el texto. */}
          <div
            ref={hintRef}
            className="eyebrow absolute bottom-[5svh] left-[var(--gutter)] z-20"
          >
            {dict.burger.hint}
          </div>
        </div>
      </section>

      {/* Con movimiento reducido no hay coreografía que degradar: la misma
          información se entrega como ficha de producto, no como una versión
          mutilada de la animación. */}
      <section
        aria-label={dict.burger.eyebrow}
        className="gutter hidden py-24 motion-reduce:block"
      >
        <p className="eyebrow">{dict.burger.eyebrow}</p>
        <h2 className="mt-4 text-(length:--step-display)">{dict.burger.title.join(" ")}</h2>
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
                className="mx-auto h-auto w-full max-w-[180px]"
              />
              <span className="mt-3 block font-display text-sm tracking-tight">
                {layer.label[lang]}
              </span>
            </li>
          ))}
        </ul>
        <CtaLink href={SITE.doordash} external className="mt-12">
          {dict.burger.cta}
        </CtaLink>
      </section>
    </div>
  );
}
