// Generate in advance the realistic "view from your seat" for every sector and row band,
// so visitors get the picture instantly instead of waiting for the image model.
//
// Needs the backend running with an image provider configured, e.g.:
//   GEMINI_API_KEY=... uvicorn backend.app:app
// then:
//   npm install playwright@1.49.1 && npx playwright install chromium
//   node tools/pregenerate_views.mjs http://localhost:8000 [--night|--day] [--only 104,105]
//
// Already generated views (and real photos in web/views/) are skipped, so the script can be
// stopped and restarted. A full stadium is about 200 images.
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:8000';
const day = process.argv.includes('--day');
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',').map(Number)) : null;
const ROWS = [3, 8, 13]; // middle row of each band (1-5, 6-10, 11-14)

const views = await (await fetch(`${base}/api/views`)).json();
if (!views.enabled) {
  console.error('La generazione non è attiva sul server: imposta GEMINI_API_KEY o OPENAI_API_KEY e riavvia il backend.');
  process.exit(1);
}
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
await page.goto(base);
await page.waitForFunction(() => window.ticketing && document.querySelector('#loading') === null, null, { timeout: 120000 });
if (day) await page.click('#timeBtn');
const sectors = (await page.evaluate(() => window.ticketing.sectors())).filter((n) => !only || only.has(n));
let made = 0, skipped = 0;
for (const sector of sectors) {
  for (const row of ROWS) {
    const key = `${sector}-${Math.ceil(row / 5)}`;
    if (views.images[key] || views.images[String(sector)]) { skipped++; continue; }
    try {
      const r = await page.evaluate(([s, r]) => window.ticketing.pregenerate(s, r), [sector, row]);
      made++;
      console.log(`${key} ${r.cached ? 'già presente' : 'generata'} → ${r.url}`);
    } catch (e) {
      console.error(`${key}: ${e.message}`);
    }
  }
}
console.log(`Fatto: ${made} generate, ${skipped} già presenti.`);
await browser.close();
