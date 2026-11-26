import * as THREE from "three";
import { COL, Kit, V3, roundedPath, rng } from "./kit";
import { Anchor, POD, WELL, anchor } from "./hub";

/** Biogas resilience yard east of Pod 1. */
export function buildYard(kit: Kit, g: THREE.Group, A: Anchor[]) {
  const R = rng(11);
  const pad = kit.box(70, 0.3, 112, kit.floorMaterial(8, 1, "#222730"), 80, 0.12, 180, g);
  pad.material = kit.floorMaterial(8, 1, "#222730");
  // markings
  kit.box(70, 0.02, 0.16, kit.emit(COL.warm, 0.6), 80, 0.3, 130.5, g);
  kit.box(70, 0.02, 0.16, kit.emit(COL.warm, 0.6), 80, 0.3, 229.5, g);
  const steel = kit.std("#8b929c", 0.85, 0.35);
  const dark = kit.darkSteel;
  const greenGlass = kit.track(new THREE.MeshPhysicalMaterial({ color: "#bfeccf", transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }));
  const liquid = kit.track(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      vertexShader: /* glsl */ `varying vec2 vUv; varying float vY; void main(){ vUv = uv; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; varying vec2 vUv; varying float vY;
        void main(){
          float swirl = 0.5 + 0.5 * sin(vUv.x * 18.0 + vY * 1.4 - uTime * 0.7);
          vec3 c = mix(vec3(0.05, 0.42, 0.20), vec3(0.45, 1.0, 0.55), swirl * 0.6 + 0.2);
          gl_FragColor = vec4(c * 1.15, 0.62);
          #include <colorspace_fragment>
        }`,
    })
  );
  kit.ticks.push(t => {
    liquid.uniforms.uTime.value = t;
  });

  // capture: subsurface well stub + atmospheric intake mast
  const cap1 = new THREE.Group();
  cap1.position.set(52, 0, 138);
  g.add(cap1);
  kit.cyl(0.9, 1.0, 0.5, dark, 0, 0.25, 0, cap1, 16);
  kit.cyl(0.35, 0.35, 3.2, steel, 0, 2.0, 0, cap1, 12);
  kit.hcyl(0.22, 1.8, steel, 0.8, 2.6, 0, "x", cap1);
  const s1 = kit.sign("SUBSURFACE CAPTURE", "#eafff1", COL.green, 8.4);
  s1.position.set(52, 6.3, 138);
  g.add(s1);
  const mast = new THREE.Group();
  mast.position.set(52, 0, 150);
  g.add(mast);
  kit.cyl(0.3, 0.4, 9, steel, 0, 4.5, 0, mast, 12);
  const cone = kit.cyl(1.6, 0.5, 1.4, kit.glow(COL.green, 0.35), 0, 9.6, 0, mast, 16);
  cone.renderOrder = 3;
  const s2 = kit.sign("ATMOSPHERIC CAPTURE", "#eafff1", COL.green, 8.4);
  s2.position.set(52, 13, 150);
  g.add(s2);
  [138, 150].forEach(z => {
    kit.flow(roundedPath([[52.8, 2.6, z], [56, 2.6, z], [56, 1.0, 146], [60, 1.0, 146]], 1.0), { color: COL.green, r: 0.16, spacing: 3.2, speed: 4, dir: 1, base: 0.4 });
  });

  // nanosieve skids
  [60, 70, 80].forEach(x => {
    const sk = new THREE.Group();
    sk.position.set(x, 0, 146);
    g.add(sk);
    kit.box(7, 0.3, 3.4, dark, 0, 0.3, 0, sk);
    const cylGeo = new THREE.CylinderGeometry(0.34, 0.34, 3.0, 12);
    const items: { p: V3; r: V3 }[] = [];
    for (let i = 0; i < 8; i += 1) for (let r = 0; r < 2; r += 1) items.push({ p: [-3 + i * 0.86, 0.9 + r * 0.9, 0], r: [Math.PI / 2, 0, 0] });
    kit.inst(cylGeo, kit.std("#d7dde6", 0.5, 0.3), items, sk);
    kit.box(7, 0.08, 0.1, kit.emit(COL.green, 1.5), 0, 2.15, 1.6, sk);
    kit.box(7, 0.08, 0.1, kit.emit(COL.green, 1.5), 0, 2.15, -1.6, sk);
    for (const sx of [-3.3, 3.3]) for (const sz of [-1.5, 1.5]) kit.box(0.14, 1.8, 0.14, steel, sx, 1.2, sz, sk);
  });
  const s3 = kit.sign("NANOSIEVE MEMBRANES", "#eafff1", COL.green, 9.4);
  s3.position.set(70, 5.4, 146);
  g.add(s3);
  kit.flow(roundedPath([[60, 1.0, 146], [84, 1.0, 146], [84, 1.0, 156]], 1.5), { color: COL.green, r: 0.2, spacing: 3.6, speed: 4.5, dir: 1, base: 0.35 });

  // bioreactors
  const bubbleN = 70;
  const bubbleGeo = new THREE.BufferGeometry();
  const bubbleBase: number[] = [];
  const bp = new Float32Array(bubbleN * 4 * 3);
  const reactors: [number, number][] = [[62, 166], [76, 166], [90, 166], [104, 166]];
  reactors.forEach(([x, z], ri) => {
    const rg = new THREE.Group();
    rg.position.set(x, 0, z);
    g.add(rg);
    kit.cyl(3.3, 3.5, 0.5, dark, 0, 0.25, 0, rg, 28);
    const tube = kit.cyl(3.1, 3.1, 11, greenGlass, 0, 6, 0, rg, 32);
    tube.renderOrder = 3;
    const liq = kit.cyl(2.8, 2.8, 8.2, liquid, 0, 4.6, 0, rg, 32);
    liq.material = liquid;
    liq.renderOrder = 2;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), greenGlass);
    kit.track(dome.geometry);
    dome.position.y = 11.5;
    dome.renderOrder = 3;
    rg.add(dome);
    for (const y of [2.5, 6.5, 10.5]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.1, 6, 40), kit.std("#59616d", 0.85, 0.35));
      kit.track(band.geometry);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      rg.add(band);
    }
    const lit = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.05, 6, 40), kit.emit(COL.green, 1.7));
    kit.track(lit.geometry);
    lit.rotation.x = Math.PI / 2;
    lit.position.y = 9.2;
    rg.add(lit);
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      kit.box(0.22, 2.6, 0.22, steel, Math.sin(a) * 3.3, 1.3, Math.cos(a) * 3.3, rg);
    }
    // bubbles
    for (let i = 0; i < bubbleN; i += 1) {
      const a = R() * Math.PI * 2;
      const r = Math.sqrt(R()) * 2.5;
      const k = (ri * bubbleN + i) * 3;
      bp[k] = x + Math.sin(a) * r;
      bp[k + 1] = 1 + R() * 8;
      bp[k + 2] = z + Math.cos(a) * r;
      bubbleBase.push(bp[k + 1]);
    }
    kit.flow(roundedPath([[84, 1.0, 156], [x, 1.0, 156], [x, 1.0, z - 3.4]], 1.5), { color: COL.green, r: 0.16, spacing: 3.2, speed: 4.5, dir: 1, base: 0.3 });
    kit.flow([[x, 1.0, z + 3.4], [x, 1.0, 180]], { color: COL.amber, r: 0.18, spacing: 3.2, speed: 4.5, dir: 1, base: 0.35 });
  });
  bubbleGeo.setAttribute("position", new THREE.BufferAttribute(bp, 3));
  const bubbles = new THREE.Points(
    bubbleGeo,
    new THREE.PointsMaterial({ color: "#d8ffe4", size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  );
  bubbles.frustumCulled = false;
  kit.track(bubbleGeo);
  g.add(bubbles);
  kit.ticks.push((t, dt) => {
    for (let i = 0; i < bubbleBase.length; i += 1) {
      const k = i * 3 + 1;
      bp[k] += dt * (0.9 + (i % 7) * 0.12);
      if (bp[k] > 9.3) bp[k] = 1;
    }
    bubbleGeo.attributes.position.needsUpdate = true;
    void t;
  });
  const s4 = kit.sign("BIOREACTORS · 5GBC1-RO1", "#eafff1", COL.green, 10.4);
  s4.position.set(83, 16.5, 166);
  g.add(s4);

  // composite tanks (segmented by zone)
  const tankGeo = new THREE.CapsuleGeometry(1.8, 12, 6, 24);
  tankGeo.rotateZ(Math.PI / 2);
  kit.track(tankGeo);
  const tankMat = kit.track(new THREE.MeshPhysicalMaterial({ color: "#d9dee5", roughness: 0.3, metalness: 0.2, clearcoat: 0.6 }));
  const tanks: [number, number][] = [[62, 186], [62, 192], [88, 186], [88, 192]];
  tanks.forEach(([x, z], i) => {
    const t = new THREE.Mesh(tankGeo, tankMat);
    t.position.set(x, 2.1, z);
    g.add(t);
    for (let s = -2; s <= 2; s += 1) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.84, 0.07, 6, 28), kit.emit(i % 2 ? COL.amber : COL.green, 1.2));
      kit.track(band.geometry);
      band.rotation.y = Math.PI / 2;
      band.position.set(x + s * 2.6, 2.1, z);
      g.add(band);
    }
    for (const dx of [-4.6, 4.6]) kit.box(0.5, 1.4, 3.4, dark, x + dx, 0.7, z, g);
  });
  const s5 = kit.sign("COMPOSITE TANKS · 20-DAY AUTONOMY", "#fff1dc", COL.amber, 12.6);
  s5.position.set(75, 7.6, 189);
  g.add(s5);
  kit.flow(roundedPath([[62, 1.0, 180], [62, 1.0, 184.2]], 1.0), { color: COL.amber, r: 0.2, spacing: 3.2, speed: 4.5, dir: 1, base: 0.4 });
  kit.flow(roundedPath([[75, 0.9, 189], [75, 0.9, 205], [58, 0.9, 205]], 1.5), { color: COL.amber, r: 0.22, spacing: 3.2, speed: 5, dir: 1, base: 0.4 });

  // microturbines: 4 continuous, 4 hot standby
  for (let i = 0; i < 8; i += 1) {
    const x = 56 + i * 6;
    const live = i < 4;
    const mt = new THREE.Group();
    mt.position.set(x, 0, 212);
    g.add(mt);
    kit.box(3.6, 0.4, 5, dark, 0, 0.2, 0, mt);
    kit.hcyl(0.85, 3.2, kit.std("#c4cbd5", 0.7, 0.3), 0, 1.6, 0, "z", mt);
    kit.cyl(0.28, 0.28, 2.6, steel, 0, 3.2, -1.4, mt, 10);
    kit.box(1.4, 1.5, 1.4, kit.std("#3a424e", 0.8, 0.4), 0, 1.1, 2.4, mt);
    const lamp = kit.box(0.5, 0.1, 0.1, kit.emit(live ? COL.green : COL.ledHi, live ? 2.2 : 1.1), 0, 2.3, 2.45, mt);
    lamp.renderOrder = 2;
    if (live) {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, 3.4, 10, 1, true), kit.glow(COL.amber, 0.28));
      kit.track(ex.geometry);
      ex.position.set(0, 5.8, -1.4);
      mt.add(ex);
    }
  }
  const s6 = kit.sign("4 CONTINUOUS", "#eafff1", COL.green, 6.4);
  s6.position.set(67.5, 5.6, 212);
  g.add(s6);
  const s7 = kit.sign("4 HOT STANDBY · < 15 s", "#e3f1ff", COL.ledHi, 8.6);
  s7.position.set(91.5, 5.6, 212);
  g.add(s7);
  // binary-cycle exchanger + exhaust heat
  kit.box(5, 3.2, 3, kit.std("#59616d", 0.8, 0.4), 108, 1.6, 212, g);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.18, 8, 24), kit.copper);
  kit.track(coil.geometry);
  coil.position.set(108, 3.9, 212);
  coil.rotation.x = Math.PI / 2;
  g.add(coil);
  kit.flow(roundedPath([[56, 6.6, 210.6], [108, 6.6, 210.6], [108, 3.3, 210.6]], 1.5), { color: COL.amber, r: 0.2, spacing: 4, speed: 6, dir: 1, base: 0.3 });
  // grid-isolated bus to the pod
  kit.flow(roundedPath([[56, 0.8, 218], [34, 0.8, 218], [30.5, 1.3, 218]], 1.5), { color: COL.amber, r: 0.3, spacing: 6, speed: 9, dir: -1, base: 0.45 });
  kit.flow(roundedPath([[108, 0.8, 218], [56, 0.8, 218]], 1.5), { color: COL.amber, r: 0.3, spacing: 6, speed: 9, dir: -1, base: 0.45 });
  const s8 = kit.sign("GRID-ISOLATED BUS · NO BATTERY UPS", "#fff1dc", COL.amber, 13.5);
  s8.position.set(44, 4.8, 220);
  g.add(s8);
  anchor(A, 66, 6, 150, COL.green, 1.4);
  anchor(A, 84, 8, 166, COL.green, 1.7);
  anchor(A, 75, 5, 190, COL.amber, 1.4);
  anchor(A, 80, 5, 210, COL.amber, 1.2);
  kit.dust(kit.lowPower ? 80 : 220, [46, 0.5, 128], [114, 14, 230], 0.09, "#e6ffee", 0.38);
}

