// ES-4 — EDGAR URL building and idempotent registry merge
const { test } = require('node:test');
const assert = require('node:assert');

const { PORTALS, searchUrl, primaryDocUrl, filingIndexUrl, mergeFilings,
  dailyIndexUrl, parseFormIdx } = require('../lib/edgar');

test('tracks the four platforms and confirms intermediary names', () => {
  assert.deepStrictEqual(PORTALS.map(p => p.id), ['wefunder', 'startengine', 'dealmaker', 'republic']);
  const byId = Object.fromEntries(PORTALS.map(p => [p.id, p]));
  assert.match('Wefunder Portal LLC', byId.wefunder.match);
  assert.match('StartEngine Capital LLC', byId.startengine.match);
  assert.match('StartEngine Primary, LLC', byId.startengine.match);
  assert.match('DealMaker Securities LLC', byId.dealmaker.match);
  assert.match('OpenDeal Portal LLC', byId.republic.match);
  assert.doesNotMatch('Wefunder Portal LLC', byId.republic.match);
});

test('builds a dated, paginated full-text-search URL', () => {
  const u = new URL(searchUrl({ query: '"Wefunder Portal"', from: '2026-08-01', to: '2026-08-12', offset: 20 }));
  assert.strictEqual(u.hostname, 'efts.sec.gov');
  assert.strictEqual(u.searchParams.get('q'), '"Wefunder Portal"');
  assert.strictEqual(u.searchParams.get('forms'), 'C,C-U,C-AR');
  assert.strictEqual(u.searchParams.get('startdt'), '2026-08-01');
  assert.strictEqual(u.searchParams.get('enddt'), '2026-08-12');
  assert.strictEqual(u.searchParams.get('from'), '20');
});

test('builds archive URLs from cik + accession number', () => {
  assert.strictEqual(
    primaryDocUrl('0001948667', '0001948667-26-000006'),
    'https://www.sec.gov/Archives/edgar/data/1948667/000194866726000006/primary_doc.xml');
  assert.strictEqual(
    filingIndexUrl('0001948667', '0001948667-26-000006'),
    'https://www.sec.gov/Archives/edgar/data/1948667/000194866726000006/0001948667-26-000006-index.htm');
});

test('builds the daily form-index URL with the right quarter', () => {
  assert.strictEqual(dailyIndexUrl('2026-08-12'),
    'https://www.sec.gov/Archives/edgar/daily-index/2026/QTR3/form.20260812.idx');
  assert.strictEqual(dailyIndexUrl('2026-01-06'),
    'https://www.sec.gov/Archives/edgar/daily-index/2026/QTR1/form.20260106.idx');
});

test('parses real-format form.idx lines (YYYYMMDD dates, trailing spaces) into C-family filings', () => {
  const idx = [
    'Form Type        Company Name                                                  CIK         Date Filed  File Name',
    '----------------------------------------------------------------------------------------------------------------',
    '10-K             Big Corp                                                      123456      20260812    edgar/data/123456/0001234567-26-000001.txt   ',
    'C-W              Tiny Startup, Inc.                                            1948667     20260812    edgar/data/1948667/0001948667-26-000009.txt  ',
    'C-U/A            Other Startup LLC                                             999999      20260812    edgar/data/999999/0001493152-26-034360.txt   ',
  ].join('\n');
  const rows = parseFormIdx(idx);
  assert.deepStrictEqual(rows, [
    { form: 'C-W', cik: '1948667', fileDate: '2026-08-12', adsh: '0001948667-26-000009' },
    { form: 'C-U/A', cik: '999999', fileDate: '2026-08-12', adsh: '0001493152-26-034360' },
  ]);
});

test('merge is idempotent and keeps the registry sorted by date then adsh', () => {
  const a = { adsh: 'x1', fileDate: '2026-08-02', form: 'C' };
  const b = { adsh: 'x2', fileDate: '2026-08-01', form: 'C' };
  const merged = mergeFilings([a], [b, { ...a, issuerName: 'refreshed' }]);
  assert.strictEqual(merged.length, 2);
  assert.deepStrictEqual(merged.map(f => f.adsh), ['x2', 'x1']);
  assert.strictEqual(merged[1].issuerName, 'refreshed');
});
