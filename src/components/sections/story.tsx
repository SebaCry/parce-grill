"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import type { Dictionary } from "@/lib/i18n";

/**
 * "De Colombia para acá" en scroll horizontal con pin.
 *
 * El desplazamiento se calcula sobre el ancho real del riel en tiempo de
 * montaje, no sobre un `-300vw` fijo: los cuatro paneles miden distinto en cada
 * idioma y en cada breakpoint, y un valor cerrado deja el último panel a medio
 * entrar o un hueco vacío al final.
 */
export function Story({ dict }: { dict: Dictionary }) {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const track = trackRef.current;
      const root = rootRef.current;
      if (!track || !root) return;

      const mm = gsap.matchMedia();

      // Sólo a partir de tablet. En móvil el scroll horizontal con pin pelea
      // con el gesto de volver atrás del navegador y con el scroll vertical;
      // ahí los paneles se apilan y ya está.
      mm.add("(min-width: 768px)", () => {
        const distance = () => track.scrollWidth - root.clientWidth;

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            // El recorrido vertical iguala al horizontal: así un píxel de
            // rueda mueve un píxel de riel y la sección no se siente pesada.
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });

        return () => tween.kill();
      });

      return () => {
        mm.revert();
        ScrollTrigger.refresh();
      };
    },
    { scope: rootRef },
  );

  // Todo el layout horizontal cuelga de `motion-safe`. Con movimiento reducido
  // la timeline no se construye, y si la disposición siguiera siendo en fila
  // los dos últimos paneles quedarían fuera de pantalla sin forma de
  // alcanzarlos: contenido perdido, no sólo contenido sin animar.
  return (
    <section
      ref={rootRef}
      id="historia"
      aria-label={dict.story.eyebrow}
      className="relative overflow-hidden bg-carbon-2 py-24 motion-safe:md:h-svh motion-safe:md:py-0"
    >
      <div
        ref={trackRef}
        className="flex flex-col gap-16 motion-safe:md:h-full motion-safe:md:flex-row motion-safe:md:items-center motion-safe:md:gap-0"
      >
        <div className="gutter shrink-0 motion-safe:md:w-[42vw] motion-safe:md:pr-[6vw]">
          <p className="eyebrow">{dict.story.eyebrow}</p>
          <h2 className="mt-4 text-(length:--step-display)">
            {dict.story.title.map((line, i) => (
              <span key={line} className="block">
                {i === 1 ? <span className="text-amarillo">{line}</span> : line}
              </span>
            ))}
          </h2>
          <span className="flag-edge mt-8 block h-[3px] w-32 rounded-full" aria-hidden="true" />
        </div>

        <ol className="gutter flex flex-col gap-16 motion-safe:md:flex-row motion-safe:md:gap-[6vw] motion-safe:md:pr-[14vw]">
          {dict.story.panels.map((panel, i) => (
            <li
              key={panel.title}
              className="relative max-w-md shrink-0 motion-safe:md:w-[34vw] motion-safe:md:max-w-none"
            >
              <span
                aria-hidden="true"
                className="font-display text-[clamp(4rem,9vw,9rem)] leading-none text-hueso/[0.07]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="eyebrow mt-2 text-ember">{panel.kicker}</p>
              <h3 className="mt-3 text-(length:--step-title)">{panel.title}</h3>
              <p className="mt-4 text-(length:--step-lead) leading-relaxed text-humo">
                {panel.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
