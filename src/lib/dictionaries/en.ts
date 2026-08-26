import type { Dictionary } from "./es";

/**
 * Copy en inglés. No es una traducción literal: el público anglo de Utah y
 * California responde a otra cadencia, y varias frases vienen de sus propios
 * captions en inglés ("This isn't just any burger").
 */
export const en: Dictionary = {
  meta: {
    title: "El Parce Grill · Colombian gourmet burgers",
    description:
      "Colombian food truck in Utah and Temecula. La Colombiana, mazorcada and real fire with criollo seasoning. Order on DoorDash or come by the truck.",
    ogAlt: "La Colombiana, El Parce Grill's signature burger",
  },

  nav: {
    burger: "La Colombiana",
    story: "Story",
    menu: "Menu",
    gallery: "Gallery",
    locations: "Find us",
    order: "Order",
    skipToContent: "Skip to content",
    menuOpen: "Open menu",
    menuClose: "Close menu",
  },

  hero: {
    eyebrow: "Colombian food truck · Utah & Temecula",
    // Dos líneas, como el español: el titular comparte pantalla con la
    // hamburguesa armada. "This isn't just any burger" pedía tres y la empujaba
    // fuera de plano.
    title: ["Not just", "another burger"],
    lead: "It's La Colombiana. Criollo seasoning, real fire, and that one bite that tastes like home.",
    cta: "Order now",
    ctaSecondary: "See the menu",
    scroll: "Scroll to take it apart",
  },

  burger: {
    eyebrow: "01 — La Colombiana",
    title: ["Layer", "by layer"],
    lead: "Eight pieces. Not one of them filler.",
    outroTitle: ["And it ships", "in its box"],
    outroLead: "Ready in minutes, packed the right way, hot until the first bite.",
    cta: "Order La Colombiana",
    hint: "Keep scrolling",
    staticNote: "The eight ingredients in La Colombiana, base to bun.",
  },

  story: {
    eyebrow: "02 — Story",
    title: ["From Colombia", "to here"],
    panels: [
      {
        kicker: "The start",
        title: "It began as an idea",
        body: "A dream that started with an idea, a lot of long nights, and a recipe we don't negotiate. Today it's served in every burger.",
      },
      {
        kicker: "The truck",
        title: "We parked in Utah",
        body: "One food truck, one grill, and the seasoning we brought from home. Word got around and the line formed itself.",
      },
      {
        kicker: "Going further",
        title: "Then came Temecula",
        body: "Same fire, same recipe, new corner. California now knows exactly what Colombia tastes like.",
      },
      {
        kicker: "The promise",
        title: "Pure criollo love",
        body: "Tradition, seasoning, and the kind of touch you don't learn — you inherit it. In every bite.",
      },
    ],
  },

  menu: {
    eyebrow: "03 — The menu",
    title: ["Straight off", "the grill"],
    lead: "Colombian gourmet burgers, house fries, and the mazorcada everybody asks for.",
    priceNote: "Prices and availability on DoorDash.",
    orderItem: "Order",
  },

  gallery: {
    eyebrow: "04 — Gallery",
    title: ["El Parce", "live"],
    lead: "What comes out of the truck, no extra filters.",
    follow: "Follow us on Instagram",
  },

  order: {
    eyebrow: "05 — Ordering",
    title: ["Order up"],
    lead: "Delivery through DoorDash, or message us directly and we'll have it ready when you pull up.",
    doordash: "Order on DoorDash",
    whatsapp: "Message on WhatsApp",
    call: "Call us",
  },

  locations: {
    eyebrow: "06 — Find us",
    title: ["Come", "find us"],
    hoursLabel: "Hours",
    directions: "Get directions",
    soon: "Hours to be confirmed",
  },

  footer: {
    tagline: "The taste of Colombia you feel in your soul.",
    rights: "All rights reserved.",
    madeWith: "Made with fire in Utah.",
    nav: "Navigation",
    contact: "Contact",
  },

  a11y: {
    langLabel: "Language",
    switchTo: "Ver en español",
    playPause: "Pause animation",
  },
};
