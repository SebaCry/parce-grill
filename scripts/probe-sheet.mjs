/**
 * Diagnóstico de una lámina nueva: aprende el fondo y localiza los objetos.
 *
 * La lámina nnag23 no viene sobre negro sino sobre el tablero de transparencia
 * que pinta el visor, y los ingredientes están en posiciones distintas a las de
 * la lámina anterior. En vez de volver a clavar coordenadas a mano, aquí se
 * detectan las manchas y se reporta su caja.
 *
 *   node scripts/probe-sheet.mjs [ruta]
 */
import sharp from "sharp";

const SRC = process.argv[2] ?? "assets/ingredients/Gemini_Generated_Image_nnag23nnag23nnag.png";

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
console.log(`lámina ${W}x${H}`);

const lumAt = (p) => {
  const i = p * C;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};
const satAt = (p) => {
  const i = p * C;
  return Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
};

// El tablero son dos grises neutros. Se aprenden del marco exterior, que es
// fondo garantizado, en vez de asumir 255 y 204.
const frame = [];
for (let x = 0; x < W; x++) for (let y = 0; y < 24; y++) { frame.push(y * W + x); frame.push((H - 1 - y) * W + x); }
const hist = new Map();
let satMax = 0;
for (const p of frame) {
  const l = Math.round(lumAt(p));
  hist.set(l, (hist.get(l) ?? 0) + 1);
  satMax = Math.max(satMax, satAt(p));
}
const levels = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(`niveles de fondo más frecuentes: ${levels.map(([l, n]) => `${l}(${n})`).join(" ")}`);
console.log(`saturación máxima del marco: ${satMax}`);

// Máscara de objeto: cromático, o mucho más oscuro que el tablero.
const SAT_MIN = 22;
const LUM_LOW = 120;
const fg = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) fg[p] = satAt(p) > SAT_MIN || lumAt(p) < LUM_LOW ? 1 : 0;

// Componentes conexas, quedándose con las ocho mayores.
const seen = new Uint8Array(W * H);
const blobs = [];
for (let start = 0; start < fg.length; start++) {
  if (!fg[start] || seen[start]) continue;
  const stack = [start];
  seen[start] = 1;
  let n = 0, minX = W, minY = H, maxX = -1, maxY = -1;
  while (stack.length) {
    const p = stack.pop();
    n++;
    const x = p % W, y = (p / W) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    const push = (nx, ny) => {
      const np = ny * W + nx;
      if (fg[np] && !seen[np]) { seen[np] = 1; stack.push(np); }
    };
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }
  if (n > W * H * 0.0008) blobs.push({ n, minX, minY, maxX, maxY });
}

blobs.sort((a, b) => b.n - a.n);
const top = blobs.slice(0, 12);
// Orden de lectura: por filas y luego por columnas.
top.sort((a, b) => {
  const rowA = a.minY < H / 2 ? 0 : 1;
  const rowB = b.minY < H / 2 ? 0 : 1;
  return rowA - rowB || a.minX - b.minX;
});

console.log(`\nmanchas detectadas: ${blobs.length} (se listan las ${top.length} mayores, en orden de lectura)`);
for (const b of top) {
  console.log(
    `  x=${String(b.minX).padStart(4)}..${String(b.maxX).padStart(4)}  y=${String(b.minY).padStart(4)}..${String(b.maxY).padStart(4)}` +
      `  ${String(b.maxX - b.minX + 1).padStart(4)}x${String(b.maxY - b.minY + 1).padStart(4)}  px=${b.n}`,
  );
}
