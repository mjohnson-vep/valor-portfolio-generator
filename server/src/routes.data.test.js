'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpg-put-data-'));
process.env.DATA_DIR = tmpDir;

delete require.cache[require.resolve('./dataStore')];
delete require.cache[require.resolve('./routes')];

const routes = require('./routes');
const { DATA_FILE } = require('./dataStore');

const SEED_FILE = path.join(__dirname, '..', 'data', 'companies.json');

function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', routes);
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function jsonReq(base, method, urlPath, body) {
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

const CUTOVER = {
  deckSettings: {
    title: 'Portfolio Overview',
    date: 'September 2026',
    footer: 'Confidential. Not For Further Distribution.',
  },
  sections: [
    {
      id: 'growth-platform',
      label: 'Growth – Platform',
      pptLabel: 'GROWTH – PLATFORM',
      companies: [
        {
          id: 'growth-platform-001-acme',
          name: 'ACME',
          url: 'acme.com',
          desc: 'Building industrial widgets.',
          included: true,
          order: 0,
          valorId: 'vos-acme',
          otherFunds: ['VSV – Core'],
        },
      ],
    },
    {
      id: 'vsv-core',
      label: 'VSV – Core',
      pptLabel: 'VSV – CORE',
      companies: [],
    },
  ],
};

test('PUT /api/data replaces the store and GET returns the saved payload', async (t) => {
  const { server, base } = await startServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const put = await jsonReq(base, 'PUT', '/api/data', CUTOVER);
  assert.equal(put.status, 200);
  assert.equal(put.json.sections.length, 2);
  assert.equal(put.json.sections[0].id, 'growth-platform');
  assert.equal(put.json.sections[0].label, 'Growth – Platform');
  assert.equal(put.json.sections[0].companies[0].name, 'ACME');
  assert.equal(put.json.sections[0].companies[0].valorId, 'vos-acme');
  assert.deepEqual(put.json.sections[0].companies[0].otherFunds, ['VSV – Core']);
  assert.equal(put.json.deckSettings.title, 'Portfolio Overview');

  const get = await jsonReq(base, 'GET', '/api/data');
  assert.equal(get.status, 200);
  assert.deepEqual(get.json, put.json);

  const onDisk = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  assert.deepEqual(onDisk, put.json);
  assert.ok(!DATA_FILE.includes('server/data/companies.json') || DATA_FILE.startsWith(tmpDir));
  assert.equal(path.resolve(DATA_FILE), path.join(tmpDir, 'companies.json'));
  assert.notEqual(path.resolve(DATA_FILE), path.resolve(SEED_FILE));
});

test('PUT /api/data returns 400 when sections is missing or empty', async (t) => {
  const { server, base } = await startServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const missing = await jsonReq(base, 'PUT', '/api/data', { deckSettings: { title: 'X' } });
  assert.equal(missing.status, 400);
  assert.match(String(missing.json.error || ''), /sections/i);

  const empty = await jsonReq(base, 'PUT', '/api/data', { deckSettings: { title: 'X' }, sections: [] });
  assert.equal(empty.status, 400);
  assert.match(String(empty.json.error || ''), /sections/i);
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
