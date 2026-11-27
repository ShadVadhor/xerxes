/**
 * All copy + figures for the Xerxes site live here so they are easy to edit.
 *
 * Sources: the previous xerxes.nexus site and White Paper V-1F (02 May 2025); the Xerxes well-field geometry
 * (12 wells, 10 directional branches each, ~5 km deep, 50 m between wells) and the nano-shell roof as briefed by the
 * client; the DTF (Dark Token Factory) facts from www.darktokenfactory.com; EQG technology from www.geios.energy.
 * Every performance figure is a DESIGN TARGET or MODELLED value, not audited operating data.
 */

export const SITE = {
  name: "XERXES",
  descriptor: "DATA CENTERS",
  tagline: "Off-grid. Carbon-negative. AI-optimized.",
  contactEmail: "contact@geios.energy",
};

export const NAV = [
  { id: "models", label: "Models" },
  { id: "technology", label: "Technology" },
  { id: "compute", label: "Compute" },
  { id: "impact", label: "Impact" },
  { id: "programme", label: "Programme" },
  { id: "company", label: "Company" },
];

/** Chapters shown on the left rail, in page order */
export const CHAPTERS = [
  { id: "top", n: "00", label: "Surface" },
  { id: "why", n: "01", label: "Premise" },
  { id: "models", n: "02", label: "Two models" },
  { id: "technology", n: "03", label: "Descent" },
  { id: "compute", n: "04", label: "Compute" },
  { id: "intelligence", n: "05", label: "Intelligence" },
  { id: "impact", n: "06", label: "Impact" },
  { id: "security", n: "07", label: "Sovereignty" },
  { id: "programme", n: "08", label: "Programme" },
  { id: "company", n: "09", label: "Company" },
  { id: "contact", n: "10", label: "Contact" },
];

/** Hero HUD phases keyed to the loop film (seconds into the 22.25 s loop) */
export const HERO_PHASES = [
  { from: 0, to: 6.0, tag: "01 / SURFACE", line: "A campus that asks nothing of the grid." },
  { from: 6.0, to: 10.0, tag: "02 / ONE WELL PAD", line: "Every well is a pad: one wellhead, a short copper casing and a ring of ten slots." },
  { from: 10.0, to: 14.2, tag: "03 / FOUR → TEN", line: "Four branches open on day one. Six more grow in, each deeper into hotter rock." },
  { from: 14.2, to: 19.0, tag: "04 / 120 BRANCHES", line: "Twelve pads, fifty metres apart, ten branches each: one hundred and twenty, about five kilometres down." },
  { from: 19.0, to: 22.25, tag: "05 / COMPUTE", line: "Heat becomes intelligence." },
];

export const HERO_TELEMETRY = [
  { value: 1.5, decimals: 1, unit: "EF", label: "Compute, up to" },
  { value: 1.05, decimals: 2, unit: "", label: "Design PUE" },
  { value: 150, decimals: 0, unit: "kW", label: "Per rack" },
  { value: 120, decimals: 0, unit: "", label: "Geothermal branches" },
  { value: 25, decimals: 0, unit: "%", label: "Water vs conventional DC" },
];

export const MANIFESTO = {
  eyebrow: "01 — The premise",
  text:
    "Every other data center is a tenant of someone else's grid. Xerxes is its own power plant: a campus built over twelve geothermal wells and 120 directional branches, five kilometres deep, turning the heat of the earth directly into high-density AI compute. No grid. A quarter of the water. No carbon. Just intelligence, at scale.",
  stats: [
    { value: 100, suffix: "%", label: "Carbon negative", sub: "by design" },
    { value: 10, suffix: "×", label: "Energy efficiency", sub: "vs. conventional" },
    { value: 24, suffix: "/7", label: "Zero downtime", sub: "design target" },
    { value: 5, suffix: " ms", label: "Ultra-low latency", sub: "design target" },
  ],
  footnote: "Design targets per White Paper V-1F (02 May 2025). Not audited operating data.",
};

