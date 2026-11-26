/**
 * Xerxes 3D walkthrough — content and camera script.
 *
 * World units are metres, +y is up, hub at the origin, Production Pod 1 runs along +z.
 * Everything shown is a design target or modelled value taken from the Xerxes White Paper (V-1F);
 * proportions are schematic and the scene is not to engineering scale.
 */
export type V3 = [number, number, number];

export type Hotspot = { at: V3; label: string; text: string };
export type Figure = { v: string; l: string };
export type Waypoint = { p: V3; l: V3 };

export type Stop = {
  id: string;
  zone: string; // short HUD label
  kicker: string;
  title: string;
  accent: string; // italic serif tail of the title
  body: string;
  figures: Figure[];
  /** where the claim comes from / how firm it is */
  basis: string;
  cam: V3;
  look: V3;
  /** vertical field of view for wide screens (default 58) */
  fov?: number;
  /** alternative pose for portrait screens (phones) */
  portrait?: { cam: V3; look: V3; fov?: number };
  /** waypoints flown through when arriving at this stop from the previous one */
  via?: Waypoint[];
  /** "cut" fades through black instead of flying (used where the world changes) */
  cut?: boolean;
  dwell: number; // seconds of narration in guided autoplay
  hotspots: Hotspot[];
};

export const WALK_META = {
  title: "Xerxes 3D Walkthrough — Inside a Geothermal AI Data Center",
  description:
    "Walk through a Xerxes production pod in 3D: the hub and digital twin, compute halls, CO₂ cooling, the NanoVault thermal store, wellheads, 120 deep branches and the biogas bus. Design targets, schematic scale.",
  path: "/walkthrough",
};

export const WALK_NOTE =
  "Schematic walkthrough. Proportions are illustrative, not to engineering scale. All figures are design targets or modelled values from the Xerxes White Paper (V-1F), not measured performance.";

