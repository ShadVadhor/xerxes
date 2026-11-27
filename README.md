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

Images, 3D renders and films (including the explainer and campus films) are not stored in this repository. They are referenced in `client/src/lib/assets.ts` as `/manus-storage/...` paths, which are served by the Manus hosting platform. To host the site elsewhere, copy those files to your own storage or CDN and update the paths in `assets.ts`.

## Platform notes

The project started from the Manus web-db-user template (React / Express / tRPC / Drizzle). `server/_core/publicConfig.ts` exposes only named public runtime values; private keys stay server-side. The platform serves managed `/manus-storage/` assets, so the application does not register a second proxy. Platform configuration is read and edited through `webdev.config`.

## History

`TODO.md` records each design round and its QA.
