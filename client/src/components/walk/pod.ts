import * as THREE from "three";
import { COL, Kit, V3, roundedPath } from "./kit";
import { Anchor, POD, WELL, anchor, hexOverlayMat, podSection } from "./hub";

/** Arch curve in the XY plane, x = W cos a, y = H sin a. */
class Arch extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = Math.PI * t;
    return target.set(POD.W * Math.cos(a), POD.H * Math.sin(a), 0);
  }
}

function capsuleFootprint(w: number, zA: number, zB: number) {
  const s = new THREE.Shape();
  s.moveTo(-w, -zA);
  s.lineTo(-w, -zB);
  s.absarc(0, -zB, w, Math.PI, Math.PI * 2, false);
  s.lineTo(w, -zA);
  s.absarc(0, -zA, w, 0, Math.PI, false);
  return s;
}

/** Shell, floor, ribs, lights and zone portals of Pod 1. */
export function buildPodShell(kit: Kit, g: THREE.Group, shell: THREE.BufferGeometry, A: Anchor[]) {
  const outer = new THREE.Mesh(shell, kit.ceramic);
  const hex = new THREE.Mesh(shell, hexOverlayMat(kit));
  hex.scale.set(1.006, 1.012, 1.002);
  const innerMat = kit.track(new THREE.MeshStandardMaterial({ color: "#1b212b", metalness: 0.55, roughness: 0.5, side: THREE.BackSide }));
  const inner = new THREE.Mesh(shell, innerMat);
  const innerHexMat = kit.track(
    new THREE.MeshBasicMaterial({ map: kit.hexTexInner, transparent: true, alphaTest: 0.02, depthWrite: false, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, toneMapped: false })
  );
  const innerHex = new THREE.Mesh(shell, innerHexMat);
  g.add(outer, hex, inner, innerHex);

  // floor
  const floorGeo = new THREE.ShapeGeometry(capsuleFootprint(POD.W - 0.2, POD.S0, POD.S1), 48);
  floorGeo.rotateX(-Math.PI / 2);
  kit.track(floorGeo);
  const floor = new THREE.Mesh(floorGeo, kit.floorMaterial(6, 1, "#2a303a"));
  floor.position.y = 0.03;
  g.add(floor);
  // central guide line
  kit.box(0.1, 0.02, 188, kit.emit(COL.ledHi, 0.9), 0, 0.06, 156, g);

  // ribs
  const step = kit.lowPower ? 12 : 8;
  const ribGeo = new THREE.TubeGeometry(new Arch(), 56, 0.3, 6, false);
  const items: { p: V3; s: V3 }[] = [];
  for (let z = 68; z <= 244; z += step) {
    const { k } = podSection(z);
    if (k < 0.2) continue;
    items.push({ p: [0, 0, z], s: [k, k, 1] });
  }
  kit.inst(ribGeo, kit.std("#2c333e", 0.8, 0.4), items, g);

  // ceiling light strips
  for (const x of [0, -9, 9, -19, 19]) {
    const y = POD.H * Math.sqrt(1 - (x / POD.W) ** 2) - 0.3;
    const strip = kit.box(0.36, 0.07, 128, kit.emit(COL.warm, 1.15), x, y, 155, g);
    strip.rotation.z = Math.asin(Math.min(0.95, (x / POD.W) * 0.9)) * -0.0;
  }

  // zone portals with a lit sign bar
  const portals: { z: number; color: string; text: string }[] = [
    { z: 84, color: COL.led, text: "COMPUTE" },
    { z: 130, color: COL.ice, text: "STORAGE + FABRIC" },
    { z: 160, color: COL.cyan, text: "COOLING" },
    { z: 190, color: COL.amber, text: "NANOVAULT" },
    { z: 214, color: COL.magma, text: "ENERGY BAY" },
  ];
  const portalGeo = new THREE.TubeGeometry(new Arch(), 56, 0.5, 8, false);
  kit.track(portalGeo);
  portals.forEach(p => {
    const { k } = podSection(p.z);
    const arch = new THREE.Mesh(portalGeo, kit.std("#39414d", 0.85, 0.35));
    arch.position.z = p.z;
    arch.scale.set(k, k, 1);
    g.add(arch);
    const edge = new THREE.Mesh(new THREE.TubeGeometry(new Arch(), 56, 0.14, 6, false), kit.emit(p.color, 1.6));
    kit.track(edge.geometry);
    edge.position.z = p.z - 0.42;
    edge.scale.set(k * 0.995, k * 0.995, 1);
    g.add(edge);
    const s = kit.sign(p.text, "#ffffff", p.color, 9.5);
    s.position.set(0, POD.H * k - 3.6, p.z - 0.6);
    g.add(s);
  });

  anchor(A, 0, 10, 100, "#cfe0ff", 1.1);
  anchor(A, 0, 10, 130, "#e7f0ff", 1.0);
  anchor(A, 0, 10, 160, "#d9f6ff", 1.0);
  anchor(A, 0, 10, 190, "#ffe0bc", 1.0);
  anchor(A, 0, 10, 222, "#ffd2b0", 1.0);
}

type Bank = { xc: number; color: string; edge: string };

