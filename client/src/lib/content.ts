/**
 * All copy + figures for the Xerxes site live here so they are easy to edit.
 *
 * Source of truth: the previous xerxes.nexus site and White Paper V-1F (02 May 2025).
 * Every performance figure is a DESIGN TARGET or MODELLED value, not audited operating data.
 * NOTE: the DTF (compact model) figures are mapped from the previous site's "Spartan" compact-model row.
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

/** Hero HUD phases keyed to the loop film (seconds into the 19s loop) */
export const HERO_PHASES = [
  { from: 0, to: 7.4, tag: "01 / SURFACE", line: "A campus that asks nothing of the grid." },
  { from: 7.4, to: 15, tag: "02 / DESCENT", line: "One shaft. Ten branches. Fifty megawatts a well." },
  { from: 15, to: 19.1, tag: "03 / COMPUTE", line: "Heat becomes intelligence." },
];

export const HERO_TELEMETRY = [
  { value: 1.5, decimals: 1, unit: "EF", label: "Compute, up to" },
  { value: 1.05, decimals: 2, unit: "", label: "Design PUE" },
  { value: 150, decimals: 0, unit: "kW", label: "Per rack" },
  { value: 0, decimals: 0, unit: "L", label: "Water for cooling" },
  { value: 100, decimals: 0, unit: "%", label: "Off-grid" },
];

export const MANIFESTO = {
  eyebrow: "01 — The premise",
  text:
    "Every other data center is a tenant of someone else's grid. Xerxes is its own power plant: a campus built over a closed-loop geothermal system that turns the heat of the earth directly into high-density AI compute. No grid. No water. No carbon. Just intelligence, at scale.",
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
  title: "Small enough to deploy anywhere.",
  titleAccent: "Large enough to change everything.",
  intro:
    "The DTF is the compact campus: one compute pod on a small hub. Xerxes is the Goliath: a central hub feeding six pods, ten geothermal branches and up to 1.5 ExaFLOPS. Same architecture. Radically different scale.",
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
      kind: "The compact model",
      line: "One pod. One hub. Sovereign AI compute in a footprint you can place almost anywhere.",
      pods: "1",
      compute: "Up to 500 PetaFLOPS",
    },
    {
      id: "xerxes",
      name: "XERXES",
      kind: "The Goliath",
      line: "A central hub, six compute pods, ten geothermal branches. A campus that is its own power plant.",
      pods: "6",
      compute: "Up to 1.5 ExaFLOPS",
    },
  ],
  specs: [
    { k: "Compute", dtf: "Up to 500 PetaFLOPS", xerxes: "Up to 1.5 ExaFLOPS" },
    { k: "GPU platform", dtf: "NVIDIA GH200 Grace Hopper", xerxes: "NVIDIA Blackwell, 5th gen (DGX GB200)" },
    { k: "Interconnect", dtf: "NVLink 4.0 + Quantum-3", xerxes: "NVLink 5.0 + Quantum-3 · 80 GB/s+ per node" },
    { k: "Design PUE", dtf: "1.2 – 1.3", xerxes: "1.05 – 1.1" },
    { k: "Layout", dtf: "1 compute pod + compact hub", xerxes: "Central hub + 6 compute pods" },
    { k: "Power", dtf: "Geothermal, off-grid", xerxes: "Geothermal, off-grid · 10-branch EQG" },
  ],
  footnote: "Figures are design targets from White Paper V-1F. DTF values are for the compact model.",
};

