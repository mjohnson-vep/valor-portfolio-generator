# Valor Portfolio Generator — Handoff Context

This file is a complete project briefing for another AI assistant (or engineer) picking up
this project. It covers what the app is, how it's deployed, everything that's been fixed
or decided so far, and the exact spec for the next pending task. Read this fully before
making changes — several of the "why" notes below exist because a naive fix already broke
something once.

---

## 1. What this is

A shared internal web app for Valor Equity Partners' Rev Gen team. It replaced an older
single-file HTML tool that stored data in browser localStorage (not shared across the team).
This version:

- Lets anyone on the team view/edit the portfolio company list (name, website, description,
  included/excluded checkbox) through one shared URL, with edits saved immediately to a
  shared backend.
- Generates a branded `.pptx` portfolio overview deck from that data on demand.

## 2. Live deployment

| What | Where |
|---|---|
| Frontend (share this with the team) | https://valor-portfolio-generator.netlify.app |
| Backend API | https://valor-portfolio-generator-production.up.railway.app |
| GitHub repo | https://github.com/mjohnson-vep/valor-portfolio-generator |
| Local code | `C:\Users\mjohnson\OneDrive - Valor Management Corp\Desktop\CLAUDE\valor portfolio generator` |

**Auth:** The whole app (frontend gate + every `/api/*` route) is behind HTTP Basic Auth.
Username is hardcoded client-side as `valor`. The password is **only** in Railway's
`APP_PASSWORD` environment variable — get it from Mahal Johnson (mjohnson@valorep.com)
directly, don't ask him to paste it into a shared doc. Every API call in this doc's examples
needs an `Authorization: Basic base64(valor:<password>)` header.

**Hosting split:**
- Netlify serves the React frontend (`client/`) as a static build.
- Railway runs the Express backend (`server/`) as a long-running Node process.
- Both auto-deploy from GitHub `main` on push — no manual redeploy needed for code changes.
- **Railway gotcha:** the service's Root Directory must be set to `server` in Railway's
  dashboard. If it ever gets reset to the repo root, Railway runs the monorepo's own
  `npm start` (which launches both a Vite dev server AND the API via `concurrently`),
  causing a port mismatch and a 502. If you see a 502, check Root Directory first.
- **Data persistence gotcha:** company data lives in a file the server reads/writes
  (`server/data/companies.json` is only the seed). Railway has a Volume mounted at `/data`
  with env var `DATA_DIR=/data` so edits survive redeploys. If a redeploy ever appears to
  reset all the data back to some old state, check that the Volume and `DATA_DIR` are still
  configured on the Railway service — without them, every redeploy silently wipes live edits
  back to whatever's committed in git.

## 3. Architecture

```
client/   React + Vite. Talks to the backend via client/src/api.js (VITE_API_URL env var
          in production, Vite dev-proxy locally). All UI state flows through
          client/src/hooks/useSections.js.
server/   Express. server/src/routes.js is the whole REST API. server/src/dataStore.js
          reads/writes the JSON file (in-memory cache + debounced disk write).
          server/src/pptx/generate.js builds the .pptx with PptxGenJS + a couple of
          custom OOXML patches (server/src/pptx/fonts.js embeds Europa font files so the
          deck renders correctly without Europa installed; server/src/pptx/vmark.js draws
          the Valor "V" brand mark as a native vector shape, not a rasterized image).
```

Key files:
- `client/src/App.jsx` — top-level component, wires the password gate + main UI together.
- `client/src/hooks/useSections.js` — all data-fetching and mutation logic (add/edit/delete/
  reorder/toggle-included/sort/import-CSV), talks to the API via `client/src/api.js`.
- `client/src/components/CompanyCard.jsx` / `CompanyGrid.jsx` — the editable company rows.
- `server/src/routes.js` — every endpoint: `GET/PUT /api/data`, `POST /api/sections`,
  full CRUD under `/api/sections/:sectionId/companies/:companyId`, `/reorder`,
  `/toggle-all`, `/sort`, `/import`, and `POST /api/generate-pptx`.
- `server/src/pptx/generate.js` — the deck layout logic: title slide, then one set of
  slides per section, 4-column grid of company cards, up to `CARDS_PER` cards per slide
  (computed from slide geometry, currently works out to 16).

