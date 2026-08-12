/* Crowdfunding Watch — shared module: platforms, i18n, formatters, data
   loading and SVG chart rendering. Used by home.js and platform.js. */
'use strict';

const PLATFORMS = [
  { id: 'wefunder', label: 'Wefunder', cssVar: '--series-1', site: 'https://wefunder.com' },
  { id: 'startengine', label: 'StartEngine', cssVar: '--series-2', site: 'https://www.startengine.com' },
  { id: 'dealmaker', label: 'DealMaker', cssVar: '--series-3', site: 'https://www.dealmaker.tech' },
  { id: 'republic', label: 'Republic', cssVar: '--series-4', site: 'https://republic.com' },
];
const PLATFORM_BY_ID = Object.fromEntries(PLATFORMS.map(p => [p.id, p]));

const FORM_GROUPS = [
  { key: 'newProjects', forms: ['C'], cssVar: '--series-1' },
  { key: 'amendments', forms: ['C/A'], cssVar: '--series-2' },
  { key: 'progressUpdates', forms: ['C-U', 'C-U/A'], cssVar: '--series-3' },
  { key: 'annualReports', forms: ['C-AR', 'C-AR/A'], cssVar: '--series-4' },
  { key: 'withdrawals', forms: ['C-W', 'C-W/A', 'C-TR', 'C-TR/A'], cssVar: '--series-5' },
];
const GROUP_OF_FORM = new Map(FORM_GROUPS.flatMap(g => g.forms.map(f => [f, g.key])));

const WEEK_BUCKET_THRESHOLD = 120; // days shown per bar past this span: 7