function rackBank(kit: Kit, g: THREE.Group, banks: Bank[], z0: number, z1: number, rows = 24) {
  const pitch = 0.8;
  const n = Math.floor((z1 - z0) / pitch);
  const bodies: { p: V3 }[] = [];
  banks.forEach(b => {
    const faces: { p: V3; r: V3 }[] = [];
    for (let i = 0; i < n; i += 1) {
      const z = z0 + i * pitch + pitch / 2;
      bodies.push({ p: [b.xc - 2.1, 1.18, z] }, { p: [b.xc + 2.1, 1.18, z] });
      faces.push({ p: [b.xc - 2.1 + 0.604, 1.18, z], r: [0, Math.PI / 2, 0] }, { p: [b.xc + 2.1 - 0.604, 1.18, z], r: [0, -Math.PI / 2, 0] });
    }
    kit.inst(new THREE.PlaneGeometry(0.76, 2.2), kit.ledMat(b.color, b.edge, rows), faces, g, true);
    // cold-aisle containment roof + busway strip
    const roof = kit.box(3.0, 0.05, n * pitch, kit.glass, b.xc, 2.6, (z0 + z1) / 2 - 0.4, g);
    roof.renderOrder = 2;
    kit.box(0.14, 2.6, 0.1, kit.darkSteel, b.xc - 1.5, 1.3, z0 - 0.1, g);
    kit.box(0.14, 2.6, 0.1, kit.darkSteel, b.xc + 1.5, 1.3, z0 - 0.1, g);
    kit.box(0.3, 0.1, n * pitch, kit.emit(COL.amber, 0.9), b.xc, 3.0, (z0 + z1) / 2 - 0.4, g);
    kit.box(0.04, 0.02, n * pitch, kit.emit(b.edge, 1.0), b.xc - 1.45, 0.06, (z0 + z1) / 2 - 0.4, g);
    kit.box(0.04, 0.02, n * pitch, kit.emit(b.edge, 1.0), b.xc + 1.45, 0.06, (z0 + z1) / 2 - 0.4, g);
  });
  kit.inst(new THREE.BoxGeometry(1.2, 2.3, 0.78), kit.std("#10141a", 0.75, 0.45), bodies, g);
}

/** The showcase rack in the plaza, cut away so you can see trays, cold plates and manifolds. */
function featureRack(kit: Kit, g: THREE.Group, z: number) {
  const S = 2.4;
  const rack = new THREE.Group();
  rack.position.set(0, 0.04, z);
  rack.scale.setScalar(S);
  g.add(rack);
  // dais
  const dais = kit.cyl(2.0, 2.15, 0.06, kit.std("#222831", 0.8, 0.35), 0, 0, 0, rack, 48);
  dais.position.y = 0.0;
  const daisRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.012, 6, 80), kit.emit(COL.led, 1.8));
  kit.track(daisRing.geometry);
  daisRing.rotation.x = Math.PI / 2;
  daisRing.position.y = 0.05;
  rack.add(daisRing);
  // frame posts
  const post = new THREE.BoxGeometry(0.04, 2.3, 0.04);
  const posts: { p: V3 }[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) posts.push({ p: [sx * 0.4, 1.15, sz * 0.58] });
  kit.inst(post, kit.steel, posts, rack);
  kit.box(0.84, 0.06, 1.22, kit.darkSteel, 0, 0.03, 0, rack);
  kit.box(0.84, 0.06, 1.22, kit.darkSteel, 0, 2.3, 0, rack);
  // trays
  const N = 10;
  const trays: { p: V3 }[] = [];
  const bars: { p: V3 }[] = [];
  const gpus: { p: V3 }[] = [];
  const plates: { p: V3 }[] = [];
  const stubs: { p: V3; r: V3 }[] = [];
  for (let i = 0; i < N; i += 1) {
    const y = 0.22 + i * 0.2;
    trays.push({ p: [0, y, 0.0] });
    bars.push({ p: [0, y, -0.545] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      gpus.push({ p: [sx * 0.17, y + 0.09, sz * 0.27 + 0.05] });
      plates.push({ p: [sx * 0.17, y + 0.14, sz * 0.27 + 0.05] });
    }
    stubs.push({ p: [-0.35, y + 0.03, 0.5], r: [0, 0, Math.PI / 2] }, { p: [0.35, y + 0.03, 0.5], r: [0, 0, Math.PI / 2] });
  }
  kit.inst(new THREE.BoxGeometry(0.72, 0.1, 1.08), kit.std("#161a21", 0.8, 0.4), trays, rack);
  kit.inst(new THREE.BoxGeometry(0.66, 0.025, 0.012), kit.emit(COL.led, 2.2), bars, rack);
  kit.inst(new THREE.BoxGeometry(0.2, 0.07, 0.3), kit.std("#0b0d12", 0.9, 0.35), gpus, rack);
  kit.inst(new THREE.BoxGeometry(0.17, 0.018, 0.26), kit.copper, plates, rack);
  kit.inst(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), kit.copper, stubs.map(s => ({ p: [s.p[0] * 0.78, s.p[1], s.p[2] - 0.2] as V3, r: [Math.PI / 2, 0, 0] as V3 })), rack);
  // manifolds (cool in / warm out)
  const coolM = kit.std("#2f93b5", 0.8, 0.3);
  const warmM = kit.std("#c9622e", 0.8, 0.3);
  kit.cyl(0.03, 0.03, 2.2, coolM, -0.35, 1.15, 0.5, rack, 12);
  kit.cyl(0.03, 0.03, 2.2, warmM, 0.35, 1.15, 0.5, rack, 12);
  // glow pulses inside manifolds (rack-local → world)
  const fx = (x: number, c: string, dir: 1 | -1) =>
    kit.flow(
      [
        [x * S, 0.1 * S + 0.04, 0.5 * S + z],
        [x * S, 2.2 * S + 0.04, 0.5 * S + z],
      ],
      { color: c, r: 0.1, spacing: 1.4, speed: 2.2, dir, base: 0.55, width: 0.2 }
    );
  fx(-0.35, COL.cyan, 1);
  fx(0.35, COL.magma, 1);
  // open front door (glass, hinged left, swung out) and a glass right side panel
  const door = new THREE.Group();
  door.position.set(-0.4, 1.15, -0.6);
  door.rotation.y = -1.25;
  rack.add(door);
  const doorGlass = kit.box(0.8, 2.2, 0.025, kit.glass, 0.4, 0, 0, door);
  doorGlass.renderOrder = 3;
  kit.box(0.8, 0.04, 0.04, kit.steel, 0.4, 1.1, 0, door);
  kit.box(0.8, 0.04, 0.04, kit.steel, 0.4, -1.1, 0, door);
  kit.box(0.04, 2.2, 0.04, kit.steel, 0.8, 0, 0, door);
  const side = kit.box(0.02, 2.2, 1.16, kit.glass, 0.425, 1.15, 0, rack);
  side.renderOrder = 3;
  // overhead drop from the CO2 header
  kit.flow(
    [
      [0.35 * S, 2.3 * S + 0.2, 0.5 * S + z],
      [0.35 * S, 13, 0.5 * S + z],
      [10, 13.4, 0.5 * S + z],
    ],
    { color: COL.magma, r: 0.16, spacing: 3, speed: 3, dir: -1, base: 0.35 }
  );
  kit.flow(
    [
      [-0.35 * S, 2.3 * S + 0.2, 0.5 * S + z],
      [-0.35 * S, 13.2, 0.5 * S + z],
      [-10, 13.6, 0.5 * S + z],
    ],
    { color: COL.cyan, r: 0.16, spacing: 3, speed: 3, dir: 1, base: 0.35 }
  );
}