/** Direct-air-capture contactors and the mineralisation line, west of Pod 1. */
export function buildDac(kit: Kit, g: THREE.Group, A: Anchor[]) {
  g.add(kit.box(78, 0.3, 112, kit.floorMaterial(8, 1, "#222730"), -82, 0.12, 180));
  const fans: THREE.Group[] = [];
  const body = kit.std("#2f3640", 0.7, 0.45);
  const slats = kit.std("#5a636f", 0.85, 0.35);
  [-62, -86].forEach((x, col) => {
    for (let i = 0; i < 6; i += 1) {
      const z = 142 + i * 15;
      const u = new THREE.Group();
      u.position.set(x, 0, z);
      g.add(u);
      kit.box(3.2, 9, 5.2, body, 0, 4.5, 0, u);
      // louvre slats on the outward face
      const slatItems: { p: V3 }[] = [];
      for (let s = 0; s < 14; s += 1) slatItems.push({ p: [col ? -1.64 : 1.64, 1.2 + s * 0.56, 0] });
      kit.inst(new THREE.BoxGeometry(0.1, 0.12, 4.7), slats, slatItems, u);
      // fan on the face looking at the pod
      const f = new THREE.Group();
      f.position.set(col ? 1.66 : -1.66, 5.2, 0);
      f.rotation.y = Math.PI / 2;
      u.add(f);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.16, 8, 36), kit.std("#8b929c", 0.9, 0.3));
      kit.track(ring.geometry);
      f.add(ring);
      const hub = kit.cyl(0.35, 0.35, 0.3, kit.steel, 0, 0, 0, f, 12);
      hub.rotation.x = Math.PI / 2;
      const rotor = new THREE.Group();
      f.add(rotor);
      for (let b = 0; b < 6; b += 1) {
        const blade = kit.box(0.5, 1.7, 0.05, kit.std("#c9d0da", 0.6, 0.35), 0, 1.15, 0, rotor);
        blade.rotation.z = (b / 6) * Math.PI * 2;
        blade.position.set(-Math.sin(blade.rotation.z) * 1.15, Math.cos(blade.rotation.z) * 1.15, 0);
        blade.rotation.y = 0.35;
      }
      fans.push(rotor);
      kit.box(0.2, 0.2, 4.5, kit.emit(COL.cyan, 1.4), col ? 1.66 : -1.66, 9.05, 0, u);
      // CO2 off-take line on top
      kit.flow([[x, 9.2, z], [x, 11.2, z], [-74, 11.2, z]], { color: "#d9f6ff", r: 0.12, spacing: 3, speed: 4, dir: 1, base: 0.35 });
    }
  });
  kit.ticks.push(t => {
    fans.forEach((r, i) => {
      r.rotation.z = -t * (3.2 + (i % 3) * 0.2);
    });
  });
  kit.flow([[-74, 11.2, 142], [-74, 11.2, 232]], { color: "#d9f6ff", r: 0.3, spacing: 5, speed: 5, dir: 1, base: 0.4 });
  // compressor skid + mineralisation well
  kit.box(6, 2.6, 4.4, kit.std("#59616d", 0.8, 0.4), -74, 1.3, 236, g);
  kit.cyl(1.2, 1.2, 3.4, kit.std("#c4cbd5", 0.7, 0.3), -77.5, 1.7, 236, g, 20);
  kit.box(6, 0.12, 0.12, kit.emit(COL.cyan, 1.5), -74, 2.65, 233.8, g);
  kit.flow(roundedPath([[-74, 11.2, 232], [-74, 3.4, 232], [-74, 3.2, 236]], 1.0), { color: "#d9f6ff", r: 0.3, spacing: 4, speed: 4, dir: 1, base: 0.4 });
  // mineralisation well: CO2 goes down, forever
  kit.cyl(0.9, 1.0, 0.5, kit.darkSteel, -66, 0.25, 244, g, 16);
  kit.cyl(0.35, 0.35, 2.6, kit.steel, -66, 1.8, 244, g, 12);
  kit.flow(roundedPath([[-74, 1.2, 237], [-66, 1.2, 238], [-66, 3.0, 244], [-66, 0.4, 244]], 1.0), { color: "#d9f6ff", r: 0.2, spacing: 3, speed: 4, dir: 1, base: 0.4 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.5, 18, 16, 1, true), kit.glow(COL.cyan, 0.16));
  kit.track(beam.geometry);
  beam.position.set(-66, 9, 244);
  g.add(beam);
  const s1 = kit.sign("DIRECT AIR CAPTURE", "#e8fbff", COL.cyan, 11);
  s1.position.set(-74, 16.5, 172);
  g.add(s1);
  const s2 = kit.sign("MINERALISED UNDERGROUND", "#e8fbff", COL.cyan, 11.5);
  s2.position.set(-66, 8.6, 244);
  g.add(s2);
  anchor(A, -74, 8, 160, COL.cyan, 1.4);
  anchor(A, -70, 6, 225, COL.cyan, 1.2);
}

