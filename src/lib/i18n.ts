import { es } from "./dictionaries/es";
import { en } from "./dictionaries/en";

export type { Dictionary } from "./dictionaries/es";

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Español primero: la comunidad latina de Utah es el público que ya los sigue. */
export const DEFAULT_LOCALE: Locale = "es";

const DICTIONARIES = { es, en } as const;

export function getDictionary(locale: Locale): typeof es {
  return DICTIONARIES[locale];
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_NAMES: Record<Locale, string> = {
  es: "Español",
  en: "English",
};
