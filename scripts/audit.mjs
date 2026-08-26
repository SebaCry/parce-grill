/**
 * Auditoría rápida contra el build de producción: Web Vitals de carga y un
 * repaso de accesibilidad que no necesita ninguna dependencia extra.
 *
 * No sustituye a Lighthouse; sirve para detectar en cada iteración las tres
 * cosas que esta página puede romper con facilidad — una imagen enorme como
 * LCP, saltos de layout al montar la timeline, y textos o enlaces sin nombre
 * accesible.
 *
 *   node scripts/audit.mjs [--url=http://localhost:3001/es] [--vp=390x844]
 */
import { chromium } from "playwright";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const URL_BASE = arg("url", "http://localhost:3001/es");
const [vw, vh] = arg("vp", "1440x900").split("x").map(Number);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: vw, height: vh } });

const failures = [];
page.on("pageerror", (e) => failures.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && failures.push(`console: ${m.text()}`));

const transfers = [];
page.on("response", async (r) => {
  const type = r.request().resourceType();
  if (["image", "font", "script", "stylesheet"].includes(type)) {
    const len = Number(r.headers()["content-length"] ?? 0);
    transfers.push({ type, url: new URL(r.url()).pathname, bytes: len });
  }
});

await page.addInitScript(() => {
  window.__vitals = { lcp: 0, cls: 0, shifts: [] };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__vitals.cls += e.value;
      if (e.value > 0.01) window.__vitals.shifts.push(e.value);
    }
  }).observe({ type: "layout-shift", buffered: true });
});

console.log(`→ ${URL_BASE} @ ${vw}x${vh}`);
await page.goto(URL_BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const vitals = await page.evaluate(() => window.__vitals);
console.log(`\nCarga`);
console.log(`  LCP  ${Math.round(vitals.lcp)} ms  ${vitals.lcp < 2500 ? "✓" : "✗ (objetivo <2500)"}`);
console.log(`  CLS  ${vitals.cls.toFixed(4)}  ${vitals.cls < 0.1 ? "✓" : "✗ (objetivo <0.1)"}`);

// Peso por tipo. Las capas de la hamburguesa se cargan con `priority`, así que
// entran en el arranque y conviene vigilar cuánto pesan.
const byType = {};
for (const t of transfers) byType[t.type] = (byType[t.type] ?? 0) + t.bytes;
console.log(`\nTransferencia inicial`);
for (const [type, bytes] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(11)} ${(bytes / 1024).toFixed(0).padStart(5)} KB`);
}
const heaviest = transfers.sort((a, b) => b.bytes - a.bytes).slice(0, 5);
console.log(`  más pesados: ${heaviest.map((t) => `${t.url} (${(t.bytes / 1024).toFixed(0)}KB)`).join(", ")}`);

const a11y = await page.evaluate(() => {
  const out = [];
  for (const img of document.querySelectorAll("img")) {
    if (!img.hasAttribute("alt")) out.push(`<img> sin alt: ${img.getAttribute("src")}`);
  }
  for (const a of document.querySelectorAll("a")) {
    const name = (a.getAttribute("aria-label") ?? a.textContent ?? "").trim();
    if (!name) out.push(`<a> sin nombre accesible: ${a.getAttribute("href")}`);
  }
  for (const b of document.querySelectorAll("button")) {
    const name = (b.getAttribute("aria-label") ?? b.textContent ?? "").trim();
    if (!name) out.push(`<button> sin nombre accesible`);
  }
  // Sólo cuentan los <h1> renderizados. La página lleva dos en el marcado —el
  // de la secuencia animada y el de su equivalente para movimiento reducido—
  // pero `display:none` deja uno fuera del árbol de accesibilidad, así que en
  // cada modo se expone exactamente uno.
  const h1 = [...document.querySelectorAll("h1")].filter((el) => el.getClientRects().length > 0);
  if (h1.length !== 1) out.push(`se esperaba exactamente un <h1> visible, hay ${h1.length}`);
  if (!document.documentElement.getAttribute("lang")) out.push("<html> sin lang");
  return out;
});

console.log(`\nAccesibilidad`);
console.log(a11y.length ? a11y.map((m) => `  ✗ ${m}`).join("\n") : "  ✓ sin hallazgos");

console.log(`\nErrores de runtime`);
console.log(failures.length ? failures.map((m) => `  ✗ ${m}`).join("\n") : "  ✓ ninguno");

await browser.close();
process.exit(failures.length || a11y.length ? 1 : 0);