export const MODELS = {
  eyebrow: "02 — Two models, one idea",
  title: "A node on one old well.",
  titleAccent: "A Goliath on twelve deep ones.",
  intro:
    "The Dark Token Factory (DTF) is the small model: a prefabricated, two-level building that runs dark beside one re-entered well and lives off its heat. Xerxes is the Goliath: a hub and six pods over twelve wells and 120 directional branches, five kilometres deep. Same principle. Take the data center to the power. Radically different scale.",
  viewerNote: "Illustrative massing — not to engineering scale",
  toggles: [
    { id: "dtf", label: "DTF" },
    { id: "compare", label: "Compare" },
    { id: "xerxes", label: "XERXES" },
  ] as const,
  cards: [
    {
      id: "dtf",
      name: "DTF",
      kind: "The small model · Dark Token Factory",
      line: "One re-entered well. One two-level building: compute above, power and cooling below. Robot-serviced, lights off.",
      stats: [
        { k: "Wells", v: "1" },
        { k: "Per well pad", v: "20 MWe" },
        { k: "Routine staff", v: "0" },
      ],
      href: "https://www.darktokenfactory.com",
      hrefLabel: "darktokenfactory.com",
    },
    {
      id: "xerxes",
      name: "XERXES",
      kind: "The Goliath",
      line: "A central hub, six compute pods and a nano-shell roof, over twelve wells. A campus that is its own power plant.",
      stats: [
        { k: "Wells", v: "12" },
        { k: "Branches", v: "120" },
        { k: "Peak compute", v: "1.5 EF" },
      ],
      href: "",
      hrefLabel: "",
    },
  ],
  anatomy: {
    eyebrow: "Anatomy of a DTF",
    title: "A two-level building",
    titleAccent: "that runs dark.",
    intro:
      "Built and tested in a factory, then stacked on a stationary pad by a small crew. Compute sits on Level 2. Everything that feeds it sits on Level 1, directly over one well.",
    level2: {
      tag: "Level 2 · Compute",
      rail: "Robotic gantry and arm",
      modules: [
        { name: "Compute Module A", body: "Immersed GPU servers on native DC" },
        { name: "Compute Module B", body: "Isolatable for service; any DTF class" },
      ],
    },
    links: [
      { id: "dc", label: "native DC" },
      { id: "cool", label: "cooling" },
    ],
    level1: {
      tag: "Level 1 · Power, cooling, stimulation and storage",
      units: [
        { name: "Native ORC-DC", body: "Turns well heat into native DC power", tone: "heat" },
        { name: "GEOFLEX BESS", sub: "2 × 5 MW", body: "10 MW / 20 MWh closed-loop DC buffer", tone: "store" },
        { name: "20.57 MWth cooling", body: "Tail-brine LiBr/NH₃ absorption chills tanks and BESS", tone: "cool" },
        { name: "Stimulation unit", body: "N₂ nanofoam for the heat-capture zone", tone: "stim" },
      ],
    },
    figures: [
      { value: "20.0", unit: "MWe", label: "gross ORC-DC · 18.7 MW-IT net" },
      { value: "20.57", unit: "MWth", label: "absorption cooling · PUE 1.04 target" },
      { value: "0", unit: "", label: "people on site, routine operations" },
    ],
    classes: [
      { name: "DTF-Nx", sub: "NVIDIA H100 / H200 · pilot class" },
      { name: "DTF-A", sub: "AMD Instinct MI350X" },
      { name: "DTF-N", sub: "NVIDIA B200 / B300 · highest density" },
    ],
    designedOut: {
      title: "Designed out",
      items: [
        { k: "Construction and labor", v: "Built and tested in the factory, then stacked on the pad by a small crew." },
        { k: "IT people", v: "Robots swap servers in ≤15 minutes (target), supervised remotely." },
        { k: "Transformers", v: "Native DC from ORC to BESS to GPUs: no substation transformer." },
        { k: "Switchboards", v: "DC distribution and protection integrated and tested in the factory." },
        { k: "Lighting and occupancy", v: "No lights, no people, no occupancy loads: power goes to compute." },
      ],
    },
    note: "Design targets, to be verified in the pilot. 10-branch wellpad basis: 140 MWth → 20.0 MWe gross → 19.2 MWe net → 18.7 MW-IT; dynamically scalable 2–20 MWe. Not every well qualifies: candidates are screened for heat, integrity and access.",
  },
  spine: {
    eyebrow: "The well pad",
    title: "Four branches today.",
    titleAccent: "Ten when it grows.",
    intro:
      "A verified idle well is re-entered on the same API and becomes the pad: a short colloidal conductor casing, a ring of ten slots with six sealed in reserve, and a motherbore probe that listens to the rock. Branches fan out in a fountain, each new one deeper into hotter rock.",
    steps: [
      { n: "01", tag: "Re-enter", title: "Same API, short casing", body: "The existing wellbore is re-entered, not redrilled. A colloidal conductor casing reaches about an eighth of the way down; a ring of ten slots sits at its foot, six of them sealed in reserve." },
      { n: "02", tag: "Listen", title: "Motherbore probe: acoustic, thermal, EM", body: "A central probe runs the full depth and feeds an AI 3D subsurface model, so each new branch is steered toward the hottest rock." },
      { n: "03", tag: "Grow", title: "Four branches, then ten", body: "The pad opens with four. When the heat is needed, the reserve slots open one by one and each new branch peels off in a smooth curve. N₂ nanofoam, timed by the AI, opens the heat pathways." },
      { n: "04", tag: "Convert and scale", title: "Native ORC-DC, no rig move", body: "Ten branches of 14.0 MWth each feed a low-boiling nanofluid ORC. Output scales from 2 to 20 MWe as branches come online: Building 1 first, Phase 2 after." },
    ],
    figures: [
      { value: "20", unit: "MWe", label: "gross per well pad" },
      { value: "4 → 10", unit: "", label: "branches per pad" },
      { value: "4.5", unit: "km", label: "deepest branches · 150–200 °C rock" },
    ],
  },
  specs: [
    { k: "Form", dtf: "One prefabricated two-level building on a stationary pad: compute above, power and cooling below", xerxes: "Central hub + 6 compute pods under a nano-shell roof" },
    { k: "Wells", dtf: "1 re-entered idle oil & gas well", xerxes: "12 wells · 2 under each pod · 50 m apart" },
    { k: "Branches", dtf: "One well pad: a ring of 10 slots · 4 branches open, 6 reserve slots sealed until the pad grows to 10, each deeper into hotter rock", xerxes: "10 directional branches per well pad (6 production + 4 injection) · 120 in total" },
    { k: "Depth", dtf: "Up to 4.5 km on the deepest branches, into 150–200 °C rock", xerxes: "About 5 km on the deepest branches; the outer ones flare wide and stop shallower" },
    { k: "Power", dtf: "20.0 MWe gross Native ORC-DC · 19.2 MWe net · scalable 2–20 MWe", xerxes: "Up to 50 MW per well · 54 MWe net modelled" },
    { k: "Compute", dtf: "About 18.7 MW of IT per pad at full build", xerxes: "Up to 1.5 ExaFLOPS reference design · 150 kW per rack" },
    { k: "Silicon", dtf: "Three classes: DTF-Nx (NVIDIA H100/H200), DTF-A (AMD Instinct MI350X), DTF-N (NVIDIA B200/B300)", xerxes: "NVIDIA Vera Rubin, next-gen AMD Instinct GPUs, advanced TPUs, NPUs and new high-density chips" },
    { k: "Cooling", dtf: "Servers immersed in dielectric coolant · 20.57 MWth tail-brine absorption cooling · PUE 1.04 target", xerxes: "Closed-loop CO₂ liquid cooling · nano-shell roof captures wind and cold for the chillers · heat recovered and reused" },
    { k: "Operation", dtf: "Lights-out: zero people on site for routine operations · gantry and arm swap a server in ≤15 min (target)", xerxes: "AI GMS autonomous operation, with human oversight" },
    { k: "Status", dtf: "Design stage · first pilot is a target, not a commitment", xerxes: "KSA programme on standby · no dates committed" },
  ],
  footnote:
    "All figures are design targets or modelled values, not audited operating data. DTF: per the DTF design basis and darktokenfactory.com; no DTF facility is yet in operation and accelerator figures are vendor-published. Xerxes: White Paper V-1F and design intent.",
  room: {
    eyebrow: "Inside a DTF",
    title: "Lights out. Robots in.",
    body: "Every server sits fully immersed in dielectric coolant, cooled by the absorption loop beneath it. A gantry and arm run overhead on a fixed service path: lift, swap and return. A failed server is pulled, replaced with a spare and back in service in fifteen minutes or less, as a design target. Nobody goes inside.",
    stats: [
      { value: "≤15", unit: "min", label: "server swap, target" },
      { value: "≥99.5", unit: "%", label: "robot-cell acceptance target, 500 cycles" },
      { value: "~5", unit: "µs/km", label: "one-way delay in fibre" },
    ],
    caption: "Concept render of a DTF compute level.",
  },
};

