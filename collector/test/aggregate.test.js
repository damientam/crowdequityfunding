// ES-3 — daily aggregation of the filings registry
const { test } = require('node:test');
const assert = require('node:assert');

const { buildSummary } = require('../lib/aggregate');

const F = (over) => Object.assign({
  adsh: '0000000000-26-000001', cik: '1', fileDate: '2026-08-01',
  form: 'C', issuerName: 'X', offeringAmount: null, maximumOfferingAmount: null,
  raisedAmount: null,
}, over);

const sample = [
  F({ adsh: 'a1', form: 'C', fileDate: '2026-08-01', offeringAmount: 50000, maximumOfferingAmount: 100000 }),
  F({ adsh: 'a2', form: 'C', fileDate: '2026-08-01', offeringAmount: 75000, maximumOfferingAmount: 200000 }),
  F({ adsh: 'a3', form: 'C/A', fileDate: '2026-08-01', offeringAmount: 50000 }),
  F({ adsh: 'a4', form: 'C-U', fileDate: '2026-08-03', raisedAmount: 186172 }),
  F({ adsh: 'a5', form: 'C-W', fileDate: '2026-08-03' }),
  F({ adsh: 'a6', form: 'C-AR', fileDate: '2026-08-03' }),
];

test('counts and sums per day', () => {
  const s = buildSummary(sample);
  const d1 = s.days.find(d => d.date === '2026-08-01');
  assert.strictEqual(d1.newProjects, 2);
  assert.strictEqual(d1.amendments, 1);
  assert.strictEqual(d1.progressUpdates, 0);
  assert.strictEqual(d1.withdrawals, 0);
  assert.strictEqual(d1.targetAmountSum, 125000);
  assert.strictEqual(d1.maxAmountSum, 300000);
  assert.strictEqual(d1.filings, 3);

  const d3 = s.days.find(d => d.date === '2026-08-03');
  assert.strictEqual(d3.newProjects, 0);
  assert.strictEqual(d3.progressUpdates, 1);
  assert.strictEqual(d3.withdrawals, 1);
  assert.strictEqual(d3.annualReports, 1);
  assert.strictEqual(d3.raisedAmountSum, 186172);
});

test('a day without filings does not appear, days are sorted', () => {
  const s = buildSummary(sample);
  assert.deepStrictEqual(s.days.map(d => d.date), ['2026-08-01', '2026-08-03']);
});

test('grand totals are correct', () => {
  const s = buildSummary(sample);
  assert.strictEqual(s.totals.filings, 6);
  assert.strictEqual(s.totals.newProjects, 2);
  assert.strictEqual(s.totals.targetAmountSum, 125000);
  assert.strictEqual(s.totals.raisedAmountSum, 186172);
});

test('empty registry gives empty summary', () => {
  const s = buildSummary([]);
  assert.deepStrictEqual(s.days, []);
  assert.strictEqual(s.totals.filings, 0);
});
