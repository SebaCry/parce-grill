/**
 * Convierte el material crudo de `assets/` en los assets servibles de `public/`.
 *
 * Lo importante que ocurre aquí es el recorte de la lámina de ingredientes:
 * ocho ingredientes fotografiados sobre negro dentro de una rejilla 4x2 se
 * separan en ocho PNG con alfa, que son las capas que la secuencia de scroll
 * despliega en el aire. El manifiesto resultante lleva las dimensiones reales
 * de cada capa para que el layout no adivine proporciones.
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { cutoutFromBlack } from "./lib/cutout.mjs";
import { detectCells, padBox } from "./lib/detect-cells.mjs";

const ROOT = process.cwd();
const SRC = (...p) => path.join(ROOT, "assets", ...p);
const OUT = (...p) => path.join(ROOT, "public", ...p);

/**
 * Lámina de ingredientes. La segunda que manda el cliente: misma resolución que
 * la anterior (2528x1684, ~460 px por ingrediente) pero sobre el tablero de
 * transparencia en vez de sobre negro de estudio, lo que la hace mucho más
 * limpia — las sombras ya no van pegadas al objeto, son grises neutros que la
 * clave por saturación descarta sola.
 *
 * Pese a la extensión .png es un JPEG sin canal alfa; da igual, el recorte se
 * hace aquí. Las posiciones NO se clavan: `detectCells` las encuentra, para que
 * la próxima lámina no obligue a volver a medir.
 */
const GRID = SRC("ingredients", "Gemini_Generated_Image_nnag23nnag23nnag.png");
const SHEET_BG = "light";
/** Unidad de referencia del layout: el ancho nominal de una celda. */
const SOURCE_CELL = 544;
/** Aire alrededor de cada objeto detectado, para que la pluma tenga sitio. */
const BOX_PAD = 26;

/**
 * `stack` es el orden real de la hamburguesa de abajo hacia arriba (0 = pan
 * inferior). `cell` es el orden de lectura dentro de la lámina.
 */
const LAYERS = [
  { cell: 0, id: "bun-top",      stack: 7, es: "Pan brioche",        en: "Brioche bun" },
  { cell: 1, id: "greens",       stack: 6, es: "Lechuga fresca",     en: "Fresh lettuce" },
  { cell: 2, id: "onion",        stack: 5, es: "Cebolla morada",     en: "Red onion" },
  { cell: 3, id: "chimichurri",  stack: 4, es: "Chimichurri criollo", en: "Criollo chimichurri" },
  { cell: 4, id: "bacon",        stack: 3, es: "Tocineta ahumada",   en: "Smoked bacon" },
  { cell: 5, id: "patty",        stack: 2, es: "Carne 100% res + cheddar", en: "100% beef + cheddar" },
  { cell: 6, id: "papas",        stack: 1, es: "Papa al hilo",       en: "Shoestring potato" },
  { cell: 7, id: "bun-bottom",   stack: 0, es: "Base tostada",       en: "Toasted base" },
];

/**
 * Ajustes por ingrediente sobre los umbrales por defecto.
 *
 * Los tres porosos (papa al hilo, aros de cebolla, lechuga) van con cierre
 * mínimo y filtro de manchas permisivo: se prefiere conservar los claros entre
 * hebras y el centro de los aros, aunque eso deje piezas sueltas, a fabricar una
 * silueta compacta que se delataría al flotar.
 */
const TUNING = {
  papas: { closeRadius: 1, minAreaRatio: 0.00004, maxHoleRatio: 0.0004 },
  greens: { closeRadius: 1, minAreaRatio: 0.00008, maxHoleRatio: 0.0006 },
  // La cebolla es el único caso donde el umbral general se pasa de listo: su
  // carne blanca es tan poco saturada como la sombra dibujada (sat ~16 contra
  // ~15), así que con el corte de 20/24 el aro se quedaba en cuatro líneas
  // moradas sin relleno. Baja el umbral y asume un halo mínimo, que sobre
  // carbón no se ve.
  onion: {
    closeRadius: 1,
    minAreaRatio: 0.0002,
    maxHoleRatio: 0.0006,
    satMin: 10,
    foodSatMin: 12,
  },
};

/**
 * Umbrales de la lámina clara, elegidos con datos y no a ojo.
 *
 * `probe-halo.mjs` mide las dos poblaciones que hay que separar: la sombra que
 * la lámina trae dibujada (saturación p50=2, p90≤15) y la comida pálida —la
 * miga del pan, la papa, el tostado— que se va a 60-130. Con ese margen, cortar
 * en 20/24 mata el halo entero sin tocar la comida. La carne blanca de la
 * cebolla es la única que se solapa con la sombra, y sobrevive porque queda
 * encerrada por los aros morados y la rescata el relleno de huecos.
 */
const SHEET_DEFAULTS = {
  bg: SHEET_BG,
  satMin: 20,
  lumLow: 70,
  foodSatMin: 24,
  foodDarkBelow: 95,
  foodDarkSoft: 40,
};