/** Plaza + compute hall (z 62 – 130). */
export function buildHall(kit: Kit, g: THREE.Group, A: Anchor[]) {
  // plaza medallion
  const med = new THREE.Mesh(new THREE.RingGeometry(5.6, 5.72, 96), kit.emit(COL.ledHi, 1.0));
  kit.track(med.geometry);
  med.rotation.x = -Math.PI / 2;
  med.position.set(0, 0.07, 76);
  g.add(med);
  const med2 = new THREE.Mesh(new THREE.RingGeometry(9.0, 9.08, 96), kit.emit(COL.led, 0.7));
  kit.track(med2.geometry);
  med2.rotation.x = -Math.PI / 2;
  med2.position.set(0, 0.07, 76);
  g.add(med2);
  featureRack(kit, g, 76);
  anchor(A, 0, 6, 70, "#bcd8ff", 1.7);
  anchor(A, 0, 3.5, 66, "#ffe9cf", 0.9);

  // racks
  const centers = kit.lowPower ? [-11.7, -3.9, 3.9, 11.7] : [-19.5, -11.7, -3.9, 3.9, 11.7, 19.5];
  rackBank(
    kit,
    g,
    centers.map(xc => ({ xc, color: COL.led, edge: COL.ledHi })),
    92,
    126
  );

  // overhead CO2 headers along hot aisles (supply cyan, return warm)
  const hot = [-15.6, -7.8, 0, 7.8, 15.6];
  hot.forEach(x => {
    if (kit.lowPower && Math.abs(x) > 12) return;
    kit.hcyl(0.17, 44, kit.std("#3b4552", 0.85, 0.35), x - 0.5, 4.3, 108, "z", g);
    kit.hcyl(0.17, 44, kit.std("#3b4552", 0.85, 0.35), x + 0.5, 4.3, 108, "z", g);
    kit.flow([[x - 0.5, 4.3, 86], [x - 0.5, 4.3, 130]], { color: COL.cyan, r: 0.24, spacing: 6, speed: 5, dir: 1, base: 0.3 });
    kit.flow([[x + 0.5, 4.3, 86], [x + 0.5, 4.3, 130]], { color: COL.magma, r: 0.24, spacing: 6, speed: 5, dir: -1, base: 0.3 });
  });
  // cross headers
  kit.flow([[-24, 5.4, 87], [24, 5.4, 87]], { color: COL.cyan, r: 0.3, spacing: 9, speed: 6, dir: 1, base: 0.3 });
  kit.flow([[-24, 5.9, 87], [24, 5.9, 87]], { color: COL.magma, r: 0.3, spacing: 9, speed: 6, dir: -1, base: 0.3 });
  kit.flow([[-24, 5.4, 129], [24, 5.4, 129]], { color: COL.cyan, r: 0.3, spacing: 9, speed: 6, dir: 1, base: 0.3 });
  kit.flow([[-24, 5.9, 129], [24, 5.9, 129]], { color: COL.magma, r: 0.3, spacing: 9, speed: 6, dir: -1, base: 0.3 });
  kit.hcyl(0.3, 48, kit.std("#3b4552", 0.85, 0.35), 0, 5.4, 87, "x", g);
  kit.hcyl(0.3, 48, kit.std("#3b4552", 0.85, 0.35), 0, 5.9, 87, "x", g);
  // power spine along both walls, running pod-wards
  for (const sx of [-1, 1]) {
    kit.flow([[sx * 27.5, 1.2, 240], [sx * 27.5, 1.2, 66]], { color: COL.amber, r: 0.2, spacing: 7, speed: 8, dir: 1, base: 0.3, width: 0.12 });
    kit.box(0.5, 0.5, 176, kit.std("#222831", 0.8, 0.4), sx * 27.7, 0.5, 153, g);
  }
  kit.dust(kit.lowPower ? 140 : 360, [-26, 0.3, 66], [26, 10, 130], 0.06, "#bcd3ff", 0.4);
}

