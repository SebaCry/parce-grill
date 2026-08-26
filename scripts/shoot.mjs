/**
 * Capturas de revisión de la landing.
 *
 * La secuencia de la hamburguesa sólo se puede juzgar en fotogramas concretos
 * del recorrido, así que el script posiciona el scroll en fracciones exactas de
 * la sección con pin y espera a que la timeline asiente antes de disparar.
 *
 *   node scripts/shoot.mjs [--url=...] [--vp=1440x900] [--only=burger]
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;

const URL_BASE = arg("url", "http://localhost:3000/es");
const [vw, vh] = arg("vp", "1440x900").split("x").map(Number);
const ONLY = arg("only", null);
const OUT = `tmp/shots/${vw}x${vh}${arg("motion", null) === "reduce" ? "-reduce" : ""}`;

/** Instantes del recorrido con pin que vale la pena mirar. */
const BURGER_FRAMES = [0, 0.14, 0.3, 0.45, 0.55, 0.7, 0.86, 0.95, 1];

await mkdir(OUT, { recursive: true });

// `--motion=reduce` fotografía la variante accesible: sin timeline, sin Lenis,
// y con la ficha estática de la hamburguesa en lugar del escenario con pin.
const REDUCE = arg("motion", null) === "reduce";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: vw, height: vh },
  deviceScaleFactor: 1,
  reducedMotion: REDUCE ? "reduce" : "no-preference",
});

page.on("console", (m) => {
  if (m.type() === "error") console.log(`  [console] ${m.text()}`);
});
page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message}`));

console.log(`→ ${URL_BASE} @ ${vw}x${vh}`);
await page.goto(URL_BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(900);

/**
 * Dos inercias encadenadas: Lenis interpola el scroll y ScrollTrigger corre con
 * `scrub: 1`, que tarda alrededor de un segundo en alcanzar la posición. Sin
 * esperar de sobra se fotografía un fotograma intermedio y se acaba corrigiendo
 * una geometría que en realidad estaba bien.
 */
async function settleAt(y) {
  await page.evaluate((target) => window.scrollTo({ top: target, behavior: "instant" }), y);
  await page
    .waitForFunction((target) => Math.abs(window.scrollY - target) < 2, y, { timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(1800);
}

if ((!ONLY || ONLY === "burger") && !REDUCE) {
  const box = await page.evaluate(() => {
    const el = document.querySelector("#la-colombiana");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: el.scrollHeight };
  });
  if (!box) throw new Error("No se encontró #la-colombiana");

  // El recorrido útil termina una ventana antes del final de la sección: a
  // partir de ahí el sticky ya se despegó.
  const travel = box.height - vh;
  for (const p of BURGER_FRAMES) {
    await settleAt(box.top + travel * p);
    const name = `burger-${String(Math.round(p * 100)).padStart(3, "0")}.png`;
    await page.screenshot({ path: `${OUT}/${name}` });
    console.log(`  ✓ ${name}`);
  }
}

if (!ONLY || ONLY === "page") {
  for (const [name, selector] of [
    ["hero", "#inicio"],
    ["colombiana", "#la-colombiana"],
    ["historia", "#historia"],
    ["carta", "#carta"],
    ["galeria", "#galeria"],
    ["pedir", "#pedir"],
    ["donde", "#donde-estamos"],
  ]) {
    const top = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect().top + window.scrollY : null;
    }, selector);
    if (top === null) {
      console.log(`  · falta ${selector}`);
      continue;
    }
    await settleAt(top);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`  ✓ ${name}.png`);
  }
}

await browser.close();
console.log(`Listo → ${OUT}`);
