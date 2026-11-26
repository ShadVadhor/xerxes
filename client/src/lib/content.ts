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

/** Hero HUD phases keyed to the loop film (seconds into the 19s loop) */
export const HERO_PHASES = [
  { from: 0, to: 7.4, tag: "01 / SURFACE", line: "A campus that asks nothing of the grid." },
  { from: 7.4, to: 15, tag: "02 / DESCENT", line: "Twelve wells. One hundred and twenty branches. Five kilometres down." },
  { from: 15, to: 19.1, tag: "03 / COMPUTE", line: "Heat becomes intelligence." },
];

export const HERO_TELEMETRY = [
  { value: 1.5, decimals: 1, unit: "EF", label: "Compute, up to" },
  { value: 1.05, decimals: 2, unit: "", label: "Design PUE" },
  { value: 150, decimals: 0, unit: "kW", label: "Per rack" },
  { value: 120, decimals: 0, unit: "", label: "Geothermal branches" },
  { value: 0, decimals: 0, unit: "L", label: "Water for cooling" },
];

export const MANIFESTO = {
  eyebrow: "01 — The premise",
  text:
    "Every other data center is a tenant of someone else's grid. Xerxes is its own power plant: a campus built over twelve geothermal wells and 120 directional branches, five kilometres deep, turning the heat of the earth directly into high-density AI compute. No grid. No water. No carbon. Just intelligence, at scale.",
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
    "The Dark Token Factory (DTF) is the small model: a sealed, lights-out AI factory on one re-entered oil-and-gas well. Xerxes is the Goliath: a hub and six pods over twelve wells and 120 directional branches, five kilometres deep. Same principle. Take the data center to the power. Radically different scale.",
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
      line: "One re-entered well. One sealed building, robot-serviced, lights off. Compute where the heat already is.",
      stats: [
        { k: "Wells", v: "1" },
        { k: "Per well pad", v: "20 MWe" },
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
  specs: [
    { k: "Form", dtf: "One sealed, prefabricated two-level building on a fenced well pad", xerxes: "Central hub + 6 compute pods under a nano-shell roof" },
    { k: "Wells", dtf: "1 re-entered existing oil & gas well", xerxes: "12 wells · 2 under each pod · 50 m apart" },
    { k: "Branches", dtf: "4, growing to 10, around a central motherbore core", xerxes: "10 directional branches per well · 120 in total" },
    { k: "Depth", dtf: "Original bore, then sidetracks into hotter rock", xerxes: "About 5 km on every branch" },
    { k: "Power", dtf: "20 MWe per well pad · Native ORC-DC generator", xerxes: "Up to 50 MW per well · 54 MWe net modelled" },
    { k: "Compute", dtf: "About 18.7 MW of IT per pad at full build", xerxes: "Up to 1.5 ExaFLOPS reference design · 150 kW per rack" },
    { k: "Silicon", dtf: "Open models on AMD Instinct or NVIDIA accelerators", xerxes: "NVIDIA Vera Rubin, next-gen AMD Instinct GPUs, advanced TPUs, NPUs and new high-density chips" },
    { k: "Cooling", dtf: "Servers immersed in dielectric coolant · heat-driven absorption chiller", xerxes: "Closed-loop CO₂ liquid cooling · nano-shell roof captures wind and cold for the chillers · heat recovered and reused" },
    { k: "Operation", dtf: "Lights-out, robot-serviced, run from central command", xerxes: "AI GMS autonomous operation, with human oversight" },
    { k: "Status", dtf: "Design nearly final · first pilot is a target, not a commitment", xerxes: "KSA programme on standby · no dates committed" },
  ],
  footnote:
    "All figures are design targets or modelled values, not audited operating data. DTF: per darktokenfactory.com; no DTF facility is yet in operation and accelerator figures are vendor-published. Xerxes: White Paper V-1F and design intent.",
  room: {
    eyebrow: "Inside a DTF",
    title: "Lights out. Robots in.",
    body: "Every server sits fully immersed in dielectric coolant, cooled by the heat-driven loop beneath it. An overhead gantry lifts each sled out for inspection or swap; a service robot runs the parts. The same well that powers the room cools it. Nobody goes inside.",
    caption: "Illustrative visualisation of a DTF data room.",
  },
};

export const DESCENT = {
  eyebrow: "03 — The technology",
  title: "Power from below.",
  /** Order matches the scene beats: surface · spacing · depth · branches · field · to compute */
  steps: [
    {
      tag: "Surface",
      title: "A campus that asks nothing of the grid.",
      body: "Above ground: a hub and six white pods under a nano-shell roof. Below them: twelve wells, two under every pod, and the power station they feed.",
      stat: null,
    },
    {
      tag: "Well spacing",
      title: "Two wells a pod. Fifty metres apart.",
      body: "Each pod stands over a pair of wells, set a long fifty metres apart so that neither sits in the other's thermal shadow. Thermal interference is designed out before the first metre is drilled.",
      stat: { value: "50", unit: "m", label: "between wells" },
    },
    {
      tag: "Nanomaterial pipes",
      title: "Five kilometres down.",
      body: "Down each closed-loop shaft, nanomaterial-enhanced pipework lifts heat transfer by 56% over conventional casing, pulling more usable energy from every metre of rock on the way to the reservoir.",
      stat: { value: "5", unit: "km", label: "deep, every branch" },
    },
    {
      tag: "Enhanced Quantum Geothermal",
      title: "Ten branches. Every well.",
      body: "At depth each well fans into ten directional branches, sidetracked into hotter rock and sealed in one closed loop. Production carries heat up; injection carries fluid back down. Nothing leaves the loop. Nothing is burned.",
      stat: { value: "10", unit: "", label: "directional branches per well" },
    },
    {
      tag: "The whole field",
      title: "Twelve wells. 120 branches.",
      body: "Pull the rock away and the field appears: a root system of 120 branches beneath six pods, each branch reaching about five kilometres down, each well fifty metres from its neighbour. This is what a Goliath stands on.",
      stat: { value: "120", unit: "", label: "branches · 12 wells" },
    },
    {
      tag: "Heat becomes intelligence",
      title: "Earth's heat, converted to compute.",
      body: "Only 8% of the field's output keeps the loop alive. In AI GMS simulation, 472 MWth of thermal energy yields 54 MWe net per well: continuous, weather-proof power for the densest racks on the planet.",
      stat: { value: "54", unit: "MWe", label: "net per well, modelled" },
    },
  ],
  footnote: "Schematic — not to scale. Geometry per Xerxes design intent; power figures modelled (AI GMS Phase 0, White Paper V-1F).",
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
      caption: "Kaigen closed-loop CO₂ cooling. No water. No compromise.",
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
      caption: "Where the closed loop meets the surface. Compact, quiet, sealed.",
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
    { n: "03", t: "Cool", d: "Closed-loop CO₂ cooling carries heat out of 150 kW racks. No water is evaporated.", tone: "cold" },
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
  titleAccent: "Water-free.",
  intro:
    "A conventional AI campus draws on the grid and boils away water. Xerxes does neither: closed-loop cooling, a roof that captures wind and cold, and heat that is recovered, not rejected. The comparison below is modelled for a facility of equal scale.",
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
      role: "AI infrastructure and high-performance computing. Designers of the Dark Token Factory data center.",
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
  "ZERO WATER",
  "150 kW / RACK",
];
