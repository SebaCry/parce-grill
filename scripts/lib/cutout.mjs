// Recorte de objetos fotografiados sobre fondo negro de estudio.
//
// Un umbral de luminancia no sirve: el fondo de la lámina tiene un degradado
// que llega a lum ~116, muy por encima de las zonas oscuras del chimichurri o
// la tocineta. Lo que sí separa limpiamente es la SATURACIÓN — medida sobre el
// marco exterior de las ocho celdas, el fondo nunca pasa de sat 9, mientras que
// toda la comida es cromática. La luminancia sólo entra como red de seguridad
// para las partes pálidas (la carne blanca de la cebolla, el nervio de la
// lechuga), donde el brillo sí despega del fondo.
//
// Pipeline: clave por saturación -> cierre morfológico -> relleno de huecos
// interiores -> descarte de manchas -> pluma en el borde.

function foregroundMask(data, W, H, C, { satMin, lumHigh }) {
  const fg = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += C) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (sat > satMin) {
      fg[p] = 1;
      continue;
    }
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > lumHigh) fg[p] = 1;
  }
  return fg;
}

/** Dilatación por ventana cuadrada, separable en dos pasadas. */
function dilate(mask, W, H, radius) {
  if (radius <= 0) return mask;
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      let on = 0;
      const lo = Math.max(0, x - radius), hi = Math.min(W - 1, x + radius);
      for (let nx = lo; nx <= hi; nx++) if (mask[row + nx]) { on = 1; break; }
      tmp[row + x] = on;
    }
  }
  const out = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let on = 0;
      const lo = Math.max(0, y - radius), hi = Math.min(H - 1, y + radius);
      for (let ny = lo; ny <= hi; ny++) if (tmp[ny * W + x]) { on = 1; break; }
      out[y * W + x] = on;
    }
  }
  return out;
}

/** Erosión = dilatación del complemento. */
function erode(mask, W, H, radius) {
  if (radius <= 0) return mask;
  const inv = new Uint8Array(W * H);
  for (let p = 0; p < mask.length; p++) inv[p] = mask[p] ? 0 : 1;
  const grown = dilate(inv, W, H, radius);
  const out = new Uint8Array(W * H);
  for (let p = 0; p < out.length; p++) out[p] = grown[p] ? 0 : 1;
  return out;
}

/**
 * Cierre morfológico: une piezas cercanas sin engordar la silueta.
 * Es lo que mantiene la maraña de papa al hilo como un solo objeto.
 */
function close(mask, W, H, radius) {
  return erode(dilate(mask, W, H, radius), W, H, radius);
}

/**
 * Rellena únicamente los huecos PEQUEÑOS encerrados por el objeto.
 *
 * Rellenarlos todos era el error obvio: el centro de un aro de cebolla y los
 * claros entre las hojas de lechuga son huecos legítimos, y taparlos deja un
 * disco negro que se delata en cuanto la capa flota sobre otra. Por encima de
 * `maxHoleRatio` el hueco se respeta; por debajo se asume ruido del keyeo.
 */
function fillSmallHoles(fg, W, H, maxHoleRatio) {
  const maxHole = Math.round(W * H * maxHoleRatio);
  const seen = new Uint8Array(W * H);
  const seed = (x, y, stack) => {
    const p = y * W + x;
    if (!seen[p] && !fg[p]) { seen[p] = 1; stack.push(p); }
  };

  // Primera pasada: marca todo el fondo alcanzable desde el borde.
  const outer = [];
  for (let x = 0; x < W; x++) { seed(x, 0, outer); seed(x, H - 1, outer); }
  for (let y = 0; y < H; y++) { seed(0, y, outer); seed(W - 1, y, outer); }
  while (outer.length) {
    const p = outer.pop();
    const x = p % W, y = (p / W) | 0;
    if (x > 0) seed(x - 1, y, outer);
    if (x < W - 1) seed(x + 1, y, outer);
    if (y > 0) seed(x, y - 1, outer);
    if (y < H - 1) seed(x, y + 1, outer);
  }

  // Segunda pasada: lo que quedó sin marcar son huecos interiores.
  let filled = 0, spared = 0;
  for (let start = 0; start < fg.length; start++) {
    if (fg[start] || seen[start]) continue;
    const hole = [start];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % W, y = (p / W) | 0;
      const grow = (nx, ny) => {
        const np = ny * W + nx;
        if (!fg[np] && !seen[np]) { seen[np] = 1; stack.push(np); hole.push(np); }
      };
      if (x > 0) grow(x - 1, y);
      if (x < W - 1) grow(x + 1, y);
      if (y > 0) grow(x, y - 1);
      if (y < H - 1) grow(x, y + 1);
    }
    if (hole.length <= maxHole) { for (const p of hole) fg[p] = 1; filled++; }
    else spared++;
  }
  return { filled, spared };
}

