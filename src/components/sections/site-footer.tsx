import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/data/site";
import type { Dictionary, Locale } from "@/lib/i18n";

const NAV_KEYS = ["burger", "story", "menu", "gallery", "locations"] as const;
const NAV_HREFS: Record<(typeof NAV_KEYS)[number], string> = {
  burger: "#la-colombiana",
  story: "#historia",
  menu: "#carta",
  gallery: "#galeria",
  locations: "#donde-estamos",
};

export function SiteFooter({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  return (
    <footer className="border-t border-hueso/10 bg-carbon-2">
      {/* Marquesina: el mismo texto dos veces y un desplazamiento del 50%
          — así el bucle es continuo sin medir nada en JS. */}
      <div className="flex overflow-hidden border-b border-hueso/10 py-6 select-none">
        <div className="animate-marquee flex shrink-0 motion-reduce:animate-none" aria-hidden="true">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0">
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className="flex shrink-0 items-center gap-6 pr-6 font-display text-[clamp(1.2rem,3vw,2.4rem)] tracking-tight whitespace-nowrap"
                >
                  {dict.footer.tagline}
                  <span className="text-ember">●</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="gutter grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Image src="/logo.png" alt={SITE.name} width={112} height={112} className="rounded-full" />
          <p className="mt-6 max-w-xs text-sm text-humo">{dict.footer.tagline}</p>
        </div>

        <nav aria-label={dict.footer.nav}>
          <p className="eyebrow">{dict.footer.nav}</p>
          <ul className="mt-5 space-y-2.5">
            {NAV_KEYS.map((key) => (
              <li key={key}>
                <Link
                  href={NAV_HREFS[key]}
                  className="text-sm transition-colors hover:text-amarillo"
                >
                  {dict.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="eyebrow">{dict.footer.contact}</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            <li>
              <a href={`tel:${SITE.phone}`} className="transition-colors hover:text-amarillo">
                {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-amarillo"
              >
                {SITE.instagramHandle}
              </a>
            </li>
            <li>
              <a
                href={SITE.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-amarillo"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="gutter flex flex-col gap-2 border-t border-hueso/10 py-6 text-xs text-humo sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {SITE.name}. {dict.footer.rights}
        </p>
        <p lang={lang}>{dict.footer.madeWith}</p>
      </div>
    </footer>
  );
}
