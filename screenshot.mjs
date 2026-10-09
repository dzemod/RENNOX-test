// Usage: node screenshot.mjs [url] [label] [width=1440]
//   node screenshot.mjs                          -> http://localhost:3000
//   node screenshot.mjs http://localhost:3000 hero
// Saves to "./temporary screenshots/screenshot-N[-label].png" (auto-incremented, never overwrites).

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const width = Number(process.argv[4]) || 1440;
const label = process.argv[3] ? `-${process.argv[3].replace(/[^\w-]/g, '_')}` : '';
const outDir = path.join(__dirname, 'temporary screenshots');

fs.mkdirSync(outDir, { recursive: true });

const nums = fs.readdirSync(outDir)
  .map((f) => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const next = nums.length ? Math.max(...nums) + 1 : 1;
const outFile = path.join(outDir, `screenshot-${next}${label}.png`);

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: outFile, fullPage: true });
  console.log(`Saved: ${outFile}`);
} catch (err) {
  console.error(`Screenshot failed for ${url}: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
