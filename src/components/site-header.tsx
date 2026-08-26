"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CtaLink } from "@/components/ui/cta";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { SITE } from "@/data/site";
import type { Dictionary, Locale } from "@/lib/i18n";

const NAV = [
  { key: "burger", href: "#la-colombiana" },
  { key: "story", href: "#historia" },
  { key: "menu", href: "#carta" },
  { key: "gallery", href: "#galeria" },
  { key: "locations", href: "#donde-estamos" },
] as const;

export function SiteHeader({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const other: Locale = lang === "es" ? "en" : "es";

  useGSAP(
    () => {
      if (prefersReducedMotion() || !ref.current) return;

      // Se esconde al bajar y reaparece al subir. La barra estorba justo
      // durante la secuencia de la hamburguesa, que es cuando el usuario está
      // bajando; al subir vuelve a hacer falta para navegar.
      const show = gsap.quickTo(ref.current, "yPercent", {
        duration: 0.45,
        ease: "power3.out",
      });

      const trigger = ScrollTrigger.create({
        start: "top -120",
        end: "max",
        onUpdate: (self) => show(self.direction === 1 ? -110 : 0),
        onLeaveBack: () => show(0),
      });

      return () => trigger.kill();
    },
    { scope: ref },
  );

  // `backdrop-blur` sólo en punteros finos: en móvil una barra fija con
  // desenfoque de fondo se recompone en cada fotograma del scroll. Allí va con
  // fondo casi opaco, que da la misma separación por cero coste.
  return (
    <header
      ref={ref}
      className="fixed inset-x-0 top-0 z-50 border-b border-hueso/10 bg-carbon/92 [@media(pointer:fine)]:bg-carbon/70 [@media(pointer:fine)]:backdrop-blur-md"
    >
      <div className="gutter flex h-16 items-center justify-between gap-6 md:h-20">
        <Link href={`/${lang}`} className="flex shrink-0 items-center gap-3" aria-label={SITE.name}>
          <Image
            src="/logo.png"
            alt=""
            width={44}
            height={44}
            priority
            className="size-9 rounded-full md:size-11"
          />
          <span className="sr-only">{SITE.name}</span>
        </Link>

        <nav aria-label={dict.footer.nav} className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {NAV.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  className="font-display text-xs tracking-[0.14em] uppercase transition-colors hover:text-amarillo"
                >
                  {dict.nav[item.key]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={`/${other}`}
            hrefLang={other}
            aria-label={dict.a11y.switchTo}
            className="font-display text-xs tracking-[0.14em] text-humo uppercase transition-colors hover:text-amarillo"
          >
            {other}
          </Link>
          <CtaLink href={SITE.doordash} external className="hidden !px-5 !py-2.5 sm:inline-flex">
            {dict.nav.order}
          </CtaLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="nav-movil"
            className="flex size-9 items-center justify-center lg:hidden"
          >
            <span className="sr-only">{open ? dict.nav.menuClose : dict.nav.menuOpen}</span>
            <span aria-hidden="true" className="relative block h-3 w-6">
              <span
                className={`absolute inset-x-0 top-0 h-0.5 bg-hueso transition-transform duration-300 ${open ? "translate-y-[5px] rotate-45" : ""}`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 bg-hueso transition-transform duration-300 ${open ? "-translate-y-[5px] -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      <nav
        id="nav-movil"
        aria-label={dict.footer.nav}
        hidden={!open}
        className="gutter border-t border-hueso/10 pb-8 lg:hidden"
      >
        <ul className="flex flex-col">
          {NAV.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                className="block border-b border-hueso/10 py-4 font-display text-lg tracking-tight uppercase"
              >
                {dict.nav[item.key]}
              </a>
            </li>
          ))}
        </ul>
        <CtaLink href={SITE.doordash} external className="mt-6 w-full justify-center sm:hidden">
          {dict.nav.order}
        </CtaLink>
      </nav>
    </header>
  );
}
