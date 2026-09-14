const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getData, getSection, saveAndPersist, replaceData } = require('./dataStore');
const { buildPptx } = require('./pptx/generate');
const { normalizeOtherFunds } = require('../../shared/otherFunds');

function validatePortfolioPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body must be a JSON object with deckSettings and sections' };
  }
  if (!Array.isArray(body.sections) || body.sections.length === 0) {
    return { error: 'sections must be a non-empty array' };
  }
  if (body.deckSettings != null && (typeof body.deckSettings !== 'object' || Array.isArray(body.deckSettings))) {
    return { error: 'deckSettings must be an object' };
  }

  const sections = [];
  for (let i = 0; i < body.sections.length; i++) {
    const section = body.sections[i];
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      return { error: `sections[${i}] must be an object` };
    }
    const id = section.id == null ? '' : String(section.id).trim();
    const label = section.label == null ? '' : String(section.label).trim();
    if (!id || !label) {
      return { error: `sections[${i}] requires id and label` };
    }
    if (!Array.isArray(section.companies)) {
      return { error: `sections[${i}].companies must be an array` };
    }
    sections.push({
      id,
      label,
      pptLabel: section.pptLabel ? String(section.pptLabel) : label.toUpperCase(),
      companies: section.companies.map((company) => (company && typeof company === 'object' ? { ...company } : company)),
    });
  }

  const src = body.deckSettings && typeof body.deckSettings === 'object' ? body.deckSettings : {};
  const deckSettings = {
    title: src.title ?? 'Portfolio Overview',
    date: src.date ?? '',
    footer: src.footer ?? 'Confidential. Not For Further Distribution.',
  };

  return { data: { deckSettings, sections } };
}

function applyOptionalCompanyFields(company, body) {
  if (!body || typeof body !== 'object') return company;
  if (Object.prototype.hasOwnProperty.call(body, 'valorId')) {
    const valorId = body.valorId;
    if (valorId == null || valorId === '') delete company.valorId;
    else company.valorId = String(valorId);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'otherFunds')) {
    const funds = normalizeOtherFunds(body.otherFunds);
    if (!funds.length) delete company.otherFunds;
    else company.otherFunds = funds;
  }
  return company;
}

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

// Bulk replace for live restructure (e.g. 7-tab cutover). Basic Auth already
// wraps /api/*. Replaces the in-memory store, then persist()s like other writes.
router.put('/data', async (req, res) => {
  const result = validatePortfolioPayload(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  await replaceData(result.data);
  res.json(getData());
});

// ─── SECTIONS ───────────────────────────────────────────────────────────────
router.post('/sections', async (req, res) => {
  const data = getData();
  const { id, label, pptLabel } = req.body || {};
  if (!id || !label) return res.status(400).json({ error: 'id and label are required' });
  if (data.sections.some((s) => s.id === id)) {
    return res.status(409).json({ error: `Section already exists: ${id}` });
  }
  const section = { id, label, pptLabel: pptLabel || label.toUpperCase(), companies: [] };
  data.sections.push(section);
  await saveAndPersist();
  res.status(201).json(section);
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
  applyOptionalCompanyFields(company, req.body);
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
  applyOptionalCompanyFields(company, req.body);
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
