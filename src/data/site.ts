import type { Locale } from "@/lib/i18n";

/**
 * Datos del negocio. Todo lo que el cliente puede querer cambiar sin tocar un
 * componente vive aquí.
 *
 * PENDIENTE DE CONFIRMAR CON EL CLIENTE (marcado con `verified: false`):
 *  - la dirección exacta y el horario del truck en Utah
 *  - la URL directa de su tienda en DoorDash (hoy apunta a la búsqueda)
 *  - precios de la carta
 */

export const SITE = {
  name: "El Parce Grill",
  /** Cambiar al dominio real antes de publicar: alimenta canonical, OG y JSON-LD. */
  url: "https://elparcegrill.com",
  phone: "+18013179489",
  phoneDisplay: "801-317-9489",
  instagram: "https://www.instagram.com/elparcegrill/",
  instagramHandle: "@elparcegrill",
  whatsapp: "https://wa.me/18013179489",
  /** PENDIENTE: reemplazar por el enlace directo de la tienda. */
  doordash: "https://www.doordash.com/search/store/el%20parce%20grill",
};

export type Hours = { days: Record<Locale, string>; time: string };

export type Location = {
  id: string;
  city: string;
  region: string;
  address: string | null;
  mapsQuery: string;
  hours: Hours[];
  verified: boolean;
};

export const LOCATIONS: Location[] = [
  {
    id: "utah",
    city: "Utah",
    region: "UT",
    address: null,
    mapsQuery: "El Parce Grill Utah",
    hours: [],
    verified: false,
  },
  {
    id: "temecula",
    city: "Temecula",
    region: "CA",
    address: "40115 Starling St, Temecula, CA 92591",
    mapsQuery: "40115 Starling St, Temecula, CA 92591",
    hours: [
      { days: { es: "Domingo a viernes", en: "Sunday to Friday" }, time: "6:00 PM – 11:00 PM" },
      { days: { es: "Sábado", en: "Saturday" }, time: "8:00 PM – 12:00 AM" },
    ],
    verified: true,
  },
];

export type MenuItem = {
  id: string;
  name: string;
  /** El nombre no se traduce; sí la descripción. */
  description: Record<Locale, string>;
  tag: Record<Locale, string> | null;
  image: string;
  width: number;
  height: number;
};

export const MENU: MenuItem[] = [
  {
    id: "la-colombiana",
    name: "La Colombiana",
    description: {
      es: "Carne 100% res, cheddar fundido, tocineta ahumada, chimichurri criollo, cebolla morada, lechuga y papa al hilo.",
      en: "100% beef, melted cheddar, smoked bacon, criollo chimichurri, red onion, lettuce and shoestring potato.",
    },
    tag: { es: "La insignia", en: "The signature" },
    image: "/gallery/dsc05947.webp",
    width: 1200,
    height: 1800,
  },
  {
    id: "la-clasica",
    name: "La Clásica",
    description: {
      es: "Doble carne a la parrilla, cheddar, tomate, lechuga y cebolla morada en pan brioche.",
      en: "Double grilled patty, cheddar, tomato, lettuce and red onion on a brioche bun.",
    },
    tag: null,
    image: "/gallery/dsc06047.webp",
    width: 1200,
    height: 1800,
  },
  {
    id: "la-desmechada",
    name: "La Desmechada",
    description: {
      es: "Carne desmechada lenta, tocineta, queso fundido y lechuga. La más criolla de todas.",
      en: "Slow pulled beef, bacon, melted cheese and lettuce. The most criollo of them all.",
    },
    tag: null,
    image: "/gallery/dsc06079.webp",
    width: 1800,
    height: 1266,
  },
  {
    id: "la-de-pollo",
    name: "La de Pollo",
    description: {
      es: "Pechuga a la parrilla, tocineta, cheddar, plátano maduro y salsa de la casa.",
      en: "Grilled chicken breast, bacon, cheddar, sweet plantain and house sauce.",
    },
    tag: null,
    image: "/gallery/dsc06143.webp",
    width: 1800,
    height: 1200,
  },
  {
    id: "papas-de-la-casa",
    name: "Papas de la casa",
    description: {
      es: "Papas rústicas con cilantro y especias. El acompañante que nadie deja en el plato.",
      en: "Rustic fries with cilantro and spices. The side nobody leaves behind.",
    },
    tag: { es: "Para compartir", en: "To share" },
    image: "/gallery/dsc06058.webp",
    width: 1800,
    height: 1200,
  },
  {
    id: "mazorcada",
    name: "Mazorcada del Parce",
    description: {
      es: "Mazorca desgranada con carnes, queso y salsas. Colombia entera en un solo pote.",
      en: "Corn off the cob loaded with meats, cheese and sauces. All of Colombia in one bowl.",
    },
    tag: { es: "Solo en el truck", en: "Truck only" },
    image: "/gallery/dsc06089.webp",
    width: 1800,
    height: 1200,
  },
];

/**
 * Curaduría de la galería. Se excluyen las fotos que ya cargan el hero y la
 * carta para que la página no repita el mismo plato dos veces; el orden alterna
 * vertical y horizontal a propósito, que es lo que le da ritmo a la retícula.
 */
export const GALLERY_IDS = [
  "dsc05962",
  "dsc05951",
  "dsc06036",
  "dsc05957",
  "dsc06093",
  "dsc06081",
  "dsc06027",
  "dsc06152",
  "dsc05964",
];
