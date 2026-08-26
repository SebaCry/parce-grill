/**
 * Diagnóstico: geometría real del escenario en el primer fotograma.
 *
 * Estimar posiciones mirando una captura lleva a corregir cosas que no están
 * mal. Esto lee los rectángulos que el navegador calcula de verdad.
 *
 *   node scripts/probe-stage.mjs [--url=...] [--vp=390x844] [--at=0]
 */
import { chromium } from "playwright";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const URL_BASE = arg("url", "http://localhost:3001/es");
const [vw, vh] = arg("vp", "390x844").split("x").map(Number);
const AT = Number(arg("at", "0"));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: vw, height: vh },
  hasTouch: vw < 768,
  isMobile: vw < 768,
});
await page.goto(URL_BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(900);

const report = await page.evaluate(async (progress) => {
  const section = document.querySelector("#la-colombiana");
  const travel = section.scrollHeight - window.innerHeight;
  const top = section.getBoundingClientRect().top + window.scrollY;
  window.scrollTo(0, top + travel * progress);
  await new Promise((r) => setTimeout(r, 1800));

  const stage = section.querySelector(".sticky");
  const imgs = [...stage.querySelectorAll("img")];
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.x + r.width / 2) };
  };

  const groupEl = imgs[0]?.parentElement;
  const texts = {};
  for (const [name, sel] of [["h1", "h1"], ["lead", "h1 + p"], ["eyebrow", "p.eyebrow"]]) {
    const el = stage.querySelector(sel);
    if (el) texts[name] = box(el);
  }
  const ctas = [...stage.querySelectorAll("a")].map(box);

  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    centre: Math.round(window.innerWidth / 2),
    groupTransform: groupEl ? getComputedStyle(groupEl).transform : null,
    layers: imgs.map((i) => ({ src: i.getAttribute("src")?.slice(0, 60), ...box(i) })),
    texts,
    ctas,
  };
}, AT);

console.log(`\n${URL_BASE} @ ${vw}x${vh} · progreso ${AT}`);
console.log(`  viewport ${report.viewport.w}x${report.viewport.h} · centro x=${report.centre}`);
console.log(`  transform del grupo: ${report.groupTransform}`);
console.log(`\n  capas visibles:`);
for (const l of report.layers) {
  console.log(
    `    ${String(l.w).padStart(4)}x${String(l.h).padStart(4)}  x=${String(l.x).padStart(5)}  cx=${String(l.cx).padStart(5)}  y=${String(l.y).padStart(5)}..${String(l.y + l.h).padStart(5)}`,
  );
}
console.log(`\n  textos:`);
for (const [k, v] of Object.entries(report.texts)) {
  console.log(`    ${k.padEnd(8)} y=${v.y}..${v.y + v.h}`);
}
console.log(`  botones: ${report.ctas.map((c) => `y=${c.y}..${c.y + c.h}`).join("  ")}`);

await browser.close();
