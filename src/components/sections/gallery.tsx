import Image from "next/image";
import GALLERY from "@/data/gallery.json";
import { Reveal } from "@/components/ui/reveal";
import { CtaLink } from "@/components/ui/cta";
import { GALLERY_IDS, SITE } from "@/data/site";
import type { Dictionary } from "@/lib/i18n";

const BY_ID = new Map(GALLERY.map((g) => [g.id, g]));

export function Gallery({ dict }: { dict: Dictionary }) {
  const photos = GALLERY_IDS.map((id) => BY_ID.get(id)).filter(
    (p): p is (typeof GALLERY)[number] => Boolean(p),
  );

  return (
    <section
      id="galeria"
      aria-label={dict.gallery.eyebrow}
      className="gutter border-t border-hueso/10 py-28 md:py-40"
    >
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow">{dict.gallery.eyebrow}</p>
          <h2 className="mt-4 text-(length:--step-display)">
            {dict.gallery.title.map((line, i) => (
              <span key={line} className="block">
                {i === 1 ? <span className="text-amarillo">{line}</span> : line}
              </span>
            ))}
          </h2>
          <p className="mt-6 text-(length:--step-lead) text-humo">{dict.gallery.lead}</p>
        </div>
        <CtaLink href={SITE.instagram} external variant="ghost">
          {dict.gallery.follow}
        </CtaLink>
      </Reveal>

      {/* Mosaico irregular: las verticales ocupan dos filas. Sin eso, dieciséis
          fotos del mismo plato en la misma caja se leen como un catálogo. */}
      <Reveal
        as="ul"
        stagger="li"
        className="mt-16 grid auto-rows-[minmax(0,14rem)] grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
      >
        {photos.map((photo) => (
          <li
            key={photo.id}
            className={`group relative overflow-hidden rounded-xl bg-carbon-2 ${
              photo.orientation === "portrait" ? "row-span-2" : ""
            }`}
          >
            <Image
              src={photo.src}
              alt=""
              fill
              loading="lazy"
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover object-[50%_62%] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
            />
          </li>
        ))}
      </Reveal>
    </section>
  );
}
