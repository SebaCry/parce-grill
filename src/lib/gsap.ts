"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Registrar en el módulo, no dentro de cada componente: registerPlugin es
// idempotente pero llamarlo en cada montaje ensucia el arranque.
gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export { gsap, ScrollTrigger, SplitText, useGSAP };

/**
 * `useLayoutEffect` avisa en SSR. Toda la coreografía es de cliente, así que en
 * el servidor degradamos a un no-op en vez de silenciar el warning global.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : () => {};

/**
 * Lee la preferencia de movimiento reducido en el momento de construir una
 * timeline. No es reactivo a propósito: cambiar el ajuste del sistema a mitad
 * de una animación es un caso que no vale la complejidad de re-montar todo, y
 * un recargado lo resuelve.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Marca `will-change` sólo mientras el ScrollTrigger está activo.
 *
 * Dejarlo puesto de forma permanente sobre ocho capas grandes obliga al
 * navegador a mantener otras tantas texturas en memoria durante toda la
 * sesión, que es justo lo que hunde los móviles de gama media.
 */
export function promoteWhileActive(elements: Element[]) {
  return {
    onToggle: (self: ScrollTrigger) => {
      const value = self.isActive ? "transform, opacity" : "auto";
      for (const el of elements) (el as HTMLElement).style.willChange = value;
    },
  };
}
