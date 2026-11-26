import * as THREE from "three";
import { COL, CircleCurve, Kit, rng } from "./kit";

export type Anchor = { p: THREE.Vector3; c: THREE.Color; k: number };
export const anchor = (A: Anchor[], x: number, y: number, z: number, c: string, k = 1) =>
  A.push({ p: new THREE.Vector3(x, y, z), c: new THREE.Color(c), k });

/** Pod envelope (metres). Pod 1 runs along +z from the hub. */
export const POD = { W: 30, H: 17, Z0: 60, Z1: 250, S0: 90, S1: 220 };
export const HUB = { RIN: 15, ROUT: 34.5 };
export const WELL = { x: 25, z: 226 };

export function podShellGeometry() {
  const len = (POD.S1 - POD.S0) / POD.W;
  const g = new THREE.CapsuleGeometry(1, len, 14, 56);
  g.rotateX(Math.PI / 2);
  g.scale(POD.W, POD.H, POD.W);
  g.translate(0, 0, (POD.S0 + POD.S1) / 2);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i += 1) if (p.getY(i) < 0) p.setY(i, 0);
  g.computeVertexNormals();
  return g;
}

/** Half-width and height of the pod envelope at a given z. */
export function podSection(z: number) {
  let k = 1;
  if (z < POD.S0) k = Math.sqrt(Math.max(0, 1 - ((POD.S0 - z) / POD.W) ** 2));
  else if (z > POD.S1) k = Math.sqrt(Math.max(0, 1 - ((z - POD.S1) / POD.W) ** 2));
  return { w: POD.W * k, h: POD.H * k, k };
}

function ringMesh(kit: Kit, r0: number, r1: number, y: number, mat: THREE.Material, g: THREE.Group, seg = 96) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, seg), mat);
  kit.track(m.geometry);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  g.add(m);
  return m;
}

