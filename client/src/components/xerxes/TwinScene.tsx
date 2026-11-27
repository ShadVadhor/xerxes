import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  buildXerxes,
  disposeScene,
  makeDtf,
  makeFlowMaterial,
  mergeTubes,
  PAD_TOP,
  POD_RADIUS,
  WELL_SPAN,
  WORLD_SCALE,
  type Branch,
} from "@/lib/campusModels";
import type { TwinAnchor, TwinCap, TwinModel } from "@/lib/content";

/**
 * The AI GMS digital twin: the same Xerxes campus and DTF pad geometry as the Models section, re-skinned as a
 * hologram, with one overlay per capability (demand, storage, stability, cooling, maintenance). Overlay values
 * are an illustrative simulation driven by time, not live data.
 */

const CAPS: TwinCap[] = ["demand", "storage", "stability", "cooling", "maintenance"];

type Layer = {
  cap: TwinCap;
  group: THREE.Group;
  fade: (k: number) => void;
  tick?: (t: number, k: number) => void;
};

type Focus = { target: THREE.Vector3; distance: number };

type Built = {
  root: THREE.Group;
  baseFade: (k: number) => void;
  holos: THREE.ShaderMaterial[];
  flows: THREE.ShaderMaterial[];
  emphasis: (levels: Record<TwinCap, number>, k: number) => void;
  layers: Layer[];
  anchors: Partial<Record<TwinAnchor, THREE.Vector3>>;
  overlay: THREE.Group;
  focus: (cap: TwinCap) => Focus;
};

/* ------------------------------------------------------------------------------------------- */

function holoMaterial(color: string, rim: string, base: number, map?: THREE.Texture | null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uRim: { value: new THREE.Color(rim) },
      uBase: { value: base },
      uScan: { value: 0 },
      uFade: { value: 1 },
      uMap: { value: map ?? null },
    },
    defines: map ? { USE_HOLO_MAP: "" } : {},
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        vec4 w = modelMatrix * p;
        vW = w.xyz;
        vec4 mv = viewMatrix * w;
        vV = -mv.xyz;
        vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * n);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uRim;
      uniform float uBase;
      uniform float uScan;
      uniform float uFade;
      uniform sampler2D uMap;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vW;
      varying vec2 vUv;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        float f = pow(1.0 - abs(dot(n, v)), 3.0);
        float lines = smoothstep(0.92, 1.0, abs(sin(vW.y * 46.0))) * 0.06;
        float sweep = exp(-pow((vW.y - uScan) / 0.09, 2.0));
        float a = uBase + f * 0.85 + lines + sweep * 0.32;
        #ifdef USE_HOLO_MAP
          float lattice = texture2D(uMap, vUv * vec2(2.0, 1.2)).a;
          a = a * 0.35 + lattice * 0.55;
        #endif
        vec3 col = mix(uColor, uRim, clamp(f + sweep * 0.6, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uFade);
      }
    `,
  });
}

function glow(color: string, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

function ringMaterial(color: string, speed: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uOn: { value: 1 },
      uAlert: { value: 0 },
      uFade: { value: 1 },
      uColor: { value: new THREE.Color(color) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uOn;
      uniform float uAlert;
      uniform float uFade;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float d = fract(vUv.x * 28.0 - uTime * uSpeed);
        float dash = smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.48, 0.56, d));
        float a = mix(0.08 + 0.16 * dash, 0.42 + 0.58 * dash, uOn);
        vec3 c = mix(uColor, vec3(1.0, 0.2, 0.1), uAlert);
        gl_FragColor = vec4(c * (0.7 + 0.6 * dash), a * uFade);
      }
    `,
  });
}

/** Fades every material under `root`, remembering each one's own base opacity. */
function collectFaders(root: THREE.Object3D) {
  const items: Array<(k: number) => void> = [];
  const seen = new Set<THREE.Material>();
  root.traverse(object => {
    const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    (Array.isArray(material) ? material : [material]).forEach(mat => {
      if (seen.has(mat)) return;
      seen.add(mat);
      if (mat instanceof THREE.ShaderMaterial) {
        if (mat.uniforms.uFade) items.push(k => { mat.uniforms.uFade.value = k; });
        else if (mat.uniforms.uAlpha) {
          const base = mat.uniforms.uAlpha.value as number;
          items.push(k => { mat.uniforms.uAlpha.value = base * k; });
        }
      } else {
        const base = mat.opacity;
        mat.transparent = true;
        items.push(k => { mat.opacity = base * k; });
      }
    });
  });
  return (k: number) => items.forEach(apply => apply(k));
}

