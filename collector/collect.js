#!/usr/bin/env node
// Wefunder Watch collector — pulls Wefunder Portal LLC filings from SEC EDGAR
// full-text search, merges them into data/filings.json and rebuilds
// data/summary.json. Zero npm dependency (Node >= 20).
//
// Usage:
//   node collect.js                     # last 7 days (catch-up friendly)
//   node collect.js --from 2026-07-01 --to 2026-08-12   # backfill a range
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFormC } = require('./lib/parse');
const { buildSummary } = require('./lib/aggregate');
const { PORTALS, searchUrl, primaryDocUrl, filingIndexUrl, mergeFilings, dailyIndexUrl, parseFormIdx } = require('./lib/edgar');

// SEC fair-access policy: identify yourself, stay well under 10 req/s.
const USER_AGENT = 'philo-wefunder-watch/1.0 (dtampe@gmail.com)';
const THROTTLE_MS = 350;
const PAGE_SIZE = 10; // EDGAR FTS fixed page size
const MAX_OFFSET = 9990; // FTS refuses deeper pagination

const DATA_DIR = path.join(__dirname, '..', 'data');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, { asJson = false } = {}) {
  let delay = 2000;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return asJson ? res.json() : res.text();
    if (attempt >= 4 || (res.status < 500 && res.status !== 429)) {
      throw new Error(`GET ${url} -> HTTP ${res.status}`);
    }
    console.error(`  HTTP ${res.status}, retry in ${delay / 1000}s`);
    await sleep(delay);
    delay *= 2;
  }
}

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') args.from = argv[++i];
    else if (argv[i] === '--to') args.to = argv[++i];
    else if (argv[i] === '--refresh') args.refresh = true;
  }
  const today = new Date();
  if (!args.to) args.to = isoDay(today);
  if (!args.from) args.from = isoDay(new Date(today.getTime() - 7 * 86400e3));
  for (const k of ['from', 'to']) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args[k])) {
      console.error(`Invalid --${k} date: ${args[k]} (expected YYYY-MM-DD)`);
      process.exit(1);
    }
  }
  return args;
}

// One FTS hit per document; several documents share one filing (adsh).
async function searchFilings(portal, from, to) {
  const found = new Map(); // adsh -> {adsh, cik, form, fileDate, platform}
  let offset = 0, total = Infinity;
  while (offset < total && offset <= MAX_OFFSET) {
    const data = await fetchWithRetry(searchUrl({ query: portal.query, from, to, offset }), { asJson: true });
    total = data.hits.total.value;
    for (const hit of data.hits.hits) {
      const s = hit._source;
      if (!found.has(s.adsh)) {
        found.set(s.adsh, {
          adsh: s.adsh,
          cik: s.ciks[s.ciks.length - 1],
          form: s.form,
          fileDate: s.file_date,
          displayName: (s.display_names && s.display_names[0]) || null,
          platform: portal.id,
        });
      }
    }
    offset += PAGE_SIZE;
    if (data.hits.hits.length === 0) break;
    await sleep(THROTTLE_MS);
  }
  if (total > MAX_OFFSET) {
    console.error(`WARNING: ${total} documents match but FTS pagination stops at ${MAX_OFFSET}; ` +
      'split the range into smaller --from/--to windows.');
  }
  return [...found.values()];
}