const hexCache = new WeakMap<Kit, THREE.Material>();
export function hexOverlayMat(kit: Kit) {
  let m = hexCache.get(kit);
  if (!m) {
    kit.hexTex.repeat.set(7, 9);
    kit.hexTexInner.repeat.set(7, 9);
    m = kit.track(
      new THREE.MeshPhysicalMaterial({
        map: kit.hexTex,
        color: "#ffffff",
        roughness: 0.5,
        transparent: true,
        opacity: 0.8,
        alphaTest: 0.035,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    hexCache.set(kit, m);
  }
  return m;
}

/** The five other pods: shells only, with wellhead beacons — they make the campus read at a glance. */
export function buildCampusShells(kit: Kit, g: THREE.Group, shell: THREE.BufferGeometry) {
  const hexMat = hexOverlayMat(kit);
  const beam = kit.glow(COL.amber, 0.22);
  const beamGeo = kit.track(new THREE.CylinderGeometry(0.5, 1.6, 60, 14, 1, true));
  const padGeo = kit.track(new THREE.CylinderGeometry(3.4, 3.8, 0.6, 24));
  const padMat = kit.std("#20252e", 0.7, 0.4);
  const capMat = kit.emit(COL.amber, 1.4);
  const capGeo = kit.track(new THREE.CylinderGeometry(1.1, 1.1, 1.2, 14));
  for (let k = 1; k < 6; k += 1) {
    const pod = new THREE.Group();
    pod.rotation.y = (k * Math.PI) / 3;
    const outer = new THREE.Mesh(shell, kit.ceramic);
    const hex = new THREE.Mesh(shell, hexMat);
    hex.scale.set(1.006, 1.012, 1.002);
    pod.add(outer, hex);
    for (const sx of [-1, 1]) {
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(sx * WELL.x, 0.3, WELL.z);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(sx * WELL.x, 1.2, WELL.z);
      const b = new THREE.Mesh(beamGeo, beam);
      b.position.set(sx * WELL.x, 31, WELL.z);
      pod.add(pad, cap, b);
    }
    g.add(pod);
  }
}

/** Pod 1 wellhead beacons (the detailed wellheads live in the energy bay). */
export function buildHub(kit: Kit, g: THREE.Group, A: Anchor[]) {
  const { RIN, ROUT } = HUB;
  const GAP_IN = 0.3; // radians, doorway in the courtyard glass
  const GAP_OUT = 0.22;
  const floorMat = kit.floorMaterial(6, 2 * ROUT, "#2a303a");

  // ── floor
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ROUT, 120), floorMat);
  kit.track(floor.geometry);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  g.add(floor);
  // concentric light rings in the courtyard floor
  [5.4, 8.6, 11.8, 14.5].forEach((r, i) => ringMesh(kit, r, r + 0.1, 0.05, kit.emit(i % 2 ? COL.led : COL.ledHi, 1.1), g));

  // ── outer wall (gapped for the corridor) and closed roof
  const wallPts = [new THREE.Vector2(ROUT, 0), new THREE.Vector2(ROUT, 8.4), new THREE.Vector2(ROUT - 0.4, 8.4), new THREE.Vector2(ROUT - 0.4, 0)];
  const wall = new THREE.Mesh(new THREE.LatheGeometry(wallPts, 96, GAP_OUT / 2, Math.PI * 2 - GAP_OUT), new THREE.MeshPhysicalMaterial({ color: "#8f8c87", roughness: 0.5, metalness: 0.05, clearcoat: 0.2, side: THREE.DoubleSide }));
  const roofPts = [
    new THREE.Vector2(ROUT + 0.5, 8.0),
    new THREE.Vector2(ROUT - 1.2, 12.4),
    new THREE.Vector2(26, 14.3),
    new THREE.Vector2(19, 14.0),
    new THREE.Vector2(RIN + 0.6, 13.4),
    new THREE.Vector2(RIN + 0.2, 12.2),
    new THREE.Vector2(RIN + 0.6, 12.0),
    new THREE.Vector2(19, 12.6),
    new THREE.Vector2(26, 12.9),
    new THREE.Vector2(ROUT - 1.6, 11.2),
    new THREE.Vector2(ROUT - 0.4, 8.0),
  ];
  const roof = new THREE.Mesh(new THREE.LatheGeometry(roofPts, 120), new THREE.MeshPhysicalMaterial({ color: "#a5a29c", roughness: 0.45, metalness: 0.04, clearcoat: 0.3, side: THREE.DoubleSide }));
  kit.track(wall.geometry);
  kit.track(roof.geometry);
  g.add(wall, roof);
  // roof ribs: thin emissive seams
  for (let i = 0; i < 36; i += 1) {
    const a = (i / 36) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 14.5), kit.darkSteel);
    kit.track(rib.geometry);
    const r = 25.6;
    rib.position.set(Math.sin(a) * r, 13.6, Math.cos(a) * r);
    rib.rotation.y = a;
    rib.rotation.x = 0.0;
    g.add(rib);
  }
  // soft crown ring around the oculus
  const crown = new THREE.Mesh(new THREE.TorusGeometry(RIN + 0.4, 0.14, 8, 120), kit.emit(COL.warm, 1.4));
  kit.track(crown.geometry);
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 12.3;
  g.add(crown);

  // ── courtyard glass wall with a doorway toward the pod
  const glassCurve = new THREE.CylinderGeometry(RIN, RIN, 12.4, 96, 1, true, GAP_IN / 2, Math.PI * 2 - GAP_IN);
  kit.track(glassCurve);
  const glass = new THREE.Mesh(glassCurve, kit.glass);
  glass.position.y = 6.2;
  g.add(glass);
  const mull = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 12.4, 0.16), kit.darkSteel, 60);
  kit.track(mull.geometry);
  const m4 = new THREE.Matrix4();
  let mi = 0;
  for (let i = 0; i < 60; i += 1) {
    const a = GAP_IN / 2 + ((Math.PI * 2 - GAP_IN) * i) / 59;
    m4.compose(new THREE.Vector3(Math.sin(a) * RIN, 6.2, Math.cos(a) * RIN), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)), new THREE.Vector3(1, 1, 1));
    mull.setMatrixAt(mi++, m4);
  }
  g.add(mull);
  for (const y of [0.15, 12.3, 6.2]) {
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new CircleCurve(RIN, y, 1, 0, 0, GAP_IN / 2, Math.PI * 2 - GAP_IN / 2), 100, y === 6.2 ? 0.05 : 0.11, 6, false), kit.darkSteel);
    kit.track(rail.geometry);
    g.add(rail);
  }
  // doorway frame
  const doorX = Math.sin(GAP_IN / 2) * RIN;
  for (const sx of [-1, 1]) {
    kit.box(0.35, 12.4, 0.35, kit.darkSteel, sx * doorX, 6.2, RIN * Math.cos(GAP_IN / 2), g);
    kit.box(0.08, 12.4, 0.08, kit.emit(COL.warm, 1.4), sx * (doorX - 0.25), 6.2, RIN * Math.cos(GAP_IN / 2) + 0.1, g);
  }

  // structural columns in the ring zone
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    kit.box(0.7, 13, 0.7, kit.graphite, Math.sin(a) * 31.5, 6.5, Math.cos(a) * 31.5, g);
  }

  // ── four infrastructure rings
  const RR = 24.5;
  const rings: { y: number; color: string; cw: 1 | -1; active: boolean }[] = [
    { y: 5.0, color: COL.amber, cw: 1, active: true },
    { y: 7.3, color: COL.cyan, cw: -1, active: true },
    { y: 9.6, color: COL.amber, cw: 1, active: false },
    { y: 11.9, color: COL.cyan, cw: -1, active: false },
  ];
  rings.forEach(r => {
    const body = new THREE.Mesh(new THREE.TorusGeometry(RR, 0.38, 12, 160), kit.std("#2d333d", 0.85, 0.3));
    kit.track(body.geometry);
    body.rotation.x = Math.PI / 2;
    body.position.y = r.y;
    g.add(body);
    kit.flow(new CircleCurve(RR, r.y, r.cw), {
      color: r.color,
      r: 0.5,
      spacing: r.active ? 11 : 24,
      speed: r.active ? 7 : 1.2,
      base: r.active ? 0.5 : 0.14,
      width: r.active ? 0.2 : 0.1,
      alpha: r.active ? 1 : 0.8,
      seg: 2.2,
      radial: 8,
    }, true);
    // brackets down to the floor
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      kit.box(0.14, r.y, 0.14, kit.darkSteel, Math.sin(a) * RR, r.y / 2, Math.cos(a) * RR, g);
    }
  });
  // standby tags: slow amber/cyan beacons
  [0.5, 2.2, 3.9, 5.5].forEach(a => {
    const s = kit.sign("STANDBY", "#c9d6e6", "rgba(120,160,220,0.6)", 5.2);
    s.position.set(Math.sin(a) * RR, 13.6, Math.cos(a) * RR);
    g.add(s);
  });

  // ── AI brain: pedestal, miniature campus, lattice sphere
  const brain = new THREE.Group();
  brain.position.set(0, 0, 0);
  g.add(brain);
  kit.cyl(4.6, 5.0, 0.5, kit.darkSteel, 0, 0.25, 0, brain, 48);
  kit.cyl(3.8, 4.1, 0.4, kit.graphite, 0, 0.7, 0, brain, 48);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.07, 8, 96), kit.emit(COL.ledHi, 1.8));
  kit.track(lip.geometry);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.52;
  brain.add(lip);
  // miniature campus on the pedestal (1 : 90)
  const mini = new THREE.Group();
  mini.position.y = 1.0;
  brain.add(mini);
  const miniHub = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.1, 8, 40), kit.emit(COL.ledHi, 1.5));
  kit.track(miniHub.geometry);
  miniHub.rotation.x = Math.PI / 2;
  mini.add(miniHub);
  const podG = new THREE.CapsuleGeometry(0.33, 1.7, 4, 14);
  podG.rotateX(Math.PI / 2);
  kit.track(podG);
  const podM = kit.glow(COL.led, 0.5);
  const podLine = new THREE.LineBasicMaterial({ color: new THREE.Color(COL.ledHi).multiplyScalar(1.6), transparent: true, opacity: 0.9, toneMapped: false });
  kit.track(podLine);
  const podEdges = kit.track(new THREE.EdgesGeometry(podG, 18));
  for (let k = 0; k < 6; k += 1) {
    const a = (k * Math.PI) / 3;
    const grp = new THREE.Group();
    grp.rotation.y = a;
    const m = new THREE.Mesh(podG, podM);
    m.position.z = 1.9;
    m.scale.y = 0.55;
    const e = new THREE.LineSegments(podEdges, podLine);
    e.position.z = 1.9;
    e.scale.y = 0.55;
    grp.add(m, e);
    mini.add(grp);
  }
  // lattice sphere
  const latticeGeo = kit.track(new THREE.IcosahedronGeometry(2.3, 2));
  const lattice = new THREE.LineSegments(
    kit.track(new THREE.WireframeGeometry(latticeGeo)),
    new THREE.LineBasicMaterial({ color: new THREE.Color(COL.ledHi).multiplyScalar(1.5), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, toneMapped: false, depthWrite: false })
  );
  lattice.position.y = 5.1;
  brain.add(lattice);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16), kit.emit("#bfe0ff", 2.4));
  kit.track(core.geometry);
  core.position.y = 5.1;
  brain.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), kit.glow(COL.led, 0.32));
  kit.track(halo.geometry);
  halo.position.y = 5.1;
  brain.add(halo);
  // beam from pedestal to sphere
  const beamM = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.5, 3.2, 14, 1, true), kit.glow(COL.ledHi, 0.28));
  kit.track(beamM.geometry);
  beamM.position.y = 2.7;
  brain.add(beamM);
  // orbiting rings with motes
  const orbitGroup = new THREE.Group();
  orbitGroup.position.y = 5.1;
  brain.add(orbitGroup);
  const orbitMat = kit.glow(COL.ledHi, 0.5);
  const tilts: [number, number][] = [[0.2, 0], [1.1, 0.9], [-0.9, 2.1]];
  const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), kit.emit("#d8ecff", 2.4), 42);
  kit.track(motes.geometry);
  orbitGroup.add(motes);
  tilts.forEach(([tx, tz], i) => {
    const o = new THREE.Mesh(new THREE.TorusGeometry(3.1 + i * 0.35, 0.018, 6, 120), orbitMat);
    kit.track(o.geometry);
    o.rotation.set(Math.PI / 2 + tx, 0, tz);
    orbitGroup.add(o);
  });
  const mm = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pv = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const ringRot = tilts.map(([tx, tz]) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI / 2 + tx, 0, tz)));
  kit.ticks.push(t => {
    lattice.rotation.y = t * 0.12;
    lattice.rotation.x = Math.sin(t * 0.2) * 0.12;
    halo.scale.setScalar(1 + Math.sin(t * 1.7) * 0.06);
    mini.rotation.y = t * 0.08;
    for (let i = 0; i < 42; i += 1) {
      const ring = i % 3;
      const ang = t * (0.5 + ring * 0.18) * (ring === 1 ? -1 : 1) + (i / 42) * Math.PI * 2 * 3.0;
      const rad = 3.1 + ring * 0.35;
      pv.set(Math.cos(ang) * rad, Math.sin(ang) * rad, 0).applyMatrix4(ringRot[ring]);
      mm.compose(pv, q, one);
      motes.setMatrixAt(i, mm);
    }
    motes.instanceMatrix.needsUpdate = true;
  });

  // lights
  anchor(A, 0, 6, -3, COL.ledHi, 1.4);
  anchor(A, 0, 4, -11, "#ffe9cf", 0.7);
  anchor(A, 19, 8, 19, COL.amber, 1.0);
  anchor(A, -19, 8, 19, COL.cyan, 1.0);
  anchor(A, 19, 6, -19, COL.amber, 0.8);
  anchor(A, -19, 6, -19, COL.cyan, 0.8);
}

