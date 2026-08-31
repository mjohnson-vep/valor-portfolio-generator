# PRD: Valor Portfolio Overview Generator
**Version:** 1.0  
**Owner:** Revenue Generation / Corporate Strategic Partner Support  
**Status:** Draft

---

## 1. Overview

### Problem
The current portfolio overview generator is a standalone HTML file. It works well for a single user but has two key limitations:
- Company data saves to the individual's browser — edits are not visible to teammates
- Any structural updates (new companies, section changes) require manually editing the file and redistributing it

### Goal
Rebuild the generator as a lightweight hosted web app with a shared database, so any team member can open the same URL, see live portfolio data, make edits, and generate a branded PowerPoint — with all changes persisted and shared across the team.

---

## 2. Users

| User | Description |
|------|-------------|
| Primary | Mahal Johnson and Rev Gen team members who maintain portfolio data and generate decks |
| Secondary | Any Valor employee given access to the tool |

User count: ~5–10 people. No public access required.

---

## 3. Current State (v1 HTML File)

The existing tool has the following features, all of which must be preserved in the rebuild:

**Portfolio sections (4 total)**
- Growth – Valor & VSV
- Venture – VSV
- Venture – Valor
- VAAI – Valor

**Per-company fields**
- Company name (uppercase)
- Website URL (rendered as active hyperlink in PPT)
- One-line description
- Included/excluded flag (checkbox — controls whether company appears in generated PPT)

**UI features**
- Tab navigation between sections
- Inline editing of all fields
- Add / remove / duplicate companies
- Drag-and-drop reordering within a section
- Sort A→Z
- Select all / Deselect all per section
- CSV import
- Live subtitle showing "X of Y included · Z slides"
- Stats bar showing per-section and total company counts

**PPT generation**
- Title slide (blue background, Valor branding)
- One set of content slides per section (up to 16 companies per slide, 4-column grid)
- Card layout per company: blue top bar, company name (bold, 12pt), website (italic, hyperlinked, 10pt), divider line, description (10pt)
- Blue header banner full-width with section label and page number
- Footer with section wordmark and page number
- Europa font embedded in the PPTX file so it renders correctly on any machine
- Filename: `Valor_Portfolio_Overview_[Date].pptx`

---

## 4. Requirements for Rebuild

### 4.1 Shared Database

All portfolio data must be stored in a central database accessible to all users.

- **Preferred:** Microsoft SharePoint / Excel via Microsoft Graph API (team already uses M365)
- **Alternative:** PostgreSQL or SQLite hosted alongside the app
- On page load, the app fetches current data from the database
- Every mutation (add, edit, delete, reorder, toggle included) writes back to the database immediately
- Changes made by one user are visible to others on next page load (near real-time is fine; live collaborative cursors not required)

### 4.2 Authentication

- Access restricted to Valor team members only
- **Preferred:** Microsoft SSO via Azure AD (consistent with existing M365 setup)
- **Acceptable alternative:** Simple shared password or invite-only access
- No public access

### 4.3 Hosting

- Hosted as a web app accessible via a stable URL (e.g. `tools.valorep.com/portfolio` or similar)
- Must work in Chrome and Edge
- No desktop install required for end users

### 4.4 PPT Generation

- All PPT output must match the current v1 spec exactly (see Section 3)
- Europa font (Regular, Bold, Light, Italic OTF files available) must be embedded in the PPTX
- Generated via PptxGenJS (current library) or equivalent
- Download triggers in-browser — no server-side file storage needed

### 4.5 Change History (nice to have)

- Log each edit with timestamp and user
- Allow viewing last-modified date per company
- Allow reverting a company to a previous state

### 4.6 Performance

- Page load (including data fetch) under 3 seconds on a standard corporate connection
- PPT generation under 15 seconds for a full 114-company deck

---

## 5. Data Model

```
Section
  id            string    (e.g. "growth-valor-vsv")
  label         string    (e.g. "Growth – Valor & VSV")
  pptLabel      string    (e.g. "GROWTH COMPANIES – VALOR & VSV")
  displayOrder  integer

Company
  id            uuid
  sectionId     string    (foreign key → Section)
  name          string    (uppercase)
  url           string
  description   string
  included      boolean   (default: true)
  displayOrder  integer
  createdAt     timestamp
  updatedAt     timestamp
  updatedBy     string    (user identifier)
```

---

## 6. Current Portfolio Data

114 companies across 4 sections. Full dataset is embedded in the existing HTML file and can be extracted as JSON or CSV on request. Sections and approximate company counts:

| Section | Companies |
|---------|-----------|
| Growth – Valor & VSV | 52 |
| Venture – VSV | 29 |
| Venture – Valor | 19 |
| VAAI – Valor | 13 |

---

## 7. Design & Branding

The existing UI should be preserved as closely as possible.

**Brand colors**
- Primary blue: `#0042E9`
- Dark navy: `#0031B2`
- White: `#FFFFFF`
- Grey text: `#4A4A4A`
- Grey border: `#E8E8E8`

**Font:** Europa (Regular, Bold, Light, Italic) — OTF files available

The current HTML file can be used as a direct visual reference. A developer should be able to open it in a browser and use it as the design spec.

---

## 8. Out of Scope

- Mobile optimization (desktop/laptop use only)
- Real-time collaborative editing (last-write-wins on save is acceptable)
- Role-based permissions (all authenticated users have equal access)
- Integration with any CRM or external portfolio system
- Automated data sync from any source

---

## 9. Assets Available

The following are available from the current v1 implementation and can be handed off to the engineering team:

| Asset | Description |
|-------|-------------|
| `valor_ppt_generator_standalone.html` | Full working v1 — use as UI and PPT generation reference |
| `Europa_Font.zip` | All 4 Europa OTF files (Regular, Bold, Light, Italic) |
| Company dataset | Extractable as JSON/CSV from the HTML file |
| Brand assets | V-mark and wordmark SVGs embedded in the HTML file |

---

## 10. Success Criteria

- Any team member can open the tool URL, see current portfolio data, and generate a correct PPT within 2 minutes of first use
- An edit made by one user is visible to another user on next page load
- PPT output is visually identical to v1 output
- Europa font renders correctly in the downloaded PPTX on machines that do not have Europa installed

---

## 11. Suggested Stack

The following is a suggestion, not a requirement. Engineering team should use whatever stack they are most productive with.

- **Frontend:** React or plain HTML/JS (v1 is vanilla JS — straightforward to port)
- **Backend:** Node.js / Express or Python / FastAPI
- **Database:** SharePoint Excel via Microsoft Graph API (preferred) or PostgreSQL
- **Auth:** Microsoft MSAL (Azure AD SSO)
- **Hosting:** Azure App Service or Netlify (frontend) + Railway/Render (backend)
- **PPT generation:** PptxGenJS (already integrated in v1)

---

## 12. Open Questions for Engineering

1. Is Azure AD SSO feasible given current IT permissions, or should we use a simpler auth method for v1?
2. Microsoft Graph API for SharePoint Excel vs. a standalone database — which is faster to implement and more reliable for this use case?
3. Should PPT generation happen client-side (as in v1) or server-side? Server-side removes the font-embedding workaround but adds complexity.
4. What is the preferred hosting environment given Valor's existing infrastructure?
