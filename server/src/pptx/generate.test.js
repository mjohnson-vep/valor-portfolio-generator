'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { buildPptx, MULTI_FUND_LEGEND } = require('./generate');
const { formatOtherFundsLine } = require('../../../shared/otherFunds');

const FIXTURE_COMPANY = {
  id: 'growth-platform-001-acme',
  name: 'ACME',
  url: 'acme.com',
  desc: 'Building industrial widgets for mid-market manufacturers.',
  included: true,
  order: 0,
  valorId: 'valor-acme-fixture',
  otherFunds: ['VSV – Core', 'VAAI – Core'],
};

const SOLO_COMPANY = {
  id: 'growth-platform-002-soloco',
  name: 'SOLOCO',
  url: 'solo.com',
  desc: 'Doing one thing well.',
  included: true,
  order: 1,
};

const TINY_SECTIONS = [
  {
    id: 'growth-platform',
    label: 'Growth – Platform',
    pptLabel: 'GROWTH – PLATFORM',
    companies: [FIXTURE_COMPANY, SOLO_COMPANY],
  },
  {
    id: 'seed',
    label: 'Seed',
    pptLabel: 'SEED',
    companies: [
      {
        id: 'seed-001-plain',
        name: 'PLAINSEED',
        url: 'plainseed.com',
        desc: 'A single-fund seed company.',
        included: true,
        order: 0,
      },
    ],
  },
];

function slideTexts(xml) {
  return [...xml.matchAll(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g)].map((m) =>
    m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  );
}

test('pptx: * is on the fund line and legend, not the company name', async () => {
  const buffer = await buildPptx(TINY_SECTIONS, {
    title: 'Fixture Portfolio',
    date: 'September 2026',
    footer: 'Confidential. Not For Further Distribution.',
  });

  const outPath = path.join('/tmp', 'valor-otherfunds-fixture.pptx');
  fs.writeFileSync(outPath, buffer);

  const zip = await JSZip.loadAsync(buffer);
  const slide2 = await zip.file('ppt/slides/slide2.xml').async('string');
  const texts = slideTexts(slide2);
  const fundsLine = formatOtherFundsLine(FIXTURE_COMPANY.otherFunds);

  assert.ok(texts.includes('ACME'), `expected clean name ACME in ${JSON.stringify(texts)}`);
  assert.ok(!texts.some((t) => /ACME\s*\*/.test(t)), `name must not carry *: ${JSON.stringify(texts)}`);
  assert.ok(texts.includes(fundsLine), `expected fund line ${fundsLine} in ${JSON.stringify(texts)}`);
  assert.ok(texts.includes(MULTI_FUND_LEGEND), `expected footer legend in ${JSON.stringify(texts)}`);
  assert.ok(!texts.some((t) => t.includes('Also in:')), 'no Also in: wording');
  assert.ok(texts.includes('SOLOCO'));
  assert.ok(!texts.some((t) => t.includes('SOLOCO') && t.includes('*')));

  const slide3 = await zip.file('ppt/slides/slide3.xml').async('string');
  const seedTexts = slideTexts(slide3);
  assert.ok(seedTexts.includes('PLAINSEED'));
  assert.ok(
    !seedTexts.includes(MULTI_FUND_LEGEND),
    'section slides without otherFunds must omit the legend'
  );
  assert.ok(!seedTexts.includes('* VSV'), 'single-fund card must not grow a fund line');
});

test('pptx: companies without valorId/otherFunds still generate', async () => {
  const buffer = await buildPptx(
    [
      {
        id: 'legacy',
        label: 'Growth – Valor & VSV',
        pptLabel: 'GROWTH COMPANIES – VALOR & VSV',
        companies: [
          {
            id: 'legacy-001',
            name: 'LEGACYCO',
            url: 'legacy.com',
            desc: 'Existing company with no new fields.',
            included: true,
            order: 0,
          },
        ],
      },
    ],
    { title: 'Legacy', date: 'September 2026' }
  );
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('ppt/slides/slide2.xml').async('string');
  const texts = slideTexts(xml);
  assert.ok(texts.includes('LEGACYCO'));
  assert.ok(!texts.includes(MULTI_FUND_LEGEND));
});