/**
 * Deja la capa lista para servir: la sobremuestrea y la enfoca.
 *
 * Aquí se horneaba también una sombra proyectada, y fue un error. Sobre el
 * carbón del sitio una sombra negra es invisible mientras la capa flota sola,
 * que es justo cuando debía aportar profundidad; y en cambio se ve
 * perfectamente cuando las capas se apilan, porque cae encima del ingrediente
 * de abajo como un manchón. Aportaba cero donde hacía falta y estropeaba el
 * resto, así que fuera. La profundidad la dan la escala y el solape.
 *
 * El escalado x1.9 con Lanczos sí se queda: las celdas de la lámina original
 * miden ~460 px y en pantalla retina la capa se pinta a más del doble, de modo
 * que el navegador estaba ampliando con un filtro peor que este.
 */
const PAD = 8;
const UPSCALE = 1.9;

async function finishLayer(cutBuf, w, h, file) {
  // OJO con el orden del pipeline de sharp: `resize` se aplica ANTES que
  // `composite`, no después. La versión anterior creaba el lienzo, componía el
  // recorte encima y llamaba a resize esperando escalar el conjunto — lo que
  // hacía en realidad era agrandar el lienzo vacío y pegar el ingrediente a
  // tamaño original en una esquina. Resultado: la mitad de la resolución
  // prevista y medio recuadro transparente. Escalando primero y añadiendo el
  // margen con `extend` después, el orden deja de importar.
  const pad = Math.round(PAD * UPSCALE);
  const info = await sharp(cutBuf)
    .resize({ width: Math.round(w * UPSCALE), kernel: "lanczos3" })
    .sharpen({ sigma: 0.6 })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(file);

  return { width: info.width, height: info.height, unit: w + PAD * 2 };
}