## 4. Current data model

```
{
  "deckSettings": { "title": string, "date": string, "footer": string },
  "sections": [
    {
      "id": string,          // e.g. "growth-valor-vsv" — used in every API URL
      "label": string,       // shown in the sidebar tab, e.g. "Growth – Valor & VSV"
      "pptLabel": string,    // shown as the slide header, e.g. "GROWTH COMPANIES – VALOR & VSV"
      "companies": [
        {
          "id": string,          // unique within its section, e.g. "growth-valor-vsv-001-aalo"
          "name": string,        // ALL CAPS by convention — never append `*`
          "url": string,         // bare domain, no protocol, e.g. "aalo.com"
          "desc": string,        // one-liner — see house style below
          "included": boolean,   // controls whether it appears in the generated deck
          "order": integer,
          "valorId": string,     // optional — vOS company id, for future reconciliation
          "otherFunds": string[] // optional — other section labels this same company
                                 // also appears in (excluding the current section)
        }
      ]
    }
  ]
}
```

Sections and companies are both fully dynamic — the frontend (tabs, stats bar) and the PPT
generator both just iterate whatever's in `sections`, so adding/renaming/restructuring
sections (including the 7-tab split in Section 8) is a **data change, not a code change**.
Companies are independent per section (duplicate rows, not linked shared records). A
multi-fund company gets its own row in each relevant section; each row may carry
`otherFunds` (the *other* section labels) so the UI and PPT can render a footnote without
re-deriving membership at render time. Frontend and PPT must tolerate companies that omit
`valorId` / `otherFunds`.

**A company only appears in the generated deck if:** `name` is non-empty, `included !== false`,
and `desc` is non-empty. (Empty description → excluded from the deck and shown with an amber
"needs description" highlight in the UI — this is computed live from the data, not a stored flag.)

**Current live sections (as of last check, 2026-09-14):**

| id | label | count |
|---|---|---|
| `growth-valor-vsv` | Growth – Valor & VSV | 162 |
| `venture-vsv` | Venture – VSV | 37 |
| `vaai-valor` | VAAI – Valor | 39 |
| `seed-valor` | Seed - Valor | 50 |

Total: 288 companies. **Seed - Valor is currently all unchecked on purpose** — Mahal wants
those included in decks adhoc, not auto-synced (see Section 7).

## 5. Brand / style rules

- Primary blue `#0042E9`, dark navy `#0031B2` (web UI) / `104999` (PPT hex, no `#`, deliberately
  a different, darker shade than the web UI's navy — don't "fix" this to match).
- Font: Europa (Regular, Bold, Light, Italic OTF files in `server/assets/fonts/` and
  `client/public/fonts/`). Only Regular/Bold/Italic are embedded in generated decks — Light
  isn't used in the deck output.
- **Company description house style** (established 2026-09-03, applied to ~140 companies):
  - No self-reference — never "The Company is a..." or "Acme (or the 'Company') offers...".
  - Start directly with a verb/gerund or descriptive noun phrase: "Developing...",
    "Building...", "Operator of...", "Platform that...". Never start with "Is a...".
  - Succinct — one sentence, no run-on qualifier clauses.
  - Always end with a period.
  - The most authoritative source for a description, in priority order: (1) the company's
    entry in the user-approved reference sheet if one was supplied (e.g.
    `Valor_Portfolio_Companies.xlsx`, already reconciled once — see Section 7), (2) vOS's
    Portfolio CRM "Company Description" field, rewritten into this style if it isn't already,
    (3) leave as-is and flag for Mahal rather than guess.

## 6. Known gotchas / lessons already learned the hard way

- **Railway Root Directory / 502s** — see Section 2.
- **Data persistence Volume** — see Section 2.
- **CORS must explicitly expose `Content-Disposition`** (`server/server.js`) or the frontend
  can't read the filename for the downloaded `.pptx` cross-origin.