const I18N = {
  en: {
    brand: 'Crowdfunding Watch',
    updated: 'Updated', period: 'Period:',
    range30: 'Last 30 days', range90: '90 days', range180: '6 months', rangeAll: 'Full history',
    backHome: '← All platforms', viewDetails: 'View details →', officialSite: 'official site',
    heroTitle: 'Who is winning US equity crowdfunding?',
    heroText: 'Every US Regulation-Crowdfunding campaign must file public documents with the SEC: a Form C when it launches (targets, security, financials), a Form C-U at each funding milestone (declared amount raised), a Form C-W if it withdraws. Crowdfunding Watch collects these EDGAR filings daily for the four main platforms — <strong>Wefunder, StartEngine, DealMaker and Republic</strong> — and turns them into a comparable, day-by-day picture of the market: deal flow, amounts sought, declared raises and campaign progress. Click any platform for the full drill-down.',
    marketTitle: 'Market at a glance',
    platformsTitle: 'Platforms head-to-head',
    shareTitle: 'Market share of new campaigns',
    shareNote: 'Share of new projects (Form C) filed over the period.',
    compareVolumeTitle: 'Daily filing volume by platform',
    compareVolumeNote: (from, to, weekly) => `SEC filings from ${from} to ${to}, ${weekly ? 'aggregated by week' : 'day by day'}, stacked by platform.`,
    compareNewTitle: 'New campaigns',
    compareTargetTitle: 'Amounts sought',
    compareTableTitle: 'Indicators by platform',
    compareTableNote: 'All indicators computed over the selected period. Click through for the detail behind each number.',
    thPlatformCol: 'Platform', thNew: 'New projects', thTargetSum: 'Amounts sought', thMaxSum: 'Raise ceilings',
    thRaisedSum: 'Declared raised', thCU: 'C-U updates', thWithdrawn: 'Withdrawals', thFilings: 'Filings',
    kpiNew: 'New projects', kpiNewHint: 'campaigns launched (Form C)',
    kpiTarget: 'Amounts sought', kpiTargetHint: 'sum of minimum targets',
    kpiMax: 'Raise ceilings', kpiMaxHint: 'sum of allowed maximums',
    kpiRaised: 'Declared amounts raised', kpiRaisedHint: (n) => `${n} C-U update(s)`,
    kpiFilings: 'SEC filings', kpiFilingsHint: 'all form types',
    volumeTitle: 'Daily filing volume',
    volumeNote: (from, to, weekly) => `SEC filings from ${from} to ${to}, ${weekly ? 'aggregated by week' : 'day by day'}, by filing type.`,
    amountsTitle: 'Amounts sought by new projects',
    amountsNote: 'Sum of the target amounts (Form C) filed each day. Each campaign\'s allowed maximum is often much higher.',
    amountsSeries: 'Target amounts (Form C)',
    progressTitle: 'Campaign progress',
    progressNote: 'Regulatory Form C-U updates (50 %, 100 % and closing milestones), with the declared amount raised.',
    withdrawTitle: 'Withdrawals & closures',
    withdrawNote: 'Campaigns withdrawn (Form C-W) over the period.',
    tableTitle: 'Recent projects',
    tableNote: 'Filings of the period, most recent first. Each row links to the full EDGAR record.',
    thDate: 'Date', thIssuer: 'Issuer', thForm: 'Filing', thTarget: 'Target amount',
    thMax: 'Max amount', thDeadline: 'Deadline', thSecurity: 'Security offered',
    seriesNewProjects: 'New projects (C)', seriesAmendments: 'Amendments (C/A)',
    seriesProgressUpdates: 'Progress (C-U)', seriesAnnualReports: 'Annual reports (C-AR)',
    seriesWithdrawals: 'Withdrawals (C-W)',
    raised: 'raised', filingLink: 'filing', edgarFiling: 'EDGAR filing', noFiling: 'no filing',
    noProgress: 'No progress update (Form C-U) over the period.',
    noWithdraw: 'No withdrawal (Form C-W) over the period.',
    weekOf: (d) => `Week of ${d}`,
    loadError: 'Could not load the data (data/summary.json). Serve this folder over HTTP (e.g. npx http-server .) rather than file://.',
    footer: 'Amounts raised are only public at regulatory milestones (Form C-U) — between milestones, only each platform\'s site shows the live counter. Scope: Regulation Crowdfunding offerings (Reg D/A+ deals file no Form C). Public SEC data, collected daily; this site is not affiliated with any platform or the SEC and is not investment advice.',
    securityOther: { 'Common Stock': 'Common stock', 'Preferred Stock': 'Preferred stock', 'Debt': 'Debt', 'Other': 'Other' },
    locale: 'en-US',
  },
  fr: {
    brand: 'Crowdfunding Watch',
    updated: 'Mis à jour le', period: 'Période :',
    range30: '30 derniers jours', range90: '90 jours', range180: '6 mois', rangeAll: 'Tout l\'historique',
    backHome: '← Toutes les plateformes', viewDetails: 'Voir le détail →', officialSite: 'site officiel',
    heroTitle: 'Qui gagne le marché américain de l\'equity crowdfunding ?',
    heroText: 'Toute campagne américaine de Regulation Crowdfunding doit déposer des documents publics auprès de la SEC : un Form C au lancement (objectifs, titre offert, finances), un Form C-U à chaque jalon de levée (montant levé déclaré), un Form C-W en cas de retrait. Crowdfunding Watch collecte chaque jour ces dépôts EDGAR pour les quatre grandes plateformes — <strong>Wefunder, StartEngine, DealMaker et Republic</strong> — et en tire une photographie comparable, jour par jour, du marché : flux d\'affaires, montants recherchés, levées déclarées et progression des campagnes. Cliquez sur une plateforme pour le détail complet.',
    marketTitle: 'Le marché en un coup d\'œil',
    platformsTitle: 'Les plateformes face à face',
    shareTitle: 'Parts de marché des nouvelles campagnes',
    shareNote: 'Répartition des nouveaux projets (Form C) déposés sur la période.',
    compareVolumeTitle: 'Volume quotidien de dépôts par plateforme',
    compareVolumeNote: (from, to, weekly) => `Dépôts SEC du ${from} au ${to}, ${weekly ? 'agrégés par semaine' : 'jour par jour'}, empilés par plateforme.`,
    compareNewTitle: 'Nouvelles campagnes',
    compareTargetTitle: 'Montants recherchés',
    compareTableTitle: 'Indicateurs par plateforme',
    compareTableNote: 'Tous les indicateurs sont calculés sur la période sélectionnée. Cliquez pour voir le détail derrière chaque chiffre.',
    thPlatformCol: 'Plateforme', thNew: 'Nouveaux projets', thTargetSum: 'Montants recherchés', thMaxSum: 'Plafonds de levée',
    thRaisedSum: 'Levées déclarées', thCU: 'Mises à jour C-U', thWithdrawn: 'Retraits', thFilings: 'Dépôts',
    kpiNew: 'Nouveaux projets', kpiNewHint: 'campagnes lancées (Form C)',
    kpiTarget: 'Montants recherchés', kpiTargetHint: 'somme des objectifs minimaux',
    kpiMax: 'Plafonds de levée', kpiMaxHint: 'somme des montants max autorisés',
    kpiRaised: 'Montants levés déclarés', kpiRaisedHint: (n) => `${n} mise(s) à jour C-U`,
    kpiFilings: 'Dépôts SEC', kpiFilingsHint: 'tous formulaires confondus',
    volumeTitle: 'Volume d\'activité quotidien',
    volumeNote: (from, to, weekly) => `Dépôts SEC du ${from} au ${to}, ${weekly ? 'agrégés par semaine' : 'jour par jour'}, par type de dépôt.`,
    amountsTitle: 'Montants recherchés par les nouveaux projets',
    amountsNote: 'Somme des montants cibles (Form C) déposés chaque jour. Le montant maximal autorisé de chaque campagne est souvent bien supérieur.',
    amountsSeries: 'Montants cibles (Form C)',
    progressTitle: 'Progression des campagnes',
    progressNote: 'Mises à jour réglementaires Form C-U (jalons de 50 %, 100 % et clôture), avec le montant levé déclaré.',
    withdrawTitle: 'Retraits & clôtures',
    withdrawNote: 'Campagnes retirées (Form C-W) sur la période.',
    tableTitle: 'Projets récents',
    tableNote: 'Dépôts de la période, du plus récent au plus ancien. Chaque ligne renvoie au dossier EDGAR complet.',
    thDate: 'Date', thIssuer: 'Émetteur', thForm: 'Dépôt', thTarget: 'Montant cible',
    thMax: 'Montant max', thDeadline: 'Échéance', thSecurity: 'Titre offert',
    seriesNewProjects: 'Nouveaux projets (C)', seriesAmendments: 'Amendements (C/A)',
    seriesProgressUpdates: 'Progression (C-U)', seriesAnnualReports: 'Rapports annuels (C-AR)',
    seriesWithdrawals: 'Retraits (C-W)',
    raised: 'levés', filingLink: 'dossier', edgarFiling: 'dépôt EDGAR', noFiling: 'aucun dépôt',
    noProgress: 'Aucune mise à jour de progression (Form C-U) sur la période.',
    noWithdraw: 'Aucun retrait (Form C-W) sur la période.',
    weekOf: (d) => `Semaine du ${d}`,
    loadError: 'Impossible de charger les données (data/summary.json). Servez ce dossier via un serveur HTTP (par ex. npx http-server .) plutôt qu\'en file://.',
    footer: 'Les montants levés ne sont publics qu\'aux jalons réglementaires (Form C-U) — entre deux jalons, seul le site de chaque plateforme affiche le compteur en temps réel. Périmètre : offres Regulation Crowdfunding (les offres Reg D/A+ ne déposent pas de Form C). Données publiques SEC, collecte quotidienne ; ce site n\'est affilié ni aux plateformes ni à la SEC et ne constitue pas un conseil en investissement.',
    securityOther: { 'Common Stock': 'Actions ordinaires', 'Preferred Stock': 'Actions de préférence', 'Debt': 'Dette', 'Other': 'Autre' },
    locale: 'fr-FR',
  },
};

