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

const ROOT = process.cwd();
const SRC = (...p) => path.join(ROOT, "assets", ...p);
const OUT = (...p) => path.join(ROOT, "public", ...p);

const GRID = SRC("ingredients", "Gemini_Generated_Image_pvedwupvedwupved.jfif");
// Medido sobre la lámina con scripts/probe-grid.mjs. INSET descarta el borde de
// cada celda: la última columna es el degradado antialias contra la calle
// blanca de la rejilla, y la clave lo tomaba por objeto.
const INSET = 8;
/** Ancho de celda de la lámina: es la unidad contra la que se mide el layout. */
const SOURCE_CELL = 544;
const CELL = { w: SOURCE_CELL - INSET * 2, h: 719 - INSET * 2 };
const COLS = [115, 700, 1285, 1869].map((x) => x + INSET);
const ROWS = [109, 869].map((y) => y + INSET);

/**
 * `stack` es el orden real de la hamburguesa de abajo hacia arriba (0 = pan
 * inferior). La secuencia de scroll separa las capas siguiendo este índice.
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

// Ajustes por ingrediente. Los tres porosos (papa al hilo, aros de cebolla,
// lechuga) van con cierre mínimo y filtro de manchas permisivo: se prefiere
// conservar los claros entre hebras y el centro de los aros, aunque eso deje
// piezas sueltas, a fabricar una silueta compacta que se delataría al flotar.
const TUNING = {
  papas: { closeRadius: 1, minAreaRatio: 0.00004, maxHoleRatio: 0.0004 },
  onion: { closeRadius: 1, minAreaRatio: 0.0002, maxHoleRatio: 0.0006 },
  greens: { closeRadius: 1, minAreaRatio: 0.00008, maxHoleRatio: 0.0006 },
  chimichurri: { satMin: 12 },
};

/**
 * Hornea la sombra proyectada dentro del propio PNG y sobremuestrea la capa.
 *
 * La sombra estaba resuelta con `filter: drop-shadow()` en CSS y era, medido,
 * la causa del scroll a 30 fps en móvil: el navegador vuelve a rasterizar el
 * filtro en cada fotograma en que la capa se transforma, y son ocho capas
 * moviéndose a la vez. Precalculada aquí cuesta cero en tiempo de ejecución.
 *
 * De paso se escala x1.9 con Lanczos y un enfoque suave: las celdas de la
 * lámina original miden ~460 px y en pantalla retina la capa se pinta a más del
 * doble, así que el navegador estaba ampliando con un filtro peor que este.
 */
const SHADOW = { blur: 19, dy: 30, opacity: 0.52, pad: 78 };
const UPSCALE = 1.9;

async function bakeShadow(cutBuf, w, h, file) {
  const { pad } = SHADOW;
  const canvasW = w + pad * 2;
  const canvasH = h + pad * 2;

  // La silueta sale del propio canal alfa, así que la sombra encaja con el
  // recorte exacto — incluidos los huecos de los aros de cebolla.
  const alpha = await sharp(cutBuf)
    .extractChannel("alpha")
    .blur(SHADOW.blur)
    .linear(SHADOW.opacity, 0)
    .toBuffer();
  const shadow = await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();

  const target = Math.round(canvasW * UPSCALE);
  const info = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: shadow, left: pad, top: pad + SHADOW.dy },
      { input: cutBuf, left: pad, top: pad },
    ])
    .resize({ width: target, kernel: "lanczos3" })
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(file);

  return { width: info.width, height: info.height, unit: canvasW };
}

async function buildIngredients() {
  await mkdir(OUT("burger"), { recursive: true });
  const base = sharp(GRID);
  const manifest = [];

  for (const layer of LAYERS) {
    const left = COLS[layer.cell % 4];
    const top = ROWS[Math.floor(layer.cell / 4)];

    const { data, info } = await base
      .clone()
      .extract({ left, top, width: CELL.w, height: CELL.h })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { rgba, bbox, empty, stats } = cutoutFromBlack(
      data,
      info.width,
      info.height,
      info.channels,
      TUNING[layer.id] ?? {},
    );
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
      width: Math.min(CELL.w, bbox.width + pad * 2),
      height: Math.min(CELL.h, bbox.height + pad * 2),
    };
    crop.width = Math.min(crop.width, CELL.w - crop.left);
    crop.height = Math.min(crop.height, CELL.h - crop.top);

    const file = OUT("burger", `${layer.id}.webp`);
    const cut = await sharp(rgba, { raw: { width: CELL.w, height: CELL.h, channels: 4 } })
      .extract(crop)
      .png()
      .toBuffer();

    const out = await bakeShadow(cut, crop.width, crop.height, file);

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
