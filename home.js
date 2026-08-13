/* Crowdfunding Watch — home page: market overview and platform comparison,
   with drill-down links into each platform page. Uses common.js. */
'use strict';

const pageUrl = (id, anchor) => `platform.html?p=${id}${anchor ? `#${anchor}` : ''}`;

/* ---------- cumulative declared-raises time chart (Lightweight Charts) ---------- */

let raisedTimeChart = null;

// One cumulative step-series per platform: running total of C-U declared
// amounts, day-aggregated, anchored at 0 on the first collected date.
function raisedTimeSeries() {
  const first = state.filings.reduce((a, f) => a < f.fileDate ? a : f.fileDate, '9999-12-31');
  const today = new Date().toISOString().slice(0, 10);
  return PLATFORMS.map(p => {
    const perDay = new Map();
    for (const f of state.filings) {
      if (f.platform !== p.id || !f.form.startsWith('C-U') || !f.raisedAmount) continue;
      perDay.set(f.fileDate, (perDay.get(f.fileDate) || 0) + f.raisedAmount);
    }
    let total = 0;
    const data = [{ time: first, value: 0 }];
    for (const day of [...perDay.keys()].sort()) {
      total += perDay.get(day);
      data.push({ time: day, value: total });
    }
    data.push({ time: today, value: total }); // extend the last step to today
    return { platform: p, data };
  });
}

function renderRaisedTimeChart() {
  const host = $('#raised-time-chart');
  if (raisedTimeChart) { raisedTimeChart.remove(); raisedTimeChart = null; }
  host.textContent = '';
  renderLegend($('#raised-time-legend'), PLATFORMS, { hrefOf: (s) => pageUrl(s.id, 'progress') });

  const chart = LightweightCharts.createChart(host, {
    autoSize: true,
    layout: {
      background: { color: 'transparent' },
      textColor: cssColor('--text-muted'),
      fontFamily: getComputedStyle(document.body).fontFamily,
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: cssColor('--grid') },
      horzLines: { color: cssColor('--grid') },
    },
    rightPriceScale: { borderColor: cssColor('--grid') },
    timeScale: { borderColor: cssColor('--grid') },
    localization: {
      locale: t('locale'),
      priceFormatter: (v) => usdCompact(v),
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    handleScale: { axisPressedMouseMove: true },
  });
  for (const { platform, data } of raisedTimeSeries()) {
    chart.addSeries(LightweightCharts.LineSeries, {
      color: cssColor(platform.cssVar),
      lineWidth: 2,
      lineType: LightweightCharts.LineType.WithSteps,
      title: platform.label,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    }).setData(data);
  }
  chart.timeScale().fitContent();
  raisedTimeChart = chart;
}

function renderMarketKpis(from, to) {
  const s = platformStats(state.filings, from, to);
  const host = $('#market-kpis');
  host.textContent = '';
  host.append(
    statTile({ label: t('kpiNew'), value: fmtInt.format(s.newProjects), hint: t('kpiNewHint') }),
    statTile({ label: t('kpiTarget'), value: usdCompact(s.targetAmountSum), hint: t('kpiTargetHint') }),
    statTile({ label: t('kpiMax'), value: usdCompact(s.maxAmountSum), hint: t('kpiMaxHint') }),
    statTile({ label: t('kpiRaised'), value: usdCompact(s.raisedAmountSum), hint: t('kpiRaisedHint', fmtInt.format(s.progressUpdates)) }),
    statTile({ label: t('kpiFilings'), value: fmtInt.format(s.filings), hint: t('kpiFilingsHint') }),
  );
}

function renderPlatformCards(from, to) {
  const host = $('#platform-cards');
  host.textContent = '';
  for (const p of PLATFORMS) {
    const s = platformStats(state.filings.filter(f => f.platform === p.id), from, to);
    const card = document.createElement('article');
    card.className = 'platform-card';
    card.style.setProperty('--platform-color', cssColor(p.cssVar));

    const head = document.createElement('a');
    head.className = 'platform-head';
    head.href = pageUrl(p.id);
    const dot = document.createElement('span');
    dot.className = 'platform-dot';
    const name = document.createElement('span');
    name.className = 'platform-name';
    name.textContent = p.label;
    head.append(dot, name);
    card.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'platform-mini-kpis';
    const mini = (label, value, anchor) => {
      const a = document.createElement('a');
      a.className = 'mini-kpi';
      a.href = pageUrl(p.id, anchor);
      const v = document.createElement('div');
      v.className = 'value';
      v.textContent = value;
      const l = document.createElement('div');
      l.className = 'label';
      l.textContent = label;
      a.append(v, l);
      return a;
    };
    grid.append(
      mini(t('kpiNew'), fmtInt.format(s.newProjects), 'projects'),
      mini(t('kpiTarget'), usdCompact(s.targetAmountSum), 'amounts'),
      mini(t('kpiRaised'), usdCompact(s.raisedAmountSum), 'progress'),
      mini(t('kpiFilings'), fmtInt.format(s.filings), 'volume'),
    );
    card.appendChild(grid);

    const foot = document.createElement('a');
    foot.className = 'platform-foot';
    foot.href = pageUrl(p.id);
    foot.textContent = t('viewDetails');
    card.appendChild(foot);

    host.appendChild(card);
  }
}