- **The V-mark brand shape was originally rendering mostly off-slide.** The very first port of
  the watermark math (ported as-is from the old tool's client-side canvas-rendering code)
  placed ~70% of the shape outside the slide bounds — PowerPoint only ever showed a thin
  diagonal sliver, not a recognizable "V". Fixed 2026-09-14 in `server/src/pptx/vmark.js` —
  if you ever touch that file's positioning math again, actually open the resulting `.pptx`
  in real PowerPoint (or at minimum compute where the shape's bounding box falls relative to
  slide width/height) rather than trusting that XML validity implies correct visual placement.
- **Two different real companies can share the exact same display name** (e.g. two unrelated
  "Athena" companies existed in the app at once, one per section, different domains). Any
  automated name-matching against vOS must disambiguate by domain before assuming a match,
  or it will silently overwrite one company's data with an unrelated company's.
- **The very first data commit had a bug**: all of Growth's `included` flags got set to `true`
  during initial interactive testing before the first git commit, silently corrupting the
  seed data relative to the original tool's curated selection. It was caught and fixed by
  diffing against the untouched original source, but it's a reminder to sanity-check
  aggregate counts (e.g. "82 of 160 included") against expectations before trusting a bulk
  data operation succeeded.
- **`markitdown`/Python/`jq` are not available** in the environment this was built in — `.pptx`
  and `.xlsx` files were read by unzipping them directly (they're just zipped XML) and
  parsing with Node. If your environment has real Python/markitdown, prefer that; if not,
  this repo's git history (commits around 2026-09-03) shows working Node-based XML extraction
  for both formats.
- **vOS `search_process_tasks` results are often too large for a single tool response** and
  get saved to a file instead — you generally need to paginate via the returned `next_cursor`
  and accumulate results yourself; don't assume one call gets everything.

## 7. History of decisions (chronological)

1. **2026-09-02** — Rebuilt from the standalone HTML tool into this React+Express app.
   Extracted the original 235-company dataset faithfully (including catching that the
   original had ~16 companies with intentionally blank descriptions, pre-excluded).
2. **2026-09-02** — Added HTTP Basic Auth after initially considering an unguessable-URL-only
   approach; Mahal changed his mind before actually sharing the link with the team.
3. **2026-09-02** — Added a "Seed - Valor" section (50 companies) pulled from vOS Portfolio
   CRM where Fund(s) Invested included "Seed I". Mahal then deliberately deselected all of
   them ("we will include those adhoc") — **do not auto-sync this section's checkboxes from
   vOS Following status** unless explicitly asked to touch Seed specifically.
4. **2026-09-03** — Ran a full following/not-following reconciliation against vOS across all
   sections except Seed (see field mapping in Section 9). Fixed 78+55 stale checkbox states
   (companies whose vOS status had drifted from what the app showed, including a company
   named ATHENA appearing twice under different domains — handled correctly by disambiguating
   on domain, see gotcha above).
5. **2026-09-03** — Fixed ~140 truncated/malformatted descriptions (leftover from the original
   tool's data pull, which had a silent length cutoff). Sourced from a user-approved
   `Valor_Portfolio_Companies.xlsx` reference sheet (highest priority) and vOS's Company
   Description field (rewritten into house style) for everything not in that sheet. Added 4
   companies that were in the approved sheet but missing from the app (Emalex Biosciences,
   DustPhotonics, Good Karma Foods — all added unchecked/exited; and xAI, added as
   "SPACEXAI" per Mahal's naming update, checked).
6. **2026-09-14** — Fixed the V-mark rendering bug (Section 6).
7. **2026-09-14** — Mahal requested a significant restructuring (Section 8). Schema +
   multi-fund `*` display shipped in code; the vOS data refresh / 7-section rewrite of
   live `companies.json` is a separate parent-data push (do not rewrite production JSON
   in the display PR).

## 8. Section restructure — spec

Requested 2026-09-14. Structural decisions confirmed with Mahal — don't re-litigate them:

- **7 section tabs**, not 4 with sub-groupings: `Growth – Platform`, `Growth – Ancillary`,
  `VSV – Core`, `VSV – Placeholder`, `VAAI – Core`, `VAAI – Placeholder`, `Seed`.
  Labels are data-driven (`section.label` / `section.pptLabel`); no hardcoded tab list.
- **Companies are independent per section** — no linked/shared records. A company that
  belongs to multiple funds gets its own separate row (own id, own editable copy of
  name/url/desc/included) in each relevant section. Editing one copy does not affect another.
- **`*` placement (decided):** do **not** put `*` on the company name. Under the
  definition/description, in smaller text, list the other funds with `*` next to those
  funds, e.g. `* VSV – Core` or `* Growth – Platform · VAAI – Core`. PPT section slides
  get a footer legend: `* Additional Valor fund(s) invested`. CompanyCard uses the same
  pattern (name clean; smaller text under desc). No “Also in:” wording.

### 8.1 Data refresh from vOS

Pull fresh from vOS Portfolio CRM (`process_id: "portfolio"`, see field IDs in Section 9):

- Include companies whose Further Investment Status is **Following or Not Following only**
  (skip Exited entirely — don't even bring them in this time, unlike the September sync
  which kept exited-equivalent companies unchecked).
- Include companies whose Fund(s) Invested contains any of: Fund III/IV/V/VI/VII (→ Growth –
  Platform), Fund III/IV/V/VI/VII "(Ancillary)" (→ Growth – Ancillary), VSV I or VSV II (→
  VSV – Core), "VSV I - Placeholder" or "VSV II - Placeholder" (→ VSV – Placeholder), VAAI (→
  VAAI – Core), "VAAI - Placeholder" (→ VAAI – Placeholder), Seed I (→ Seed).
- **For this pull specifically, set `included: true` for every company regardless of
  Following/Not Following** — Mahal wants a full portfolio overview this time, not a curated
  subset. (This is a one-time exception to the normal "Not Following → unchecked" convention
  from the September sync — confirm with Mahal if a future sync should also do this, or
  revert to the old convention.)
- **Preserve existing house-style descriptions**: for any company that already exists in the
  current app data with a properly-formatted description, carry that description forward into
  its new section rather than re-pulling and re-writing it from vOS. Only pull+rewrite a fresh
  description for companies genuinely new to the app. (Mahal was told this is the plan; he
  didn't object, but wasn't asked to confirm explicitly — worth a quick double-check before
  doing a full re-derivation that would undo the September cleanup work.)
- Match "already exists in the app" by vOS `valor_id` via the optional `valorId` field
  (now on the company schema; create/patch persist it). Populate it from vOS's
  `field_values[COMPANY_FIELD_ID].company.valor_id` on every future pull so future
  reconciliation doesn't have to rely on fuzzy name/domain matching. Fall back to
  name+domain matching only for companies added manually that have no `valorId`.

### 8.2 Multi-fund duplicate handling

- Detect companies whose vOS `valor_id` appears in more than one of the 7 target
  buckets.
- Create one row per relevant section (not just one canonical row) — same name/url/desc,
  `included: true`, independent ids.
- Each such row carries `"otherFunds": ["VSV – Core"]` (array of the *other* section
  labels this same company also appears in, i.e. excluding whichever section this
  particular row lives in) so the frontend and PPT generator can both render the
  footnote without re-deriving it from a name search at render time.
- **`*` placement is decided (do not put it on the name):** under the description, smaller
  text, `*` next to the other fund labels (`* VSV – Core` or
  `* Growth – Platform · VAAI – Core`). Implemented in `client/src/components/CompanyCard.jsx`
  (list row) and `server/src/pptx/generate.js`'s `addCard()` (PPT card). Shared formatter:
  `shared/otherFunds.js`. CARD_H remains 1.18 — the fund line uses 8pt so it fits.
- PPT section slides that contain at least one multi-fund card also show the footer
  legend `* Additional Valor fund(s) invested`.
- Live `companies.json` / Railway data is **not** rewritten by the display PR — parent
  pushes the 7-section dataset (with `valorId` / `otherFunds` populated) separately.

## 9. vOS field reference (Portfolio CRM tracker)

`process_id: "portfolio"`. Field IDs are catalog-specific and could theoretically change if
someone edits the tracker's schema in vOS — re-run `get_process_fields` for `"portfolio"` if
any of these stop resolving.

| Field | Field ID | Notes |
|---|---|---|
| Company | `384595e3-10d3-49df-8398-1412e9fdfdd1` | type `company`; value at `field_values[id].company.{name,domain,valor_id}` |
| Company Description | `7d7b8696-6e64-497d-9b91-92b7cd70633f` | type `text`; often blank — don't let a blank vOS value clobber a good existing description |
| Further Investment Status | `f7274069-4879-45d4-948e-f8af823fa087` | type `select`; choices below |
| Fund(s) Invested | `430ede9f-eb53-4684-9659-1131004e5f4c` | type `select_multi`; choices below |

**Further Investment Status choices:**
| Value | Choice ID |
|---|---|
| Following | `0d52c59f-3c2f-62e1-1358-bc3aa3821e1d` |
| Not Following | `68ea9be3-27f3-24b2-7fb2-201ff1020810` |
| Exited | `8ddf49cd-0b54-4ff4-8be3-f55eb8d33850` |

**Fund(s) Invested choices relevant to this project:**
| Value | Choice ID | → Target section |
|---|---|---|
| Fund VII | `4f45cdb1-93ed-4807-8408-84ace721248c` | Growth – Platform |
| Fund VII (Ancillary) | `ddb25ef1-bbb4-4f13-96ca-8c15c3229102` | Growth – Ancillary |
| Fund VI | `dd1a4acb-5144-fb52-3fd3-a159a83c9300` | Growth – Platform |
| Fund VI (Ancillary) | `1835980a-369d-8ec0-7acc-e8056c58c22b` | Growth – Ancillary |
| Fund V | `569618bb-1b15-971a-c057-148ae80921bf` | Growth – Platform |
| Fund V (Ancillary) | `fdd5f5ca-1338-eb16-3c37-1035e9cdb04e` | Growth – Ancillary |
| Fund IV | `24bb10b9-d0aa-2d4c-cc68-3f3e888ec1b5` | Growth – Platform |
| Fund IV (Ancillary) | `c32bb4f4-14e9-5702-0598-2605d38fe52d` | Growth – Ancillary |
| Fund III | `fcd5365d-ac18-362a-0127-e64015ec6d50` | Growth – Platform |
| Funds 1/2 | `619962fe-58eb-7133-3385-7b153dc4a066` | Growth – Platform (unconfirmed — ask Mahal if Funds 1/2 should count as "platform"; not explicitly mentioned in his request) |
| Seed I | `c46d5fed-8b33-1001-e1ec-50df67b4fe34` | Seed |
| VSV I | `c7cf9979-0c2f-88c5-b8fb-d7b8f5199431` | VSV – Core |
| VSV I - Placeholder | `a99957aa-5712-cae3-9b10-bacf1f8f77ad` | VSV – Placeholder |
| VSV II | `0e144272-8a09-fa47-d536-9f6461f4a30e` | VSV – Core |
| VSV II - Placeholder | `6ae64f66-8d72-63d0-354d-d89aaed54601` | VSV – Placeholder |
| VAAI | `96be73ba-ec77-4b45-b41e-f307cb700bc6` | VAAI – Core |
| VAAI - Placeholder | `0fdb1a60-800c-43f6-a36c-13136f219110` | VAAI – Placeholder |

Other choices exist on this field (R&D, Argos, Studio, VOF I, VOF II, and more past sort
order 21) that are **not** in scope for this project — don't pull companies whose *only*
fund tag is one of those.

**Efficient bulk-pull pattern** (see `project_vos_monthly_sync.md` in memory / Section 7.4
above for why): call `search_process_tasks` with `process_id: "portfolio"`, the field IDs you
need, no filter, `limit: 100`, and paginate via the returned `next_cursor` until it's `null`
— there were 382 total records as of 2026-09-03. Don't rely on per-company lookups; one
company can have multiple tracker rows for different fund relationships (which is exactly the
multi-fund case Section 8.2 needs to detect).

## 10. How to verify changes after deploying

1. `GET /health` on the Railway URL → `{"ok":true}` (no auth needed, confirms the service is up).
2. `GET /api/data` with Basic Auth → confirm section list/counts look right.
3. Load the Netlify URL in a browser, confirm the password gate appears and unlocks correctly.
4. `POST /api/generate-pptx` with Basic Auth and a JSON body of `{title, date, footer}` →
   save the returned bytes to a `.pptx` file and actually open it (or at minimum unzip it and
   inspect `ppt/slides/slide1.xml` for the V-mark's `<a:off>`/`<a:ext>` values) — don't assume
   XML validity means correct visual layout, per the Section 6 gotcha.
5. After any bulk data mutation (sync, rewrite, restructuring), sanity-check aggregate counts
   per section against what you expect before considering the operation done.