export const DESCENT = {
  eyebrow: "03 — The technology",
  title: "Power from below.",
  /** Order matches the scene beats: surface · shaft · branches · network · to compute */
  steps: [
    {
      tag: "Surface",
      title: "A campus that asks nothing of the grid.",
      body: "Above ground: a white, low-profile campus engineered for minimal environmental footprint. Below it: the power station.",
      stat: null,
    },
    {
      tag: "Nanomaterial pipes",
      title: "56% more heat, moved.",
      body: "Down a single closed-loop shaft, nanomaterial-enhanced pipework lifts heat transfer by 56% over conventional casing, pulling more usable energy from every metre of rock.",
      stat: { value: "56", unit: "%", label: "better heat transfer" },
    },
    {
      tag: "Enhanced Quantum Geothermal",
      title: "One shaft. Ten branches.",
      body: "At depth the shaft fans into ten branches — six production, four injection — delivering up to 50 MW per well. Nothing leaves the loop. Nothing is burned.",
      stat: { value: "50", unit: "MW", label: "per well" },
    },
    {
      tag: "Parasitic load",
      title: "Only 8% to keep the loop alive.",
      body: "Pumps, controls and conditioning take a fraction of what the field produces. The rest goes straight to compute.",
      stat: { value: "8", unit: "%", label: "parasitic load" },
    },
    {
      tag: "Heat becomes intelligence",
      title: "Earth's heat, converted to compute.",
      body: "In AI GMS simulation, 472 MWth of thermal energy yields 54 MWe net — continuous, weather-proof power for the densest racks on the planet.",
      stat: { value: "54", unit: "MWe", label: "net, modelled" },
    },
  ],
  footnote: "Modelled values from AI GMS Phase 0 simulation and White Paper V-1F.",
};

export const HALL = {
  eyebrow: "04 — Compute",
  title: "The densest racks on earth,",
  titleAccent: "powered by the ground beneath them.",
  intro:
    "Inside the pods: Blackwell-class GPUs on NVLink 5.0 and Quantum-3 InfiniBand, liquid-cooled through a closed CO₂ loop, at 150 kW per rack.",
  callouts: [
    { value: "150", unit: "kW", label: "per rack — highest density in the industry" },
    { value: "144,000+", unit: "", label: "Blackwell GPUs (NVIDIA DGX GB200)" },
    { value: "1.5", unit: "EF", label: "ExaFLOPS peak design compute" },
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
      caption: "Kaigen closed-loop CO₂ cooling. No water. No compromise.",
    },
    {
      key: "rack",
      title: "Rack, close up",
      caption: "150 kW per rack. Liquid-cooled. Built for Blackwell.",
    },
    {
      key: "command",
      title: "AI command centre",
      caption: "Autonomous operation, human oversight.",
    },
    {
      key: "wellpad",
      title: "The wellpad",
      caption: "Where the closed loop meets the surface. Compact, quiet, sealed.",
    },
  ],
  note: "Illustrative visualisations of the Xerxes design.",
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
  titleAccent: "Water-free.",
  intro:
    "A conventional AI campus draws on the grid and boils away water. Xerxes does neither. The comparison below is modelled for a facility of equal scale.",
  bars: [
    {
      label: "CO₂ per year",
      industry: { text: "500,000 t", pct: 100 },
      xerxes: { text: "−72,000 t", pct: 14.4, negative: true },
    },
    {
      label: "Water per year",
      industry: { text: "50 B litres", pct: 100 },
      xerxes: { text: "0 litres", pct: 0 },
    },
    {
      label: "Power usage effectiveness",
      industry: { text: "1.5 – 2.0", pct: 100 },
      xerxes: { text: "1.05", pct: 52.5 },
    },
  ],
  equivalences: [
    { value: "72,000", unit: "t CO₂", label: "eliminated every year — roughly 15,000 cars off the road" },
    { value: "30", unit: "B litres", label: "of water saved every year — a city of 80,000 people" },
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
      name: "GEIOS Technologies",
      year: "2019",
      place: "Incheon, Korea",
      role: "Pioneers of Enhanced Quantum Geothermal (EQG).",
    },
    {
      name: "Aiden Digital Labs",
      year: "2020",
      place: "London, UK",
      role: "AI infrastructure and high-performance computing.",
    },
    {
      name: "Kaigen Technologies",
      year: "2021",
      place: "Casper, Wyoming, USA",
      role: "CO₂ cooling and carbon capture.",
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
    "DTF — compact model",
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
  "1.5 EXAFLOPS",
  "PUE 1.05",
  "ZERO WATER",
  "150 kW / RACK",
];