/**
 * Descarta manchas por debajo de `minAreaRatio`. No se queda con la mayor:
 * los aros de cebolla y las papas son legítimamente varias piezas sueltas.
 */
function dropSpecks(fg, W, H, minAreaRatio) {
  const minArea = Math.max(32, Math.round(W * H * minAreaRatio));
  const seen = new Uint8Array(W * H);
  let kept = 0, dropped = 0;
  for (let start = 0; start < fg.length; start++) {
    if (!fg[start] || seen[start]) continue;
    const blob = [start];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % W, y = (p / W) | 0;
      const tryPush = (nx, ny) => {
        const np = ny * W + nx;
        if (fg[np] && !seen[np]) { seen[np] = 1; stack.push(np); blob.push(np); }
      };
      if (x > 0) tryPush(x - 1, y);
      if (x < W - 1) tryPush(x + 1, y);
      if (y > 0) tryPush(x, y - 1);
      if (y < H - 1) tryPush(x, y + 1);
    }
    if (blob.length < minArea) { for (const p of blob) fg[p] = 0; dropped++; }
    else kept++;
  }
  return { kept, dropped };
}

/** Box blur separable: convierte el borde duro de la máscara en pluma. */
function featherMask(mask, W, H, radius, passes) {
  const buf = Float32Array.from(mask, (v) => v * 255);
  const tmp = new Float32Array(W * H);
  const win = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let sum = 0;
        for (let d = -radius; d <= radius; d++) {
          sum += buf[y * W + Math.min(W - 1, Math.max(0, x + d))];
        }
        tmp[y * W + x] = sum / win;
      }
    }
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        let sum = 0;
        for (let d = -radius; d <= radius; d++) {
          sum += tmp[Math.min(H - 1, Math.max(0, y + d)) * W + x];
        }
        buf[y * W + x] = sum / win;
      }
    }
  }
  return buf;
}

/**
 * Convierte un buffer RGB crudo en RGBA recortado contra el fondo de estudio.
 * Devuelve el RGBA, el bounding box del objeto y estadísticas de depuración.
 */
export function cutoutFromBlack(data, W, H, C, opts = {}) {
  const {
    satMin = 14,
    lumHigh = 120,
    closeRadius = 2,
    maxHoleRatio = 0.004,
    minAreaRatio = 0.0004,
    growRadius = 1,
    featherRadius = 1,
    featherPasses = 2,
    // Umbral para calcular el bounding box. Deliberadamente alto: el reflejo
    // del ingrediente sobre la mesa del estudio se conserva (da peso al objeto
    // cuando flota) pero su cola más tenue no debe inflar el lienzo.
    alphaFloor = 45,
  } = opts;

  let fg = foregroundMask(data, W, H, C, { satMin, lumHigh });
  fg = close(fg, W, H, closeRadius);
  const holes = fillSmallHoles(fg, W, H, maxHoleRatio);
  const blobs = dropSpecks(fg, W, H, minAreaRatio);
  fg = dilate(fg, W, H, growRadius);
  const soft = featherMask(fg, W, H, featherRadius, featherPasses);

  const rgba = Buffer.alloc(W * H * 4);
  let minX = W, minY = H, maxX = -1, maxY = -1, covered = 0;
  for (let p = 0; p < W * H; p++) {
    const a = Math.max(0, Math.min(255, Math.round(soft[p])));
    const src = p * C;
    const dst = p * 4;
    rgba[dst] = data[src];
    rgba[dst + 1] = data[src + 1];
    rgba[dst + 2] = data[src + 2];
    rgba[dst + 3] = a;
    if (a > alphaFloor) {
      covered++;
      const x = p % W, y = (p / W) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const stats = { coverage: covered / (W * H), ...blobs, ...holes };
  if (maxX < 0) {
    return { rgba, bbox: { left: 0, top: 0, width: W, height: H }, empty: true, stats };
  }
  return {
    rgba,
    bbox: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    empty: false,
    stats,
  };
}