export const STOPS: Stop[] = [
  {
    id: "campus",
    zone: "Campus",
    kicker: "Arrival",
    title: "One campus.",
    accent: "Six pods.",
    body:
      "A central hub, six production pods under a nano-composite shell, and twelve wells: two beneath every pod, fifty metres apart. We will walk one pod, from the hub to the heat source and back up onto the roof.",
    figures: [
      { v: "6", l: "Production pods" },
      { v: "12", l: "Wells · 2 per pod" },
      { v: "120", l: "Branches · 10 per well" },
    ],
    basis: "Campus design basis",
    cam: [-170, 172, -372],
    look: [0, 0, 60],
    dwell: 9,
    hotspots: [
      { at: [0, 16, 0], label: "Hub", text: "The core: control, digital twin and four infrastructure rings." },
      { at: [0, 20, 150], label: "Pod 1", text: "The pod we walk: compute, storage, cooling, thermal store and wellheads." },
      { at: [-25, 4, 226], label: "Wellhead", text: "Each pod has two wellheads, fifty metres apart." },
    ],
  },
  {
    id: "brain",
    zone: "Hub · Core",
    kicker: "01 · The brain",
    title: "A twin runs",
    accent: "the real thing.",
    body:
      "At the centre sits the AI control layer and a live digital twin of the campus. It optimises in real time, reads failure signatures weeks to months ahead, and lets reinforcement-learning agents test every change on the twin before it touches steel.",
    figures: [
      { v: "Weeks", l: "Predictive-maintenance horizon" },
      { v: "Twin-first", l: "Changes tested before deploy" },
      { v: "0", l: "External control interfaces" },
    ],
    basis: "White Paper V-1F · AI control layer",
    cam: [0, 3.4, -12.5],
    look: [0, 3.1, 0],
    via: [
      { p: [-60, 130, -190], l: [0, 20, 20] },
      { p: [-8, 34, -52], l: [0, 6, 0] },
      { p: [0, 12, -24], l: [0, 3.5, 0] },
    ],
    dwell: 9,
    hotspots: [
      { at: [0, 4.6, 0], label: "Digital twin", text: "Every pod, ring and well is mirrored; changes are rehearsed here first." },
      { at: [0, 0.4, -6.5], label: "Campus model", text: "Hub, six pods and twelve wells in miniature." },
    ],
  },
  {
    id: "rings",
    zone: "Hub · Rings",
    kicker: "02 · Infrastructure rings",
    title: "Four rings,",
    accent: "two live.",
    body:
      "Four physically separate rings interlace power and cooling around the core. Two are active, routed clockwise and counter-clockwise; two wait on automated standby. The torus is designed so that losing a ring is an event, not an outage.",
    figures: [
      { v: "4", l: "Separate rings" },
      { v: "2 + 2", l: "Active + standby" },
      { v: "Tier IV", l: "Design target, not certified" },
    ],
    basis: "White Paper V-1F · torus layout",
    cam: [-3, 6.6, -19.2],
    look: [20, 8.6, -9],
    dwell: 9,
    hotspots: [
      { at: [21.6, 11.9, -11.5], label: "Active · power", text: "Primary power ring, routed clockwise." },
      { at: [23.0, 9.6, -8.4], label: "Active · cooling", text: "Primary cooling ring, routed counter-clockwise." },
      { at: [20.1, 6.2, -14.1], label: "Standby", text: "Two rings on automated standby, ready to take load." },
    ],
  },
  {
    id: "rack",
    zone: "Pod 1 · Plaza",
    kicker: "03 · The rack",
    title: "Where the heat",
    accent: "is made.",
    body:
      "Every rack is liquid cooled into a sealed, water-free loop. The compute layer is vendor-agnostic: NVIDIA, AMD, Intel, Cerebras, Tenstorrent and sovereign silicon share one fabric, built for next-generation high-density GPUs, TPUs and NPUs.",
    figures: [
      { v: "150 kW", l: "Per rack · design" },
      { v: "≥80 GB/s", l: "Per node fabric" },
      { v: "0 L", l: "Water for cooling" },
    ],
    basis: "White Paper V-1F · compute layer",
    cam: [-7.2, 2.7, 63.5],
    look: [0, 3.3, 76],
    via: [
      { p: [0, 3.6, 20], l: [0, 3.2, 62] },
      { p: [0, 3.0, 47], l: [0, 3.4, 70] },
    ],
    dwell: 10,
    hotspots: [
      { at: [0, 6.3, 76], label: "GPU tray", text: "Immersion-ready trays on a common accelerator and memory stack (HBM3e or equivalent)." },
      { at: [1.7, 2.2, 74.4], label: "Cold plate", text: "Heat goes straight into the sealed CO₂ loop; there is no evaporative tower." },
      { at: [-1.5, 8.2, 76], label: "Manifold", text: "Cool in, warm out: the loop carries waste heat toward the absorption chillers." },
    ],
  },
  {
    id: "hall",
    zone: "Pod 1 · Compute hall",
    kicker: "04 · The compute hall",
    title: "Row after row,",
    accent: "one fabric.",
    body:
      "Cold aisles are contained, and the hall follows the radial layout so each pod is self-contained: compute, tiered storage, onboard thermal management and networking. A pod registers itself on the fabric when it comes online.",
    figures: [
      { v: "1.5 EF", l: "Per site · up to" },
      { v: "1.05", l: "Design PUE" },
      { v: "81%", l: "Site power to compute · design" },
    ],
    basis: "White Paper V-1F · compute and efficiency",
    cam: [-3.9, 2.0, 85],
    look: [-3.9, 2.6, 150],
    via: [{ p: [-3.9, 2.2, 82], l: [-3.9, 2.6, 130] }],
    dwell: 10,
    hotspots: [
      { at: [-3.9, 3.5, 104], label: "Cold aisle", text: "Contained cold aisle; fronts face each other, backs open to the hot aisle." },
      { at: [0, 5.6, 120], label: "CO₂ headers", text: "Closed CO₂ thermal loop runs overhead along every hot aisle." },
      { at: [-12, 5.2, 98], label: "Power busway", text: "Overhead busway feeds each row from the pod's isolated bus." },
    ],
  },
  {
    id: "storage",
    zone: "Pod 1 · Storage & fabric",
    kicker: "05 · Storage and fabric",
    title: "Memory close to",
    accent: "the math.",
    body:
      "Flash, NVMe and cold tiers sit beside compute. Placement is chosen by AI; data is compressed and de-duplicated. Localised routing and fault isolation stop one failed link from becoming a failed pod.",
    figures: [
      { v: "Hundreds of EB", l: "Capacity · up to" },
      { v: "Tens of TB/s", l: "Aggregate bandwidth" },
      { v: "3", l: "Tiers · flash, NVMe, cold" },
    ],
    basis: "White Paper V-1F · storage layer",
    cam: [0, 3.6, 131],
    look: [0, 3.0, 160],
    dwell: 9,
    hotspots: [
      { at: [0, 4.4, 146], label: "Fabric spine", text: "Switch spine with redundant paths into every compute row." },
      { at: [-14, 3.0, 148], label: "Flash tier", text: "Hottest data, closest to the accelerators." },
      { at: [14, 3.0, 148], label: "Cold tier", text: "Bulk capacity with the lowest power draw." },
    ],
  },
  {
    id: "cooling",
    zone: "Pod 1 · Cooling plant",
    kicker: "06 · Cooling",
    title: "No water.",
    accent: "Anywhere.",
    body:
      "Cooling runs on a sealed CO₂ loop. Waste heat drives a lithium-bromide absorption chiller, a closed cycle with no compressors, and the nano-shell hands cold air from the roof to the loop through intake ducts.",
    figures: [
      { v: "0 L", l: "Water for cooling" },
      { v: "1.2 B L", l: "Cooling water avoided / yr · modelled" },
      { v: "1.05", l: "Design PUE" },
    ],
    basis: "White Paper V-1F · cooling",
    cam: [-14, 3.4, 161.5],
    look: [4, 3.4, 183],
    dwell: 10,
    hotspots: [
      { at: [-9, 5.6, 175], label: "Absorption chiller", text: "Sealed lithium-bromide cycle powered by waste heat; no compressors." },
      { at: [-23, 9, 176], label: "Shell intake", text: "Wind and cold captured by the roof come down this duct into the loop." },
      { at: [10, 1.6, 172], label: "CO₂ loop", text: "Closed CO₂ thermal exchange; no evaporative towers." },
    ],
  },
  {
    id: "vault",
    zone: "Pod 1 · NanoVault",
    kicker: "07 · NanoVault",
    title: "A week of heat",
    accent: "in reserve.",
    body:
      "The NanoVault is the thermal interface between the earth loop and the plant: vacuum-isolated composite insulation, no moving parts, and enough stored heat to ride through up to seven days without new subsurface input.",
    figures: [
      { v: "7 days", l: "Thermal buffer · design" },
      { v: "10–12×", l: "Heat retention vs metal exchangers" },
      { v: "< 1 µs", l: "Handover to working fluid" },
    ],
    basis: "White Paper V-1F · EQG heat path",
    cam: [-15, 3.0, 191.5],
    look: [4, 2.6, 205],
    dwell: 10,
    hotspots: [
      { at: [-8, 3.3, 202], label: "Vacuum vessel", text: "Vacuum-isolated composite shell around a phase-stable core." },
      { at: [0, 0.8, 207], label: "Handover", text: "Stored heat is released directly into the working fluid." },
    ],
  },
  {
    id: "energy",
    zone: "Pod 1 · Energy bay",
    kicker: "08 · Energy bay",
    title: "Two wellheads,",
    accent: "fifty metres apart.",
    body:
      "Heat becomes electricity beside the wellhead, not kilometres away: conversion losses under 5 percent against 10–15 percent for legacy plants. Fifty metres between wells keeps neighbours from stealing each other's heat.",
    figures: [
      { v: "50 m", l: "Between wells" },
      { v: "< 5%", l: "Conversion loss · design" },
      { v: "54 MW", l: "Per well · paper reference" },
    ],
    basis: "White Paper V-1F · EQG surface plant",
    cam: [0, 15.6, 205],
    look: [0, 3.5, 226],
    fov: 72,
    portrait: { cam: [-12, 6.4, 212.5], look: [-24, 2.4, 227], fov: 78 },
    dwell: 10,
    hotspots: [
      { at: [-25, 5.0, 226], label: "Wellhead A", text: "Production and injection lines meet here, ten branches below." },
      { at: [25, 5.0, 226], label: "Wellhead B", text: "Its twin, fifty metres across, thermally isolated by distance." },
      { at: [-18, 2.4, 232], label: "Heat-to-electric", text: "Conversion next to the well keeps losses under 5%." },
    ],
  },
  {
    id: "subsurface",
    zone: "Subsurface · 0 – 5 km",
    kicker: "09 · The earth loop",
    title: "120 branches,",
    accent: "five kilometres down.",
    body:
      "Each well opens into ten directional branches: six production lines bring heat up and four injection lines return cooled fluid. Nanomaterial conduction and dry nitrogen nanofoam stimulation open the rock with no water and no proppant. Twelve wells, 120 branches.",
    figures: [
      { v: "10", l: "Branches per well · 6 + 4" },
      { v: "~5 km", l: "Depth · schematic 25 : 1" },
      { v: "> 50%", l: "Better extraction than steel · design" },
    ],
    basis: "White Paper V-1F · EQG · depth compressed for display",
    cam: [0, -104, 50],
    look: [0, -108, 226],
    cut: true,
    via: [
      { p: [0, -3, 150], l: [0, -22, 226] },
      { p: [0, -50, 118], l: [0, -70, 226] },
    ],
    dwell: 12,
    hotspots: [
      { at: [-25, -24, 226], label: "Injection", text: "Cooled fluid goes down four branches per well." },
      { at: [-25, -118, 226], label: "Production", text: "Six branches per well carry heat up from 150 °C-plus rock." },
      { at: [0, -190, 218], label: "50 m", text: "The spacing between wells, held all the way down." },
    ],
  },
  {
    id: "biogas",
    zone: "Biogas yard",
    kicker: "10 · Resilience",
    title: "No batteries.",
    accent: "A biogas bus.",
    body:
      "Instead of battery UPS, the pod rides on a grid-isolated bus fed by biogas microturbines: half run continuously, half sit on hot standby and start in under fifteen seconds. Methane is captured, cleaned by nanosieve membranes and grown in methanotrophic bioreactors, then held in composite tanks for about twenty days at full load.",
    figures: [
      { v: "0", l: "Battery UPS" },
      { v: "50 / 50", l: "Continuous / hot standby" },
      { v: "20 days", l: "Autonomy at full load" },
    ],
    basis: "White Paper V-1F · biogas resilience",
    cam: [38, 13, 108],
    look: [88, 4, 176],
    cut: true,
    dwell: 11,
    hotspots: [
      { at: [74, 8, 150], label: "Nanosieve", text: "Multi-stage membranes strip nitrogen without cryogenics." },
      { at: [96, 9, 168], label: "Bioreactors", text: "Methanotrophic strain 5GBC1-RO1 turns captured methane into steady fuel." },
      { at: [78, 2.8, 202], label: "Microturbines", text: "Half continuous, half hot standby with a start under 15 seconds." },
    ],
  },
  {
    id: "shell",
    zone: "Shell · Roof",
    kicker: "11 · The shell",
    title: "A roof that",
    accent: "works.",
    body:
      "The nano-composite shell catches wind and cold for the chillers and returns the rest as heat recovery. Beside the pod, direct-air-capture contactors pull CO₂ from the air and mineralise it permanently underground: the step that makes the campus carbon-negative by design.",
    figures: [
      { v: "72,000 t", l: "CO₂ avoided / yr vs conventional · modelled" },
      { v: "< 12%", l: "Land area vs solar for the same energy" },
      { v: "0 L", l: "Water" },
    ],
    basis: "White Paper V-1F · environment · shell performance not published",
    cam: [-150, 78, 52],
    look: [-30, 8, 170],
    via: [
      { p: [60, 24, 120], l: [60, 4, 190] },
      { p: [-4, 80, 10], l: [-10, 10, 150] },
    ],
    dwell: 11,
    hotspots: [
      { at: [0, 17.5, 150], label: "Wind and cold capture", text: "Ridge scoops feed the intake ducts into the cooling plant." },
      { at: [-70, 8, 190], label: "Direct air capture", text: "Contactors pull CO₂ from the air; it is mineralised underground, permanently." },
    ],
  },
];