/** Storage tiers and the fabric spine (z 130 – 160). */
export function buildStorage(kit: Kit, g: THREE.Group, A: Anchor[]) {
  rackBank(kit, g, [{ xc: -22, color: COL.ice, edge: "#ffffff" }], 134, 156, 22);
  rackBank(kit, g, [{ xc: -12.5, color: COL.led, edge: COL.ledHi }], 134, 156, 22);
  rackBank(kit, g, [{ xc: 12.5, color: COL.led, edge: COL.ledHi }], 134, 156, 22);
  rackBank(kit, g, [{ xc: 22, color: COL.amber, edge: COL.magma }], 134, 156, 22);

  // tier signs
  const tags: [string, number, string][] = [
    ["FLASH", -22, "#ffffff"],
    ["NVME", -12.5, COL.ledHi],
    ["NVME", 12.5, COL.ledHi],
    ["COLD", 22, COL.amber],
  ];
  tags.forEach(([t, x, c]) => {
    const s = kit.sign(t, c, c, 4.4);
    s.position.set(x, 4.3, 133.5);
    g.add(s);
  });

  // spine: six switch cabinets and a light column
  const cab: { p: V3 }[] = [];
  const faces: { p: V3; r: V3 }[] = [];
  for (let i = 0; i < 6; i += 1) {
    const x = -5 + i * 2;
    cab.push({ p: [x, 1.7, 145] });
    faces.push({ p: [x, 1.7, 145 - 0.506], r: [0, Math.PI, 0] });
    faces.push({ p: [x, 1.7, 145 + 0.506], r: [0, 0, 0] });
  }
  kit.inst(new THREE.BoxGeometry(1.6, 3.4, 1.0), kit.std("#10141a", 0.75, 0.45), cab, g);
  kit.inst(new THREE.PlaneGeometry(1.56, 3.3), kit.ledMat(COL.ledHi, "#ffffff", 30, 1.8), faces, g, true);
  const col = kit.cyl(0.32, 0.32, 10, kit.emit("#9fc4f0", 1.1), 0, 5, 145, g, 18);
  col.position.y = 5.2;
  for (let i = 0; i < 6; i += 1) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 6, 36), kit.emit(COL.ledHi, 1.8));
    kit.track(r.geometry);
    r.rotation.x = Math.PI / 2;
    r.position.set(0, 2.4 + i * 1.5, 145);
    g.add(r);
  }
  // fibre arcs from the spine into every bank
  const xcs = [-22, -12.5, 12.5, 22];
  xcs.forEach(xc => {
    [137, 145, 153].forEach((z, i) => {
      const peak = 8.4 + i * 0.4;
      kit.flow(
        [
          [Math.sign(xc) * 0.9, 9.6, 145],
          [xc * 0.5, peak, 145 + (z - 145) * 0.5],
          [xc, 3.1, z],
        ],
        { color: "#cfe6ff", r: 0.045, spacing: 2.6, speed: 15, dir: i % 2 ? 1 : -1, base: 0.3, width: 0.14, radial: 5 }
      );
    });
  });
  // links to the compute hall and onward
  [-10, 10].forEach(x => {
    kit.flow([[x, 9.2, 100], [x, 9.4, 132], [x * 0.2, 9.6, 145]], { color: COL.ledHi, r: 0.07, spacing: 3, speed: 16, dir: 1, base: 0.25, width: 0.12, radial: 5 });
  });
  kit.dust(kit.lowPower ? 80 : 200, [-26, 0.3, 130], [26, 10, 160], 0.06, "#bcd3ff", 0.35);
  anchor(A, 0, 6, 145, COL.ledHi, 1.4);
}

