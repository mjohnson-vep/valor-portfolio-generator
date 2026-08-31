const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getData, getSection, saveAndPersist } = require('./dataStore');
const { buildPptx } = require('./pptx/generate');

const router = express.Router();

function sectionOr404(req, res) {
  const section = getSection(req.params.sectionId);
  if (!section) {
    res.status(404).json({ error: `Unknown section: ${req.params.sectionId}` });
    return null;
  }
  return section;
}

// ─── FULL DATA ──────────────────────────────────────────────────────────────
router.get('/data', (req, res) => {
  res.json(getData());
});

// ─── DECK SETTINGS ──────────────────────────────────────────────────────────
router.put('/deck-settings', async (req, res) => {
  const data = getData();
  const { title, date, footer } = req.body || {};
  if (title !== undefined) data.deckSettings.title = title;
  if (date !== undefined) data.deckSettings.date = date;
  if (footer !== undefined) data.deckSettings.footer = footer;
  await saveAndPersist();
  res.json(data.deckSettings);
});

// ─── COMPANY CRUD ───────────────────────────────────────────────────────────
router.post('/sections/:sectionId/companies', async (req, res) => {
  const section = sectionOr404(req, res);
  if (!section) return;
  const { name = '', url = '', desc = '', included = true } = req.body || {};
  const company = {
    id: `${section.id}-${uuidv4()}`,
    name,
    url,
    desc,
    included,
    order: section.companies.length,
  };
  section.companies.push(company);
  await saveAndPersist();
  res.status(201).json(company);
});

router.patch('/sections/:sectionId/companies/:companyId', async (req, res) => {
  const section = sectionOr404(req, res);
  if (!section) return;
  const company = section.companies.find((c) => c.id === req.params.companyId);
  if (!company) return res.status(404).json({ error: 'Unknown company' });
  const { name, url, desc, included } = req.body || {};
  if (name !== undefined) company.name = name;
  if (url !== undefined) company.url = url;
  if (desc !== undefined) company.desc = desc;
  if (included !== undefined) company.included = included;
  await saveAndPersist();
  res.json(company);
});

router.delete('/sections/:sectionId/companies/:companyId', async (req, res) => {
  const section = sectionOr404(req, res);
  if (!section) return;
  const idx = section.companies.findIndex((c) => c.id === req.params.companyId);
  if (idx === -1) return res.status(404).json({ error: 'Unknown company' });
  section.companies.splice(idx, 1);
  section.companies.forEach((c, i) => { c.order = i; });
  await saveAndPersist();
  res.status(204).end();
});

router.post('/sections/:sectionId/companies/:companyId/duplicate', async (req, res) => {
  const section = sectionOr404(req, res);
  if (!section) return;
  const idx = section.companies.findIndex((c) => c.id === req.params.companyId);
  if (idx === -1) return res.status(404).json({ error: 'Unknown company' });
  const original = section.companies[idx];
  const copy = { ...original, id: `${section.id}-${uuidv4()}` };
  section.companies.splice(idx + 1, 0, copy);
  section.companies.forEach((c, i) => { c.order = i; });
  await saveAndPersist();
  res.status(201).json(copy);
});

// ─── SECTION-LEVEL OPERATIONS ───────────────────────────────────────────────
router.put('/sections/:sectionId/reorder', async (req, res) => {
  const section = sectionOr404(req, res);
  if (!section) return;
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });
  const byId = new Map(section.companies.map((c) => [c.id, c]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
  // Guard against a stale/partial id list wiping out companies the client didn't know about.
  if (reordered.length !== section.companies.length) {
    return res.status(400).json({ error: 'orderedIds must include every company id in the section' });
  }
  reordered.forEach((c, i) => { c.order = i; });
  section.companies = reordered;
  await saveAndPersist();
  res.json(section);
});

router.put('/sections/:sectionId/toggle-all', async (req, res) => {
  const section = sectionOr404(req, res);
  if (!section) return;
  const { included } = req.body || {};
  section.companies.forEach((c) => { c.included = !!included; });
  await saveAndPersist();
  res.json(section);
});

router.post('/sections/:sectionId/sort', async (req, res) => {
  const section = sectionOr404(req, res);
  if (!section) return;
  section.companies.sort((a, b) => a.name.localeCompare(b.name));
  section.companies.forEach((c, i) => { c.order = i; });
  await saveAndPersist();
  res.json(section);
});

router.post('/sections/:sectionId/import', async (req, res) => {
  const section = sectionOr404(req, res);
  if (!section) return;
  const { csv = '' } = req.body || {};
  const lines = String(csv).split('\n').map((l) => l.trim()).filter(Boolean);
  let added = 0;
  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;
    const nameLow = parts[0].toLowerCase();
    if (nameLow === 'name' || nameLow === 'company' || nameLow === 'company name') continue;
    const [name, url, ...descParts] = parts;
    const desc = descParts.join(', ').trim();
    if (name) {
      section.companies.push({
        id: `${section.id}-${uuidv4()}`,
        name: name.toUpperCase(),
        url: url || '',
        desc: desc || '',
        included: true,
        order: section.companies.length,
      });
      added++;
    }
  }
  await saveAndPersist();
  res.json({ added, section });
});

// ─── PPTX GENERATION ────────────────────────────────────────────────────────
router.post('/generate-pptx', async (req, res) => {
  try {
    const data = getData();
    const overrides = req.body || {};
    const settings = {
      title: overrides.title || data.deckSettings.title,
      date: overrides.date || data.deckSettings.date,
      footer: overrides.footer || data.deckSettings.footer,
    };
    const buffer = await buildPptx(data.sections, settings);
    const filename = `Valor_Portfolio_Overview_${(settings.date || 'Deck').replace(/\s+/g, '_')}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('PPTX generation failed:', err);
    res.status(500).json({ error: 'Failed to generate PPTX' });
  }
});

module.exports = router;