/** Wind-and-cold scoops, intake chimneys and wind streaks on Pod 1's shell. */
export function buildRoof(kit: Kit, g: THREE.Group) {
  const items: { p: V3; r: V3 }[] = [];
  const edges: { p: V3; r: V3 }[] = [];
  const rows = [0, -9, 9];
  rows.forEach(x => {
    const y = POD.H * Math.sqrt(1 - (x / POD.W) ** 2);
    const tilt = Math.asin(x / POD.W) * 0.0 + (x === 0 ? 0 : (x / POD.W) * 0.9);
    for (let z = 96; z <= 216; z += 5) {
      items.push({ p: [x, y + 0.55, z], r: [-0.42, 0, -tilt] });
      edges.push({ p: [x, y + 0.9, z + 0.8], r: [-0.42, 0, -tilt] });
    }
  });
  kit.inst(new THREE.BoxGeometry(0.16, 1.4, 3.0), kit.std("#e6e2da", 0.35, 0.4), items, g);
  kit.inst(new THREE.BoxGeometry(0.05, 0.06, 2.6), kit.emit(COL.cyan, 1.8), edges, g);
  // intake chimneys above the cooling plant
  [-23.5, 23.5].forEach(x => {
    const top = POD.H * Math.sqrt(1 - ((Math.abs(x) + 0.9) / POD.W) ** 2) - 0.4;
    const ch = kit.cyl(1.0, 1.3, 3.2, kit.ceramic, x, top + 1.2, 176, g, 20);
    ch.rotation.z = (x < 0 ? 1 : -1) * 0.0;
    const funnel = kit.cyl(2.3, 1.2, 1.2, kit.ceramic, x, top + 3.4, 176, g, 20);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.07, 6, 30), kit.emit(COL.cyan, 1.8));
    kit.track(rim.geometry);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, top + 4.0, 176);
    g.add(rim);
    void funnel;
  });
  // wind streaks over the roof
  for (let i = 0; i < 9; i += 1) {
    const z = 108 + i * 12;
    const y0 = 14 + (i % 3) * 1.4;
    kit.flow(
      [
        [-52, y0 - 2, z],
        [-24, y0 + 6, z],
        [0, POD.H + 5.5, z + 1.5],
        [24, y0 + 6, z],
        [52, y0 - 2, z],
      ],
      { color: "#d7f6ff", r: 0.06, spacing: 14, speed: 16, dir: 1, base: 0.12, width: 0.2, radial: 5 }
    );
  }
}