/** Re-skins a campus as a hologram. Returns the hologram materials (for the scan sweep). */
function holographic(root: THREE.Object3D) {
  const structure = holoMaterial("#1d4f9c", "#8fd0ff", 0.035);
  const holos: THREE.ShaderMaterial[] = [structure];
  const lattices = new Map<THREE.Texture, THREE.ShaderMaterial>();
  const retired = new Set<THREE.Material>();
  const hide: THREE.Object3D[] = [];
  root.traverse(object => {
    if (object instanceof THREE.Sprite) {
      hide.push(object);
      return;
    }
    if (object instanceof THREE.LineSegments) {
      const mat = object.material as THREE.LineBasicMaterial;
      if (mat.depthTest === false) hide.push(object);
      else {
        mat.color.set("#4f8fd8");
        mat.opacity = 0.4;
        mat.transparent = true;
      }
      return;
    }
    if (!(object instanceof THREE.Mesh)) return;
    const mat = object.material as THREE.Material;
    if (!(mat instanceof THREE.MeshStandardMaterial)) return;
    if (!mat.map && mat.transparent && mat.opacity < 0.3) {
      hide.push(object);
      return;
    }
    if (mat.map) {
      let lattice = lattices.get(mat.map);
      if (!lattice) {
        lattice = holoMaterial("#2a6fd6", "#a8dcff", 0.02, mat.map);
        lattices.set(mat.map, lattice);
        holos.push(lattice);
      }
      object.material = lattice;
    } else {
      object.material = structure;
    }
    retired.add(mat);
  });
  hide.forEach(object => { object.visible = false; });
  // The hex texture lives on in the lattice hologram, so only the old materials are released.
  retired.forEach(mat => {
    const texture = (mat as THREE.MeshStandardMaterial).map;
    if (texture) (mat as THREE.MeshStandardMaterial).map = null;
    mat.dispose();
  });
  return holos;
}

function haloTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function layer(cap: TwinCap, group: THREE.Group, tick?: Layer["tick"]): Layer {
  return { cap, group, fade: collectFaders(group), tick };
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const pulse = (phase: number, from: number, to: number, ramp = 0.3) =>
  smooth(THREE.MathUtils.clamp((phase - from) / ramp, 0, 1)) * (1 - smooth(THREE.MathUtils.clamp((phase - to) / ramp, 0, 1)));
const COOL = new THREE.Color("#3d8bff");
const WARM = new THREE.Color("#ff5a1f");
const HEALTHY = "#49e39a";
const FLAG = "#ffb020";

function podPoint(index: number, radial = POD_RADIUS, y = 0) {
  const angle = (index * Math.PI * 2) / 6;
  return new THREE.Vector3(Math.cos(angle) * radial, y, Math.sin(angle) * radial);
}

function line(points: THREE.Vector3[]) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < points.length - 1; i += 1) path.add(new THREE.LineCurve3(points[i], points[i + 1]));
  return path;
}

function flowMesh(branches: Branch[], radius: number, hot: string, cold: string, speed = 0.18, alpha = 1) {
  const material = makeFlowMaterial(hot, cold, alpha, speed);
  const mesh = new THREE.Mesh(mergeTubes(branches, radius, 96, 6), material);
  mesh.frustumCulled = false;
  return { mesh, material };
}

/* ------------------------------------------------------------------------------------------- *
 * Xerxes overlays (pre-scale campus units).
 * ------------------------------------------------------------------------------------------- */

