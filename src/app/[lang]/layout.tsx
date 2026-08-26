import type { Metadata } from "next";
import { Archivo, Inter_Tight } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SITE, LOCATIONS } from "@/data/site";
import { LOCALES, getDictionary, isLocale, type Locale } from "@/lib/i18n";

/**
 * Archivo con el eje de anchura activo: los titulares se estiran a ~112% para
 * dar presencia de cartel de food truck sin recurrir a una condensada genérica.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);

  return {
    metadataBase: new URL(SITE.url),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: lang === "es" ? "es_CO" : "en_US",
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${lang}`,
      images: [{ url: "/hero-burger.webp", width: 2400, height: 1600, alt: dict.meta.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
      images: ["/hero-burger.webp"],
    },
    icons: { icon: "/logo.png", apple: "/logo.png" },
  };
}

/**
 * Schema.org por sede. Google trata cada truck como un `Restaurant`
 * independiente, así que van dos nodos y no uno con varias direcciones.
 */
function structuredData(lang: Locale) {
  const dict = getDictionary(lang);
  return LOCATIONS.filter((l) => l.verified).map((loc) => ({
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: `${SITE.name} · ${loc.city}`,
    description: dict.meta.description,
    servesCuisine: ["Colombian", "Burgers"],
    priceRange: "$$",
    image: `${SITE.url}/hero-burger.webp`,
    telephone: SITE.phone,
    url: `${SITE.url}/${lang}`,
    sameAs: [SITE.instagram],
    address: loc.address
      ? {
          "@type": "PostalAddress",
          streetAddress: loc.address.split(",")[0],
          addressLocality: loc.city,
          addressRegion: loc.region,
          addressCountry: "US",
        }
      : undefined,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "18:00",
        closes: "23:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday"],
        opens: "20:00",
        closes: "24:00",
      },
    ],
  }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html lang={lang} className={`${archivo.variable} ${interTight.variable}`}>
      <body className="antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-amarillo focus:px-5 focus:py-2.5 focus:font-semibold focus:text-carbon"
        >
          {dict.nav.skipToContent}
        </a>
        <SmoothScroll />
        <div className="grain-overlay" aria-hidden="true" />
        {children}
        <script
          type="application/ld+json"
          // Datos del propio sitio, no entrada de usuario.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(lang)) }}
        />
      </body>
    </html>
  );
}
