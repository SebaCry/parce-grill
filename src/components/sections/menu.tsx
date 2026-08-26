import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { CtaLink } from "@/components/ui/cta";
import { MENU, SITE } from "@/data/site";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * La carta va sin precios a propósito: El Parce cambia el menú según la plaza
 * y el día, y un precio desactualizado en la web cuesta más credibilidad que
 * la que gana. La conversión ocurre en DoorDash, que es donde el precio vive
 * al día.
 */
export function Menu({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  return (
    <section id="carta" aria-label={dict.menu.eyebrow} className="gutter py-28 md:py-40">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">{dict.menu.eyebrow}</p>
        <h2 className="mt-4 text-(length:--step-display)">
          {dict.menu.title.map((line, i) => (
            <span key={line} className="block">
              {i === 1 ? <span className="text-amarillo">{line}</span> : line}
            </span>
          ))}
        </h2>
        <p className="mt-6 text-(length:--step-lead) text-humo">{dict.menu.lead}</p>
      </Reveal>

      <Reveal
        as="ul"
        stagger="li"
        className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
      >
        {MENU.map((item) => (
          <li key={item.id} className="group">
            <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-carbon-2">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                // El encuadre se baja al 72%: en todas las fotos el plato está
                // en el tercio inferior y centrarlas llenaba la tarjeta con la
                // pared del fondo.
                className="object-cover object-[50%_72%] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
              />
              {item.tag && (
                <span className="absolute top-4 left-4 rounded-full bg-amarillo px-3 py-1 font-display text-[0.7rem] tracking-tight text-carbon uppercase">
                  {item.tag[lang]}
                </span>
              )}
            </div>
            <h3 className="mt-5 text-[clamp(1.35rem,2.2vw,1.9rem)]">{item.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-humo">{item.description[lang]}</p>
          </li>
        ))}
      </Reveal>

      <Reveal className="mt-16 flex flex-wrap items-center gap-6">
        <CtaLink href={SITE.doordash} external>
          {dict.menu.orderItem}
        </CtaLink>
        <p className="text-sm text-humo">{dict.menu.priceNote}</p>
      </Reveal>
    </section>
  );
}