/** Glass link tube between the hub and the pod. */
export function buildCorridor(kit: Kit, g: THREE.Group, A: Anchor[]) {
  const z0 = 30;
  const z1 = POD.Z0 + 6;
  const len = z1 - z0;
  const floor = kit.box(7.4, 0.2, len, kit.floorMaterial(6, 1, "#2a303a"), 0, 0.08, (z0 + z1) / 2, g);
  floor.material = kit.floorMaterial(6, 1, "#2a303a");
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, len, 40, 1, true, Math.PI, Math.PI * 2), kit.glass);
  kit.track(tube.geometry);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 0, (z0 + z1) / 2);
  tube.scale.set(1, 1, 0.72);
  g.add(tube);
  const nRibs = 13;
  const ribs = new THREE.InstancedMesh(new THREE.TorusGeometry(3.8, 0.1, 6, 36, Math.PI), kit.darkSteel, nRibs);
  kit.track(ribs.geometry);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < nRibs; i += 1) {
    m4.compose(new THREE.Vector3(0, 0, z0 + (len * i) / (nRibs - 1)), new THREE.Quaternion(), new THREE.Vector3(1, 0.72, 1));
    ribs.setMatrixAt(i, m4);
  }
  g.add(ribs);
  // wall strips of light
  for (const sx of [-1, 1]) {
    kit.box(0.08, 0.08, len, kit.emit(COL.ledHi, 1.4), sx * 3.5, 0.3, (z0 + z1) / 2, g);
    kit.box(0.06, 0.06, len, kit.emit(COL.warm, 1.0), sx * 2.5, 2.55, (z0 + z1) / 2, g);
  }
  // four feeder lines from the rings into the pod (power x2 amber, cooling x2 cyan)
  const feed = [
    { x: -1.5, y: 2.5, c: COL.amber, spd: 7, base: 0.5 },
    { x: -0.5, y: 2.7, c: COL.cyan, spd: 5, base: 0.5 },
    { x: 0.5, y: 2.7, c: COL.amber, spd: 1.2, base: 0.14 },
    { x: 1.5, y: 2.5, c: COL.cyan, spd: 1.2, base: 0.14 },
  ];
  feed.forEach(f => {
    kit.flow(
      [
        [f.x, f.y, z0 - 6],
        [f.x, f.y, z0 + 20],
        [f.x, f.y, z1 + 4],
      ],
      { color: f.c, r: 0.12, spacing: 5, speed: f.spd, base: f.base, width: 0.16 }
    );
  });
  anchor(A, 0, 3.2, 44, "#d6e6ff", 1.0);
  anchor(A, 0, 3.2, 56, "#ffe9cf", 0.7);
  void rng;
}
