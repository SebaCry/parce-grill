import { Reveal } from "@/components/ui/reveal";
import { LOCATIONS } from "@/data/site";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * Las sedes sin dirección confirmada (hoy, la de Utah) se muestran igual pero
 * sin fabricar datos: mejor "horario por confirmar" que una dirección inventada
 * que mande a alguien a la esquina equivocada.
 */
export function Locations({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  return (
    <section
      id="donde-estamos"
      aria-label={dict.locations.eyebrow}
      className="gutter border-t border-hueso/10 py-28 md:py-40"
    >
      <Reveal className="max-w-2xl">
        <p className="eyebrow">{dict.locations.eyebrow}</p>
        <h2 className="mt-4 text-(length:--step-display)">
          {dict.locations.title.map((line, i) => (
            <span key={line} className="block">
              {i === 1 ? <span className="text-amarillo">{line}</span> : line}
            </span>
          ))}
        </h2>
      </Reveal>

      <Reveal as="ul" stagger="li" className="mt-16 grid gap-px bg-hueso/10 md:grid-cols-2">
        {LOCATIONS.map((loc) => (
          <li key={loc.id} className="bg-carbon p-8 md:p-12">
            <div className="flex items-baseline gap-4">
              <h3 className="text-(length:--step-title)">{loc.city}</h3>
              <span className="eyebrow">{loc.region}</span>
            </div>

            {loc.address && <p className="mt-4 text-(length:--step-lead) text-hueso/80">{loc.address}</p>}

            <dl className="mt-8">
              <dt className="eyebrow">{dict.locations.hoursLabel}</dt>
              {loc.hours.length > 0 ? (
                <dd className="mt-3 space-y-1.5">
                  {loc.hours.map((h) => (
                    <span key={h.time} className="flex flex-wrap justify-between gap-x-6 text-sm">
                      <span className="text-humo">{h.days[lang]}</span>
                      <span className="font-display tracking-tight">{h.time}</span>
                    </span>
                  ))}
                </dd>
              ) : (
                <dd className="mt-3 text-sm text-humo">{dict.locations.soon}</dd>
              )}
            </dl>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.mapsQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 font-display text-sm tracking-tight text-amarillo uppercase transition-colors hover:text-ember"
            >
              {dict.locations.directions}
              <span aria-hidden="true">{"↗"}</span>
            </a>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
