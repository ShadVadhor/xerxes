# Xerxes Data Centers — redesign TODO

Design direction (confirmed blueprint): **Strata Noir** — geological editorial meets architectural blueprint.
Obsidian base, ceramic-white architecture, signature **Magma** ember orange, cold LED blue only for compute.
Left rail = chapter / depth gauge. Smooth Lenis scrolling, GSAP ScrollTrigger, Three.js scenes.

- [x] **Brand + system**: Xerxes hexagon double-X mark kept (cropped from the official logo), custom wordmark lockup, tokens in `index.css` (obsidian / ceramic / magma / LED blue), fonts (Syne display, Instrument Serif accent, Instrument Sans body, JetBrains Mono telemetry), grain + hairline utilities, reduced-motion support.
- [x] **Cinematic hero**: a designed looping video of the white hub-and-six-pod campus → descent through the ground to the geothermal wells → data-hall fly-through (generated, composited with a live WebGL ember-particle overlay, pointer parallax, headline reveal, telemetry strip with 1.5 ExaFLOPS / PUE 1.05 / 150 kW per rack / 0 L water / off-grid, and a "KSA programme on hold — resuming with partners" status tag linking to the programme section). Intro curtain with hexagon draw.
- [x] **Persistent chapter + depth rail** and top nav (Home, Technology, Sustainability, AI Optimization, Sovereignty, About, Contact) with smooth anchor scrolling.
- [x] **Manifesto**: scroll-revealed statement on grid-dependent vs self-powered compute (off-grid, carbon-negative, AI-optimised), word-by-word reveal, big stat strip (100% carbon negative, 10× energy efficiency, 24/7 zero downtime, 5 ms latency).
- [x] **DTF vs Xerxes**: interactive Three.js 3D scale comparison (DTF = the small model: a fenced single-well pad with a sealed two-level building, BESS and ORC skid, 4 branches growing to 10; Xerxes = the Goliath: hub + six pods over 12 wells / 120 branches) with toggle, orbit/pointer control, per-mode legend, scale bars (wells 1 vs 12, branches 4→10 vs 120) and spec table. DTF facts sourced from darktokenfactory.com (design targets; early-2027 pilot is a target only; no DTF facility is in operation).
- [x] **Geothermal descent**: pinned, scroll-driven Three.js journey (6 beats) from the surface through strata to the field: 12 wells, 50 m between wells (no thermal interference), 120 directional branches (10 per well), ~5 km deep, closed loop, nanomaterial pipes (56% better heat transfer), 8% parasitic load. Rock dissolves to reveal the whole field; schematic, not to scale.
- [x] **Inside the data hall**: gallery/horizontal scroll of generated visuals + data-hall clip; silicon row (NVIDIA Vera Rubin roadmap, AMD next-gen GPU, advanced TPU, NPU, new high-density chips — roadmap names, not supply commitments); nano-composite shell roof block (capture wind and cold → chillers → heat recovery) with animated flow strip.
- [x] **AI GMS dashboard**: animated live-style telemetry (472 MWth thermal, 2.4 MWe parasitic, 54 MWe net, 94.5% AI confidence), LLM + LAM capabilities, SCADA integration steps, nanofoam, predictive resource mgmt, CH₄ hybrid test (57% efficiency, 59.2 MWe, 35.9% CO₂ offset), 39.6% opex reduction vs $0.022/kWh target, AI recommendations ticker.
- [x] **Sustainability + benchmarks**: animated bars for CO₂ (500,000 t vs −72,000 t), water (50 B L vs 0), PUE (1.5–2.0 vs 1.05); 72,000 t CO₂ eliminated (≈15,000 cars), 30 B litres saved (city of 80,000), clearly labelled as design targets / White Paper v1F (02 May 2025).
- [x] **Sovereignty & security**: off-grid independence, physical isolation, military-grade security, quantum encryption, over a dark atmospheric perimeter visual.
- [x] **Programme status & roadmap (honest KSA section)**: KSA programme paused — regional conflict and instability have slowed delivery; Xerxes will resume with its partners once conditions allow; no date promised. Re-baselined phases (Phase 0 AI GMS proven; Phase 1 first Xerxes facility = KSA; Phase 2 second Middle East facility; Phase 3 two additional locations → four facilities), dates replaced by "re-baselined on resumption".
- [x] **Company**: GEIOS Technologies (2019, Incheon), Aiden Digital Labs (2020, London), Kaigen Technologies (2021, Casper WY); mission; six leaders (Shad Am Serroune CEO, Atif Serroune CBO, Dr Lee Young Soo CTO, Lee Dong Kyu CIO, Kim Sanghwan CMO, Hyungsun Lee Chief Innovation Manager).
- [x] **Access + contact**: gated request cards for White Paper v1F, podcast, full walkthrough film (not embedded publicly); inquiry form (name, org, email, interest type: DTF / Xerxes / Partnership / Investor / Press, message) stored in DB and notifying the owner; the three office addresses and emails; footer.
- [x] **Quality**: responsive down to 360px, WebGL fallbacks (no-WebGL / reduced-motion / mobile DPR cap), SEO head + OG image + JSON-LD, `manus-routes.json`, `logoUrl` in `app.config.ts`, `pnpm check` clean, checkpoint pushed.


## Round 2 (follow-up)
- [x] DTF content re-sourced from www.darktokenfactory.com (+ walkthrough, geios.energy); old Spartan/GH200/500 PF DTF specs removed.
- [x] Xerxes silicon block (Vera Rubin / AMD next-gen GPU / advanced TPU / NPU / new high-density chips) — "Ruben Vera" read as NVIDIA Vera Rubin; flagged to user.
- [x] Geothermal geometry: 6 pods × 2 wells = 12 wells × 10 branches = 120, 5 km, 50 m spacing (as given by the user; not independently verified). No campus-total MW stated.
- [x] Nanocomposite shell roof visual + copy (performance figures deliberately not published).
- [x] Footer links to darktokenfactory.com and geios.energy; SEO head + crawler fallback updated.
## Round 3
- [x] Hero film v3: four phases (surface, twelve wells, 120 branches, compute); no city. AI-generated and schematic.
- [x] DTF redesign for "02 — Two models, one idea" from the DTF pitch-deck DESIGN only (anatomy, branch ladder, pad/room renders). No financials, revenue, raise or investor data from the confidential deck are on the site.
- [x] `/walkthrough`: detailed interactive 3D walkthrough of one Xerxes pod (Three.js, lazy-loaded): campus arrival, hub digital twin, four rings, rack, hall, NanoVault, cooling, energy bay (two wellheads 50 m apart), subsurface cut (120 branches, 5 km), biogas bus, nano-shell roof. Guided tour + free explore (WASD / drag), minimap, depth gauge, hotspots, mobile layout, no-WebGL fallback, deep links (`?stop=N`). Figures are white-paper design targets; schematic scale.
- [x] Entry points: nav link (desktop + mobile menu), Home teaser band after "Inside the data hall", footer link. "Request access" returns to `/#contact` with the Xerxes interest pre-selected.
- [x] Route head tags for `/walkthrough` set client-side and server-side (title, description, canonical, og, twitter); `manus-routes.json` lists the route.
- [ ] Open questions for the owner: campus-total MW (white paper Phase 1 = 5 wells / 250 MW vs 12 wells), whether to gate parts of the walkthrough detail, DTF branch count (deck 10 vs site 4 to 10).
- [ ] Publishing is the user's step (not published).
