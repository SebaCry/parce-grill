import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { CtaLink } from "@/components/ui/cta";
import { SITE } from "@/data/site";
import type { Dictionary } from "@/lib/i18n";

export function Order({ dict }: { dict: Dictionary }) {
  return (
    <section
      id="pedir"
      aria-label={dict.order.eyebrow}
      className="relative overflow-hidden bg-carbon-2 py-28 md:py-40"
    >
      <div className="gutter grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <Reveal>
          <p className="eyebrow">{dict.order.eyebrow}</p>
          <h2 className="mt-4 text-(length:--step-display)">
            <span className="text-amarillo">{dict.order.title[0]}</span>
          </h2>
          <p className="mt-6 max-w-md text-(length:--step-lead) text-humo">{dict.order.lead}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <CtaLink href={SITE.doordash} external>
              {dict.order.doordash}
            </CtaLink>
            <CtaLink href={SITE.whatsapp} external variant="ghost">
              {dict.order.whatsapp}
            </CtaLink>
          </div>

          <a
            href={`tel:${SITE.phone}`}
            className="mt-10 inline-block font-display text-[clamp(1.6rem,4vw,2.8rem)] tracking-tight transition-colors hover:text-amarillo"
          >
            {SITE.phoneDisplay}
          </a>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <Image
            src="/packaging.webp"
            alt=""
            width={1400}
            height={1400}
            loading="lazy"
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="h-auto w-full rounded-2xl"
          />
        </Reveal>
      </div>
    </section>
  );
}
