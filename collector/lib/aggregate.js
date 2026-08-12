// Daily aggregation of the filings registry into summary.json.
'use strict';

const FORM_KEYS = {
  'C': 'newProjects',
  'C/A': 'amendments',
  'C-U': 'progressUpdates',
  'C-U/A': 'progressUpdates',
  'C-AR': 'annualReports',
  'C-AR/A': 'annualReports',
  'C-W': 'withdrawals',
  'C-W/A': 'withdrawals',
  'C-TR': 'terminations',
  'C-TR/A': 'terminations',
};

function emptyBucket(date) {
  return {
    date,
    filings: 0,
    newProjects: 0,
    amendments: 0,
    progressUpdates: 0,
    annualReports: 0,
    withdrawals: 0,
    terminations: 0,
    other: 0,
    targetAmountSum: 0,   // offeringAmount of new Form C filings
    maxAmountSum: 0,      // maximumOfferingAmount of new Form C filings
    raisedAmountSum: 0,   // amounts declared in C-U progress updates
  };
}

function buildSummary(filings) {
  const byDay = new Map();
  for (const f of filings) {
    if (!f.fileDate) continue;
    if (!byDay.has(f.fileDate)) byDay.set(f.fileDate, emptyBucket(f.fileDate));
    const d = byDay.get(f.fileDate);
    d.filings++;
    d[FORM_KEYS[f.form] || 'other']++;
    if (f.form === 'C') {
      d.targetAmountSum += f.offeringAmount || 0;
      d.maxAmountSum += f.maximumOfferingAmount || 0;
    }
    if (f.form === 'C-U' || f.form === 'C-U/A') {
      d.raisedAmountSum += f.raisedAmount || 0;
    }
  }
  const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  const totals = emptyBucket(null);
  delete totals.date;
  for (const d of days) {
    for (const k of Object.keys(totals)) totals[k] += d[k];
  }
  return { days, totals };
}

module.exports = { buildSummary };
