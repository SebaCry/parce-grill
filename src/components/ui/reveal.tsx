"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Retraso en segundos. Para escalonar hermanos sin envolverlos en un contenedor. */
  delay?: number;
  /** Selector de hijos a escalonar. Sin él se anima el propio elemento. */
  stagger?: string;
};

/**
 * Aparición al entrar en viewport. Deliberadamente sobria —desplazamiento
 * corto, sin escala ni rotación— porque la página ya gasta su presupuesto de
 * movimiento en la secuencia de la hamburguesa, y repetir gestos llamativos
 * cada dos secciones los abarata.
 *
 * Sin `scrub`: se dispara una vez y termina a su ritmo. Encadenar la opacidad
 * al scroll obliga a rebobinar para volver a leer un párrafo.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  stagger,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !ref.current) return;
      const targets = stagger
        ? Array.from(ref.current.querySelectorAll(stagger))
        : [ref.current];
      if (!targets.length) return;

      gsap.from(targets, {
        autoAlpha: 0,
        y: 28,
        duration: 0.9,
        delay,
        ease: "power3.out",
        stagger: stagger ? 0.08 : 0,
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
