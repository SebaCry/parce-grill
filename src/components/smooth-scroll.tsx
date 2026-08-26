"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/**
 * Monta Lenis una sola vez y lo casa con ScrollTrigger.
 *
 * El acople correcto son tres piezas y las tres importan: ScrollTrigger tiene
 * que recalcular en cada evento de scroll de Lenis, Lenis tiene que avanzar en
 * el tick de GSAP (no en su propio rAF, o los dos relojes se separan y la
 * animación va medio frame por detrás del scroll), y hay que desactivar el
 * suavizado de lag de GSAP, que fue pensado para saltos de pestaña y aquí sólo
 * introduce salto.
 *
 * No se monta en dos casos:
 *
 *  - Con movimiento reducido, porque el scroll nativo es exactamente lo que esa
 *    preferencia está pidiendo.
 *  - En punteros gruesos. El suavizado existe para arreglar la rueda del ratón,
 *    que avanza a saltos; el scroll táctil ya trae la inercia del sistema, que
 *    corre en el compositor y no en JavaScript. Interponer Lenis ahí sólo añade
 *    un bucle de rAF que compite con la timeline y hace que el dedo se sienta
 *    desacoplado de la página.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      // Exponencial: arranca rápido y frena largo. Es lo que hace que un scroll
      // de 300vh se sienta como un plano continuo y no como una lista.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return null;
}
