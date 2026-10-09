// Gemini image generation (Node port of the GEMINI_IMAGE_GENERATION.md starter CLI).
//
// Single image:
//   node tools/generate_image.mjs <output.jpg> "<prompt>" [--aspect 16:9] [--size 2K] [--ref style.jpg ...]
// Batch from a manifest (skips files that already exist unless --force):
//   node tools/generate_image.mjs --manifest tools/rennox_images.json [--only hero,kitchen] [--force]
//
// Reads GOOGLE_AI_API_KEY from .env in the project root. Model: gemini-3-pro-image-preview.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
const QUALITY_SUFFIX = 'ultra-realistic, professional photography, 4K, no text, no watermark';
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function loadKey() {
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const key = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('Missing GOOGLE_AI_API_KEY. Add it to .env in the project root.');
    process.exit(2);
  }
  return key;
}

function parseArgs(argv) {
  const opts = { aspect: '4:3', size: '2K', refs: [], positional: [], force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--aspect') opts.aspect = argv[++i];
    else if (a === '--size') opts.size = argv[++i];
    else if (a === '--ref') opts.refs.push(argv[++i]);
    else if (a === '--manifest') opts.manifest = argv[++i];
    else if (a === '--only') opts.only = argv[++i].split(',');
    else if (a === '--force') opts.force = true;
    else opts.positional.push(a);
  }
  return opts;
}

async function generate(key, { out, prompt, aspect, size, refs = [] }, attempt = 1) {
  const parts = [{ text: `${prompt.trim()} ${QUALITY_SUFFIX}` }];
  for (const r of refs) {
    const ext = path.extname(r).toLowerCase();
    parts.push({ inlineData: { mimeType: MIME[ext] || 'image/jpeg', data: fs.readFileSync(r).toString('base64') } });
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect, imageSize: size } },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // 429/503 are transient: back off and retry a couple of times.
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const wait = 15000 * attempt;
      console.warn(`  ${res.status} — retrying in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
      return generate(key, { out, prompt, aspect, size, refs }, attempt + 1);
    }
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = await res.json();
  const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!img) throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 500)}`);
  // Name the file after the real format when no extension was given.
  if (!path.extname(out)) out += { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[img.mimeType] || '.png';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(img.data, 'base64'));
  return { out, mime: img.mimeType };
}

const opts = parseArgs(process.argv.slice(2));
const key = loadKey();

if (opts.manifest) {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(ROOT, opts.manifest), 'utf8'));
  const outDir = path.resolve(ROOT, manifest.outDir);
  let failed = 0;
  for (const item of manifest.images) {
    if (opts.only && !opts.only.includes(item.name)) continue;
    const out = path.join(outDir, item.name);
    const existing = fs.existsSync(outDir) && fs.readdirSync(outDir).find((f) => path.parse(f).name === item.name);
    if (existing && !opts.force) { console.log(`skip  ${existing} (exists)`); continue; }
    process.stdout.write(`gen   ${item.name} [${item.aspect}] ... `);
    try {
      await generate(key, { out, prompt: item.prompt, aspect: item.aspect, size: item.size || opts.size });
      console.log('ok');
    } catch (e) {
      failed++;
      console.log(`FAILED\n  ${e.message}`);
    }
  }
  process.exitCode = failed ? 1 : 0;
} else {
  const [out, prompt] = opts.positional;
  if (!out || !prompt) {
    console.error('Usage: node tools/generate_image.mjs <output> "<prompt>" [--aspect 16:9] [--size 2K] [--ref img]');
    process.exit(1);
  }
  const r = await generate(key, { out: path.resolve(out), prompt, aspect: opts.aspect, size: opts.size, refs: opts.refs });
  console.log(`Saved: ${r.out} (${r.mime})`);
}
