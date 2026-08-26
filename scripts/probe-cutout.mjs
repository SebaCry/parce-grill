// Diagnóstico: vuelca el canal alfa de cada celda sin recortar, para ver qué
// región extra está inflando el bounding box.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { cutoutFromBlack } from "./lib/cutout.mjs";

const GRID = "assets/ingredients/Gemini_Generated_Image_pvedwupvedwupved.jfif";
const CELL = { w: 544, h: 719 };
const COLS = [115, 700, 1285, 1869];
const ROWS = [109, 869];
const IDS = ["bun-top", "greens", "onion", "chimichurri", "bacon", "patty", "papas", "bun-bottom"];
const TUNING = {
  papas: { closeRadius: 5, minAreaRatio: 0.00008 },
  onion: { closeRadius: 4, minAreaRatio: 0.0002 },
  greens: { closeRadius: 4, minAreaRatio: 0.0002 },
  chimichurri: { satMin: 12 },
};

await mkdir("tmp/probe", { recursive: true });
const base = sharp(GRID);
const tiles = [];

for (let cell = 0; cell < 8; cell++) {
  const id = IDS[cell];
  const { data, info } = await base
    .clone()
    .extract({
      left: COLS[cell % 4],
      top: ROWS[Math.floor(cell / 4)],
      width: CELL.w,
      height: CELL.h,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { rgba, bbox } = cutoutFromBlack(data, info.width, info.height, info.channels, TUNING[id] ?? {});

  // Alfa como gris, para leer la máscara directamente.
  const alpha = Buffer.alloc(CELL.w * CELL.h);
  for (let p = 0; p < CELL.w * CELL.h; p++) alpha[p] = rgba[p * 4 + 3];

  const tile = await sharp(alpha, { raw: { width: CELL.w, height: CELL.h, channels: 1 } })
    .resize({ width: 260 })
    .png()
    .toBuffer();
  tiles.push({ input: tile, left: (cell % 4) * 260, top: Math.floor(cell / 4) * 344 });

  console.log(`${id.padEnd(12)} bbox y=${bbox.top}..${bbox.top + bbox.height - 1}  x=${bbox.left}..${bbox.left + bbox.width - 1}`);
}

await sharp({ create: { width: 4 * 260, height: 2 * 344, channels: 3, background: "#202020" } })
  .composite(tiles)
  .png()
  .toFile("tmp/probe/alpha-sheet.png");
console.log("-> tmp/probe/alpha-sheet.png");