export const DESCENT = {
  eyebrow: "03 — The technology",
  title: "Power from below.",
  /** Order matches the scene beats: surface · spacing · the pad · four to ten · five km · whole field · to compute */
  steps: [
    {
      tag: "Surface",
      title: "A campus that asks nothing of the grid.",
      body: "Above ground: a hub and six white pods under a nano-shell roof. Below them: twelve well pads, two under every pod, and the power station they feed.",
      stat: null,
    },
    {
      tag: "Well spacing",
      title: "Two wells a pod. Fifty metres apart.",
      body: "Each pod stands over a pair of wells, set a long fifty metres apart so that neither sits in the other's thermal shadow. Thermal interference is designed out before the first metre is drilled.",
      stat: { value: "50", unit: "m", label: "between wells" },
    },
    {
      tag: "One well pad",
      title: "One wellhead. Ten slots.",
      body: "Every pad is a single wellhead over a colloidal conductor casing that reaches only about an eighth of the way down. At its foot sits a ring of ten reserve slots, sealed until each is needed, and a motherbore probe runs down the middle listening to the rock.",
      stat: { value: "10", unit: "", label: "slots on every pad" },
    },
    {
      tag: "Four to ten",
      title: "Four branches. Then ten.",
      body: "A pad opens with four active branches. When it is time to grow, the reserve slots open one by one and each new branch peels off in a smooth curve, deeper into hotter rock. AI-timed nitrogen nanofoam opens the heat pathways in the new rock.",
      stat: { value: "4 → 10", unit: "", label: "branches per pad" },
    },
    {
      tag: "Five kilometres",
      title: "Deeper into hotter rock.",
      body: "The outer branches flare wide and stop shallower; the inner ones stay close to the axis and run deepest, about five kilometres down. Nanomaterial-enhanced pipe lifts heat transfer by 56%; six branches produce heat while four return the cooled fluid in one closed loop.",
      stat: { value: "5", unit: "km", label: "to the deepest branches" },
    },
    {
      tag: "The whole field",
      title: "Twelve pads. 120 branches.",
      body: "Pull the rock away and the field appears: twelve fountains of ten branches beneath six pods, each pad fifty metres from its neighbour. Each pad is modelled at up to fifty megawatts. This is what a Goliath stands on.",
      stat: { value: "120", unit: "", label: "branches · 12 wells" },
    },
    {
      tag: "Heat becomes intelligence",
      title: "Earth's heat, converted to compute.",
      body: "Only 8% of the field's output keeps the loop alive. In AI GMS simulation, 472 MWth of thermal energy yields 54 MWe net per well: continuous, weather-proof power for the densest racks on the planet.",
      stat: { value: "54", unit: "MWe", label: "net per well, modelled" },
    },
  ],
  footnote: "Schematic — not to scale. Pad geometry per Xerxes design intent; power figures modelled (AI GMS Phase 0, White Paper V-1F).",
};
export const HALL = {
  eyebrow: "04 — Compute",
  title: "The densest racks on earth,",
  titleAccent: "powered by the ground beneath them.",
  intro:
    "Inside the pods: racks at 150 kW, liquid-cooled through a closed CO₂ loop, and built to host whatever silicon comes next, not only what ships today.",
  silicon: {
    label: "Built for next-generation, high-density silicon",
    chips: [
      { name: "NVIDIA Vera Rubin", sub: "Next-gen GPU platform" },
      { name: "AMD Instinct", sub: "Next-gen GPUs" },
      { name: "Advanced TPU", sub: "Tensor accelerators" },
      { name: "NPU", sub: "Neural processing units" },
      { name: "New chips", sub: "High-density silicon" },
    ],
    note: "Reference configuration in White Paper V-1F: Blackwell-class GPUs on NVLink 5.0 and Quantum-3 InfiniBand. Platform names are vendor roadmap names, not supply commitments.",
  },
  callouts: [
    { value: "150", unit: "kW", label: "per rack — highest density in the industry" },
    { value: "1.5", unit: "EF", label: "ExaFLOPS peak design compute, V-1F reference" },
    { value: "144,000+", unit: "", label: "GPUs in the V-1F reference configuration" },
    { value: "80+", unit: "GB/s", label: "bandwidth per node, NVLink 5.0" },
    { value: "100+", unit: "EB", label: "storage capacity" },
  ],
  gallery: [
    {
      key: "hub",
      title: "The hub",
      caption: "The Torus design: minimal environmental footprint, maximum carbon capture.",
    },
    {
      key: "hall",
      title: "The data hall",
      caption: "Raised-floor halls, black racks, cold-aisle LED strips.",
    },
    {
      key: "cooling",
      title: "CO₂ cooling gallery",
      caption: "Kaigen sealed nano-CO₂ loop. No water in the primary circuit.",
    },
    {
      key: "rack",
      title: "Rack, close up",
      caption: "150 kW per rack. Liquid-cooled. Built for what comes next.",
    },
    {
      key: "command",
      title: "AI command centre",
      caption: "Autonomous operation, human oversight.",
    },
    {
      key: "wellpad",
      title: "The wellpad",
      caption: "One wellhead, one pad: where the closed loop meets the surface. Compact, quiet, sealed.",
    },
  ],
  note: "Illustrative visualisations of the Xerxes design.",
};

export const SHELL = {
  eyebrow: "04 — Compute · The shell",
  title: "A roof that catches the wind",
  titleAccent: "and keeps the cold.",
  body: "The roof of every pod is a shell of nanocomposite, engineered with nanotechnology to capture wind and cold. What it gathers is transferred to the chillers, so the cooling plant begins each day ahead. The heat the racks give up is recovered and reused rather than vented.",
  steps: [
    { n: "01", t: "Capture", d: "A nanocomposite shell gathers wind and cold from the air around the campus.", tone: "cold" },
    { n: "02", t: "Transfer", d: "That cooling potential is passed to the chillers instead of being generated from scratch.", tone: "cold" },
    { n: "03", t: "Cool", d: "A sealed nano-CO₂ loop carries heat out of 150 kW racks. Water stays in the secondary loop: about 25% of a conventional site, 15% with liquid cooling.", tone: "cold" },
    { n: "04", t: "Recover", d: "Rejected heat is captured and reused on the campus, not thrown away.", tone: "heat" },
  ],
  alt: "Roof of a Xerxes pod: a nanocomposite lattice shell gathering wind and cold at dawn",
  note: "Illustrative visualisation. Shell performance figures are not yet published.",
};

