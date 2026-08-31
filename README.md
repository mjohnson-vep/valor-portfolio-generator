# Valor Portfolio Overview Generator

A shared web app for maintaining Valor's portfolio company list and generating a
branded PowerPoint overview deck. Rebuilt from the original single-file
`valor_ppt_generator_standalone_15.html` tool so the whole team can edit the
same data from one URL instead of a browser-local copy.

## Architecture

```
client/   React + Vite frontend — same UI/UX as the standalone HTML tool
server/   Node.js + Express backend — holds company data in server/data/companies.json
          and generates the .pptx server-side with PptxGenJS
```

All edits (add/remove/reorder companies, checkbox toggles, description edits,
deck settings) are written straight to `server/data/companies.json` on the
backend, so every teammate hitting the same backend URL sees the same data.

## Local Development

Requires [Node.js](https://nodejs.org) 18+ and npm. From the project root:

```bash
npm install
npm start
```

`npm install` installs the root, `server/`, and `client/` dependencies in one
shot (via a `postinstall` hook). `npm start` runs the Express API on
`http://localhost:4000` and the Vite dev server on `http://localhost:5173`
concurrently — open `http://localhost:5173` in Chrome or Edge. The Vite dev
server proxies `/api/*` to the backend automatically, so no extra config is
needed locally.

## Environment Variables

| File | Variable | Purpose |
|------|----------|---------|
| `server/.env` | `PORT` | Port the API listens on (Railway sets this for you) |
| `server/.env` | `CORS_ORIGIN` | Comma-separated allowed frontend origin(s) in production |
| `client/.env` | `VITE_API_URL` | Full origin of the deployed backend, e.g. `https://valor-portfolio-api.up.railway.app` (leave unset for local dev) |

Copy the `.env.example` file in each folder to `.env` and fill in real values
when deploying.

## Data Persistence — Important for Railway

The shared company data lives in `server/data/companies.json` on disk. This is
fine for local dev and for a Railway container that stays running, but a
**redeploy replaces the container's filesystem**, which would silently reset
everyone's edits back to the data committed in git.

To make edits durable across redeploys:

1. In the Railway service settings, add a **Volume**.
2. Mount it anywhere, e.g. `/data`.
3. Set an env var `DATA_DIR=/data` on the service.

On first boot with an empty volume, the backend automatically seeds
`companies.json` from the bundled dataset and then reads/writes exclusively
from `DATA_DIR` from then on — no manual copy step needed.

Without a volume, treat `server/data/companies.json` as the source of truth —
periodically download it (or add a small backup script) so a redeploy never
loses real edits.

## Deploying the Backend (Railway)

1. Push this repo to GitHub (or GitLab).
2. In Railway: **New Project → Deploy from GitHub repo**, select this repo.
3. Set the service's **Root Directory** to `server`.
4. Railway auto-detects Node via Nixpacks and runs `npm install` then
   `npm start` (defined in `server/package.json`).
5. Add environment variables from `server/.env.example` under the service's
   **Variables** tab (`CORS_ORIGIN` — you can fill this in after step 3 of the
   Netlify section below, once you know the Netlify URL).
6. Set up a Volume as described above if you want edits to survive redeploys.
7. Deploy. Note the generated public URL, e.g.
   `https://valor-portfolio-api-production.up.railway.app` — you'll need it
   for the frontend.
8. Sanity check: visit `<that-url>/health` — it should return `{"ok":true}`.

## Deploying the Frontend (Netlify)

1. In Netlify: **Add new site → Import an existing project**, connect the
   same repo.
2. Set **Base directory** to `client`, **Build command** to `npm run build`,
   **Publish directory** to `client/dist` (the included `client/netlify.toml`
   sets these automatically if Netlify picks it up from the base directory).
3. Add an environment variable `VITE_API_URL` set to the Railway backend URL
   from the previous section (no trailing slash).
4. Deploy. Netlify gives you a URL like `https://valor-portfolio.netlify.app`.
5. Go back to Railway and set `CORS_ORIGIN` to that Netlify URL, then redeploy
   the backend so the browser is allowed to call it cross-origin.

Share the Netlify URL with the team — that's the one stable link everyone
uses.

## Europa Font

The four Europa OTF files (Regular, Bold, Light, Italic) live in
`server/assets/fonts/` (used to embed the font into generated `.pptx` files so
they render correctly on machines without Europa installed) and are copied
into `client/public/fonts/` (used for `@font-face` in the web UI so the app
itself matches the brand). If Valor's brand team issues updated font files,
replace both copies.

## Regenerating the Seed Data

`server/data/companies.json` is the live, shared dataset — once the app is
running, edit it through the UI, not by hand. If you ever need to reset a
fresh environment back to the original 235-company v1 dataset, restore that
file from git history rather than re-deriving it from the old HTML file.

## Troubleshooting

- **"Failed to load portfolio data" on the frontend** — the backend isn't
  reachable. Check `VITE_API_URL` (prod) or that `npm start` is running both
  processes (local).
- **CORS errors in the browser console** — set `CORS_ORIGIN` on the backend to
  match the frontend's exact origin (including `https://`, no trailing slash).
- **Generated .pptx opens with a "repair" prompt in PowerPoint** — this is
  almost always a symptom of a corrupted OOXML patch (font embedding or the
  title-slide watermark shape in `server/src/pptx/`). Diff against a
  previously-working file's `ppt/presentation.xml` after unzipping both as
  `.zip`.