/** Cooling plant (z 160 – 190). */
export function buildCooling(kit: Kit, g: THREE.Group, A: Anchor[]) {
  const teal = kit.std("#3b8fa6", 0.8, 0.35);
  const shellMat = kit.std("#c8d0da", 0.85, 0.3);
  // two LiBr absorption chillers
  [-10, 10].forEach((x, idx) => {
    const c = new THREE.Group();
    c.position.set(x, 0, 176);
    g.add(c);
    kit.box(7.2, 0.5, 15, kit.darkSteel, 0, 0.25, 0, c);
    kit.hcyl(1.65, 13, shellMat, 0, 2.2, 0, "z", c);
    kit.hcyl(1.3, 13, shellMat, 0, 4.9, 0, "z", c);
    kit.hcyl(0.9, 9, teal, 0, 3.55, 0, "z", c);
    for (const z of [-6.8, 6.8]) {
      const capA = new THREE.Mesh(new THREE.SphereGeometry(1.65, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
      kit.track(capA.geometry);
      capA.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2;
      capA.position.set(0, 2.2, z);
      c.add(capA);
      const capB = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
      kit.track(capB.geometry);
      capB.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2;
      capB.position.set(0, 4.9, z);
      c.add(capB);
    }
    // glow bands + sight glasses
    for (let i = -2; i <= 2; i += 1) {
      const t1 = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.05, 6, 40), kit.emit(COL.cyan, 1.5));
      kit.track(t1.geometry);
      t1.position.set(0, 2.2, i * 2.6);
      c.add(t1);
      const t2 = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.04, 6, 40), kit.emit(idx ? COL.cyan : COL.amber, 1.4));
      kit.track(t2.geometry);
      t2.position.set(0, 4.9, i * 2.6);
      c.add(t2);
    }
    // risers and saddles
    for (const z of [-4, 0, 4]) kit.cyl(0.28, 0.28, 1.7, kit.steel, 0, 3.6, z, c, 12);
    for (const z of [-4.5, 4.5]) {
      kit.box(3.2, 1.0, 0.5, kit.darkSteel, 0, 0.9, z, c);
      kit.box(2.4, 0.5, 0.5, kit.darkSteel, 0, 3.9, z * 0.9, c);
    }
    // waste-heat intake and chilled outlet
    kit.flow([[x - 0.9, 5.0, 164], [x - 0.9, 5.0, 169.2]], { color: COL.magma, r: 0.3, spacing: 4, speed: 4, dir: 1, base: 0.4 });
    kit.flow([[x + 0.9, 2.2, 182.8], [x + 0.9, 2.2, 187]], { color: COL.cyan, r: 0.3, spacing: 4, speed: 4, dir: 1, base: 0.4 });
    kit.hcyl(0.3, 5.2, teal, x - 0.9, 5.0, 166.6, "z", g);
    kit.hcyl(0.3, 4.2, teal, x + 0.9, 2.2, 185, "z", g);
    const lab = kit.sign(idx ? "CHILLER B · LiBr" : "CHILLER A · LiBr", "#e8fbff", COL.cyan, 7.6);
    lab.position.set(x, 8.2, 176);
    g.add(lab);
  });

  // plate heat-exchangers
  const plates: { p: V3 }[] = [];
  for (let i = 0; i < 26; i += 1) plates.push({ p: [-0.0, 0, i * 0.13] });
  [-21, 21].forEach(x => {
    const grp = new THREE.Group();
    grp.position.set(x, 2.0, 166);
    g.add(grp);
    kit.inst(new THREE.BoxGeometry(2.8, 3.4, 0.06), kit.std("#b4bcc6", 0.9, 0.3), plates.map(p => ({ p: [p.p[0], p.p[1], p.p[2] - 1.7] as V3 })), grp);
    kit.box(3.0, 3.6, 0.2, kit.darkSteel, 0, 0, -1.95, grp);
    kit.box(3.0, 3.6, 0.2, kit.darkSteel, 0, 0, 1.95, grp);
    kit.box(0.14, 3.7, 0.14, kit.steel, -1.4, 0, -1.95, grp);
    kit.box(0.14, 3.7, 0.14, kit.steel, 1.4, 0, 1.95, grp);
  });

  // CO2 loop around the plant
  const loop: V3[] = [[-19, 1.2, 163], [19, 1.2, 163], [19, 1.2, 188], [-19, 1.2, 188], [-19, 1.2, 163]];
  kit.flow(roundedPath(loop, 3), { color: COL.cyan, r: 0.34, spacing: 9, speed: 4.5, dir: 1, base: 0.32 });
  const loop2: V3[] = [[-19, 2.0, 164.5], [17.5, 2.0, 164.5], [17.5, 2.0, 186.5], [-19, 2.0, 186.5]];
  kit.flow(roundedPath(loop2, 3), { color: COL.magma, r: 0.26, spacing: 9, speed: 4.5, dir: -1, base: 0.3 });
  kit.tubeBody(roundedPath(loop, 3), 0.28, "#3b4552", g);

  // shell intake ducts: cold air from the roof into the loop
  [-23.5, 23.5].forEach(x => {
    const top = POD.H * Math.sqrt(1 - ((Math.abs(x) + 0.9) / POD.W) ** 2) - 0.4;
    kit.box(1.8, top, 1.8, kit.glass, x, top / 2, 176, g).renderOrder = 3;
    for (const dx of [-0.8, 0.8]) for (const dz of [-0.8, 0.8]) kit.box(0.1, top, 0.1, kit.steel, x + dx, top / 2, 176 + dz, g);
    [-0.4, 0.4].forEach(o => {
      kit.flow([[x + o, top - 0.2, 176 + o * 0.5], [x + o * 0.4, 1.3, 176]], { color: "#d7f6ff", r: 0.07, spacing: 2.4, speed: 6, dir: 1, base: 0.3, width: 0.12 });
    });
    kit.flow([[x, 1.3, 176], [x * 0.5, 1.2, 176], [x * 0.5, 1.2, 163.5]], { color: COL.cyan, r: 0.22, spacing: 4, speed: 4, dir: 1, base: 0.4 });
    const funnel = kit.cyl(1.5, 0.9, 0.6, kit.glow(COL.cyan, 0.18), x, top - 0.1, 176, g, 16);
    funnel.renderOrder = 3;
    const lab = kit.sign("COLD FROM THE SHELL", "#e8fbff", COL.cyan, 6.6);
    lab.position.set(x * 0.92, top + 1.6, 176);
    g.add(lab);
  });

  // pumps
  for (let i = 0; i < 5; i += 1) {
    const x = -14 + i * 7;
    kit.cyl(0.55, 0.55, 1.1, kit.std("#58606c", 0.8, 0.4), x, 0.8, 186, g, 16);
    kit.box(1.0, 0.9, 1.0, kit.darkSteel, x + 0.9, 0.55, 186, g);
    const lamp = kit.box(0.2, 0.06, 0.06, kit.emit(COL.green, 2), x + 0.9, 1.05, 185.48, g);
    lamp.renderOrder = 2;
  }
  kit.dust(kit.lowPower ? 60 : 160, [-26, 0.3, 160], [26, 10, 190], 0.06, "#dff6ff", 0.35);
  anchor(A, -10, 6, 170, COL.cyan, 1.3);
  anchor(A, 10, 6, 182, COL.cyan, 1.1);
}

