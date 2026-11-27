# Xerxes Data Centers — website

The website for **Xerxes**, a geothermal-embedded, off-grid, carbon-negative data center designed for very high-density compute, and its small sibling, the **DTF (Dark Token Factory)**.

Built with React 19, Vite 7, Tailwind CSS v4, three.js, GSAP and Lenis on the front end, with Express, tRPC and Drizzle (MySQL) on the server.

## What is on the site

| Route | Content |
| --- | --- |
| `/` | Single-page story: hero (animated descent to the well field), 01 The premise, 02 Two models, one idea (7-minute explainer film and a 3D DTF/Xerxes campus viewer), 03 The technology (descent and well pad), 04 Compute (data hall, shell), 05 Intelligence (AI GMS and the digital twin), 06 Impact, 07 Sovereignty, 08 Programme status (with the campus film), 09 The company, request access and contact |
| `/walkthrough` | Interactive 3D walkthrough of the Xerxes campus |

Figures shown on the site are design targets, modelled or simulated values, and the imagery is concept visualisation.

## Project layout

```
client/            front end (Vite root)
  src/pages/       Home, Walkthrough, NotFound
  src/components/  xerxes/ (site sections, players, popups), walk/ (3D walkthrough), ui/
  src/lib/         content.ts (all copy), assets.ts (media paths), 3D campus models
server/            Express + tRPC API (contact / access inquiries)
drizzle/           database schema and migrations
shared/            types and constants shared by client and server
```

Copy lives in `client/src/lib/content.ts`; media paths live in `client/src/lib/assets.ts`.

## Running it

```bash
pnpm install
pnpm dev          # development server; honors PORT (default 3000)
pnpm check        # type check
pnpm test         # application tests
pnpm build        # production build: dist/index.js and dist/public/
pnpm start        # serve the production build
pnpm db:migrate   # apply checked-in migrations (pnpm db:push generates and applies new schema changes)
```

The server reads `DATABASE_URL` (MySQL) and the platform variables `MANUS_API_URL`, `MANUS_API_KEY`, `MANUS_JWT_SECRET`, `MANUS_OAUTH_API_URL`, `MANUS_PROJECT_ID` and `OWNER_OPEN_ID`. Keep them in an untracked `.env`; never commit them.

## Media

Images, 3D renders and the two films are referenced in `client/src/lib/assets.ts` as `/manus-storage/<name>` paths. In this GitHub repository the files themselves are in `client/public/manus-storage/` (about 130 MB, including the 82 MB explainer film and the 45 MB campus film), so every path resolves on any static host without code changes. (The Manus-managed project serves the same files from its own storage and keeps them out of its Git history.)

## Deploy to Vercel

1. In Vercel choose **Add New > Project** and import `ShadVadhor/xerxes`. `vercel.json` already sets the install and build commands (`pnpm build:vercel`); leave the framework preset on **Other** and do not set an output directory.
2. Optional, for the contact and access forms, add environment variables under **Settings > Environment Variables**:
   - `DATABASE_URL`: a MySQL database (TiDB Cloud, PlanetScale, or any MySQL 8 host). Create the table once from your computer with `pnpm db:migrate`.
   - `INQUIRY_WEBHOOK_URL`: a Slack or Discord incoming webhook, a Make or Zapier hook, or any URL that accepts a JSON POST; each new inquiry is sent there.

   With neither set the site still works, and the form tells visitors to email `contact@geios.energy`.
3. Deploy. Add the domain (for example `www.xerxes.nexus`) under **Settings > Domains**.

`pnpm build:vercel` (`scripts/vercel-build.mjs`) runs the Vite build and writes the Vercel Build Output: the static site, the API (`/api/trpc`, bundled from `server/vercel.ts`) and the routes (single-page fallback, long cache for hashed assets). `.env.example` lists the variables.

To run the production build locally: `pnpm build && pnpm start`.

## Platform notes

The project started from the Manus web-db-user template (React / Express / tRPC / Drizzle). `server/_core/publicConfig.ts` exposes only named public runtime values; private keys stay server-side. The platform serves managed `/manus-storage/` assets, so the application does not register a second proxy. Platform configuration is read and edited through `webdev.config`.

## History

`TODO.md` records each design round and its QA.
