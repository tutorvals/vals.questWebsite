// Local-only build tool: scans public/vibes/original_images/, reads each image's
// dimensions, and writes a committed JSON manifest the /vibes collage page renders.
//
// It runs on the DEV machine only (never on the VPS, which uses the committed JSON).
// Re-run whenever you add/remove images:  npm run build:vibes
//
// Node equivalent of girl.surgery's lister.py. `image-size` is pure JS (no native
// build) and handles jpg/png/webp/gif; it does NOT read HEIC, so convert .heic first.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from 'image-size';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../public/vibes/original_images');
const OUT = resolve(__dirname, '../src/data/vibes.json');

// Browser-servable URL prefix (public/ is served at the site root).
const URL_PREFIX = '/vibes/original_images';

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const files = readdirSync(SRC_DIR)
  .filter((name) => SUPPORTED.has(extname(name).toLowerCase()))
  .sort(); // stable diffs

const out = [];
let skipped = 0;
for (const name of files) {
  try {
    const { width, height } = imageSize(readFileSync(resolve(SRC_DIR, name)));
    if (!width || !height) throw new Error('no dimensions');
    out.push([`${URL_PREFIX}/${name}`, [width, height]]);
  } catch (e) {
    console.warn(`skipping ${name}: ${e.message}`);
    skipped++;
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out) + '\n');

console.log(
  `vibes: wrote ${out.length} images` +
    (skipped ? `, skipped ${skipped}` : '') +
    `  ->  ${OUT.replace(resolve(__dirname, '..') + '/', '')}`
);