/** NanoVault hall (z 190 – 215). */
export function buildVault(kit: Kit, g: THREE.Group, A: Anchor[]) {
  const coreMat = kit.track(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      toneMapped: false,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; varying vec2 vUv;
        void main(){
          float g = 0.5 + 0.5 * cos(vUv.x * 6.2831853 * 2.0 + 0.9);
          float b = 0.5 + 0.5 * sin(vUv.y * 46.0 - uTime * 0.7);
          float s = 0.55 + 0.45 * sin(uTime * 0.4 + vUv.y * 3.0);
          vec3 col = mix(vec3(0.62, 0.10, 0.02), vec3(1.0, 0.56, 0.14), g * 0.65 + b * 0.2 + s * 0.15);
          gl_FragColor = vec4(col * 1.7, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  kit.ticks.push(t => {
    coreMat.uniforms.uTime.value = t;
  });
  const vessel = kit.track(
    new THREE.MeshPhysicalMaterial({ color: "#cfd9e8", transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0.25, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false })
  );
  const L = 15;
  [-18, -6, 6, 18].forEach(x => {
    const v = new THREE.Group();
    v.position.set(x, 3.5, 202);
    g.add(v);
    // inner hot core
    const core = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, L - 1, 36, 1, false), coreMat);
    kit.track(core.geometry);
    core.rotation.x = Math.PI / 2;
    v.add(core);
    // outer vacuum shell
    const shellC = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, L, 40, 1, true), vessel);
    kit.track(shellC.geometry);
    shellC.rotation.x = Math.PI / 2;
    shellC.renderOrder = 3;
    v.add(shellC);
    for (const s of [-1, 1]) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(3.0, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), vessel);
      kit.track(dome.geometry);
      dome.rotation.x = s * Math.PI / 2;
      dome.position.z = s * (L / 2);
      dome.renderOrder = 3;
      v.add(dome);
      const flange = new THREE.Mesh(new THREE.TorusGeometry(3.02, 0.16, 8, 48), kit.std("#59616d", 0.9, 0.3));
      kit.track(flange.geometry);
      flange.position.z = s * (L / 2);
      v.add(flange);
    }
    for (let i = -2; i <= 2; i += 1) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(3.04, 0.05, 6, 48), kit.emit(i % 2 ? COL.ledHi : COL.cyan, 1.1));
      kit.track(band.geometry);
      band.position.z = i * 2.7;
      v.add(band);
    }
    // cradles
    for (const z of [-4.6, 4.6]) {
      kit.box(5.4, 1.1, 0.7, kit.darkSteel, 0, -2.95, z, v);
      kit.box(0.6, 0.4, 0.6, kit.darkSteel, -2.2, -2.2, z, v);
      kit.box(0.6, 0.4, 0.6, kit.darkSteel, 2.2, -2.2, z, v);
    }
    // hot manifold stub to the energy side
    kit.flow([[x, 3.5, 209.6], [x, 3.5, 213.4], [x * 0.7, 5.2, 216]], { color: COL.magma, r: 0.28, spacing: 3.6, speed: 3.5, dir: 1, base: 0.5 });
    kit.flow([[x, 3.5, 194.4], [x, 3.5, 191], [x * 0.7, 5.6, 188.5]], { color: COL.amber, r: 0.24, spacing: 3.6, speed: 3.5, dir: -1, base: 0.4 });
    const halo = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, L - 1.4, 28, 1, true), kit.glow(COL.magma, 0.1));
    kit.track(halo.geometry);
    halo.rotation.x = Math.PI / 2;
    v.add(halo);
  });
  // base plinth with sub-microsecond handover bus
  kit.box(48, 0.16, 20, kit.floorMaterial(6, 1, "#262b34"), 0, 0.1, 202, g).visible = false;
  kit.box(46, 0.08, 0.3, kit.emit(COL.amber, 1.3), 0, 0.12, 195.5, g);
  kit.box(46, 0.08, 0.3, kit.emit(COL.amber, 1.3), 0, 0.12, 208.5, g);
  const s = kit.sign("7 DAYS OF HEAT · VACUUM ISOLATED", "#fff1dc", COL.magma, 11);
  s.position.set(0, 9.2, 202);
  g.add(s);
  kit.dust(kit.lowPower ? 40 : 110, [-26, 0.3, 190], [26, 9, 215], 0.07, "#ffd7b0", 0.4);
  anchor(A, -12, 5, 202, COL.magma, 1.9);
  anchor(A, 12, 5, 202, COL.magma, 1.9);
}

