// Parser for SEC Form C family XML documents (primary_doc.xml).
// Regex-based on purpose: the documents are small, machine-generated,
// and we avoid any npm dependency.
'use strict';

function decodeEntities(str) {
  if (str == null) return str;
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// First occurrence of <tag>...</tag>, namespace-prefix tolerant. Null if absent/empty.
function tag(xml, name) {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`));
  if (!m) return null;
  const v = decodeEntities(m[1].trim());
  return v === '' ? null : v;
}

function num(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// EDGAR dates are MM-DD-YYYY; normalize to ISO YYYY-MM-DD.
function isoDate(v) {
  if (v == null) return null;
  const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : v;
}

// Largest dollar amount found in free text, e.g. "The final number is $186,172.00".
function extractRaisedAmount(text) {
  if (!text) return null;
  const matches = [...text.matchAll(/\$\s?([\d,]+(?:\.\d+)?)/g)]
    .map(m => Number(m[1].replace(/,/g, '')))
    .filter(Number.isFinite);
  return matches.length ? Math.max(...matches) : null;
}

function parseFormC(xml) {
  const progressUpdate = tag(xml, 'progressUpdate');
  return {
    submissionType: tag(xml, 'submissionType'),
    issuerName: tag(xml, 'nameOfIssuer'),
    issuerWebsite: tag(xml, 'issuerWebsite'),
    issuerCity: tag(xml, 'city'),
    issuerState: tag(xml, 'stateOrCountry'),
    jurisdiction: tag(xml, 'jurisdictionOrganization'),
    portalName: tag(xml, 'companyName'),
    securityType: tag(xml, 'securityOfferedType'),
    securityTypeOther: tag(xml, 'securityOfferedOtherDesc'),
    price: num(tag(xml, 'price')),
    offeringAmount: num(tag(xml, 'offeringAmount')),
    maximumOfferingAmount: num(tag(xml, 'maximumOfferingAmount')),
    deadlineDate: isoDate(tag(xml, 'deadlineDate')),
    oversubscriptionAccepted: tag(xml, 'overSubscriptionAccepted'),
    currentEmployees: num(tag(xml, 'currentEmployees')),
    revenueMostRecent: num(tag(xml, 'revenueMostRecentFiscalYear')),
    netIncomeMostRecent: num(tag(xml, 'netIncomeMostRecentFiscalYear')),
    progressUpdate,
    raisedAmount: extractRaisedAmount(progressUpdate),
  };
}

module.exports = { parseFormC, extractRaisedAmount, decodeEntities };