function renderAll() {
  buildFormatters();
  applyStaticI18n();
  const { from, to } = rangeBounds();
  renderMarketKpis(from, to);
  renderPlatformCards(from, to);

  const statsOf = (p) => platformStats(state.filings.filter(f => f.platform === p.id), from, to);
  const rows = PLATFORMS.map(p => ({ id: p.id, label: p.label, cssVar: p.cssVar, stats: statsOf(p) }));

  renderShareBar($('#share-chart'), rows.map(r => ({ ...r, value: r.stats.newProjects })),
    { valueFmt: (v) => fmtInt.format(v) });
  renderLegend($('#share-legend'), PLATFORMS, { hrefOf: (s) => pageUrl(s.id) });

  renderHBarChart($('#compare-new-chart'),
    rows.map(r => ({ ...r, value: r.stats.newProjects })).sort((a, b) => b.value - a.value),
    { valueFmt: (v) => fmtInt.format(v), hrefOf: (r) => pageUrl(r.id, 'projects') });
  renderHBarChart($('#compare-target-chart'),
    rows.map(r => ({ ...r, value: r.stats.targetAmountSum })).sort((a, b) => b.value - a.value),
    { valueFmt: usdCompact, hrefOf: (r) => pageUrl(r.id, 'amounts') });
  renderHBarChart($('#compare-raised-chart'),
    rows.map(r => ({ ...r, value: r.stats.raisedAmountSum })).sort((a, b) => b.value - a.value),
    { valueFmt: usdCompact, hrefOf: (r) => pageUrl(r.id, 'progress') });
  renderRaisedTimeChart();

  const { buckets, weekly } = buildBuckets(state.filings, from, to);
  $('#compare-volume-note').textContent =
    t('compareVolumeNote', fmtDate.format(parseDay(from)), fmtDate.format(parseDay(to)), weekly);
  const series = PLATFORMS.map(p => ({ key: p.id, label: p.label, cssVar: p.cssVar }));
  renderLegend($('#compare-volume-legend'), series, { hrefOf: (s) => pageUrl(s.key, 'volume') });
  renderBarChart($('#compare-volume-chart'), buckets, weekly, series,
    { valueFmt: (v) => fmtInt.format(v), tickFmt: (v) => fmtInt.format(v) });

  renderCompareTable(rows);
}

function renderCompareTable(rows) {
  const tbody = $('#compare-table tbody');
  tbody.textContent = '';
  for (const r of [...rows].sort((a, b) => b.stats.newProjects - a.stats.newProjects)) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    const link = document.createElement('a');
    link.className = 'platform-link';
    link.href = pageUrl(r.id);
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = cssColor(r.cssVar);
    const nm = document.createElement('span');
    nm.className = 'issuer';
    nm.textContent = r.label;
    link.append(sw, nm);
    tdName.appendChild(link);
    tr.appendChild(tdName);

    const cells = [
      [fmtInt.format(r.stats.newProjects), 'projects'],
      [usdCompact(r.stats.targetAmountSum), 'amounts'],
      [usdCompact(r.stats.maxAmountSum), 'amounts'],
      [usdCompact(r.stats.raisedAmountSum), 'progress'],
      [fmtInt.format(r.stats.progressUpdates), 'progress'],
      [fmtInt.format(r.stats.withdrawals), 'withdrawals'],
      [fmtInt.format(r.stats.filings), 'volume'],
    ];
    for (const [txt, anchor] of cells) {
      const td = document.createElement('td');
      td.className = 'num';
      const a = document.createElement('a');
      a.href = pageUrl(r.id, anchor);
      a.textContent = txt;
      td.appendChild(a);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
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
