// EDGAR full-text-search URLs, archive URLs and registry merge.
'use strict';

const FTS_BASE = 'https://efts.sec.gov/LATEST/search-index';

// Tracked platforms: `query` finds candidate filings in full-text search,
// `match` then confirms the intermediary name parsed from the filing itself
// (StartEngine has used both "StartEngine Capital LLC" and "StartEngine
// Primary, LLC"; Republic's portal entity is "OpenDeal Portal LLC").
const PORTALS = [
  { id: 'wefunder', label: 'Wefunder', query: '"Wefunder Portal"', match: /wefunder/i },
  { id: 'startengine', label: 'StartEngine', query: '"StartEngine"', match: /startengine/i },
  { id: 'dealmaker', label: 'DealMaker', query: '"DealMaker Securities"', match: /dealmaker/i },
  { id: 'republic', label: 'Republic', query: '"OpenDeal Portal"', match: /opendeal|republic/i },
];

// forms=C only covers C and C/A; C-U and C-AR are separate root forms.
// C-W / C-TR never contain the portal name, so full-text search cannot find
// them at all — they are picked up by the daily-index sweep instead.
function searchUrl({ query, from, to, offset = 0 }) {
  const u = new URL(FTS_BASE);
  u.searchParams.set('q', query);
  u.searchParams.set('forms', 'C,C-U,C-AR');
  u.searchParams.set('dateRange', 'custom');
  u.searchParams.set('startdt', from);
  u.searchParams.set('enddt', to);
  u.searchParams.set('from', String(offset));
  return u.toString();
}

function archiveDir(cik, adsh) {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${adsh.replace(/-/g, '')}`;
}

function primaryDocUrl(cik, adsh) {
  return `${archiveDir(cik, adsh)}/primary_doc.xml`;
}

function filingIndexUrl(cik, adsh) {
  return `${archiveDir(cik, adsh)}/${adsh}-index.htm`;
}

// Daily form index (one file per business day) — the complement to full-text
// search: it lists every filing of the day, so C-W/C-U/C-AR filings of issuers
// we already track can be caught even when their text never mentions Wefunder.
function dailyIndexUrl(isoDate) {
  const [y, m, d] = isoDate.split('-');
  const qtr = Math.floor((Number(m) - 1) / 3) + 1;
  return `https://www.sec.gov/Archives/edgar/daily-index/${y}/QTR${qtr}/form.${y}${m}${d}.idx`;
}

const SWEEP_FORMS = new Set(['C-U', 'C-U/A', 'C-AR', 'C-AR/A', 'C-W', 'C-W/A', 'C-TR', 'C-TR/A']);

// form.idx rows: "FORM  COMPANY  CIK  YYYYMMDD  edgar/data/CIK/ADSH.txt"
// (daily indexes use undashed dates; the accession prefix may be a filing
// agent's CIK, distinct from the issuer CIK column)
function parseFormIdx(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^(\S+)\s+.*?\s(\d+)\s+(\d{4})(\d{2})(\d{2})\s+edgar\/data\/\d+\/([\d-]+)\.txt\s*$/);
    if (m && SWEEP_FORMS.has(m[1])) {
      rows.push({ form: m[1], cik: m[2], fileDate: `${m[3]}-${m[4]}-${m[5]}`, adsh: m[6] });
    }
  }
  return rows;
}

// Dedupe by accession number; incoming entries refresh existing ones.
// Sorted by fileDate then adsh so the registry file diffs cleanly in git.
function mergeFilings(existing, incoming) {
  const byAdsh = new Map();
  for (const f of existing) byAdsh.set(f.adsh, f);
  for (const f of incoming) byAdsh.set(f.adsh, { ...byAdsh.get(f.adsh), ...f });
  return [...byAdsh.values()].sort((a, b) =>
    a.fileDate === b.fileDate ? a.adsh.localeCompare(b.adsh) : a.fileDate.localeCompare(b.fileDate));
}

module.exports = { PORTALS, searchUrl, primaryDocUrl, filingIndexUrl, mergeFilings, dailyIndexUrl, parseFormIdx };
