/**
 * Copy en español. Este archivo define la FORMA del diccionario: `en.ts` se
 * tipa contra él, así que añadir una clave aquí obliga a traducirla allá.
 *
 * La voz es la de su propio Instagram: paisa, directa, sin floritura de
 * restaurante. Varias frases son literalmente suyas y se conservan.
 */
export const es = {
  meta: {
    title: "El Parce Grill · Hamburguesas gourmet colombianas",
    description:
      "Food truck colombiano en Utah y Temecula. La Colombiana, mazorcada y parrilla con sazón criolla. Pida por DoorDash o pásese por el truck.",
    ogAlt: "La Colombiana, la hamburguesa insignia de El Parce Grill",
  },

  nav: {
    burger: "La Colombiana",
    story: "Historia",
    menu: "Carta",
    gallery: "Galería",
    locations: "Dónde estamos",
    order: "Pedir",
    skipToContent: "Saltar al contenido",
    menuOpen: "Abrir menú",
    menuClose: "Cerrar menú",
  },

  hero: {
    eyebrow: "Food truck colombiano · Utah & Temecula",
    // Dos líneas, no tres: ahora el titular comparte pantalla con la
    // hamburguesa armada, y una tercera línea la empujaba fuera de plano.
    title: ["No es otra", "hamburguesa"],
    lead: "Es La Colombiana. Sazón criolla, parrilla de verdad y ese bocado que sabe a casa.",
    cta: "Pedir ahora",
    ctaSecondary: "Ver la carta",
    scroll: "Baje y desármela",
  },

  burger: {
    eyebrow: "01 — La Colombiana",
    title: ["Capa", "por capa"],
    lead: "Ocho piezas. Ninguna de relleno.",
    outroTitle: ["Y se va", "en su caja"],
    outroLead:
      "Lista en minutos, empacada como se debe, caliente hasta la primera mordida.",
    cta: "Pedir La Colombiana",
    hint: "Siga bajando",
    staticNote: "Los ocho ingredientes de La Colombiana, de la base al pan.",
  },

  story: {
    eyebrow: "02 — Historia",
    title: ["De Colombia", "para acá"],
    panels: [
      {
        kicker: "El comienzo",
        title: "Empezó con una idea",
        body: "Un sueño que arrancó con una idea, muchas horas y una receta que no se negocia. Hoy se sirve en cada hamburguesa.",
      },
      {
        kicker: "El truck",
        title: "Parqueamos en Utah",
        body: "Un food truck, una parrilla y la sazón que trajimos de casa. Se corrió la voz y la fila se hizo sola.",
      },
      {
        kicker: "La expansión",
        title: "Y llegamos a Temecula",
        body: "Mismo fuego, misma receta, nueva esquina. California ya sabe a qué sabe Colombia.",
      },
      {
        kicker: "La promesa",
        title: "Puro amor criollo",
        body: "Tradición, sazón y ese toque que no se aprende: se hereda. En cada bocado.",
      },
    ],
  },

  menu: {
    eyebrow: "03 — La carta",
    title: ["Lo que sale", "de la parrilla"],
    lead: "Hamburguesas gourmet colombianas, papas de la casa y la mazorcada que nos pide todo el mundo.",
    priceNote: "Precios y disponibilidad en DoorDash.",
    orderItem: "Pedir",
  },

  gallery: {
    eyebrow: "04 — Galería",
    title: ["El parce", "en vivo"],
    lead: "Lo que sale del truck, sin filtros de más.",
    follow: "Síganos en Instagram",
  },

  order: {
    eyebrow: "05 — Pedidos",
    title: ["Pida ya"],
    lead: "Domicilio por DoorDash o escríbanos directo y lo tenemos listo cuando llegue.",
    doordash: "Pedir por DoorDash",
    whatsapp: "Escribir por WhatsApp",
    call: "Llamar",
  },

  locations: {
    eyebrow: "06 — Dónde estamos",
    title: ["Búsquenos", "aquí"],
    hoursLabel: "Horario",
    directions: "Cómo llegar",
    soon: "Horario por confirmar",
  },

  footer: {
    tagline: "El sabor de Colombia que se siente en el alma.",
    rights: "Todos los derechos reservados.",
    madeWith: "Hecho con fuego en Utah.",
    nav: "Navegación",
    contact: "Contacto",
  },

  a11y: {
    langLabel: "Idioma",
    switchTo: "Ver en inglés",
    playPause: "Pausar animación",
  },
};

/**
 * Sin `as const` a propósito: los literales se ensanchan a `string` y `string[]`,
 * de modo que `en.ts` puede tiparse contra esta forma y el compilador avisa si
 * falta una clave, en vez de exigir el mismo texto.
 */
export type Dictionary = typeof es;
