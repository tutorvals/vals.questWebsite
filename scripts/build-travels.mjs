// Local-only build tool: normalizes ../../travels/stays.yaml into a clean,
// privacy-filtered JSON that is committed into this repo and shipped to the browser.
//
// It runs on the DEV machine only (never on the VPS, which lacks stays.yaml).
// Re-run whenever stays.yaml changes:  npm run build:travels
//
// Privacy: only `visibility: public` stays are ever emitted. Private coordinates
// stay on your machine.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../../travels/stays.yaml');
const OUT = resolve(__dirname, '../src/data/travels.public.json');

// ---- helpers ---------------------------------------------------------------

// stays.yaml is (accidentally) wrapped in Markdown code fences; drop them.
function stripFences(text) {
  return text
    .split('\n')
    .filter((line) => !/^\s*```/.test(line))
    .join('\n');
}

const MS_PER_DAY = 86_400_000;

// Parse a start/end value into { ts, iso, granularity } or null.
// js-yaml may hand us: a Date (YYYY-MM-DD), a number (YYYY), a string
// (YYYY-MM / YYYY-MM-DD), null, or undefined.
function parseDate(value) {
  if (value == null) return null;

  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = value.getUTCMonth();
    const d = value.getUTCDate();
    return { ts: Date.UTC(y, m, d), iso: isoDay(y, m, d), granularity: 'day' };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // bare year, e.g. 2012
    const y = value;
    return { ts: Date.UTC(y, 0, 1), iso: String(y), granularity: 'year' };
  }

  const s = String(value).trim();
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    const [y, mo, d] = [+m[1], +m[2] - 1, +m[3]];
    return { ts: Date.UTC(y, mo, d), iso: isoDay(y, mo, d), granularity: 'day' };
  }
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) {
    const [y, mo] = [+m[1], +m[2] - 1];
    return { ts: Date.UTC(y, mo, 1), iso: `${m[1]}-${m[2]}`, granularity: 'month' };
  }
  if ((m = /^(\d{4})$/.exec(s))) {
    const y = +m[1];
    return { ts: Date.UTC(y, 0, 1), iso: m[1], granularity: 'year' };
  }
  return null;
}

function isoDay(y, m, d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${y}-${p(m + 1)}-${p(d)}`;
}

const COUNTRY_FIX = {
  uk: 'UK',
  usa: 'USA',
  chili: 'Chile',
};
function normalizeCountry(raw) {
  if (!raw) return '';
  const key = String(raw).trim().toLowerCase();
  if (COUNTRY_FIX[key]) return COUNTRY_FIX[key];
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizePurpose(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => String(p).trim().toLowerCase())
    .map((p) => (p === 'life' ? 'live' : p)) // typo in source
    .filter(Boolean);
}

// ---- main ------------------------------------------------------------------

const doc = yaml.load(stripFences(readFileSync(SRC, 'utf8')));
const rawStays = Array.isArray(doc?.stays) ? doc.stays : [];

let skipped = 0;
const reasons = { private: 0, invalid: 0 };

// Pass 1: keep valid public entries, in file order, with parsed dates.
const kept = [];
for (const s of rawStays) {
  if (!s || !s.id) {
    skipped++; reasons.invalid++; continue;
  }
  if (s.visibility !== 'public') {
    skipped++; reasons.private++; continue;
  }
  const coords = s.coordinates;
  const lat = Array.isArray(coords) ? Number(coords[0]) : NaN;
  const lng = Array.isArray(coords) ? Number(coords[1]) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    skipped++; reasons.invalid++; continue;
  }

  kept.push({
    id: String(s.id).trim(),
    place: String(s.place ?? '').trim(),
    country: normalizeCountry(s.country),
    lat,
    lng,
    purpose: normalizePurpose(s.purpose),
    _start: parseDate(s.start),
    _end: parseDate(s.end),
  });
}

// Pass 2: resolve missing endpoints using neighbouring entries (file order is
// chronological). null start -> previous entry's end; null end -> ongoing.
let prevEndTs = null;
for (const stay of kept) {
  const start = stay._start;
  const end = stay._end;

  let startTs = start?.ts ?? prevEndTs ?? end?.ts ?? null;
  stay.startTs = startTs;
  stay.start = start?.iso ?? (startTs != null ? new Date(startTs).toISOString().slice(0, 10) : null);

  if (end) {
    stay.endTs = end.ts;
    stay.end = end.iso;
    stay.ongoing = false;
  } else {
    stay.endTs = null;
    stay.end = null;
    stay.ongoing = true;
  }

  prevEndTs = end?.ts ?? startTs ?? prevEndTs;
  delete stay._start;
  delete stay._end;
}

// Sort chronologically by resolved start.
kept.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));

// Timeline bounds: earliest start .. latest known end (or latest start).
const minTs = Math.min(...kept.map((s) => s.startTs));
const maxTs = Math.max(...kept.map((s) => s.endTs ?? s.startTs));

const out = {
  generatedAt: new Date().toISOString(),
  minTs,
  maxTs,
  stays: kept,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(
  `travels: kept ${kept.length} public stays, skipped ${skipped} ` +
    `(${reasons.private} private, ${reasons.invalid} invalid/blank)`
);
console.log(
  `range ${new Date(minTs).toISOString().slice(0, 10)} .. ${new Date(maxTs)
    .toISOString()
    .slice(0, 10)}  ->  ${OUT.replace(resolve(__dirname, '..') + '/', '')}`
);