export const GMS = {
  eyebrow: "05 — Intelligence",
  title: "A geothermal plant that thinks.",
  intro:
    "AI GMS pairs a Large Language Model with a Large Action Model — Llama 3.3 70B reading and acting through SCADA and PLC systems — to run the well field with millisecond precision.",
  badge: "Phase 0 · Simulated operation",
  kpis: [
    { label: "Thermal output", value: 472, unit: "MWth", decimals: 0 },
    { label: "Parasitic load", value: 2.4, unit: "MWe", decimals: 1 },
    { label: "Net power", value: 54, unit: "MWe", decimals: 0 },
    { label: "AI confidence", value: 94.5, unit: "%", decimals: 1 },
  ],
  loop: [
    { id: "scada", label: "SCADA + PLC", sub: "Live telemetry" },
    { id: "llm", label: "LLM", sub: "Llama 3.3 70B · reasons" },
    { id: "lam", label: "LAM", sub: "Acts · millisecond control" },
    { id: "wells", label: "Well field", sub: "Nanofoam · pumps · valves" },
  ],
  capabilities: [
    "Real-time optimisation",
    "Predictive maintenance",
    "Resource management",
    "Adaptive control",
    "Efficiency optimisation",
    "Autonomous decision-making",
  ],
  steps: [
    { n: "01", t: "SCADA integration", d: "Direct integration with PLC and SCADA systems." },
    { n: "02", t: "Nanofoam injection control", d: "Nitrogen-hybrid nanofoam dosing tuned in real time." },
    { n: "03", t: "Parasitic load reduction", d: "Pump scheduling and load balancing across the field." },
    { n: "04", t: "Predictive resource management", d: "Maintenance for pumps, turbines, wells, nanofluid and heat exchangers." },
  ],
  hybrid: {
    title: "CH₄ hybrid, single-well test",
    items: [
      { label: "Efficiency", value: "57%" },
      { label: "Output", value: "59.2 MWe" },
      { label: "CO₂ offset", value: "35.9%" },
    ],
  },
  opex: {
    value: 39.6,
    label: "operating-cost reduction",
    sub: "Target of $0.022 / kWh reached in simulated operation",
  },
  recommendations: [
    "Optimise pump scheduling across production branches",
    "Load-balance pumps via LAM + SCADA",
    "Schedule global maintenance: pump, turbine, wells, nanofluid, heat exchanger",
    "Hold injection temperature within nanofoam envelope",
    "Raise net output while parasitic load stays under 8%",
  ],
  footnote: "Phase 0 results are from simulated operation (White Paper V-1F).",
};

export const IMPACT = {
  eyebrow: "06 — Impact",
  title: "Carbon negative.",
  titleAccent: "75% less water.",
  intro:
    "A conventional AI campus draws on the grid and evaporates water by the billion litres. Xerxes makes its own power and keeps water out of the primary loop: a sealed nano-CO₂ circuit cools the racks, and water is used only in the secondary loop. That is about 25% of a conventional facility with conventional cooling, and about 15% with liquid or immersion cooling. The comparison below is modelled for a facility of equal scale.",
  bars: [
    {
      label: "CO₂ per year",
      industry: { text: "500,000 t", pct: 100 },
      xerxes: { text: "−72,000 t", pct: 14.4, negative: true },
    },
    {
      label: "Water per year",
      industry: { text: "50 B litres", pct: 100 },
      xerxes: { text: "≈ 12.5 B litres · 25%", pct: 25 },
      alt: { label: "Xerxes · liquid or immersion cooling", text: "≈ 7.5 B litres · 15%", pct: 15 },
      note: "Water is used only in the secondary loop. It never enters the primary nano-CO₂ circuit, where it could degrade the pipes.",
    },
    {
      label: "Power usage effectiveness",
      industry: { text: "1.5 – 2.0", pct: 100 },
      xerxes: { text: "1.05", pct: 52.5 },
    },
  ],
  equivalences: [
    { value: "72,000", unit: "t CO₂", label: "eliminated every year — roughly 15,000 cars off the road" },
    { value: "75", unit: "% less water", label: "than a conventional AI campus with conventional cooling, and up to 85% less with liquid or immersion cooling" },
  ],
  footnote:
    "Design targets and modelled figures per White Paper V-1F (02 May 2025). Industry baselines are company estimates. Not audited operating data.",
};

export const SECURITY = {
  eyebrow: "07 — Sovereignty",
  title: "Your compute.",
  titleAccent: "Your jurisdiction. Your terms.",
  intro:
    "Because Xerxes needs no grid and no external cooling supply, it can stand apart: physically, politically and digitally.",
  pillars: [
    { t: "Off-grid independence", d: "Self-powered by closed-loop geothermal. No dependency on a national grid or fuel supply." },
    { t: "Physical isolation", d: "A hardened, self-contained campus with a controlled perimeter and no shared infrastructure." },
    { t: "Military-grade security", d: "Layered physical and cyber security designed for sovereign and defence-grade workloads." },
    { t: "Quantum encryption", d: "Quantum-secure encryption protecting data in transit and at rest." },
  ],
  control: "100% data control",
};

export const PROGRAMME = {
  eyebrow: "08 — Programme status",
  status: "Standby",
  title: "Kingdom of Saudi Arabia:",
  titleAccent: "paused, not cancelled.",
  body:
    "Delivery of the first Xerxes facility in the Kingdom has slowed as a result of regional conflict and instability. Our commitment, and our partners', has not changed. We will resume together as soon as conditions allow, and we are not committing to dates until then.",
  humane: "Our thoughts are with everyone affected across the region.",
  statusRows: [
    { k: "Programme", v: "On standby" },
    { k: "Commitment", v: "Unchanged" },
    { k: "Approach", v: "Resume with our partners" },
    { k: "Timeline", v: "Re-baselined on resumption · no dates committed" },
  ],
  phases: [
    { n: "0", t: "AI GMS & EQG proven", d: "Control intelligence and the geothermal system validated in simulation.", status: "Complete" },
    { n: "1", t: "First Xerxes facility", d: "Kingdom of Saudi Arabia.", status: "Standby" },
    { n: "2", t: "Second Middle East facility", d: "Follows Phase 1.", status: "Planned" },
    { n: "3", t: "Two further locations", d: "Four Xerxes facilities worldwide.", status: "Planned" },
  ],
  resume: [
    { n: "01", t: "Conditions allow", d: "Regional conditions permit safe, responsible delivery." },
    { n: "02", t: "Partners re-align", d: "Scope, schedule and site readiness confirmed together." },
    { n: "03", t: "Mobilise & re-baseline", d: "Delivery restarts. We announce it here first." },
  ],
  cta: "Register interest — be told first",
};