function buildXerxesTwin(halo: THREE.Texture): Built {
  const campus = buildXerxes();
  const holos = holographic(campus.group);
  const baseFade = collectFaders(campus.group);
  const [branchFlow, streakFlow] = campus.flows;
  const overlay = new THREE.Group();
  overlay.scale.setScalar(WORLD_SCALE);
  campus.group.add(overlay);
  const anchors: Built["anchors"] = {};
  const layers: Layer[] = [];
  const flows: THREE.ShaderMaterial[] = [...campus.flows];

  // 01 Demand: a live load bar over every pod, with the forecast drawn as a ghost sleeve around it.
  {
    const group = new THREE.Group();
    const barGeometry = new THREE.CylinderGeometry(0.17, 0.17, 1, 24, 1, true).translate(0, 0.5, 0);
    const sleeveGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 24, 1, true).translate(0, 0.5, 0);
    const ringGeometry = new THREE.TorusGeometry(0.25, 0.014, 6, 40);
    const y0 = 1.2;
    const bars: { bar: THREE.Mesh; sleeve: THREE.Mesh; top: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
    for (let index = 0; index < 6; index += 1) {
      const p = podPoint(index, POD_RADIUS, y0);
      const mat = glow("#ff6a2a", 0.8);
      const bar = new THREE.Mesh(barGeometry, mat);
      const sleeve = new THREE.Mesh(sleeveGeometry, glow("#7cc4ff", 0.16));
      const base = new THREE.Mesh(ringGeometry, glow("#7cc4ff", 0.85));
      const top = new THREE.Mesh(ringGeometry, glow("#cfeaff", 0.9));
      [bar, sleeve, base, top].forEach(mesh => mesh.position.copy(p));
      base.rotation.x = top.rotation.x = Math.PI / 2;
      group.add(bar, sleeve, base, top);
      bars.push({ bar, sleeve, top, mat });
    }
    anchors.pod2 = new THREE.Vector3();
    anchors.pod5 = new THREE.Vector3();
    layers.push(layer("demand", group, t => {
      bars.forEach(({ bar, sleeve, top, mat }, index) => {
        const wave = index === 1 ? 0.3 * (0.5 + 0.5 * Math.sin(t * 0.45)) : 0;
        const load = 0.5 + 0.16 * Math.sin(t * 0.55 + index * 1.4) + wave;
        const forecast = load + 0.1 + (index === 1 ? 0.18 : 0.04 * Math.sin(t * 0.3 + index));
        bar.scale.y = 0.15 + load * 2.1;
        sleeve.scale.y = 0.15 + forecast * 2.1;
        top.position.y = y0 + sleeve.scale.y;
        mat.color.copy(COOL).lerp(WARM, THREE.MathUtils.clamp((load - 0.35) / 0.55, 0, 1));
        if (index === 1) anchors.pod2!.set(top.position.x, top.position.y + 0.15, top.position.z);
        if (index === 4) anchors.pod5!.set(top.position.x, top.position.y + 0.15, top.position.z);
      });
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  // 02 Storage: a NanoVault thermal store under every pod, charging from the well pair.
  {
    const group = new THREE.Group();
    const shellGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.95, 32, 1, true);
    const fillGeometry = new THREE.CylinderGeometry(0.32, 0.32, 1, 32).translate(0, 0.5, 0);
    const rimGeometry = new THREE.TorusGeometry(0.38, 0.014, 6, 40);
    const chargeGeometry = new THREE.TorusGeometry(0.33, 0.01, 6, 40);
    const bottom = -1.3;
    const vaults: { fill: THREE.Mesh; charge: THREE.Mesh }[] = [];
    const links: Branch[] = [];
    for (let index = 0; index < 6; index += 1) {
      const p = podPoint(index, POD_RADIUS);
      const shell = new THREE.Mesh(shellGeometry, glow("#e9b949", 0.12));
      shell.position.set(p.x, bottom + 0.475, p.z);
      const fill = new THREE.Mesh(fillGeometry, glow("#ffb347", 0.42));
      fill.position.set(p.x, bottom, p.z);
      const charge = new THREE.Mesh(chargeGeometry, glow("#fff0c8", 0.9));
      charge.rotation.x = Math.PI / 2;
      charge.position.set(p.x, bottom, p.z);
      [bottom, bottom + 0.95].forEach(y => {
        const rim = new THREE.Mesh(rimGeometry, glow("#e9b949", 0.8));
        rim.rotation.x = Math.PI / 2;
        rim.position.set(p.x, y, p.z);
        group.add(rim);
      });
      group.add(shell, fill, charge);
      vaults.push({ fill, charge });
      for (const side of [-1, 1]) {
        const well = podPoint(index, POD_RADIUS + side * WELL_SPAN, -0.35);
        const mid = podPoint(index, POD_RADIUS + side * WELL_SPAN * 0.55, -0.62);
        const end = podPoint(index, POD_RADIUS + side * 0.4, -0.85);
        links.push({ curve: new THREE.CatmullRomCurve3([well, mid, end]), dir: -1, phase: (index * 0.37 + side * 0.2 + 1) % 1 });
      }
    }
    const heat = flowMesh(links, 0.022, "#ffb347", "#3d8bff", 0.35);
    flows.push(heat.material);
    group.add(heat.mesh);
    anchors.vault = podPoint(0, POD_RADIUS, bottom + 1.05);
    layers.push(layer("storage", group, t => {
      vaults.forEach(({ fill, charge }, index) => {
        const level = 0.55 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.32 + index * 0.6));
        fill.scale.y = level * 0.93;
        charge.position.y = bottom + ((t * 0.5 + index * 0.17) % 1) * level * 0.93;
      });
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  // 03 Stability: four rings over the hub (two active, two standby) and the power feeds to each pod.
  {
    const group = new THREE.Group();
    const radii = [1.92, 2.08, 2.24, 2.4];
    const colors = ["#ff6a2a", "#7cc4ff", "#ffd3b0", "#cfeaff"];
    const speeds = [0.5, -0.42, 0.5, -0.42];
    const rings = radii.map((radius, index) => {
      const material = ringMaterial(colors[index], speeds[index]);
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 8, 160), material);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = 1.05 + index * 0.03;
      group.add(mesh);
      return material;
    });
    const feeds: Branch[] = [];
    for (let index = 0; index < 6; index += 1) {
      feeds.push({
        curve: new THREE.LineCurve3(podPoint(index, 1.75, 0.62), podPoint(index, 2.75, 0.62)),
        dir: -1,
        phase: index / 6,
      });
    }
    const feed = flowMesh(feeds, 0.03, "#ff7a3a", "#7cc4ff", 0.6);
    flows.push(feed.material);
    group.add(feed.mesh);
    anchors.ring = new THREE.Vector3(0, 1.1, radii[0]);
    anchors.hub = new THREE.Vector3(0, 0.9, 0);
    layers.push(layer("stability", group, t => {
      const phase = t % 9;
      const fault = pulse(phase, 2.0, 7.2, 0.25);
      const flicker = phase > 2.0 && phase < 2.9 ? 0.5 + 0.5 * Math.sin(phase * 70) : 0;
      rings.forEach(material => { material.uniforms.uTime.value = t; });
      rings[0].uniforms.uAlert.value = phase > 2.0 && phase < 3.2 ? 1 : 0;
      rings[0].uniforms.uOn.value = phase < 2.0 || phase > 7.2 ? 1 : phase < 2.9 ? flicker : 0.05;
      rings[1].uniforms.uOn.value = 1;
      rings[2].uniforms.uOn.value = pulse(phase, 2.35, 7.2, 0.3);
      rings[3].uniforms.uOn.value = 0.05;
      feed.material.uniforms.uSpeed.value = 0.6 + fault * 0.5;
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  // 04 Cooling: a nano-CO₂ loop round every pod and a thermal halo over it; the shell streaks brighten.
  const halos: THREE.SpriteMaterial[] = [];
  {
    const group = new THREE.Group();
    const loops: Branch[] = [];
    for (let index = 0; index < 6; index += 1) {
      const angle = (index * Math.PI * 2) / 6;
      const points: THREE.Vector3[] = [];
      for (let s = 0; s <= 64; s += 1) {
        const theta = (s / 64) * Math.PI * 2;
        const x = POD_RADIUS + Math.cos(theta) * 2.25;
        const z = Math.sin(theta) * 1.08;
        points.push(new THREE.Vector3(x * Math.cos(angle) - z * Math.sin(angle), 0.3, x * Math.sin(angle) + z * Math.cos(angle)));
      }
      loops.push({ curve: new THREE.CatmullRomCurve3(points, true), dir: 1, phase: index / 6 });
      const material = new THREE.SpriteMaterial({ map: halo, color: "#3d8bff", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.2, 2.2, 1);
      sprite.position.copy(podPoint(index, POD_RADIUS, 1.25));
      group.add(sprite);
      halos.push(material);
    }
    const loop = flowMesh(loops, 0.028, "#ff7a3a", "#7cc4ff", 0.22);
    flows.push(loop.material);
    group.add(loop.mesh);
    anchors.shell = podPoint(0, POD_RADIUS, 1.4);
    layers.push(layer("cooling", group, t => {
      halos.forEach((material, index) => {
        const heat = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.4 + index * 1.1));
        material.color.copy(COOL).lerp(WARM, heat);
      });
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  // 05 Maintenance: a health beacon on every wellhead; one pump is flagged weeks ahead.
  {
    const group = new THREE.Group();
    const dot = new THREE.SphereGeometry(0.075, 14, 10);
    const flagIndex = 3; // pod 2, well B
    let flagged = new THREE.Vector3();
    for (let index = 0; index < 6; index += 1) {
      for (const side of [-1, 1]) {
        const p = podPoint(index, POD_RADIUS + side * WELL_SPAN, 0.2);
        const wellIndex = index * 2 + (side > 0 ? 1 : 0);
        const isFlag = wellIndex === flagIndex;
        const mesh = new THREE.Mesh(dot, glow(isFlag ? FLAG : HEALTHY, 0.95));
        mesh.position.copy(p);
        if (isFlag) {
          mesh.scale.setScalar(1.5);
          flagged = p.clone();
        }
        group.add(mesh);
      }
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.7, 8, 1, true), glow(FLAG, 0.75));
    beam.position.set(flagged.x, 0.2 + 0.85, flagged.z);
    const pulseMaterial = glow(FLAG, 0.8);
    const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 48), pulseMaterial);
    pulseRing.rotation.x = Math.PI / 2;
    pulseRing.position.set(flagged.x, 0.06, flagged.z);
    const scanMaterial = glow(FLAG, 0.7);
    const scan = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 6, 32), scanMaterial);
    scan.rotation.x = Math.PI / 2;
    scan.position.set(flagged.x, 0, flagged.z);
    group.add(beam, pulseRing, scan);
    anchors.well = new THREE.Vector3(flagged.x, 2.0, flagged.z);
    layers.push(layer("maintenance", group, (t, k) => {
      const phase = (t * 0.6) % 1;
      pulseRing.scale.setScalar(1 + phase * 3);
      pulseMaterial.opacity = 0.8 * (1 - phase) * k;
      const depth = (t * 0.35) % 1;
      scan.position.y = -depth * 2.4;
      scanMaterial.opacity = 0.7 * (1 - depth) * k;
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
    (overlay.userData as { flagged?: THREE.Vector3 }).flagged = flagged;
  }

  const flaggedWorld = ((overlay.userData as { flagged?: THREE.Vector3 }).flagged ?? new THREE.Vector3()).clone().multiplyScalar(WORLD_SCALE);
  return {
    root: campus.group,
    baseFade,
    holos,
    flows,
    layers,
    anchors,
    overlay,
    emphasis: (levels, k) => {
      branchFlow.uniforms.uAlpha.value = k * (1 - 0.55 * levels.stability - 0.35 * levels.cooling - 0.25 * levels.demand);
      streakFlow.uniforms.uAlpha.value = k * (0.2 + 0.8 * levels.cooling);
      halos.forEach(material => { material.opacity = 0.55 * k * levels.cooling; });
    },
    focus: cap => {
      if (cap === "stability") return { target: new THREE.Vector3(0, 0.5, 0), distance: 10 };
      if (cap === "maintenance") return { target: flaggedWorld.clone().add(new THREE.Vector3(0, 0.1, 0)), distance: 9.5 };
      if (cap === "storage") return { target: new THREE.Vector3(0, -0.6, 0), distance: 14 };
      if (cap === "demand") return { target: new THREE.Vector3(0, 0.3, 0), distance: 15 };
      return { target: new THREE.Vector3(0, -0.2, 0), distance: 14.5 };
    },
  };
}

/* ------------------------------------------------------------------------------------------- *
 * DTF overlays (pre-scale pad units; see makeDtf for the building layout).
 * ------------------------------------------------------------------------------------------- */

function buildDtfTwin(halo: THREE.Texture): Built {
  const campus = makeDtf();
  const holos = holographic(campus.group);
  const baseFade = collectFaders(campus.group);
  const [branchFlow] = campus.flows;
  const overlay = new THREE.Group();
  overlay.scale.setScalar(WORLD_SCALE);
  campus.group.add(overlay);
  const anchors: Built["anchors"] = {};
  const layers: Layer[] = [];
  const flows: THREE.ShaderMaterial[] = [...campus.flows];
  const modules = [new THREE.Vector3(-1.67, 0, -0.6), new THREE.Vector3(-0.73, 0, -0.6)];
  const bess = [new THREE.Vector3(-1.5, 0, 1.05), new THREE.Vector3(-0.8, 0, 1.05)];
  const orc = new THREE.Vector3(1.5, PAD_TOP + 0.32, 1.0);

  // 01 Demand: load bars over Compute Modules A and B.
  {
    const group = new THREE.Group();
    const barGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 24, 1, true).translate(0, 0.5, 0);
    const sleeveGeometry = new THREE.CylinderGeometry(0.18, 0.18, 1, 24, 1, true).translate(0, 0.5, 0);
    const ringGeometry = new THREE.TorusGeometry(0.18, 0.01, 6, 40);
    const y0 = PAD_TOP + 1.08;
    const bars = modules.map(m => {
      const mat = glow("#ff6a2a", 0.8);
      const bar = new THREE.Mesh(barGeometry, mat);
      const sleeve = new THREE.Mesh(sleeveGeometry, glow("#7cc4ff", 0.16));
      const base = new THREE.Mesh(ringGeometry, glow("#7cc4ff", 0.85));
      const top = new THREE.Mesh(ringGeometry, glow("#cfeaff", 0.9));
      [bar, sleeve, base, top].forEach(mesh => mesh.position.set(m.x, y0, m.z));
      base.rotation.x = top.rotation.x = Math.PI / 2;
      group.add(bar, sleeve, base, top);
      return { bar, sleeve, top, mat };
    });
    anchors.modA = new THREE.Vector3();
    anchors.modB = new THREE.Vector3();
    layers.push(layer("demand", group, t => {
      bars.forEach(({ bar, sleeve, top, mat }, index) => {
        const peak = index === 0 ? 0.28 * (0.5 + 0.5 * Math.sin(t * 0.45)) : 0;
        const load = 0.55 + 0.12 * Math.sin(t * 0.6 + index * 2) + peak;
        const forecast = load + 0.1 + (index === 0 ? 0.14 : 0);
        bar.scale.y = 0.12 + load * 1.25;
        sleeve.scale.y = 0.12 + forecast * 1.25;
        top.position.y = y0 + sleeve.scale.y;
        mat.color.copy(COOL).lerp(WARM, THREE.MathUtils.clamp((load - 0.35) / 0.55, 0, 1));
        (index === 0 ? anchors.modA! : anchors.modB!).set(top.position.x, top.position.y + 0.1, top.position.z);
      });
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  // 02 Storage: the GEOFLEX BESS state of charge, inside the two containers and as gauges above them.
  {
    const group = new THREE.Group();
    const fillGeometry = new THREE.BoxGeometry(0.56, 1, 0.3).translate(0, 0.5, 0);
    const gaugeGeometry = new THREE.CylinderGeometry(0.07, 0.07, 1, 18, 1, true).translate(0, 0.5, 0);
    const ringGeometry = new THREE.TorusGeometry(0.11, 0.009, 6, 32);
    const cells = bess.map(b => {
      const fill = new THREE.Mesh(fillGeometry, glow("#ffb347", 0.5));
      fill.position.set(b.x, PAD_TOP + 0.01, b.z);
      const gauge = new THREE.Mesh(gaugeGeometry, glow("#e9b949", 0.75));
      gauge.position.set(b.x, PAD_TOP + 0.42, b.z);
      const ring = new THREE.Mesh(ringGeometry, glow("#e9b949", 0.9));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(b.x, PAD_TOP + 0.42, b.z);
      group.add(fill, gauge, ring);
      return { fill, gauge };
    });
    anchors.bess = new THREE.Vector3((bess[0].x + bess[1].x) / 2, PAD_TOP + 1.1, bess[0].z);
    layers.push(layer("storage", group, t => {
      const soc = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.35));
      cells.forEach(({ fill, gauge }, index) => {
        fill.scale.y = Math.max(0.01, (soc - index * 0.03) * 0.3);
        gauge.scale.y = 0.05 + (soc - index * 0.03) * 0.6;
      });
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  // 03 Stability: the native DC bus from the ORC skid to the BESS and the building.
  {
    const group = new THREE.Group();
    const y = PAD_TOP + 0.26;
    const bus = line([new THREE.Vector3(1.5, y, 0.74), new THREE.Vector3(1.5, y, 0.52), new THREE.Vector3(-1.15, y, 0.52), new THREE.Vector3(-1.15, y, -0.06)]);
    const tap = line([new THREE.Vector3(-1.15, y, 0.52), new THREE.Vector3(-1.15, y, 0.86)]);
    const main = flowMesh([{ curve: bus, dir: -1, phase: 0 }], 0.026, "#ff7a3a", "#7cc4ff", 0.35);
    const branch = flowMesh([{ curve: tap, dir: 1, phase: 0.3 }], 0.022, "#ff7a3a", "#ffd27a", 0.6);
    flows.push(main.material, branch.material);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), glow("#fff0c8", 0.95));
    const sparkHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: "#ffb347", transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sparkHalo.scale.set(0.5, 0.5, 1);
    group.add(main.mesh, branch.mesh, spark, sparkHalo);
    anchors.bus = new THREE.Vector3(0.2, y + 0.05, 0.52);
    layers.push(layer("stability", group, t => {
      const phase = t % 8;
      const step = pulse(phase, 2.0, 5.0, 0.2);
      branch.material.uniforms.uSpeed.value = 0.6 + step * 1.4;
      const u = THREE.MathUtils.clamp((phase - 2.0) / 1.2, 0, 1);
      const at = tap.getPoint(1 - u);
      spark.position.copy(at);
      sparkHalo.position.copy(at);
      spark.visible = sparkHalo.visible = phase > 2.0 && phase < 3.2;
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  // 04 Cooling: the absorption-cooling supply and return between the tanks and the building.
  const coolHalos: THREE.SpriteMaterial[] = [];
  {
    const group = new THREE.Group();
    const supply = line([new THREE.Vector3(-0.05, PAD_TOP + 0.2, 0.82), new THREE.Vector3(-0.05, PAD_TOP + 0.2, 0.36), new THREE.Vector3(-0.62, PAD_TOP + 0.2, 0.36), new THREE.Vector3(-0.62, PAD_TOP + 0.2, -0.06)]);
    const back = line([new THREE.Vector3(-0.8, PAD_TOP + 0.34, -0.06), new THREE.Vector3(-0.8, PAD_TOP + 0.34, 0.26), new THREE.Vector3(-0.15, PAD_TOP + 0.34, 0.26), new THREE.Vector3(-0.15, PAD_TOP + 0.34, 0.82)]);
    const loop = flowMesh([{ curve: supply, dir: 1, phase: 0 }, { curve: back, dir: -1, phase: 0.5 }], 0.022, "#ff7a3a", "#7cc4ff", 0.4);
    flows.push(loop.material);
    group.add(loop.mesh);
    [new THREE.Vector3(-1.2, PAD_TOP + 0.95, -0.6), new THREE.Vector3(-0.05, PAD_TOP + 0.5, 1.0)].forEach(p => {
      const material = new THREE.SpriteMaterial({ map: halo, color: "#3d8bff", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(1.6, 1.6, 1);
      sprite.position.copy(p);
      group.add(sprite);
      coolHalos.push(material);
    });
    anchors.tanks = new THREE.Vector3(-0.05, PAD_TOP + 0.62, 1.0);
    layers.push(layer("cooling", group, t => {
      coolHalos.forEach((material, index) => {
        material.color.copy(COOL).lerp(WARM, 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.5 + index * 2)));
      });
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  // 05 Maintenance: health beacons on every major asset; the ORC feed pump is flagged.
  {
    const group = new THREE.Group();
    const dot = new THREE.SphereGeometry(0.05, 14, 10);
    const healthy = [
      new THREE.Vector3(0.62, PAD_TOP + 0.62, 0.3),
      ...bess.map(b => new THREE.Vector3(b.x, PAD_TOP + 0.4, b.z)),
      ...modules.map(m => new THREE.Vector3(m.x, PAD_TOP + 0.95, m.z)),
      new THREE.Vector3(-0.05, PAD_TOP + 0.5, 1.0),
    ];
    healthy.forEach(p => {
      const mesh = new THREE.Mesh(dot, glow(HEALTHY, 0.95));
      mesh.position.copy(p);
      group.add(mesh);
    });
    const flag = new THREE.Mesh(dot, glow(FLAG, 1));
    flag.scale.setScalar(1.6);
    flag.position.copy(orc);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1.0, 8, 1, true), glow(FLAG, 0.75));
    beam.position.set(orc.x, orc.y + 0.5, orc.z);
    const pulseMaterial = glow(FLAG, 0.8);
    const pulseRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.01, 6, 48), pulseMaterial);
    pulseRing.rotation.x = Math.PI / 2;
    pulseRing.position.set(orc.x, PAD_TOP + 0.02, orc.z);
    group.add(flag, beam, pulseRing);
    anchors.orc = new THREE.Vector3(orc.x, orc.y + 1.05, orc.z);
    layers.push(layer("maintenance", group, (t, k) => {
      const phase = (t * 0.6) % 1;
      pulseRing.scale.setScalar(1 + phase * 2.6);
      pulseMaterial.opacity = 0.8 * (1 - phase) * k;
    }));
    group.traverse(o => { o.frustumCulled = false; });
    overlay.add(group);
  }

  const s = WORLD_SCALE;
  return {
    root: campus.group,
    baseFade,
    holos,
    flows,
    layers,
    anchors,
    overlay,
    emphasis: (levels, k) => {
      branchFlow.uniforms.uAlpha.value = k * (1 - 0.5 * levels.stability - 0.3 * levels.cooling - 0.2 * levels.demand);
      coolHalos.forEach(material => { material.opacity = 0.55 * k * levels.cooling; });
    },
    focus: cap => {
      if (cap === "maintenance") return { target: new THREE.Vector3(orc.x * s * 0.6, 0.2, orc.z * s * 0.5), distance: 5.6 };
      if (cap === "storage") return { target: new THREE.Vector3(-0.8 * s, 0.1, 0.6 * s), distance: 5.4 };
      if (cap === "stability") return { target: new THREE.Vector3(0, 0.1, 0.25), distance: 5.6 };
      if (cap === "demand") return { target: new THREE.Vector3(-0.6 * s, 0.35, -0.2 * s), distance: 6.2 };
      return { target: new THREE.Vector3(-0.3 * s, 0.05, 0.2 * s), distance: 6.0 };
    },
  };
}

/* ------------------------------------------------------------------------------------------- */

export default function TwinScene(props: {
  model: TwinModel;
  cap: TwinCap;
  callouts: { at: TwinAnchor; text: string }[];
  className?: string;
  onUnsupported?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef(props.model);
  const capRef = useRef(props.cap);
  const unsupportedRef = useRef(props.onUnsupported);
  const [unsupported, setUnsupported] = useState(false);
  modelRef.current = props.model;
  capRef.current = props.cap;
  unsupportedRef.current = props.onUnsupported;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let frameId: number | null = null;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    function cleanup() {
      if (disposed) return;
      disposed = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      cleanups.forEach(remove => remove());
      controls?.dispose();
      disposeScene(scene);
      if (renderer) {
        renderer.renderLists.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    }

    function reportUnsupported() {
      cleanup();
      setUnsupported(true);
      unsupportedRef.current?.();
    }

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      const activeRenderer = renderer;
      activeRenderer.setClearColor("#05080c", 1);
      activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = activeRenderer.domElement;
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Holographic digital twin of the Xerxes campus or the DTF well pad, highlighting what AI GMS is managing");
      host.prepend(canvas);

      const halo = haloTexture();
      const twins: Record<TwinModel, Built> = { xerxes: buildXerxesTwin(halo), dtf: buildDtfTwin(halo) };
      (Object.keys(twins) as TwinModel[]).forEach(key => scene.add(twins[key].root));
      const modelLevel: Record<TwinModel, number> = { xerxes: modelRef.current === "xerxes" ? 1 : 0, dtf: modelRef.current === "dtf" ? 1 : 0 };
      const capLevel = Object.fromEntries(CAPS.map(c => [c, c === capRef.current ? 1 : 0])) as Record<TwinCap, number>;

      const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
      const startFocus = twins[modelRef.current].focus(capRef.current);
      const target = startFocus.target.clone();
      let distance = startFocus.distance;
      camera.position.copy(target).addScaledVector(new THREE.Vector3(0.42, 0.36, 0.83).normalize(), distance);
      controls = new OrbitControls(camera, canvas);
      const orbit = controls;
      orbit.target.copy(target);
      orbit.enableZoom = false;
      orbit.enablePan = false;
      orbit.dampingFactor = 0.07;
      orbit.minPolarAngle = Math.PI * 0.18;
      orbit.maxPolarAngle = Math.PI * 0.6;
      orbit.autoRotateSpeed = 0.45;
      orbit.touches = { ONE: THREE.TOUCH.ROTATE };
      canvas.style.touchAction = "pan-y";
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reduced = motion.matches;
      orbit.enableDamping = !reduced;
      orbit.update();

      let width = 0;
      let height = 0;
      let framing = 1;
      let onScreen = typeof IntersectionObserver === "undefined";
      let visibleDoc = document.visibilityState === "visible";
      let previous = 0;
      let simTime = 6;
      let interacting = false;
      let pauseUntil = 0;
      const offset = new THREE.Vector3();
      const projected = new THREE.Vector3();

      const isActive = () => !disposed && onScreen && visibleDoc && width > 0 && height > 0;
      function sync() {
        if (isActive()) {
          if (frameId === null) {
            previous = 0;
            frameId = requestAnimationFrame(render);
          }
        } else if (frameId !== null) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
      }

      function placeLabels(built: Built, k: number) {
        const box = labelsRef.current;
        if (!box) return;
        box.querySelectorAll<HTMLElement>("[data-anchor]").forEach(element => {
          const anchor = built.anchors[element.dataset.anchor as TwinAnchor];
          if (!anchor || k < 0.5) {
            element.style.opacity = "0";
            return;
          }
          projected.copy(anchor);
          built.overlay.localToWorld(projected);
          projected.project(camera);
          const behind = projected.z > 1;
          const x = THREE.MathUtils.clamp((projected.x * 0.5 + 0.5) * width, 70, width - 70);
          const y = THREE.MathUtils.clamp((-projected.y * 0.5 + 0.5) * height, 56, height - 8);
          element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          element.style.opacity = behind ? "0" : String(Math.min(1, (k - 0.5) * 2));
        });
      }

      function render(time: number) {
        frameId = null;
        if (!isActive()) return;
        const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 1 / 60;
        previous = time;
        if (!reduced) simTime += delta;
        const step = reduced ? 1 : Math.min(1, delta * 3.2);
        const current = twins[modelRef.current];

        (Object.keys(twins) as TwinModel[]).forEach(key => {
          modelLevel[key] += ((key === modelRef.current ? 1 : 0) - modelLevel[key]) * step;
        });
        CAPS.forEach(c => {
          capLevel[c] += ((c === capRef.current ? 1 : 0) - capLevel[c]) * step;
        });

        const scan = -2.6 + ((simTime * 0.28) % 1) * 4.6;
        (Object.keys(twins) as TwinModel[]).forEach(key => {
          const built = twins[key];
          const k = modelLevel[key];
          built.root.visible = k > 0.01;
          if (!built.root.visible) return;
          built.root.scale.setScalar(0.9 + 0.1 * k);
          built.baseFade(k);
          built.holos.forEach(material => { material.uniforms.uScan.value = scan; });
          built.flows.forEach(material => { material.uniforms.uTime.value = simTime; });
          built.emphasis(capLevel, k);
          built.layers.forEach(item => {
            const level = capLevel[item.cap] * k;
            item.group.visible = level > 0.01;
            if (!item.group.visible) return;
            item.fade(level);
            item.tick?.(simTime, level);
          });
        });

        const focus = current.focus(capRef.current);
        target.lerp(focus.target, reduced ? 1 : Math.min(1, delta * 2));
        distance += (focus.distance - distance) * (reduced ? 1 : Math.min(1, delta * 2));
        offset.copy(camera.position).sub(orbit.target).setLength(distance * framing);
        orbit.target.copy(target);
        camera.position.copy(target).add(offset);
        orbit.autoRotate = !reduced && !interacting && time > pauseUntil;
        orbit.update(delta);
        activeRenderer.render(scene, camera);
        placeLabels(current, modelLevel[modelRef.current] * capLevel[capRef.current]);
        if (isActive()) frameId = requestAnimationFrame(render);
      }

      function resize() {
        const bounds = host!.getBoundingClientRect();
        width = Math.round(bounds.width);
        height = Math.round(bounds.height);
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          framing = Math.max(1, 1.25 / camera.aspect);
          camera.updateProjectionMatrix();
          activeRenderer.setSize(width, height, false);
        }
        sync();
      }

      const onStart = () => { interacting = true; };
      const onEnd = () => { interacting = false; pauseUntil = performance.now() + 3000; };
      orbit.addEventListener("start", onStart);
      orbit.addEventListener("end", onEnd);
      cleanups.push(() => { orbit.removeEventListener("start", onStart); orbit.removeEventListener("end", onEnd); });
      const onMotion = (event: MediaQueryListEvent) => { reduced = event.matches; orbit.enableDamping = !reduced; };
      motion.addEventListener("change", onMotion);
      cleanups.push(() => motion.removeEventListener("change", onMotion));
      const onVisibility = () => { visibleDoc = document.visibilityState === "visible"; sync(); };
      document.addEventListener("visibilitychange", onVisibility);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));
      if (typeof IntersectionObserver !== "undefined") {
        const observer = new IntersectionObserver(entries => { onScreen = entries.some(e => e.isIntersecting); sync(); }, { threshold: 0 });
        observer.observe(host);
        cleanups.push(() => observer.disconnect());
      }
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      cleanups.push(() => resizeObserver.disconnect());
      const onLost = (event: Event) => { event.preventDefault(); reportUnsupported(); };
      canvas.addEventListener("webglcontextlost", onLost);
      cleanups.push(() => canvas.removeEventListener("webglcontextlost", onLost));
      cleanups.push(() => halo.dispose());
      resize();
    } catch {
      reportUnsupported();
    }
    return cleanup;
  }, []);

  if (unsupported) return null;
  return (
    <div ref={hostRef} className={props.className} style={{ position: "absolute", inset: 0 }}>
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {props.callouts.map((callout, index) => (
          <div
            key={`${props.model}-${props.cap}-${callout.at}`}
            data-anchor={callout.at}
            className="absolute left-0 top-0 opacity-0 transition-opacity duration-300 will-change-transform"
          >
            <div className="flex -translate-x-1/2 -translate-y-full flex-col items-center">
              <span className={`mono whitespace-nowrap border bg-black/70 px-2 py-1 text-[0.56rem] uppercase tracking-[0.16em] text-white backdrop-blur-sm sm:text-[0.6rem] ${index === 0 ? "border-magma/70" : "border-led-hi/50"}`}>
                {callout.text}
              </span>
              <span className={`h-5 w-px ${index === 0 ? "bg-magma/80" : "bg-led-hi/60"}`} />
              <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-magma-hi shadow-[0_0_8px_#ff5a1f]" : "bg-led-hi"}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
