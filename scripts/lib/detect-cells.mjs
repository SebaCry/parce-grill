/**
 * Localiza los ingredientes dentro de una lámina, sin coordenadas a mano.
 *
 * Las láminas han cambiado dos veces —fondo negro primero, tablero de
 * transparencia después— y con ellas la posición de cada ingrediente. Clavar la
 * rejilla en constantes obligaba a volver a medirla cada vez; detectar las
 * manchas hace que el pipeline aguante la siguiente lámina sin tocar código.
 */

/**
 * @param {Buffer} data  RGB crudo
 * @param {(p:number)=>boolean} isObject  clasificador de píxel de objeto
 * @returns manchas en orden de lectura (filas de arriba abajo, columnas de
 *          izquierda a derecha), con su caja
 */
export function detectCells(data, W, H, C, isObject, { minAreaRatio = 0.0008, rows = 2 } = {}) {
  const fg = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) fg[p] = isObject(p) ? 1 : 0;

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
    if (n > W * H * minAreaRatio) {
      blobs.push({ area: n, left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
    }
  }

  // Orden de lectura. La fila se decide por el centro vertical repartido en
  // bandas iguales, no por el orden de descubrimiento.
  const bandHeight = H / rows;
  blobs.sort((a, b) => {
    const rowA = Math.min(rows - 1, Math.floor((a.top + a.height / 2) / bandHeight));
    const rowB = Math.min(rows - 1, Math.floor((b.top + b.height / 2) / bandHeight));
    return rowA - rowB || a.left - b.left;
  });
  return blobs;
}

/** Ensancha una caja sin salirse del lienzo: deja aire para la pluma del borde. */
export function padBox(box, W, H, pad) {
  const left = Math.max(0, box.left - pad);
  const top = Math.max(0, box.top - pad);
  return {
    left,
    top,
    width: Math.min(W - left, box.width + pad * 2),
    height: Math.min(H - top, box.height + pad * 2),
  };
}