export const COMPANY = {
  eyebrow: "09 — The company",
  title: "Three companies. One system.",
  mission: "To deliver autonomous, sustainable computing power for the AI-driven future.",
  vision: "To become the world's dominant force in sovereign, green AI computing.",
  entities: [
    {
      id: "geios",
      name: "GEIOS Technologies",
      year: "2019",
      yearNote: "Incheon · the heat source",
      place: "Incheon, Korea",
      role: "Pioneers of Enhanced Quantum Geothermal (EQG).",
      detail: {
        kicker: "The heat source",
        summary:
          "GEIOS brings the earth to the machine: Enhanced Quantum Geothermal wells, nanofoam stimulation and the AI GMS that runs the well field. Xerxes is developed by the XERXES Division of GEIOS.",
        timeline: [
          { when: "2019", what: "GEIOS Technologies, Incheon, Korea", body: "Pioneers of Enhanced Quantum Geothermal (EQG)." },
          { when: "2023", what: "Partnership with Aiden Digital Labs on Xerxes", body: "AI infrastructure and high-performance computing join the geothermal campus." },
          { when: "End of 2025", what: "Partnership extended to the DTF", body: "The Dark Token Factory, the small model, joins the programme." },
        ],
        brings: ["EQG wells: 12 wells, 120 branches, ~5 km", "Nanofoam stimulation", "AI GMS: LLM + LAM through SCADA"],
      },
    },
    {
      id: "kaigen",
      name: "Kaigen Technologies",
      year: "2021",
      yearNote: "Casper · cooling and capture",
      place: "Casper, Wyoming, USA",
      role: "CO₂ cooling and carbon capture.",
      detail: {
        kicker: "The cold side",
        summary:
          "Kaigen carries the heat away and the carbon down: the sealed nano-CO₂ cooling loop that water never enters, and the carbon capture that makes the campus carbon negative by design.",
        timeline: [
          { when: "2021", what: "Kaigen Technologies, Casper, Wyoming", body: "CO₂ cooling and carbon capture." },
        ],
        brings: ["Sealed nano-CO₂ primary cooling loop", "Water only in the secondary loop", "Carbon capture"],
      },
    },
    {
      id: "aiden",
      name: "Aiden Digital Labs",
      year: "2023",
      yearNote: "GEIOS partner · Xerxes 2023 · DTF end 2025",
      place: "London, UK",
      role: "AI infrastructure and high-performance computing. Designers of the Dark Token Factory data center.",
      detail: {
        kicker: "The compute partner",
        summary:
          "Aiden Digital Labs designs the AI infrastructure that the geothermal heat feeds. Its partnership with GEIOS began in 2023 with Xerxes and extended to the Dark Token Factory at the end of 2025.",
        timeline: [
          { when: "2023", what: "Partnership with GEIOS on Xerxes", body: "Aiden joins GEIOS on Xerxes, the Goliath: AI infrastructure and high-performance computing for the geothermal campus." },
          { when: "End of 2025", what: "Partnership extended to the DTF", body: "The partnership extends to the Dark Token Factory, the small model. Aiden designs the DTF data center." },
        ],
        brings: ["AI infrastructure and HPC design", "Dark Token Factory data center design", "GEIOS partner · Xerxes 2023 · DTF end 2025"],
      },
    },
  ],
  leaders: [
    { name: "Shad Am Serroune", role: "CEO, GEIOS Technologies" },
    { name: "Atif Serroune", role: "Chief Business Operation, GEIOS" },
    { name: "Dr. Lee Young Soo", role: "CTO, GEIOS" },
    { name: "Lee Dong Kyu", role: "CIO, XERXES Division of GEIOS" },
    { name: "Kim Sanghwan", role: "CMO, GEIOS" },
    { name: "Hyungsun Lee", role: "Chief Innovation Manager, Xerxes and GEIOS" },
  ],
};

export const ACCESS = {
  eyebrow: "Request access",
  title: "The documents behind the design.",
  items: [
    {
      id: "whitepaper",
      kind: "White paper",
      title: "Xerxes AI DC Deployment — V-1F",
      meta: "02 May 2025 · GEIOS DC Division",
      interest: "Investor",
      cta: "Request the white paper",
    },
    {
      id: "podcast",
      kind: "Podcast · Ep. 01",
      title: "The Future of Off-Grid AI Infrastructure",
      meta: "≈ 15 min · with Dr. Lee Young Soo, CTO GEIOS",
      interest: "Press",
      cta: "Request the episode",
    },
    {
      id: "film",
      kind: "Film",
      title: "The full walkthrough film",
      meta: "Private · shared on request",
      interest: "Partnership",
      cta: "Request private access",
    },
  ],
};

export const CONTACT = {
  eyebrow: "10 — Contact",
  title: "Build with us.",
  titleAccent: "Above ground. Below ground.",
  intro:
    "Tell us about your compute, your site or your capital. A member of the team will reply personally.",
  interests: [
    "DTF — Dark Token Factory",
    "Xerxes — hyperscale campus",
    "Partnership",
    "Investor",
    "Press",
    "KSA programme updates",
  ],
  offices: [
    {
      name: "GEIOS Technologies",
      lines: ["C-3805, 323 Incheon Tower-Daero", "Yeonsu-gu, Incheon", "Republic of Korea"],
      email: "contact@geios.energy",
    },
    {
      name: "Aiden Digital Labs UK",
      lines: ["71-75 Shelton Street", "Covent Garden, London WC2H 9JQ", "United Kingdom"],
      email: "contact@aiden.ventures",
    },
    {
      name: "Kaigen Technologies",
      lines: ["5830 E 2nd St, Suite 8", "Casper, Wyoming 82609", "United States"],
      email: "contact@kaigen.io",
    },
  ],
};

export const MARQUEE = [
  "OFF-GRID",
  "CARBON-NEGATIVE",
  "AI-OPTIMIZED",
  "GEOTHERMAL-EMBEDDED",
  "12 WELLS",
  "120 BRANCHES",
  "5 KM DEEP",
  "NANO-SHELL ROOF",
  "1.5 EXAFLOPS",
  "PUE 1.05",
  "75% LESS WATER",
  "150 kW / RACK",
];

