// ES-1 / ES-2 — Form C XML parser and raised-amount extraction
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { parseFormC, extractRaisedAmount, decodeEntities } = require('../lib/parse');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

test('parses a real Form C (new offering)', () => {
  const doc = parseFormC(fixture('form-c-boxsy.xml'));
  assert.strictEqual(doc.submissionType, 'C');
  assert.strictEqual(doc.issuerName, 'Boxsy Inc.');
  assert.strictEqual(doc.portalName, 'Wefunder Portal LLC');
  assert.strictEqual(doc.offeringAmount, 50000);
  assert.strictEqual(doc.maximumOfferingAmount, 124000);
  assert.strictEqual(doc.deadlineDate, '2027-04-30');
  assert.strictEqual(doc.issuerWebsite, 'https://www.boxsy.io');
  assert.strictEqual(doc.issuerCity, 'Austin');
  assert.strictEqual(doc.issuerState, 'TX');
  assert.strictEqual(doc.securityType, 'Other');
  assert.strictEqual(doc.price, 1);
  assert.strictEqual(doc.revenueMostRecent, 4238);
  assert.strictEqual(doc.netIncomeMostRecent, -156334);
});

test('parses a real Form C-U (progress update) with raised amount', () => {
  const doc = parseFormC(fixture('form-cu-ysmd.xml'));
  assert.strictEqual(doc.submissionType, 'C-U');
  assert.strictEqual(doc.issuerName, 'YSMD, LLC');
  assert.match(doc.progressUpdate, /186,172/);
  assert.strictEqual(doc.raisedAmount, 186172);
});

test('missing fields yield null, not exceptions', () => {
  const doc = parseFormC('<edgarSubmission><formData></formData></edgarSubmission>');
  assert.strictEqual(doc.issuerName, null);
  assert.strictEqual(doc.offeringAmount, null);
  assert.strictEqual(doc.deadlineDate, null);
  assert.strictEqual(doc.raisedAmount, null);
});

test('decodes XML entities in text fields', () => {
  assert.strictEqual(decodeEntities('Tom &amp; Jerry &lt;p&gt; &#39;quote&#39; &quot;q&quot;'),
    'Tom & Jerry <p> \'quote\' "q"');
});

test('extractRaisedAmount: plain milestone sentence', () => {
  assert.strictEqual(extractRaisedAmount('The final number is $186,172.00 in investments.'), 186172);
});

test('extractRaisedAmount: picks the largest of several amounts', () => {
  assert.strictEqual(
    extractRaisedAmount('Raised $50,000 of our $1,200,000.50 maximum'), 1200000.5);
});

test('extractRaisedAmount: no amount gives null', () => {
  assert.strictEqual(extractRaisedAmount('We reached 50% of our target'), null);
  assert.strictEqual(extractRaisedAmount(''), null);
  assert.strictEqual(extractRaisedAmount(null), null);
});