// C-W (withdrawals) never mention the portal, and some C-U/C-AR don't either,
// so full-text search misses them. Sweep the daily form indexes and keep the
// C-family filings of issuers already known to be Wefunder campaigns.
async function sweepDailyIndexes(from, to, cikPlatform) {
  const hits = [];
  for (let d = new Date(`${from}T12:00:00Z`); d <= new Date(`${to}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = (d.getUTCDay() + 6) % 7;
    if (day >= 5) continue; // no index on weekends
    const iso = d.toISOString().slice(0, 10);
    await sleep(THROTTLE_MS);
    let text;
    try {
      text = await fetchWithRetry(dailyIndexUrl(iso));
    } catch { continue; } // holidays and very recent days 404
    for (const row of parseFormIdx(text)) {
      const platform = cikPlatform.get(row.cik);
      if (platform) hits.push({ ...row, displayName: null, platform, fromSweep: true });
    }
  }
  return hits;
}

// Registry entries written before multi-platform support carry no platform
// field; recover it from the stored intermediary name.
function platformOf(f) {
  if (f.platform) return f.platform;
  const p = PORTALS.find(p => p.match.test(f.portalName || ''));
  return p ? p.id : 'wefunder';
}

function loadRegistry(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Collecting Wefunder filings from ${args.from} to ${args.to}`);

  const filingsFile = path.join(DATA_DIR, 'filings.json');
  const registry = loadRegistry(filingsFile).map(f => ({ ...f, platform: platformOf(f) }));
  const known = new Set(registry.map(f => f.adsh));

  const hits = [];
  const seen = new Set();
  for (const portal of PORTALS) {
    const portalHits = await searchFilings(portal, args.from, args.to);
    console.log(`  ${portal.label}: ${portalHits.length} filings via full-text search`);
    for (const h of portalHits) if (!seen.has(h.adsh)) { hits.push(h); seen.add(h.adsh); }
    await sleep(THROTTLE_MS);
  }
  const cikPlatform = new Map([...registry, ...hits].map(f => [String(Number(f.cik)), f.platform]));
  const sweepHits = await sweepDailyIndexes(args.from, args.to, cikPlatform);
  for (const h of sweepHits) if (!seen.has(h.adsh)) { hits.push(h); seen.add(h.adsh); }
  console.log(`${hits.length} filings in range (${sweepHits.length} via daily-index sweep), ` +
    `${registry.length} already in registry`);

  const portalById = Object.fromEntries(PORTALS.map(p => [p.id, p]));
  const enriched = [];
  let skippedOtherPortal = 0;
  for (const hit of hits) {
    if (known.has(hit.adsh) && !args.refresh) continue;
    await sleep(THROTTLE_MS);
    let doc;
    try {
      doc = parseFormC(await fetchWithRetry(primaryDocUrl(hit.cik, hit.adsh)));
    } catch (e) {
      console.error(`  skip ${hit.adsh} (${hit.displayName}): ${e.message}`);
      continue;
    }
    // FTS matches full text; keep only filings truly intermediated by the platform.
    // Sweep hits are already scoped by issuer CIK (their XML often has no portal field).
    if (!hit.fromSweep && !portalById[hit.platform].match.test(doc.portalName || '')) { skippedOtherPortal++; continue; }
    const { progressUpdate, ...fields } = doc;
    enriched.push({
      adsh: hit.adsh,
      cik: String(Number(hit.cik)),
      platform: hit.platform,
      form: doc.submissionType || hit.form,
      fileDate: hit.fileDate,
      edgarUrl: filingIndexUrl(hit.cik, hit.adsh),
      ...fields,
      progressUpdate: progressUpdate ? progressUpdate.slice(0, 500) : null,
    });
    console.log(`  + ${hit.fileDate} [${hit.platform}] ${doc.submissionType || hit.form}  ${doc.issuerName || hit.displayName}`);
  }
  if (skippedOtherPortal) console.log(`${skippedOtherPortal} filings skipped (other portal)`);

  const merged = mergeFilings(registry, enriched);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filingsFile, JSON.stringify(merged, null, 1) + '\n');

  const platforms = { all: buildSummary(merged) };
  for (const p of PORTALS) platforms[p.id] = buildSummary(merged.filter(f => f.platform === p.id));
  const summary = { updatedAt: new Date().toISOString(), platforms };
  fs.writeFileSync(path.join(DATA_DIR, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');

  console.log(`Registry: ${merged.length} filings (${enriched.length} new/refreshed). Summary rebuilt.`);
}

main().catch(e => { console.error(e); process.exit(1); });
