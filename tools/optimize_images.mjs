// Resize + re-encode raw generated images to WebP for the website (uses Puppeteer's Chrome, no extra deps).
//   node tools/optimize_images.mjs [inDir=.tmp/images_raw] [outDir=site/assets/img]
// Max widths per file come from SIZES below (default 1600px). Quality 0.82.

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const inDir = path.resolve(process.argv[2] || '.tmp/images_raw');
const outDir = path.resolve(process.argv[3] || 'site/assets/img');
const SIZES = { 'avatar-1': 160, 'avatar-2': 160, 'hero-chip': 480, 'hero-craftsman': 1200 };
const QUALITY = 0.82;

fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(inDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

for (const f of files) {
  const name = path.parse(f).name;
  const mime = /png$/i.test(f) ? 'image/png' : /webp$/i.test(f) ? 'image/webp' : 'image/jpeg';
  const src = `data:${mime};base64,${fs.readFileSync(path.join(inDir, f)).toString('base64')}`;
  const dataUrl = await page.evaluate(async (src, maxW, q) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.min(1, maxW / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', q);
  }, src, SIZES[name] || 1600, QUALITY);
  const out = path.join(outDir, `${name}.webp`);
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`${f} -> ${path.relative(process.cwd(), out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
}
await browser.close();