const state = { summary: null, filings: [], rangeDays: 30, lang: 'en' };
const t = (key, ...args) => {
  const v = I18N[state.lang][key];
  return typeof v === 'function' ? v(...args) : v;
};

const $ = (sel) => document.querySelector(sel);
const cssColor = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

let fmtInt, fmtUsd, fmtDate, fmtDateShort;
function buildFormatters() {
  const loc = t('locale');
  fmtInt = new Intl.NumberFormat(loc);
  fmtUsd = new Intl.NumberFormat(loc, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  fmtDate = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  fmtDateShort = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' });
}

function usdCompact(n) {
  const loc = t('locale');
  if (n >= 1e6) return `${(n / 1e6).toLocaleString(loc, { maximumFractionDigits: 1 })} M$`;
  if (n >= 1e3) return `${(n / 1e3).toLocaleString(loc, { maximumFractionDigits: 0 })} k$`;
  return `${n.toLocaleString(loc)} $`;
}
const parseDay = (iso) => new Date(`${iso}T12:00:00Z`);

function securityLabel(f) {
  const raw = f.securityType === 'Other' && f.securityTypeOther ? f.securityTypeOther : f.securityType;
  if (!raw) return '—';
  if (/simple agreement|SAFE/i.test(raw)) return 'SAFE';
  return I18N[state.lang].securityOther[raw] || raw;
}

/* ---------- data ---------- */

async function loadData() {
  const [summary, filings] = await Promise.all([
    fetch('data/summary.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch('data/filings.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
  ]);
  state.summary = summary;
  // Registries written before multi-platform support carry no platform field.
  state.filings = filings.map(f => f.platform ? f : { ...f, platform: 'wefunder' });
}

function rangeBounds() {
  const dates = state.filings.map(f => f.fileDate);
  const last = dates.length ? dates.reduce((a, b) => a > b ? a : b) : new Date().toISOString().slice(0, 10);
  const first = dates.length ? dates.reduce((a, b) => a < b ? a : b) : last;
  if (!state.rangeDays) return { from: first, to: last };
  const d = parseDay(last);
  d.setUTCDate(d.getUTCDate() - (state.rangeDays - 1));
  const from = d.toISOString().slice(0, 10);
  return { from: from < first ? first : from, to: last };
}

const inRange = (filings, from, to) => filings.filter(f => f.fileDate >= from && f.fileDate <= to);

// Continuous zero-filled buckets over [from, to] (daily, or weekly past the
// threshold), each carrying per-form-group and per-platform counts + sums.
function buildBuckets(filings, from, to) {
  const spanDays = Math.round((parseDay(to) - parseDay(from)) / 86400e3) + 1;
  const weekly = spanDays > WEEK_BUCKET_THRESHOLD;
  const buckets = new Map();
  const keyOf = (iso) => {
    if (!weekly) return iso;
    const d = parseDay(iso);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  for (let d = parseDay(from); d <= parseDay(to); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = keyOf(d.toISOString().slice(0, 10));
    if (!buckets.has(key)) {
      const b = { date: key, targetAmountSum: 0 };
      for (const g of FORM_GROUPS) b[g.key] = 0;
      for (const p of PLATFORMS) b[p.id] = 0;
      buckets.set(key, b);
    }
  }
  for (const f of filings) {
    if (f.fileDate < from || f.fileDate > to) continue;
    const b = buckets.get(keyOf(f.fileDate));
    if (!b) continue;
    const g = GROUP_OF_FORM.get(f.form);
    if (g) b[g]++;
    b[f.platform] = (b[f.platform] || 0) + 1;
    if (f.form === 'C') b.targetAmountSum += f.offeringAmount || 0;
  }
  return { buckets: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)), weekly };
}

// Per-platform indicator pack over a period — the drill-down's source of truth.
function platformStats(filings, from, to) {
  const rows = inRange(filings, from, to);
  const isC = (f) => f.form === 'C';
  const isCU = (f) => f.form === 'C-U' || f.form === 'C-U/A';
  const isCW = (f) => f.form.startsWith('C-W') || f.form.startsWith('C-TR');
  const sum = (list, k) => list.reduce((tt, f) => tt + (f[k] || 0), 0);
  return {
    filings: rows.length,
    newProjects: rows.filter(isC).length,
    targetAmountSum: sum(rows.filter(isC), 'offeringAmount'),
    maxAmountSum: sum(rows.filter(isC), 'maximumOfferingAmount'),
    progressUpdates: rows.filter(isCU).length,
    raisedAmountSum: sum(rows.filter(isCU), 'raisedAmount'),
    withdrawals: rows.filter(isCW).length,
  };
}

/* ---------- shared UI: i18n, header, filters, KPI tiles ---------- */

function applyStaticI18n() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = I18N[state.lang][el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = I18N[state.lang][el.dataset.i18nHtml];
    if (typeof v === 'string') el.innerHTML = v; // trusted local dictionary
  });
  if (state.summary) {
    const el = $('#updated-at');
    if (el) el.textContent = `${t('updated')} ` +
      new Intl.DateTimeFormat(t('locale'), { dateStyle: 'long', timeStyle: 'short' }).format(new Date(state.summary.updatedAt));
  }
}

