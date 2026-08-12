/* Crowdfunding Watch — per-platform page (?p=wefunder|startengine|dealmaker|republic).
   Drill-down target of the home page; section anchors: #volume, #amounts,
   #progress, #withdrawals, #projects. Uses common.js. */
'use strict';

const params = new URLSearchParams(location.search);
const platform = PLATFORM_BY_ID[params.get('p')] || PLATFORMS[0];

const myFilings = () => state.filings.filter(f => f.platform === platform.id);

function renderKpis(from, to) {
  const s = platformStats(myFilings(), from, to);
  const host = $('#kpi-row');
  host.textContent = '';
  host.append(
    statTile({ label: t('kpiNew'), value: fmtInt.format(s.newProjects), hint: t('kpiNewHint'), href: '#projects' }),
    statTile({ label: t('kpiTarget'), value: usdCompact(s.targetAmountSum), hint: t('kpiTargetHint'), href: '#amounts' }),
    statTile({ label: t('kpiMax'), value: usdCompact(s.maxAmountSum), hint: t('kpiMaxHint'), href: '#amounts' }),
    statTile({ label: t('kpiRaised'), value: usdCompact(s.raisedAmountSum), hint: t('kpiRaisedHint', fmtInt.format(s.progressUpdates)), href: '#progress' }),
    statTile({ label: t('kpiFilings'), value: fmtInt.format(s.filings), hint: t('kpiFilingsHint'), href: '#volume' }),
  );
}

function feedItem({ date, main, amount, detail, url }) {
  const li = document.createElement('li');
  const d = document.createElement('div');
  d.className = 'date';
  d.textContent = fmtDate.format(parseDay(date));
  const line = document.createElement('div');
  const strong = document.createElement('span');
  strong.className = 'issuer';
  strong.textContent = main;
  line.appendChild(strong);
  if (amount != null) {
    line.append(' — ');
    const a = document.createElement('span');
    a.className = 'amount';
    a.textContent = fmtUsd.format(amount);
    line.appendChild(a);
    line.append(` ${t('raised')}`);
  }
  li.append(d, line);
  if (detail) {
    const p = document.createElement('div');
    p.className = 'date';
    p.textContent = detail.length > 180 ? `${detail.slice(0, 180)}…` : detail;
    li.appendChild(p);
  }
  if (url) {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    a.textContent = t('edgarFiling');
    li.append(' ', a);
  }
  return li;
}

function renderFeeds(filings, from, to) {
  const rows = inRange(filings, from, to);
  const progress = $('#progress-feed');
  progress.textContent = '';
  const updates = rows.filter(f => f.form.startsWith('C-U')).sort((a, b) => b.fileDate.localeCompare(a.fileDate));
  for (const f of updates.slice(0, 12)) {
    progress.appendChild(feedItem({
      date: f.fileDate, main: f.issuerName || '—',
      amount: f.raisedAmount, detail: f.progressUpdate, url: f.edgarUrl,
    }));
  }
  if (!updates.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = t('noProgress');
    progress.appendChild(li);
  }

  const wd = $('#withdrawal-feed');
  wd.textContent = '';
  const withdrawals = rows.filter(f => f.form.startsWith('C-W') || f.form.startsWith('C-TR'))
    .sort((a, b) => b.fileDate.localeCompare(a.fileDate));
  for (const f of withdrawals.slice(0, 12)) {
    wd.appendChild(feedItem({ date: f.fileDate, main: f.issuerName || '—', url: f.edgarUrl }));
  }
  if (!withdrawals.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = t('noWithdraw');
    wd.appendChild(li);
  }
}

function renderTable(filings, from, to) {
  const tbody = $('#filings-table tbody');
  tbody.textContent = '';
  const rows = inRange(filings, from, to)
    .sort((a, b) => b.fileDate.localeCompare(a.fileDate)).slice(0, 200);
  for (const f of rows) {
    const tr = document.createElement('tr');
    const isOffering = f.form === 'C' || f.form === 'C/A';
    const cells = [
      fmtDate.format(parseDay(f.fileDate)),
      f.issuerName || '—',
      f.form,
      isOffering && f.offeringAmount != null ? fmtUsd.format(f.offeringAmount) : '—',
      isOffering && f.maximumOfferingAmount != null ? fmtUsd.format(f.maximumOfferingAmount) : '—',
      f.deadlineDate ? fmtDate.format(parseDay(f.deadlineDate)) : '—',
      securityLabel(f),
    ];
    cells.forEach((txt, i) => {
      const td = document.createElement('td');
      if (i === 1) {
        const span = document.createElement('span');
        span.className = 'issuer';
        span.textContent = txt;
        td.appendChild(span);
      } else if (i === 2) {
        const pill = document.createElement('span');
        pill.className = 'form-pill';
        pill.textContent = txt;
        td.appendChild(pill);
      } else {
        td.textContent = txt;
        if (i === 3 || i === 4) td.className = 'num';
      }
      tr.appendChild(td);
    });
    const tdLink = document.createElement('td');
    const a = document.createElement('a');
    a.href = f.edgarUrl;
    a.rel = 'noopener';
    a.textContent = t('filingLink');
    tdLink.appendChild(a);
    tr.appendChild(tdLink);
    tbody.appendChild(tr);
  }
}

function renderAll() {
  buildFormatters();
  applyStaticI18n();
  document.title = `${platform.label} — Crowdfunding Watch`;
  $('#platform-name').textContent = platform.label;
  $('#platform-dot').style.background = cssColor(platform.cssVar);
  const sub = $('#platform-sub');
  sub.textContent = '';
  const a = document.createElement('a');
  a.href = platform.site;
  a.rel = 'noopener';
  a.textContent = t('officialSite');
  sub.append(`${platform.site.replace(/^https?:\/\/(www\.)?/, '')} · `, a);

  const filings = myFilings();
  const { from, to } = rangeBounds();
  const { buckets, weekly } = buildBuckets(filings, from, to);

  renderKpis(from, to);

  const series = FORM_GROUPS.map(g => ({
    key: g.key,
    label: t(`series${g.key[0].toUpperCase()}${g.key.slice(1)}`),
    cssVar: g.cssVar,
  }));
  $('#volume-note').textContent =
    t('volumeNote', fmtDate.format(parseDay(from)), fmtDate.format(parseDay(to)), weekly);
  renderLegend($('#volume-legend'), series);
  renderBarChart($('#volume-chart'), buckets, weekly, series,
    { valueFmt: (v) => fmtInt.format(v), tickFmt: (v) => fmtInt.format(v) });

  renderBarChart($('#amounts-chart'), buckets, weekly,
    [{ key: 'targetAmountSum', label: t('amountsSeries'), cssVar: platform.cssVar }],
    { valueFmt: usdCompact, tickFmt: usdCompact });

  renderFeeds(filings, from, to);
  renderTable(filings, from, to);
}

async function init() {
  initLang(renderAll);
  try {
    await loadData();
  } catch {
    buildFormatters();
    applyStaticI18n();
    $('#load-error').hidden = false;
    return;
  }
  initRange(renderAll);
  renderAll();

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 150);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderAll);
}

init();
