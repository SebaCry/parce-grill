/**
 * Mide la fluidez del scroll donde de verdad duele: un móvil de gama media.
 *
 * Emula viewport táctil, estrangula la CPU y recorre la secuencia de la
 * hamburguesa registrando el tiempo entre fotogramas. Lo que importa no es la
 * media —que casi siempre sale bien— sino el percentil 95 y cuántos fotogramas
 * pasan de 32 ms, que son los tirones que el usuario siente como "va lento".
 *
 *   node scripts/scrollperf.mjs [--url=...] [--cpu=4] [--vp=390x844]
 */
import { chromium } from "playwright";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const URL_BASE = arg("url", "http://localhost:3001/es");
const [vw, vh] = arg("vp", "390x844").split("x").map(Number);
const CPU = Number(arg("cpu", "4"));
const LABEL = arg("label", "actual");

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: vw, height: vh },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();

const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });

/**
 * `--kill=grain,blur,shadow,glow` desactiva sospechosos por CSS antes de medir.
 * Sirve para atribuir el coste a un culpable concreto en vez de aplicar cuatro
 * arreglos a la vez y no saber cuál sirvió.
 */
const KILL = (arg("kill", "") || "").split(",").filter(Boolean);
const KILL_CSS = {
  grain: ".grain-overlay { display: none !important; }",
  blur: "header { backdrop-filter: none !important; background: #0b0b0c !important; }",
  shadow: "#la-colombiana img { filter: none !important; }",
  glow: "#la-colombiana .blur-3xl { filter: none !important; }",
};

await page.goto(URL_BASE, { waitUntil: "networkidle" });
if (KILL.length) {
  await page.addStyleTag({ content: KILL.map((k) => KILL_CSS[k] ?? "").join("\n") });
}
await page.waitForTimeout(1200);

// Recorre la sección con pin en pasos pequeños, como un dedo arrastrando, y
// anota el intervalo real entre fotogramas pintados.
const stats = await page.evaluate(async () => {
  const section = document.querySelector("#la-colombiana");
  if (!section) throw new Error("No se encontró #la-colombiana");
  const top = section.getBoundingClientRect().top + window.scrollY;
  const travel = section.scrollHeight - window.innerHeight;

  const frames = [];
  let last = performance.now();
  let running = true;
  const tick = (now) => {
    frames.push(now - last);
    last = now;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // 240 pasos a lo largo de todo el recorrido: unos 4 segundos de scroll
  // continuo, que es aproximadamente lo que tarda un pulgar en cruzar la
  // secuencia entera.
  const STEPS = 240;
  for (let i = 0; i <= STEPS; i++) {
    window.scrollTo(0, top + (travel * i) / STEPS);
    await new Promise((r) => requestAnimationFrame(r));
  }
  await new Promise((r) => setTimeout(r, 400));
  running = false;

  // Los primeros fotogramas incluyen el arranque del bucle: se descartan.
  const d = frames.slice(5).sort((a, b) => a - b);
  const pct = (p) => d[Math.floor(d.length * p)] ?? 0;
  return {
    count: d.length,
    median: pct(0.5),
    p95: pct(0.95),
    worst: d.at(-1),
    over32: d.filter((x) => x > 32).length,
    over64: d.filter((x) => x > 64).length,
  };
});

const fps = (ms) => (ms > 0 ? 1000 / ms : 0);
console.log(`\n${LABEL} · ${URL_BASE} @ ${vw}x${vh} · CPU ${CPU}x más lenta`);
console.log(`  fotogramas          ${stats.count}`);
console.log(`  mediana             ${stats.median.toFixed(1)} ms  (${fps(stats.median).toFixed(0)} fps)`);
console.log(`  p95                 ${stats.p95.toFixed(1)} ms  (${fps(stats.p95).toFixed(0)} fps)`);
console.log(`  peor                ${stats.worst.toFixed(1)} ms`);
console.log(
  `  tirones (>32 ms)    ${stats.over32}  (${((stats.over32 / stats.count) * 100).toFixed(1)}%)`,
);
console.log(`  bloqueos (>64 ms)   ${stats.over64}`);

await browser.close();