/** The well pad, as a stand-alone chapter after the descent (Xerxes variant of the diagram). */
export const PAD_SECTION = {
  eyebrow: "03 — The technology · The well pad",
  title: "One wellhead.",
  titleAccent: "Ten branches.",
  intro:
    "Every Xerxes well is a pad of its own: a short copper casing, a ring of ten slots, and a fountain of branches that peel off into hotter rock, six producing and four injecting in one closed loop. Switch the pad between four and ten branches and watch it grow.",
  parts: [
    { k: "Colloidal conductor casing", v: "Short and copper: it only has to reach the ring, about an eighth of the way down." },
    { k: "Ten reserve slots", v: "Four open at first. Six stay sealed until the pad grows, then open one by one." },
    { k: "Motherbore probe", v: "Acoustic, thermal and EM sensing feeds an AI 3D subsurface model of the rock." },
    { k: "N₂ nanofoam, AI-timed", v: "Opens the heat pathways around each branch, timed by that model." },
  ],
  figures: [
    { value: "50", unit: "MW", label: "per well, modelled" },
    { value: "8", unit: "%", label: "parasitic load" },
    { value: "56", unit: "%", label: "better heat transfer" },
  ],
  footnote: "Schematic, not to scale. Branch depths are fractions of total depth. 50 MW per well is a modelled design value, not audited operating data.",
};


/* ---------------------------------------------------------------------------------------------
 * "Six rooms. One machine." pop-ups. Marker x / y are percentages of the render.
 * ------------------------------------------------------------------------------------------- */
export type RoomDiagram = "rings" | "loop" | "pad";
export const ROOMS: Record<
  string,
  {
    zone: string;
    accent: string;
    body: string;
    parts: { x: number; y: number; t: string; d: string }[];
    figures: { v: string; l: string }[];
    stop: number;
    stopLabel: string;
    diagram?: RoomDiagram;
    diagramLabel?: string;
    twinLink?: boolean;
  }
> = {
  hub: {
    zone: "Hub · Core",
    accent: "The core that runs the campus.",
    body:
      "The hub sits at the centre of the torus. It holds the AI control layer and the live digital twin, and four separate infrastructure rings that interlace power and cooling out to six production pods along ribbed bridges. Two rings are active; two wait on automated standby.",
    parts: [
      { x: 50, y: 40, t: "Central court", d: "The AI control layer and the live digital twin of every pod, ring and well." },
      { x: 29, y: 61, t: "Ring corridor", d: "Four separate rings route power and cooling around the core: two active, two on standby." },
      { x: 12, y: 36, t: "Bridge to a pod", d: "Each of the six pods is joined by a ribbed bridge carrying power, cooling and fabric." },
      { x: 89, y: 12, t: "Production pod", d: "Compute, storage, cooling and two wellheads under a nano-composite lattice shell." },
    ],
    figures: [
      { v: "4", l: "Separate rings · 2 active + 2 standby" },
      { v: "6", l: "Production pods" },
      { v: "Tier IV", l: "Design target, not certified" },
    ],
    stop: 1,
    stopLabel: "Walk the hub in 3D",
    diagram: "rings",
    diagramLabel: "Ring diagram",
  },
  hall: {
    zone: "Pod · Compute hall",
    accent: "Row after row, one fabric.",
    body:
      "Inside each pod, contained cold aisles follow the radial layout. Racks are liquid cooled at up to 150 kW each, overhead headers carry the sealed nano-CO₂ loop, and a pod registers itself on the fabric the moment it comes online.",
    parts: [
      { x: 50, y: 74, t: "Contained cold aisle", d: "Rack fronts face each other; the backs open onto the hot aisle." },
      { x: 40, y: 13, t: "Overhead CO₂ headers", d: "The sealed primary loop runs above every row. No water inside it." },
      { x: 31, y: 46, t: "High-density rack row", d: "Up to 150 kW per rack, built for next-generation GPUs, TPUs and NPUs." },
      { x: 86, y: 17, t: "Power busway", d: "An overhead busway feeds each row from the pod's isolated bus." },
    ],
    figures: [
      { v: "1.05", l: "Design PUE" },
      { v: "81%", l: "Site power to compute · design" },
      { v: "1.5 EF", l: "Per site · up to" },
    ],
    stop: 4,
    stopLabel: "Walk the compute hall in 3D",
  },
  cooling: {
    zone: "Pod · Cooling plant",
    accent: "A quarter of the water.",
    body:
      "Heat leaves the racks in a sealed nano-CO₂ primary loop. Water never enters it, because water could degrade the pipes of the nano-CO₂ circuit. Water is used only in the secondary loop: about 25% of a conventional data center with conventional cooling, and about 15% with liquid or immersion cooling. Waste heat drives lithium-bromide absorption chillers, and the roof shell adds wind and cold.",
    parts: [
      { x: 78, y: 62, t: "Absorption chiller", d: "A lithium-bromide cycle driven by waste heat. No compressors." },
      { x: 88, y: 15, t: "Primary nano-CO₂ header", d: "The sealed loop from the racks. Water never enters it." },
      { x: 12, y: 70, t: "Secondary loop", d: "The only place water is used: ≈ 25% of a conventional site, ≈ 15% with liquid or immersion cooling." },
      { x: 50, y: 47, t: "Shell intake", d: "Wind and cold captured by the roof shell feed the loop." },
    ],
    figures: [
      { v: "≈ 25%", l: "Water vs conventional DC · conventional cooling" },
      { v: "≈ 15%", l: "With liquid or immersion cooling" },
      { v: "0 L", l: "Water in the primary nano-CO₂ loop" },
    ],
    stop: 6,
    stopLabel: "Walk the cooling plant in 3D",
    diagram: "loop",
    diagramLabel: "Loop diagram",
  },
  rack: {
    zone: "Pod · Rack",
    accent: "Where the heat is made.",
    body:
      "Every rack is liquid cooled into the sealed nano-CO₂ loop. The compute layer is vendor-agnostic: NVIDIA Vera Rubin, next-generation AMD Instinct, advanced TPUs, NPUs and new high-density chips share one fabric.",
    parts: [
      { x: 51, y: 31, t: "Coolant return", d: "The warm side of the cold-plate loop, carrying heat toward the chillers." },
      { x: 37, y: 37, t: "Accelerator tray", d: "High-density GPU, TPU or NPU sleds on a common memory stack." },
      { x: 46, y: 22, t: "Fabric links", d: "≥ 80 GB/s per node, with redundant paths into the spine." },
    ],
    figures: [
      { v: "150 kW", l: "Per rack · design" },
      { v: "≥ 80 GB/s", l: "Per node fabric" },
      { v: "0 L", l: "Water in the primary loop" },
    ],
    stop: 3,
    stopLabel: "Walk the rack in 3D",
  },
  command: {
    zone: "Hub · Command",
    accent: "People supervise. AI GMS acts.",
    body:
      "Operators watch what the AI GMS sees: a Large Language Model reading SCADA and PLC telemetry, and a Large Action Model acting on pumps, valves and set-points in milliseconds. Every change is rehearsed on the digital twin first.",
    parts: [
      { x: 60, y: 50, t: "Subsurface model", d: "A live 3D model of the rock, branches and heat zones from the motherbore probes." },
      { x: 80, y: 29, t: "Forecast wall", d: "Demand, storage, stability and cooling forecasts from the digital twin." },
      { x: 20, y: 57, t: "Operator console", d: "People set policy and approve; the LAM executes within it." },
    ],
    figures: [
      { v: "94.5%", l: "AI confidence · Phase 0 simulated" },
      { v: "< 8%", l: "Parasitic load target" },
      { v: "39.6%", l: "Opex reduction · simulated" },
    ],
    stop: 1,
    stopLabel: "Walk the hub's twin in 3D",
    twinLink: true,
  },
  wellpad: {
    zone: "Pod · Wellpad",
    accent: "Where the heat comes up.",
    body:
      "Each pod sits over two wellheads fifty metres apart. Below each one, a short copper casing reaches a ring of ten slots, and ten directional branches fan out into hotter rock toward five kilometres deep: six producing, four injecting. Heat becomes electricity right beside the well.",
    parts: [
      { x: 50, y: 54, t: "Wellhead", d: "One of twelve. Ten directional branches open below it." },
      { x: 47, y: 66, t: "Ring of ten slots", d: "Four open on day one; six stay sealed in reserve until the pad grows." },
      { x: 61, y: 57, t: "Hot and return lines", d: "Hot fluid out, cooled fluid back: one closed loop." },
      { x: 72, y: 50, t: "Heat-to-electric skid", d: "Conversion beside the well keeps losses under 5% (design)." },
    ],
    figures: [
      { v: "10", l: "Branches per well · 6 + 4" },
      { v: "50 m", l: "Between wells" },
      { v: "~5 km", l: "Deepest branches" },
    ],
    stop: 8,
    stopLabel: "Walk the wellpad in 3D",
    diagram: "pad",
    diagramLabel: "Below ground",
  },
};
export const ROOMS_NOTE = "Illustrative renders and schematics. Figures are design targets or modelled values (White Paper V-1F), not measured performance.";

