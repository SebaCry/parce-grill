/**
 * Diagnóstico: separa estadísticamente la sombra dibujada de la comida pálida.
 *
 * Ambas son poco saturadas, así que el umbral que mata una puede comerse la
 * otra. Esto mide las dos poblaciones sobre la lámina real para elegir el corte
 * con datos y no a ojo.
 */
import sharp from "sharp";
import { detectCells, padBox } from "./lib/detect-cells.mjs";

const SRC = "assets/ingredients/Gemini_Generated_Image_nnag23nnag23nnag.png";
const IDS = ["bun-top", "greens", "onion", "chimichurri", "bacon", "patty", "papas", "bun-bottom"];

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const sat = (p) => {
  const i = p * C;
  return Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
};
const lum = (p) => {
  const i = p * C;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};

const boxes = detectCells(data, W, H, C, (p) => sat(p) > 22 || lum(p) < 105);

const pct = (arr, f) => (arr.length ? arr[Math.floor(arr.length * f)] : 0);

for (const [i, box] of boxes.entries()) {
  const cell = padBox(box, W, H, 26);
  // "Halo": píxeles del anillo exterior de la celda que no son fondo limpio.
  // "Pálido": píxeles interiores muy claros y poco saturados — la carne blanca
  // de la cebolla, la miga del pan.
  const halo = [];
  const pale = [];
  for (let y = cell.top; y < cell.top + cell.height; y++) {
    for (let x = cell.left; x < cell.left + cell.width; x++) {
      const p = y * W + x;
      const s = sat(p), l = lum(p);
      const inner =
        x > box.left + box.width * 0.2 &&
        x < box.left + box.width * 0.8 &&
        y > box.top + box.height * 0.2 &&
        y < box.top + box.height * 0.8;
      // Fondo limpio: los dos grises del tablero, 187 y 229.
      const clean = s <= 6 && (Math.abs(l - 229) < 6 || Math.abs(l - 187) < 6);
      if (clean) continue;
      if (!inner && l > 100 && l < 215 && s < 20) halo.push(s);
      if (inner && l > 200) pale.push(s);
    }
  }
  halo.sort((a, b) => a - b);
  pale.sort((a, b) => a - b);
  console.log(
    `${IDS[i].padEnd(12)} sombra n=${String(halo.length).padStart(6)} sat p50=${pct(halo, 0.5)} p90=${pct(halo, 0.9)} p99=${pct(halo, 0.99)}` +
      `   |  pálido n=${String(pale.length).padStart(6)} sat p10=${pct(pale, 0.1)} p50=${pct(pale, 0.5)}`,
  );
}