function initLang(onChange) {
  try {
    const saved = localStorage.getItem('cw-lang');
    if (saved === 'fr' || saved === 'en') state.lang = saved;
  } catch { /* private mode */ }
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang));
    b.addEventListener('click', () => {
      state.lang = b.dataset.lang;
      try { localStorage.setItem('cw-lang', state.lang); } catch { /* private mode */ }
      document.querySelectorAll('.lang-btn').forEach(x =>
        x.setAttribute('aria-pressed', String(x.dataset.lang === state.lang)));
      onChange();
    });
  });
}

function initRange(onChange) {
  document.querySelectorAll('.range-btn').forEach(b => {
    b.addEventListener('click', () => {
      state.rangeDays = Number(b.dataset.days);
      document.querySelectorAll('.range-btn').forEach(x =>
        x.setAttribute('aria-pressed', String(Number(x.dataset.days) === state.rangeDays)));
      onChange();
    });
  });
  document.querySelectorAll('.range-btn').forEach(b =>
    b.setAttribute('aria-pressed', String(Number(b.dataset.days) === state.rangeDays)));
}

function statTile({ label, value, hint, href }) {
  const el = document.createElement(href ? 'a' : 'div');
  el.className = 'stat-tile';
  if (href) el.href = href;
  for (const [cls, txt] of [['label', label], ['value', value], ['hint', hint]]) {
    if (txt == null) continue;
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = txt;
    el.appendChild(d);
  }
  return el;
}

