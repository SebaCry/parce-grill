// Diagnóstico: localiza las celdas oscuras dentro de la lámina de ingredientes.
import sharp from "sharp";

const SRC = "assets/ingredients/Gemini_Generated_Image_pvedwupvedwupved.jfif";

const img = sharp(SRC);
const meta = await img.metadata();
console.log("size:", meta.width, "x", meta.height, meta.format);

const { data, info } = await img
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H, channels: C } = info;
const lum = (x, y) => {
  const i = (y * W + x) * C;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};

// Una fila/columna "de celda" es aquella donde una fracción alta de píxeles es oscura.
const DARK = 90;
const colDark = new Array(W).fill(0);
const rowDark = new Array(H).fill(0);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (lum(x, y) < DARK) {
      colDark[x]++;
      rowDark[y]++;
    }
  }
}

// Convierte a runs booleanos y reporta los intervalos.
const runs = (arr, total, thresh = 0.35) => {
  const out = [];
  let start = -1;
  for (let i = 0; i < arr.length; i++) {
    const on = arr[i] / total > thresh;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      if (i - start > 20) out.push([start, i - 1, i - start]);
      start = -1;
    }
  }
  if (start >= 0 && arr.length - start > 20) out.push([start, arr.length - 1, arr.length - start]);
  return out;
};

console.log("bandas verticales (columnas de celdas):", runs(colDark, H));
console.log("bandas horizontales (filas de celdas):", runs(rowDark, W));