/** The earth loop: two wells, ten branches each, 50 m apart. Depth is compressed ~25 : 1. */
export function buildUnder(kit: Kit, g: THREE.Group, A: Anchor[]) {
  const R = rng(5);
  const baseZ = WELL.z;
  const DEPTH = 200;
  // reference planes and strata
  const strata = [-14, -40, -80, -120, -160];
  strata.forEach((y, i) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), kit.glow(i < 2 ? "#7a5a3e" : i < 4 ? "#a0522d" : "#d04a1c", 0.035 + i * 0.012));
    kit.track(pl.geometry);
    pl.rotation.x = -Math.PI / 2;
    pl.position.set(0, y, baseZ);
    g.add(pl);
    const grid = new THREE.GridHelper(300, 30, 0x6a4a33, 0x3a2a20);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.2 + i * 0.03;
    (grid.material as THREE.Material).depthWrite = false;
    grid.position.set(0, y + 0.02, baseZ);
    g.add(grid);
  });
  // top face of the rock (underside of the surface)
  const top = new THREE.GridHelper(300, 30, 0xff9966, 0x6a4a33);
  (top.material as THREE.Material).transparent = true;
  (top.material as THREE.Material).opacity = 0.35;
  top.position.set(0, -0.05, baseZ);
  g.add(top);
  // hot floor
  const hot = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), kit.glow(COL.magma, 0.28));
  kit.track(hot.geometry);
  hot.rotation.x = -Math.PI / 2;
  hot.position.set(0, -DEPTH - 8, baseZ);
  g.add(hot);

  // depth ruler between the wells
  kit.box(0.12, DEPTH + 6, 0.12, kit.emit(COL.warm, 0.7), 0, -(DEPTH + 6) / 2 + 1, baseZ - 8, g);
  [1, 2, 3, 4, 5].forEach(km => {
    const y = -km * 40;
    kit.box(2.4, 0.1, 0.1, kit.emit(COL.warm, 1.4), 0, y, baseZ - 8, g);
    const s = kit.sign(`${km} km`, "#fff1dc", COL.magma, 5.4, true);
    s.position.set(-3.8, y + 1.1, baseZ - 8);
    g.add(s);
  });
  // 50 m between wells, held at depth
  kit.box(2 * WELL.x, 0.1, 0.1, kit.emit(COL.warm, 1.2), 0, -DEPTH + 6, baseZ - 8, g);
  const s50 = kit.sign("50 m", "#fff6e8", COL.magma, 8.4, true);
  s50.position.set(0, -DEPTH + 11, baseZ - 8);
  g.add(s50);

  // wells
  const injection = new Set([1, 4, 6, 9]);
  const slotDepth = (i: number) => (i < 6 ? 4 + i * 3 : 24 + (i - 6) * 5);
  for (const sx of [-1, 1]) {
    const x = sx * WELL.x;
    // casing and 10-slot neck
    kit.cyl(0.8, 0.8, 42, kit.std("#3d4650", 0.9, 0.3), x, -21, baseZ, g, 16);
    kit.cyl(1.3, 1.3, 40, kit.glow(COL.amber, 0.14), x, -21, baseZ, g, 16);
    for (let i = 0; i < 10; i += 1) {
      const p = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 6, 16), kit.emit(COL.amber, 1.8));
      kit.track(p.geometry);
      p.rotation.x = Math.PI / 2;
      p.position.set(x, -slotDepth(i), baseZ);
      g.add(p);
    }
    // 3-inch sensor core down the middle
    kit.flow([[x, -42, baseZ], [x, -DEPTH + 4, baseZ]], { color: "#e8f6ff", r: 0.14, spacing: 6, speed: 18, dir: 1, base: 0.8, width: 0.1 });
    for (let k = 1; k <= 8; k += 1) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), kit.emit(COL.ledHi, 2));
      kit.track(n.geometry);
      n.position.set(x, -42 - k * 19, baseZ);
      g.add(n);
    }
    // ten branches
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + (sx > 0 ? 0.3 : 0);
      const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const d0 = slotDepth(i);
      const reach = 11 + (i % 5) * 2.6 + R() * 2.5;
      const endY = DEPTH - 8 - (i % 3) * 6;
      const start = new THREE.Vector3(x, -d0, baseZ);
      const pts = [
        start.clone(),
        start.clone().addScaledVector(out, 1.8).add(new THREE.Vector3(0, -6, 0)),
        start.clone().addScaledVector(out, reach * 0.55).add(new THREE.Vector3(0, -(endY - d0) * 0.28 - 8, 0)),
        start.clone().addScaledVector(out, reach * 0.88).add(new THREE.Vector3(0, -(endY - d0) * 0.66, 0)),
        start.clone().addScaledVector(out, reach).setY(-endY),
      ];
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const inj = injection.has(i);
      kit.flow(curve, { color: inj ? COL.led : COL.magma, r: 0.34, spacing: 15, speed: 13, dir: inj ? 1 : -1, base: 0.55, width: 0.2, seg: 0.8, radial: 6 });
      kit.flow(curve, { color: inj ? COL.ledHi : COL.amber, r: 1.0, spacing: 15, speed: 13, dir: inj ? 1 : -1, base: 0.08, width: 0.2, alpha: 0.55, seg: 0.5, radial: 5 });
      // heated rock glow where the branch ends
      const end = pts[pts.length - 1];
      const h = new THREE.Mesh(new THREE.SphereGeometry(5.5, 14, 10), kit.glow(inj ? COL.led : COL.magma, 0.1));
      kit.track(h.geometry);
      h.position.copy(end);
      g.add(h);
    }
    // wellhead cap seen from below
    kit.cyl(1.6, 1.6, 0.4, kit.darkSteel, x, 0.2, baseZ, g, 20);
    anchor(A, x, -22, baseZ + 3, COL.warm, 1.5);
    anchor(A, x, -100, baseZ + 3, COL.amber, 1.7);
    anchor(A, x, -165, baseZ + 3, COL.magma, 2.0);
  }
  // labels
  const sa = kit.sign("4 INJECTION · 6 PRODUCTION", "#fff1dc", COL.amber, 12);
  sa.position.set(-25, -56, baseZ + 15);
  g.add(sa);
  const sb = kit.sign("PER WELL · 10 BRANCHES", "#fff1dc", COL.magma, 11);
  sb.position.set(25, -56, baseZ + 15);
  g.add(sb);
  kit.dust(kit.lowPower ? 200 : 520, [-70, -DEPTH, baseZ - 40], [70, -2, baseZ + 40], 0.22, "#ffb890", 0.45);
}