/* ---------- tooltip ---------- */

function showTooltip(evt, title, rows) {
  const tooltip = $('#tooltip');
  tooltip.textContent = '';
  const tt = document.createElement('div');
  tt.className = 'tt-title';
  tt.textContent = title;
  tooltip.appendChild(tt);
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'tt-row';
    if (r.color) {
      const key = document.createElement('span');
      key.className = 'tt-key';
      key.style.borderTopColor = r.color;
      row.appendChild(key);
    }
    const val = document.createElement('span');
    val.className = 'tt-value';
    val.textContent = r.value;
    const name = document.createElement('span');
    name.className = 'tt-name';
    name.textContent = r.name;
    row.append(val, name);
    tooltip.appendChild(row);
  }
  tooltip.hidden = false;
  const pad = 12;
  const rect = tooltip.getBoundingClientRect();
  let x = (evt.clientX ?? 0) + pad, y = (evt.clientY ?? 0) + pad;
  if (evt.clientX === undefined) { // keyboard focus: anchor to the mark
    const r = evt.target.getBoundingClientRect();
    x = r.left; y = r.top - rect.height - 6;
  }
  x = Math.min(x, window.innerWidth - rect.width - 8);
  y = Math.min(y, window.innerHeight - rect.height - 8);
  tooltip.style.left = `${Math.max(4, x)}px`;
  tooltip.style.top = `${Math.max(4, y)}px`;
}
const hideTooltip = () => { $('#tooltip').hidden = true; };

/* ---------- charts (hand-rolled SVG) ---------- */

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw);
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(v);
  if (ticks.at(-1) < max) ticks.push(ticks.at(-1) + step);
  return ticks;
}

function bucketTitle(b, weekly) {
  const d = fmtDateShort.format(parseDay(b.date));
  return weekly ? t('weekOf', d) : fmtDate.format(parseDay(b.date));
}