async function buildIngredients() {
  await mkdir(OUT("burger"), { recursive: true });
  const base = sharp(GRID);
  const manifest = [];

  // Una sola pasada sobre la lámina completa para localizar los ocho objetos.
  const sheet = await base.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const SW = sheet.info.width, SH = sheet.info.height, SC = sheet.info.channels;
  const boxes = detectCells(sheet.data, SW, SH, SC, (p) => {
    const i = p * SC;
    const r = sheet.data[i], g = sheet.data[i + 1], b = sheet.data[i + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (sat > 22) return true;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < SHEET_DEFAULTS.lumLow;
  });
  if (boxes.length !== LAYERS.length) {
    throw new Error(
      `Se detectaron ${boxes.length} ingredientes en la lámina y se esperaban ${LAYERS.length}. ` +
        `Revisar con: node scripts/probe-sheet.mjs`,
    );
  }
  console.log(`  · ${boxes.length} ingredientes localizados en ${SW}x${SH}`);

  for (const layer of LAYERS) {
    const cell = padBox(boxes[layer.cell], SW, SH, BOX_PAD);

    const { data, info } = await base
      .clone()
      .extract(cell)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { rgba, bbox, empty, stats } = cutoutFromBlack(data, info.width, info.height, info.channels, {
      ...SHEET_DEFAULTS,
      ...(TUNING[layer.id] ?? {}),
    });
    if (empty) throw new Error(`No se encontró objeto en la celda de "${layer.id}"`);
    // Cobertura casi total = la clave falló y se rellenó la celda entera.
    if (stats.coverage > 0.85) {
      throw new Error(
        `El recorte de "${layer.id}" cubre el ${(stats.coverage * 100).toFixed(0)}% de la celda: la clave no separó el fondo.`,
      );
    }

    const pad = 6;
    const crop = {
      left: Math.max(0, bbox.left - pad),
      top: Math.max(0, bbox.top - pad),
      width: Math.min(info.width, bbox.width + pad * 2),
      height: Math.min(info.height, bbox.height + pad * 2),
    };
    crop.width = Math.min(crop.width, info.width - crop.left);
    crop.height = Math.min(crop.height, info.height - crop.top);

    const file = OUT("burger", `${layer.id}.webp`);
    const cut = await sharp(rgba, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .extract(crop)
      .png()
      .toBuffer();

    const out = await finishLayer(cut, crop.width, crop.height, file);

    manifest.push({
      id: layer.id,
      stack: layer.stack,
      src: `/burger/${layer.id}.webp`,
      // Dimensiones reales del archivo: las usa next/image para elegir el
      // tamaño del srcset.
      width: out.width,
      height: out.height,
      // Ancho del elemento como múltiplo de BASE. Va aparte porque el archivo
      // está sobremuestreado y con margen para la sombra, así que sus píxeles
      // ya no sirven para calcular el layout.
      ratio: out.unit / SOURCE_CELL,
      label: { es: layer.es, en: layer.en },
    });
    console.log(
      `  ✓ ${layer.id.padEnd(12)} ${String(crop.width).padStart(3)}x${String(crop.height).padStart(3)}` +
        `  cobertura ${(stats.coverage * 100).toFixed(1).padStart(5)}%` +
        `  piezas ${stats.kept}/${stats.kept + stats.dropped}` +
        `  huecos ${stats.filled} rellenos, ${stats.spared} respetados`,
    );
  }

  manifest.sort((a, b) => a.stack - b.stack);
  await writeFile(
    path.join(ROOT, "src", "data", "burger-layers.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await contactSheet(manifest);
  return manifest;
}

/**
 * Dos hojas de contactos: una sobre el carbón real del sitio, para juzgar el
 * borde tal como se verá, y otra sobre magenta, donde cualquier halo oscuro o
 * hueco mal rellenado salta a la vista. No se sirven, son para revisión.
 */
async function contactSheet(manifest) {
  await sheet(manifest, { r: 11, g: 11, b: 12 }, "burger-contact-sheet.png");
  await sheet(manifest, { r: 214, g: 0, b: 168 }, "burger-matte-check.png");
  console.log("  · revisión: tmp/burger-contact-sheet.png · tmp/burger-matte-check.png");
}

async function sheet(manifest, background, filename) {
  const TILE = 300;
  const cols = 4;
  const rows = Math.ceil(manifest.length / cols);
  const composites = [];
  for (const [i, layer] of manifest.entries()) {
    const buf = await sharp(OUT("burger", `${layer.id}.webp`))
      .resize({ width: TILE - 24, height: TILE - 24, fit: "inside" })
      .toBuffer();
    const m = await sharp(buf).metadata();
    composites.push({
      input: buf,
      left: (i % cols) * TILE + Math.round((TILE - m.width) / 2),
      top: Math.floor(i / cols) * TILE + Math.round((TILE - m.height) / 2),
    });
  }
  await mkdir(path.join(ROOT, "tmp"), { recursive: true });
  await sharp({
    create: {
      width: cols * TILE,
      height: rows * TILE,
      channels: 4,
      background: { ...background, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(ROOT, "tmp", filename));
}

/** Las fotos originales son de 6192x4128; a la web va una versión sensata. */
async function buildPhotos() {
  await mkdir(OUT("gallery"), { recursive: true });
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(SRC("gallery"))).filter((f) => /\.jpe?g$/i.test(f)).sort();

  const gallery = [];
  for (const f of files) {
    const id = f.replace(/-Mejorado-NR\.jpe?g$/i, "").toLowerCase();
    const meta = await sharp(SRC("gallery", f)).metadata();
    const out = OUT("gallery", `${id}.webp`);
    await sharp(SRC("gallery", f))
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(out);
    const o = await sharp(out).metadata();
    gallery.push({
      id,
      src: `/gallery/${id}.webp`,
      width: o.width,
      height: o.height,
      orientation: o.width >= o.height ? "landscape" : "portrait",
    });
    console.log(`  ✓ gallery/${id}.webp  ${o.width}x${o.height}  (orig ${meta.width}x${meta.height})`);
  }

  await writeFile(
    path.join(ROOT, "src", "data", "gallery.json"),
    JSON.stringify(gallery, null, 2) + "\n",
  );
  return gallery;
}

async function buildSingles() {
  await sharp(SRC("gallery", "DSC05913-Mejorado-NR.jpg"))
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(OUT("hero-burger.webp"));
  console.log("  ✓ hero-burger.webp");

  await sharp(SRC("ingredients", "image.png"))
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(OUT("packaging.webp"));
  console.log("  ✓ packaging.webp");

  // 512px: la etiqueta de la tapa de la caja lo pinta a ~264 CSS px y el pie a
  // 112, así que da de sobra a 2x. A 900px pesaba 100KB y entraba en la carga
  // inicial por la vía del <image href> del SVG, que no pasa por next/image.
  // Paleta de 128 colores: el logo son cuatro tintas planas (negro, hueso,
  // amarillo, rojo) más el degradado del canto. Sin cuantizar, el ruido JPEG
  // del original impide que PNG comprima y el archivo se queda en ~96KB.
  await sharp(SRC("logo", "image.png"))
    .resize({ width: 512, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, colours: 128 })
    .toFile(OUT("logo.png"));
  console.log("  ✓ logo.png");
}

async function main() {
  // `--only=ingredients` acorta el ciclo de afinado del recorte: reprocesar las
  // 16 fotos de 6192px en cada iteración no aporta nada.
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  const run = (name) => !only || only === name;

  await mkdir(path.join(ROOT, "src", "data"), { recursive: true });

  if (run("ingredients")) {
    await rm(OUT("burger"), { recursive: true, force: true });
    console.log("Ingredientes:");
    await buildIngredients();
  }
  if (run("singles")) {
    console.log("Singles:");
    await buildSingles();
  }
  if (run("gallery")) {
    await rm(OUT("gallery"), { recursive: true, force: true });
    console.log("Galería:");
    await buildPhotos();
  }
  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