/** Energy bay: wellheads fifty metres apart, heat-to-electric conversion beside them. */
export function buildEnergy(kit: Kit, g: THREE.Group, A: Anchor[], wells: THREE.Group[]) {
  const accent = kit.std("#e9edf2", 0.4, 0.3);
  for (const sx of [-1, 1]) {
    const x = sx * WELL.x;
    const z = WELL.z;
    const w = new THREE.Group();
    w.position.set(x, 0, z);
    g.add(w);
    wells.push(w);
    // grating pad with lit rim
    kit.cyl(4.3, 4.5, 0.3, kit.darkSteel, 0, 0.15, 0, w, 40);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.07, 6, 60), kit.emit(COL.magma, 1.6));
    kit.track(rim.geometry);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.32;
    w.add(rim);
    // wellhead tree
    kit.cyl(1.0, 1.1, 0.45, kit.steel, 0, 0.5, 0, w, 24);
    kit.cyl(0.55, 0.55, 3.6, kit.std("#6b747f", 0.9, 0.3), 0, 2.5, 0, w, 20);
    for (const yy of [1.2, 2.6, 3.6]) kit.cyl(0.8, 0.8, 0.18, kit.steel, 0, yy, 0, w, 20);
    kit.cyl(0.4, 0.4, 0.5, kit.steel, 0, 4.5, 0, w, 16);
    kit.hcyl(0.3, 3.4, kit.std("#6b747f", 0.9, 0.3), 0, 2.0, 0, "x", w);
    kit.hcyl(0.3, 2.8, kit.std("#6b747f", 0.9, 0.3), 0, 3.2, 0, "z", w);
    for (const [hx, hy, hz] of [[1.7, 2.0, 0], [-1.7, 2.0, 0], [0, 3.2, 1.4]] as V3[]) {
      kit.cyl(0.5, 0.5, 0.3, kit.steel, hx, hy, hz, w, 14);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 6, 20), kit.emit(COL.magma, 1.3));
      kit.track(wheel.geometry);
      wheel.position.set(hx, hy + 0.35, hz);
      wheel.rotation.x = Math.PI / 2;
      w.add(wheel);
    }
    // gauge halo
    const g2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 6, 30), kit.emit(COL.amber, 2.0));
    kit.track(g2.geometry);
    g2.position.set(0, 4.0, 0);
    g2.rotation.x = Math.PI / 2;
    w.add(g2);
    // the pad: a copper collar at the foot of the tree, a gold ring of ten slot caps in the deck (orange: production, blue: injection)
    kit.cyl(0.78, 0.78, 0.5, kit.copper, 0, 0.62, 0, w, 24);
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.09, 8, 48), kit.emit("#e9b949", 1.7));
    kit.track(padRing.geometry);
    padRing.rotation.x = Math.PI / 2;
    padRing.position.y = 0.34;
    w.add(padRing);
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 - 1.2;
      const production = ![1, 3, 6, 8].includes(i);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), kit.emit(production ? COL.magma : COL.led, 2.2));
      kit.track(cap.geometry);
      cap.position.set(Math.cos(a) * 2.0, 0.36, Math.sin(a) * 2.0);
      w.add(cap);
    }
    // sensor mast for the motherbore probe, with a cyan beacon
    kit.cyl(0.05, 0.05, 3.2, kit.steel, 2.9, 1.9, -1.6, w, 8);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), kit.emit(COL.cyan, 2.6));
    kit.track(beacon.geometry);
    beacon.position.set(2.9, 3.6, -1.6);
    w.add(beacon);
    // fence posts
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      kit.box(0.08, 1.2, 0.08, kit.steel, Math.sin(a) * 4.1, 0.9, Math.cos(a) * 4.1, w);
    }
    const fence = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.03, 6, 60), kit.steel);
    kit.track(fence.geometry);
    fence.rotation.x = Math.PI / 2;
    fence.position.y = 1.4;
    w.add(fence);
    // downhole beam
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 40, 16, 1, true), kit.glow(COL.magma, 0.1));
    kit.track(beam.geometry);
    beam.position.y = -20;
    w.add(beam);

    // heat-to-electric skid beside the well (toward centre)
    const sk = new THREE.Group();
    sk.position.set(sx * 13.5, 0, 234);
    g.add(sk);
    kit.box(7.2, 0.4, 5, kit.darkSteel, 0, 0.2, 0, sk);
    kit.box(2.8, 2.6, 2.4, kit.std("#c9ced6", 0.5, 0.35), -1.9, 1.7, 0, sk);
    kit.box(2.82, 0.14, 2.42, kit.emit(COL.amber, 1.3), -1.9, 2.4, 0, sk);
    kit.hcyl(1.0, 3.2, kit.std("#8e97a3", 0.9, 0.3), 1.2, 1.5, 0, "x", sk);
    for (let i = -1; i <= 1; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.07, 6, 28), kit.copper);
      kit.track(ring.geometry);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(1.2 + i * 1.0, 1.5, 0);
      sk.add(ring);
    }
    kit.box(1.8, 2.8, 1.8, kit.std("#59616d", 0.8, 0.4), 2.7, 1.8, 1.4, sk);
    kit.box(1.8, 0.1, 1.8, kit.emit(COL.cyan, 1.2), 2.7, 3.25, 1.4, sk);
    const stripe = kit.box(0.04, 1.8, 0.03, kit.emit(COL.ledHi, 1.8), -3.31, 1.7, 1.22, sk);
    stripe.rotation.y = 0;
    // pipework: hot from the well, cooled back, power out
    kit.flow(roundedPath([[x, 1.2, z - 0.6], [x, 1.2, z - 3.6], [sx * 15.5, 1.4, z - 3.6], [sx * 15.5, 1.6, 231.4]], 1.2), { color: COL.magma, r: 0.3, spacing: 4, speed: 4, dir: 1, base: 0.5 });
    kit.flow(roundedPath([[sx * 12.6, 1.0, 236.8], [sx * 12.6, 1.0, 239.8], [x + sx * 1.8, 0.9, 239.8], [x + sx * 1.8, 0.9, z + 1]], 1.2), { color: COL.cyan, r: 0.24, spacing: 4, speed: 4, dir: 1, base: 0.4 });
    kit.flow(roundedPath([[sx * 11.2, 2.6, 232], [sx * 11.2, 2.6, 222], [sx * 27.5, 1.2, 222], [sx * 27.5, 1.2, 222.5]], 1.2), { color: COL.amber, r: 0.22, spacing: 6, speed: 8, dir: 1, base: 0.4 });
    kit.hcyl(0.3, 3.2, kit.std("#6b747f", 0.9, 0.3), sx * 15.5, 1.5, 230, "z", g);
    const lab = kit.sign(sx < 0 ? "WELL PAD A" : "WELL PAD B", "#fff1dc", COL.magma, 5);
    lab.position.set(x, 7.2, z);
    g.add(lab);
    anchor(A, x, 5.4, z - 3, COL.magma, 1.6);
  }
  void accent;

  // 50 m dimension line on the floor between the wells
  const zz = 218.5;
  kit.box(2 * WELL.x, 0.03, 0.12, kit.emit(COL.warm, 1.6), 0, 0.07, zz, g);
  for (const sx of [-1, 1]) {
    kit.box(0.12, 0.03, 3.4, kit.emit(COL.warm, 1.6), sx * WELL.x, 0.07, zz, g);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 3), kit.emit(COL.warm, 1.6));
    kit.track(arrow.geometry);
    arrow.rotation.set(Math.PI / 2, 0, sx * -Math.PI / 2);
    arrow.rotation.order = "ZXY";
    arrow.position.set(sx * (WELL.x - 0.8), 0.1, zz);
    arrow.rotation.set(-Math.PI / 2, 0, 0);
    arrow.rotation.z = sx * Math.PI / 2;
    g.add(arrow);
  }
  const fifty = kit.sign("50 m", "#fff6e8", COL.magma, 8, true);
  fifty.position.set(0, 2.2, zz);
  g.add(fifty);

  // overhead gantry crane with a trolley
  const crane = new THREE.Group();
  crane.position.set(0, 6.2, 224);
  g.add(crane);
  kit.box(54, 0.5, 0.7, kit.std("#3a424e", 0.8, 0.4), 0, 0, 0, crane);
  kit.box(54, 0.14, 0.14, kit.emit(COL.warm, 1.0), 0, -0.34, 0.4, crane);
  const trolley = new THREE.Group();
  crane.add(trolley);
  kit.box(2.2, 0.7, 1.8, kit.std("#c1c8d1", 0.6, 0.35), 0, -0.55, 0, trolley);
  const cable = kit.cyl(0.04, 0.04, 4.4, kit.steel, 0, -3.0, 0, trolley, 6);
  cable.position.y = -3.1;
  kit.box(0.5, 0.35, 0.5, kit.std("#e04a12", 0.5, 0.4), 0, -5.4, 0, trolley);
  kit.ticks.push(t => {
    trolley.position.x = Math.sin(t * 0.22) * 19;
  });

  kit.dust(kit.lowPower ? 60 : 160, [-26, 0.3, 215], [26, 9, 248], 0.07, "#ffd7b0", 0.4);
}