// Vertical (possibly stacked) time-series bar chart.
function renderBarChart(svg, buckets, weekly, series, { valueFmt, tickFmt }) {
  svg.textContent = '';
  const width = Math.max(svg.parentElement.clientWidth || 640, 320);
  const H = 270, top = 22, bottom = 34, left = 46, right = 8;
  svg.setAttribute('viewBox', `0 0 ${width} ${H}`);
  const plotW = width - left - right, plotH = H - top - bottom;

  const totals = buckets.map(b => series.reduce((tt, s) => tt + b[s.key], 0));
  const ticks = niceTicks(Math.max(...totals, 0));
  const yMax = ticks.at(-1);
  const y = (v) => top + plotH * (1 - v / yMax);
  const slot = plotW / buckets.length;
  const barW = Math.min(24, Math.max(2, slot - Math.max(2, slot * 0.25)));

  for (const tick of ticks) { // recessive hairline grid + axis labels
    svg.appendChild(svgEl('line', { x1: left, x2: width - right, y1: y(tick), y2: y(tick), stroke: cssColor(tick === 0 ? '--baseline' : '--grid'), 'stroke-width': 1 }));
    const lbl = svgEl('text', { x: left - 6, y: y(tick) + 4, 'text-anchor': 'end', fill: cssColor('--text-muted'), 'font-size': 11 });
    lbl.textContent = tickFmt(tick);
    svg.appendChild(lbl);
  }

  const maxLabels = Math.floor(plotW / 64);
  const labelEvery = Math.ceil(buckets.length / maxLabels);
  const peak = totals.indexOf(Math.max(...totals));

  buckets.forEach((b, i) => {
    const x = left + i * slot + (slot - barW) / 2;
    let cursor = y(0);
    const segs = series.filter(s => b[s.key] > 0);
    segs.forEach((s, si) => {
      const h = plotH * (b[s.key] / yMax);
      const gap = si < segs.length - 1 ? 2 : 0; // 2px surface gap between stacked fills
      const segH = Math.max(h - gap, 0.5);
      const yTop = cursor - h;
      const isTop = si === segs.length - 1;
      const r = Math.min(4, segH / 2, barW / 2);
      const seg = isTop // 4px rounded data-end, square at the baseline
        ? svgEl('path', { d: `M${x},${yTop + segH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${yTop + segH} Z`, fill: cssColor(s.cssVar) })
        : svgEl('rect', { x, y: yTop, width: barW, height: segH, fill: cssColor(s.cssVar) });
      svg.appendChild(seg);
      cursor -= h;
    });
    if (i === peak && totals[i] > 0) { // selective direct label on the extreme
      const lbl = svgEl('text', { x: x + barW / 2, y: y(totals[i]) - 6, 'text-anchor': 'middle', fill: cssColor('--text-secondary'), 'font-size': 11, 'font-weight': 600 });
      lbl.textContent = valueFmt(totals[i]);
      svg.appendChild(lbl);
    }
    if (i % labelEvery === 0) {
      const lbl = svgEl('text', { x: left + i * slot + slot / 2, y: H - 12, 'text-anchor': 'middle', fill: cssColor('--text-muted'), 'font-size': 11 });
      lbl.textContent = fmtDateShort.format(parseDay(b.date));
      svg.appendChild(lbl);
    }

    // full-height transparent hit target, larger than the mark
    const hit = svgEl('rect', { x: left + i * slot, y: top, width: slot, height: plotH, fill: 'transparent', tabindex: 0, role: 'img' });
    const rows = series.filter(s => b[s.key] > 0).map(s => ({ color: cssColor(s.cssVar), value: valueFmt(b[s.key]), name: s.label }));
    const allRows = rows.length ? rows : [{ value: valueFmt(0), name: t('noFiling') }];
    hit.setAttribute('aria-label', `${bucketTitle(b, weekly)}: ${allRows.map(r => `${r.value} ${r.name}`).join(', ')}`);
    const lift = svgEl('rect', { x: left + i * slot + (slot - barW) / 2 - 2, y: top, width: barW + 4, height: plotH, fill: cssColor('--text-primary'), opacity: 0, 'pointer-events': 'none' });
    svg.insertBefore(lift, svg.firstChild);
    const show = (e) => { lift.setAttribute('opacity', 0.05); showTooltip(e, bucketTitle(b, weekly), allRows); };
    const hide = () => { lift.setAttribute('opacity', 0); hideTooltip(); };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('focus', show);
    hit.addEventListener('blur', hide);
    svg.appendChild(hit);
  });
}

