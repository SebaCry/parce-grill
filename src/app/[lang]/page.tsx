import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/sections/hero";
import { BurgerSequence } from "@/components/sections/burger-sequence";
import { Story } from "@/components/sections/story";
import { Menu } from "@/components/sections/menu";
import { Gallery } from "@/components/sections/gallery";
import { Order } from "@/components/sections/order";
import { Locations } from "@/components/sections/locations";
import { SiteFooter } from "@/components/sections/site-footer";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <>
      <SiteHeader dict={dict} lang={lang} />
      <main id="contenido">
        <Hero dict={dict} />
        <BurgerSequence dict={dict} lang={lang} />
        <Story dict={dict} />
        <Menu dict={dict} lang={lang} />
        <Gallery dict={dict} />
        <Order dict={dict} />
        <Locations dict={dict} lang={lang} />
      </main>
      <SiteFooter dict={dict} lang={lang} />
    </>
  );
}
