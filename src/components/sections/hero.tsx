"use client";

import { useRef } from "react";
import Image from "next/image";
import { CtaLink } from "@/components/ui/cta";
import { gsap, ScrollTrigger, SplitText, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { SITE } from "@/data/site";
import type { Dictionary } from "@/lib/i18n";

export function Hero({ dict }: { dict: Dictionary }) {
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !titleRef.current) return;

      // `SplitText` con `autoSplit` rehace el troceado cuando cambia el ancho
      // de la fuente o del contenedor; sin eso, un cambio de tipografía a mitad
      // de carga deja los caracteres desalineados.
      const split = SplitText.create(titleRef.current, {
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

      // Paralaje corto sobre la foto. Sin `scrub` sería un salto; con scrub 0.6
      // sigue al scroll con la inercia justa para leerse como profundidad.
      if (photoRef.current) {
        gsap.to(photoRef.current, {
          yPercent: 14,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }

      return () => {
        split.revert();
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === rootRef.current) t.kill();
        });
      };
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="inicio"
      className="relative flex min-h-svh flex-col justify-end overflow-hidden pb-[8svh]"
    >
      <div ref={photoRef} className="absolute inset-0 -top-[10%] h-[120%]">
        <Image
          src="/hero-burger.webp"
          alt={dict.meta.ogAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Dos degradados en vez de un velo plano: el de abajo asienta el
            titular, el radial reserva el centro para que la hamburguesa no
            compita con el texto. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #0b0b0c 4%, rgba(11,11,12,0.72) 34%, rgba(11,11,12,0.25) 62%, rgba(11,11,12,0.68) 100%)",
          }}
        />
      </div>

      <div className="gutter relative z-10 w-full">
        {/* `items-start` y no `items-center`: en móvil el texto pasa a dos
            líneas y el filo tricolor quedaba flotando a media altura. */}
        <p className="eyebrow flex items-start gap-3">
          <span
            className="flag-edge mt-[0.45em] inline-block h-[3px] w-10 shrink-0 rounded-full"
            aria-hidden="true"
          />
          {dict.hero.eyebrow}
        </p>

        <h1 ref={titleRef} className="mt-6 text-(length:--step-hero)">
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

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-lg text-(length:--step-lead) leading-snug text-hueso/80">
            {dict.hero.lead}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <CtaLink href={SITE.doordash} external>
              {dict.hero.cta}
            </CtaLink>
            <CtaLink href="#carta" variant="ghost">
              {dict.hero.ctaSecondary}
            </CtaLink>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="eyebrow absolute bottom-[2.5svh] left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap motion-reduce:hidden"
      >
        {dict.hero.scroll}
        <span className="inline-block animate-bounce">{"↓"}</span>
      </div>
    </section>
  );
}