/** Where each pod zone lives along z (used for the HUD zone label in Explore mode). */
export const ZONES: { test: (x: number, y: number, z: number) => boolean; name: string }[] = [
  { test: (_x, y) => y < -1, name: "Subsurface · 0 – 5 km" },
  { test: (x, _y, z) => x > 38 && z > 100 && z < 250, name: "Biogas yard" },
  { test: (x, _y, z) => x < -38 && z > 100 && z < 250, name: "Direct-air-capture field" },
  { test: (x, y, z) => Math.hypot(x, z) < 15.5 && y < 20, name: "Hub · Core" },
  { test: (x, y, z) => Math.hypot(x, z) < 35 && y < 20, name: "Hub · Rings" },
  { test: (x, _y, z) => z >= 35 && z < 62 && Math.abs(x) < 6, name: "Link corridor" },
  { test: (x, _y, z) => z >= 62 && z < 84 && Math.abs(x) < 29, name: "Pod 1 · Plaza" },
  { test: (x, _y, z) => z >= 84 && z < 130 && Math.abs(x) < 29, name: "Pod 1 · Compute hall" },
  { test: (x, _y, z) => z >= 130 && z < 160 && Math.abs(x) < 29, name: "Pod 1 · Storage & fabric" },
  { test: (x, _y, z) => z >= 160 && z < 190 && Math.abs(x) < 29, name: "Pod 1 · Cooling plant" },
  { test: (x, _y, z) => z >= 190 && z < 215 && Math.abs(x) < 29, name: "Pod 1 · NanoVault" },
  { test: (x, _y, z) => z >= 215 && z < 252 && Math.abs(x) < 29, name: "Pod 1 · Energy bay" },
];