// Horizontal per-entity comparison bars (one bar per platform, entity colors,
// value at the tip). Rows link to each platform's page (drill-down).
function renderHBarChart(svg, rows, { valueFmt, hrefOf }) {
  svg.textContent = '';
  const width = Math.max(svg.parentElement.clientWidth || 400, 260);
  const rowH = 34, top = 4, left = 100, right = 76;
  const H = top + rows.length * rowH + 4;
  svg.setAttribute('viewBox', `0 0 ${width} ${H}`);
  const plotW = width - left - right;
  const max = Math.max(...rows.map(r => r.value), 0) || 1;

  rows.forEach((r, i) => {
    const yMid = top + i * rowH + rowH / 2;
    const w = Math.max(plotW * (r.value / max), r.value > 0 ? 2 : 0);
    const link = svgEl('a', { href: hrefOf(r) });
    const name = svgEl('text', { x: left - 8, y: yMid + 4, 'text-anchor': 'end', fill: cssColor('--text-secondary'), 'font-size': 12, 'font-weight': 600 });
    name.textContent = r.label;
    link.appendChild(name);
    const rr = Math.min(4, 10);
    link.appendChild(svgEl('path', {
      d: w > 0
        ? `M${left},${yMid - 10} H${left + w - rr} Q${left + w},${yMid - 10} ${left + w},${yMid - 10 + rr} V${yMid + 10 - rr} Q${left + w},${yMid + 10} ${left + w - rr},${yMid + 10} H${left} Z`
        : `M${left},${yMid - 10} h0`,
      fill: cssColor(r.cssVar),
    }));
    const val = svgEl('text', { x: left + w + 8, y: yMid + 4, fill: cssColor('--text-primary'), 'font-size': 12, 'font-weight': 600 });
    val.textContent = valueFmt(r.value);
    link.appendChild(val);
    const hit = svgEl('rect', { x: 0, y: yMid - rowH / 2, width, height: rowH, fill: 'transparent' });
    hit.setAttribute('aria-label', `${r.label}: ${valueFmt(r.value)}`);
    link.appendChild(hit);
    svg.appendChild(link);
  });
}

// Single 100% stacked horizontal bar (market share) + per-segment tooltip.
function renderShareBar(svg, rows, { valueFmt }) {
  svg.textContent = '';
  const width = Math.max(svg.parentElement.clientWidth || 400, 260);
  const H = 46, barH = 22, top = 6;
  svg.setAttribute('viewBox', `0 0 ${width} ${H}`);
  const total = rows.reduce((tt, r) => tt + r.value, 0);
  if (!total) return;
  let x = 0;
  rows.forEach((r, i) => {
    const w = width * (r.value / total) - (i < rows.length - 1 ? 2 : 0); // 2px surface gap
    if (w <= 0) { x += width * (r.value / total); return; }
    const seg = svgEl('rect', { x, y: top, width: w, height: barH, rx: 3, fill: cssColor(r.cssVar), tabindex: 0 });
    const pct = (100 * r.value / total);
    const pctLabel = `${pct.toLocaleString(t('locale'), { maximumFractionDigits: 0 })} %`;
    seg.setAttribute('aria-label', `${r.label}: ${valueFmt(r.value)} (${pctLabel})`);
    const show = (e) => showTooltip(e, r.label, [{ color: cssColor(r.cssVar), value: `${valueFmt(r.value)} · ${pctLabel}`, name: '' }]);
    seg.addEventListener('pointermove', show);
    seg.addEventListener('pointerleave', hideTooltip);
    seg.addEventListener('focus', show);
    seg.addEventListener('blur', hideTooltip);
    svg.appendChild(seg);
    if (w > 46) { // % label inside only when it fits comfortably
      const lbl = svgEl('text', { x: x + w / 2, y: top + barH / 2 + 4, 'text-anchor': 'middle', fill: '#fff', 'font-size': 11, 'font-weight': 600, 'pointer-events': 'none' });
      lbl.textContent = pctLabel;
      svg.appendChild(lbl);
    }
    x += width * (r.value / total);
  });
}

function renderLegend(el, series, { hrefOf } = {}) {
  el.textContent = '';
  for (const s of series) {
    const key = document.createElement(hrefOf ? 'a' : 'span');
    key.className = 'key';
    key.setAttribute('role', 'listitem');
    if (hrefOf) key.href = hrefOf(s);
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = cssColor(s.cssVar);
    const name = document.createElement('span');
    name.textContent = s.label;
    key.append(sw, name);
    el.appendChild(key);
  }
}