/* ---------------------------------------------------------------------------------------------
 * Digital twin (AI GMS). Everything here is an illustrative simulation.
 * ------------------------------------------------------------------------------------------- */
export type TwinModel = "dtf" | "xerxes";
export type TwinCap = "demand" | "storage" | "stability" | "cooling" | "maintenance";
export type TwinAnchor =
  | "pod2" | "pod5" | "hub" | "vault" | "ring" | "shell" | "well"
  | "modA" | "modB" | "bess" | "bus" | "tanks" | "orc";
type TwinScene = {
  headline: string;
  body: string;
  chart: string;
  kpis: { v: string; l: string }[];
  log: [string, string][];
  callouts: { at: TwinAnchor; text: string }[];
};
export const TWIN: {
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  badge: string;
  models: Record<TwinModel, { name: string; kind: string; line: string }>;
  caps: { id: TwinCap; n: string; t: string; short: string }[];
  scenes: Record<TwinModel, Record<TwinCap, TwinScene>>;
  footnote: string;
} = {
  eyebrow: "05 — Intelligence · Digital twin",
  title: "A twin that sees",
  accent: "tomorrow.",
  intro:
    "AI GMS keeps a live digital twin of every site, from a single DTF well pad to the full Xerxes campus. It reads SCADA telemetry, forecasts what the next hours will ask of the machine, and rehearses each action on the twin before it touches steel.",
  badge: "Illustrative simulation · Phase 0",
  models: {
    dtf: { name: "DTF", kind: "The small model", line: "One well · one two-level building · 20 MWe" },
    xerxes: { name: "XERXES", kind: "The Goliath", line: "Hub + six pods · 12 wells · 120 branches" },
  },
  caps: [
    { id: "demand", n: "01", t: "Predict demand", short: "Forecast the load hours ahead" },
    { id: "storage", n: "02", t: "Store power", short: "Charge before the peak" },
    { id: "stability", n: "03", t: "Hold stability", short: "Absorb steps and faults" },
    { id: "cooling", n: "04", t: "Tune cooling", short: "Cool ahead of the heat" },
    { id: "maintenance", n: "05", t: "Prevent failure", short: "Fix it before it breaks" },
  ],
  scenes: {
    xerxes: {
      demand: {
        headline: "Forecasts the next training wave.",
        body: "The twin learns each pod's job mix and forecasts its load hours ahead, so the well field ramps before the racks do instead of chasing them.",
        chart: "Campus compute load · % of capacity",
        kpis: [
          { v: "24 h", l: "Rolling forecast horizon" },
          { v: "94.5%", l: "AI confidence · Phase 0" },
          { v: "6", l: "Pods forecast one by one" },
        ],
        log: [
          ["SCADA", "Pods 1–6 telemetry in · campus load 68%"],
          ["LLM", "Training wave forecast at 18:00 · +22% for 5 h"],
          ["LAM", "Ramp branch flow on pods 2 and 5 · ORC set-point +6%"],
        ],
        callouts: [
          { at: "pod2", text: "Pod 2 · +22% at 18:00" },
          { at: "pod5", text: "Pod 5 · steady" },
        ],
      },
      storage: {
        headline: "Banks heat before the peak.",
        body: "The NanoVault is a thermal store. The twin charges it in quiet hours and draws it down through the peak, with up to seven days of ride-through if subsurface input stops. A biogas bus stands in for batteries.",
        chart: "NanoVault thermal reserve · % full",
        kpis: [
          { v: "7 days", l: "NanoVault ride-through · design" },
          { v: "0", l: "Battery UPS" },
          { v: "< 15 s", l: "Biogas hot-standby start" },
        ],
        log: [
          ["SCADA", "NanoVault reserve 61% · well input steady"],
          ["LLM", "Peak in 4 h · charge to 85% beforehand"],
          ["LAM", "Divert 9% of well heat to the vault · release at peak"],
        ],
        callouts: [{ at: "vault", text: "NanoVault · charging" }],
      },
      stability: {
        headline: "Turns a fault into an event.",
        body: "Four separate rings interlace power and cooling around the hub. When the twin sees a ring drift, the LAM moves load onto a standby ring in milliseconds, and the bus barely notices.",
        chart: "Bus voltage deviation · %",
        kpis: [
          { v: "2 + 2", l: "Active + standby rings" },
          { v: "12 ms", l: "Simulated ring transfer" },
          { v: "Tier IV", l: "Design target, not certified" },
        ],
        log: [
          ["SCADA", "Ring A voltage dip −3.1% · pod 4 feed"],
          ["LLM", "Signature matches breaker fatigue · isolate ring A"],
          ["LAM", "Transfer pod 4 to standby ring C · 12 ms"],
        ],
        callouts: [{ at: "ring", text: "Ring A → standby ring C" }],
      },
      cooling: {
        headline: "Cools ahead of the heat.",
        body: "Knowing when the load will rise, the twin pre-cools the nano-CO₂ loop and stages the absorption chillers before rack temperatures climb, drawing on the roof shell's wind and cold first.",
        chart: "Rack inlet temperature · °C",
        kpis: [
          { v: "1.05", l: "Design PUE" },
          { v: "150 kW", l: "Per rack · design" },
          { v: "≈ 25%", l: "Water vs conventional · secondary loop" },
        ],
        log: [
          ["SCADA", "Rack inlet 24.1 °C · shell intake 11 °C"],
          ["LLM", "Load rise in 40 min · pre-cool the loop by 1.5 °C"],
          ["LAM", "Open shell intake dampers · stage chiller 3"],
        ],
        callouts: [{ at: "shell", text: "Shell intake · wind and cold" }],
      },
      maintenance: {
        headline: "Finds the fault weeks ahead.",
        body: "Every pump, turbine, well, nanofluid line and heat exchanger has a health curve on the twin. When one bends, AI GMS books the repair into a quiet window and tests the fix on the twin first.",
        chart: "Pump P-2B health index · days",
        kpis: [
          { v: "Weeks", l: "Predictive-maintenance horizon" },
          { v: "5", l: "Asset classes · pumps to exchangers" },
          { v: "Twin-first", l: "Every change rehearsed" },
        ],
        log: [
          ["SCADA", "Pump P-2B vibration +18% over 9 days"],
          ["LLM", "Bearing-wear signature · failure risk in ~3 weeks"],
          ["LAM", "Service window booked · flow moved to well 2A"],
        ],
        callouts: [{ at: "well", text: "P-2B · bearing wear · ~3 weeks" }],
      },
    },
    dtf: {
      demand: {
        headline: "Matches one well to the load.",
        body: "On a single pad, the twin forecasts the load on Compute Modules A and B and moves the ORC set-point ahead of it, anywhere between 2 and 20 MWe.",
        chart: "Pad compute load · MW-IT",
        kpis: [
          { v: "2–20", l: "MWe, dynamically scalable" },
          { v: "2", l: "Compute modules forecast" },
          { v: "0", l: "People on site, routine" },
        ],
        log: [
          ["SCADA", "Modules A + B at 14.2 MW-IT"],
          ["LLM", "Inference peak at 20:00 · +3 MW for 2 h"],
          ["LAM", "Raise ORC-DC output · pre-charge the BESS"],
        ],
        callouts: [
          { at: "modA", text: "Module A · peak at 20:00" },
          { at: "modB", text: "Module B · steady" },
        ],
      },
      storage: {
        headline: "A DC buffer, charged on schedule.",
        body: "The GEOFLEX BESS sits on the native DC bus. The twin charges it ahead of predicted peaks and discharges it through them, so the well runs steady while the compute does not.",
        chart: "GEOFLEX BESS state of charge · %",
        kpis: [
          { v: "10 MW", l: "GEOFLEX BESS · 2 × 5 MW" },
          { v: "20 MWh", l: "Closed-loop DC buffer" },
          { v: "Native DC", l: "No transformer in the path" },
        ],
        log: [
          ["SCADA", "BESS state of charge 48%"],
          ["LLM", "Peak in 3 h · charge to 90% on surplus ORC output"],
          ["LAM", "Charge at 2.5 MW · release through the peak"],
        ],
        callouts: [{ at: "bess", text: "GEOFLEX BESS · charging" }],
      },
      stability: {
        headline: "Holds the DC bus steady.",
        body: "There is no grid to lean on. When the compute load steps, the BESS answers first and the ORC follows, while the twin keeps the native DC bus inside its band.",
        chart: "DC bus voltage deviation · %",
        kpis: [
          { v: "0", l: "Substation transformers" },
          { v: "< 1 s", l: "Simulated BESS response" },
          { v: "1", l: "Well · one closed loop" },
        ],
        log: [
          ["SCADA", "Load step +4 MW · DC bus dip"],
          ["LLM", "Transient, not a fault · bridge with the BESS"],
          ["LAM", "BESS discharge 4 MW · ORC ramps over 90 s"],
        ],
        callouts: [{ at: "bus", text: "Native DC bus · held" }],
      },
      cooling: {
        headline: "Chills with the tail brine.",
        body: "Tail-brine absorption cooling chills the immersion tanks and the BESS. The twin times the chillers against the forecast load. Water stays out of the nano-CO₂ circuit, in the secondary loop only.",
        chart: "Immersion tank inlet · °C",
        kpis: [
          { v: "20.57", l: "MWth absorption cooling" },
          { v: "1.04", l: "PUE target" },
          { v: "≈ 15%", l: "Water vs conventional · immersion" },
        ],
        log: [
          ["SCADA", "Tank inlet 31 °C · tail brine steady"],
          ["LLM", "Load rise at 20:00 · pre-chill the tanks"],
          ["LAM", "Raise LiBr/NH₃ duty · BESS cooling held"],
        ],
        callouts: [{ at: "tanks", text: "Absorption cooling · pre-chill" }],
      },
      maintenance: {
        headline: "Robots fix it before it breaks.",
        body: "The twin watches the ORC, the pumps, the BESS and every server. When a part trends toward failure, a robot swaps it in the next quiet window, supervised remotely.",
        chart: "ORC feed pump health index · days",
        kpis: [
          { v: "≤ 15 min", l: "Robot server swap · target" },
          { v: "0", l: "Routine staff on site" },
          { v: "Weeks", l: "Fault-warning horizon" },
        ],
        log: [
          ["SCADA", "ORC feed pump vibration +14% over 6 days"],
          ["LLM", "Seal-wear signature · act within 2 weeks"],
          ["LAM", "Swap booked 03:00 · Module B load moved to A"],
        ],
        callouts: [{ at: "orc", text: "ORC feed pump · seal wear" }],
      },
    },
  },
  footnote:
    "Illustrative simulation of AI GMS behaviour. Values are representative of Phase 0 simulated operation and design targets in White Paper V-1F, not measured performance.",
};
