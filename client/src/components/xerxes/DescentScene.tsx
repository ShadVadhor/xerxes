import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PAD, PAD_BRANCHES, branchProfile } from "@/lib/wellpad";

type DescentSceneProps = {
  progressRef: React.MutableRefObject<number>;
  className?: string;
  onUnsupported?: () => void;
};
type FlowTube = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
type Glow = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

const ORANGE = "#ff5a1f";
const BLUE = "#3d8bff";
const COPPER = "#c8773a";
const GOLD = "#e9b949";
const PROBE = "#46e3ff";
const TEAL = "#2fd0c0";
/** Total depth of the schematic (the 5 km of the brief) and the well-pad anatomy measured down from the surface. */
const TD_Y = -34;
const RESERVOIR_Y = -32.5;
const KICK_Y = TD_Y * PAD.casing; // conductor casing ends here; the ring of reserve slots sits at its foot
const REACH = 6.0; // widest lateral reach of a branch, in scene units (exaggerated)
const Z_FLAT = 0.4; // fans are flattened toward the open face of the cutaway so they read like the cross-section
/** Schematic geometry: six pods around a hub, two wells under each pod, ten directional branches per well. */
const POD_RADIUS = 6;
const WELL_OFFSET = 1.15; // half of the (exaggerated) 50 m spacing
/** Pod 1 sits at +z, at the centre of the open cutaway, so its two wells are the ones the camera dives beside. */
const FEATURED_POD = 1;

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const smoothstep = (start: number, end: number, value: number) => {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

type Well = { pos: THREE.Vector3; pod: number };
const WELLS: Well[] = [];
for (let pod = 0; pod < 6; pod += 1) {
  const angle = THREE.MathUtils.degToRad(30 + pod * 60);
  for (const slot of [-1, 1]) {
    const r = POD_RADIUS + slot * WELL_OFFSET;
    WELLS.push({ pos: new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r), pod });
  }
}
const FEATURED_INNER = WELLS[FEATURED_POD * 2].pos;
const FEATURED_OUTER = WELLS[FEATURED_POD * 2 + 1].pos;

const noiseGLSL = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.17, 0.31, 0.63));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    return noise(p) * 0.57 + noise(p * 2.07) * 0.28 + noise(p * 4.13) * 0.15;
  }
`;

/** Geology after the render in the brief: dark topsoil, an orange sandstone band, then reddish-brown rock that darkens with depth. */
const STRATA: [string, string][] = [
  ["#1f160f", "#33241a"], // topsoil
  ["#3a2417", "#5a3820"],
  ["#6a3618", "#97582a"], // sandstone
  ["#5f3216", "#8a4f25"],
  ["#4a281b", "#6e3c27"], // reddish-brown rock
  ["#45261b", "#673827"],
  ["#3d231b", "#5d3326"],
  ["#36201a", "#552f25"],
  ["#2f1b17", "#4a2922"],
  ["#2a1815", "#42241f"],
];

/** World-space noise keeps the horizontal and exposed cutaway faces coherent; uDissolve burns the rock away. */
function makeStrataMaterial(index: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uIndex: { value: index },
      uHeat: { value: 0.3 },
      uDissolve: { value: 0 },
      uDark: { value: new THREE.Color(STRATA[Math.min(index, STRATA.length - 1)][0]) },
      uLight: { value: new THREE.Color(STRATA[Math.min(index, STRATA.length - 1)][1]) },
      uWarm: { value: new THREE.Color(ORANGE) },
    },
    fog: true,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormal;
      #include <fog_pars_vertex>
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIndex;
      uniform float uHeat;
      uniform float uDissolve;
      uniform vec3 uDark;
      uniform vec3 uLight;
      uniform vec3 uWarm;
      varying vec3 vWorld;
      varying vec3 vNormal;
      #include <fog_pars_fragment>
      ${noiseGLSL}
      void main() {
        vec3 p = vWorld + vec3(uIndex * 3.71);
        float edge = 0.0;
        if (uDissolve > 0.001) {
          float k = fbm(p * 0.3 + vec3(0.0, uIndex * 0.9, 0.0)) * 0.78 + noise(p * 1.3) * 0.22 - uDissolve * 1.18;
          if (k < 0.0) discard;
          edge = exp(-k * 75.0);
        }
        float rock = fbm(p * 0.65);
        float band = sin(p.y * 17.0 + noise(p * 0.7) * 3.5) * 0.5 + 0.5;
        float speckle = hash(floor(p * 43.0));
        vec3 stone = mix(uDark, uLight, rock * 0.75 + band * 0.25);
        stone *= 0.8 + speckle * 0.37;
        float lighting = 0.58 + max(dot(normalize(vNormal), normalize(vec3(0.3,0.8,0.65))), 0.0) * 0.8;
        float veinField = fbm(p * vec3(0.48, 2.4, 0.48));
        float vein = exp(-abs(veinField - 0.49) * 170.0);
        float depth = clamp(-vWorld.y / 33.0, 0.0, 1.0);
        float broken = smoothstep(0.38, 0.65, noise(p * 2.2));
        vec3 emissive = uWarm * vein * broken * (0.035 + depth * depth * 0.43) * uHeat * (1.0 - uDissolve * 0.8);
        emissive += uWarm * edge * 0.4;
        gl_FragColor = vec4(stone * lighting + emissive, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

type FlowCurve = { curve: THREE.Curve<THREE.Vector3>; seed: number; order?: number };

/**
 * Many tubes merged into one draw call. Tube UV.x follows each curve, so signed speed sets the fluid
 * direction and the per-vertex seed staggers the pulses so 120 branches do not flash in unison.
 */
function makeFlowMesh(
  curves: FlowCurve[],
  color: THREE.ColorRepresentation,
  speed: number,
  radius: number,
  pulseCount: number,
  tubular: number,
  look: { sharp?: number; base?: number } = {},
): FlowTube {
  const parts = curves.map(({ curve, seed, order }) => {
    const geometry = new THREE.TubeGeometry(curve, tubular, radius, 6, false);
    const count = geometry.getAttribute("position").count;
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(count).fill(seed), 1));
    geometry.setAttribute("aOrder", new THREE.BufferAttribute(new Float32Array(count).fill(order ?? -1), 1));
    return geometry;
  });
  const geometry = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSpeed: { value: speed },
      uEnergy: { value: 0.75 },
      uPulseCount: { value: pulseCount },
      uGrow: { value: 1 },
      uSharp: { value: look.sharp ?? 360 },
      uBase: { value: look.base ?? 0.2 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aOrder;
      varying float vOrder;
      varying vec2 vUv;
      varying float vSeed;
      varying vec3 vNormal;
      varying vec3 vView;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vSeed = aSeed;
        vOrder = aOrder;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uEnergy;
      uniform float uPulseCount;
      uniform float uGrow;
      uniform float uSharp;
      uniform float uBase;
      uniform vec3 uColor;
      varying float vOrder;
      varying vec2 vUv;
      varying float vSeed;
      varying vec3 vNormal;
      varying vec3 vView;
      #include <fog_pars_fragment>
      void main() {
        // reserve slots open one after another: the branch grows out of its slot, tip last
        float grown = clamp((uGrow - vOrder * 0.75) / 0.25, 0.0, 1.0);
        if (vUv.x > grown) discard;
        float phase = fract(vUv.x * uPulseCount - uTime * uSpeed + vSeed);
        float distanceToPulse = min(phase, 1.0 - phase);
        float pulse = exp(-distanceToPulse * distanceToPulse * uSharp);
        float tailPhase = fract(vUv.x * uPulseCount - uTime * uSpeed + vSeed + 0.10);
        float tail = exp(-pow(min(tailPhase, 1.0 - tailPhase), 2.0) * 50.0);
        float facing = 0.45 + 0.55 * pow(abs(dot(normalize(vNormal), normalize(vView))), 0.7);
        float energy = (uBase + pulse * 1.5 + tail * 0.2) * uEnergy;
        gl_FragColor = vec4(uColor * energy * facing, 0.52 + pulse * 0.45);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

/** A procedural billboard: no downloaded textures or asynchronously arriving assets. */
function makeGlow(color: THREE.ColorRepresentation, strength = 1): Glow {
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uStrength: { value: strength },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uStrength;
        varying vec2 vUv;
        void main() {
          float r = length((vUv - 0.5) * 2.0);
          float halo = exp(-r * r * 5.8) * (1.0 - smoothstep(0.68, 1.0, r));
          gl_FragColor = vec4(uColor * uStrength, halo * 0.65);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  return glow;
}

/** One draw call of soft glows (branch ends, wellheads) instead of one billboard each. */
function makeGlowPoints(points: { position: THREE.Vector3; color: THREE.Color }[], size: number) {
  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);
  points.forEach((point, index) => {
    point.position.toArray(positions, index * 3);
    colors.set([point.color.r, point.color.g, point.color.b], index * 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { uSize: { value: size }, uDpr: { value: 1 }, uStrength: { value: 1 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uSize;
      uniform float uDpr;
      attribute vec3 aColor;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(uSize * uDpr / max(-mvPosition.z, 1.0), 3.0, 150.0 * uDpr);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uStrength;
      varying vec3 vColor;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float halo = exp(-r * r * 5.8) * (1.0 - smoothstep(0.68, 1.0, r));
        gl_FragColor = vec4(vColor * uStrength, halo * 0.6);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

/** Scene-space centre line of one branch of one pad: leaves its slot on the ring, runs in the bundle, then peels off. */
function branchCurve(well: Well, b: (typeof PAD_BRANCHES)[number], wobble: number) {
  const tipY = TD_Y * b.tip;
  const profile = branchProfile(b, 24);
  const ca = Math.cos(b.az);
  const sa = Math.sin(b.az) * Z_FLAT;
  const points = profile.map(([u, s]) => {
    const lateral = 0.2 + u * b.reach * REACH * (1 + wobble);
    return new THREE.Vector3(well.pos.x + ca * lateral, KICK_Y + s * (tipY - KICK_Y), well.pos.z + sa * lateral);
  });
  return { curve: new THREE.CatmullRomCurve3(points, false, "centripetal"), end: points[points.length - 1] };
}

/** Rank → reveal order: the first four are open on day one; the six reserve slots open one by one. */
const orderOf = (rank: number) => (rank < PAD.initial ? -1 : (rank - (PAD.initial - 1)) / (PAD.branches - PAD.initial));
const growthOf = (rank: number, grow: number) => THREE.MathUtils.clamp((grow - orderOf(rank) * 0.75) / 0.25, 0, 1);

/**
 * The well field: 12 well pads. Each is a wellhead, a copper conductor casing, a ring of ten slots (four open, six
 * sealed until the pad grows), ten fountain branches (6 production + 4 injection), a motherbore probe and a hot zone.
 */
function buildField() {
  const group = new THREE.Group();
  const production: FlowCurve[] = [];
  const injection: FlowCurve[] = [];
  const ends: { position: THREE.Vector3; color: THREE.Color; rank: number }[] = [];
  const nodeColor = { production: new THREE.Color(ORANGE), injection: new THREE.Color(BLUE) };
  const specks: { p: THREE.Vector3; rank: number; t: number; seed: number }[] = [];
  const random = seededRandom(4093);

  WELLS.forEach((well, w) => {
    PAD_BRANCHES.forEach((b) => {
      const wobble = Math.sin(w * 1.7 + b.rank * 2.3) * 0.07;
      const { curve, end } = branchCurve(well, b, wobble);
      const seed = ((w * 10 + b.rank) * 0.61803) % 1;
      (b.role === "production" ? production : injection).push({ curve, seed, order: orderOf(b.rank) });
      ends.push({ position: end, color: b.role === "production" ? nodeColor.production : nodeColor.injection, rank: b.rank });
      // N2 nanofoam: specks scattered along the open hole
      for (let k = 0; k < 7; k += 1) {
        const t = 0.12 + random() * 0.88;
        const at = curve.getPointAt(t);
        at.x += (random() - 0.5) * 0.22;
        at.z += (random() - 0.5) * 0.22;
        at.y += (random() - 0.5) * 0.3;
        specks.push({ p: at, rank: b.rank, t, seed: random() * 6.28 });
      }
    });
  });

  // the dev-only film render is a 720p frame, so its branches are drawn a little heavier to read at that size
  const branchRadius = 0.07 * (import.meta.env.DEV && (window as unknown as { __FILM__?: boolean }).__FILM__ === true ? 1.55 : 1);
  const productionFlow = makeFlowMesh(production, ORANGE, -0.27, branchRadius, 14, 96, { sharp: 1500, base: 0.34 });
  const injectionFlow = makeFlowMesh(injection, BLUE, 0.23, branchRadius, 14, 96, { sharp: 1500, base: 0.34 });

  // Motherbore probe: a cyan dashed line down the middle of every pad to a glowing node in the hot zone.
  const probeY = TD_Y * 0.955;
  const probeCurves: FlowCurve[] = WELLS.map((well, w) => ({
    curve: new THREE.LineCurve3(new THREE.Vector3(well.pos.x, KICK_Y, well.pos.z), new THREE.Vector3(well.pos.x, probeY, well.pos.z)),
    seed: (w * 0.29) % 1,
  }));
  const probeFlow = makeFlowMesh(probeCurves, PROBE, 0.32, 0.03, 34, 90);

  // Surface leg: heat comes up the casing in an orange line, cooled fluid goes down in a blue one.
  const upCurves: FlowCurve[] = [];
  const downCurves: FlowCurve[] = [];
  WELLS.forEach((well, w) => {
    upCurves.push({
      curve: new THREE.LineCurve3(new THREE.Vector3(well.pos.x - 0.085, KICK_Y, well.pos.z), new THREE.Vector3(well.pos.x - 0.085, 0.35, well.pos.z)),
      seed: (w * 0.37) % 1,
    });
    downCurves.push({
      curve: new THREE.LineCurve3(new THREE.Vector3(well.pos.x + 0.085, KICK_Y, well.pos.z), new THREE.Vector3(well.pos.x + 0.085, 0.35, well.pos.z)),
      seed: (w * 0.53) % 1,
    });
  });
  const trunkUp = makeFlowMesh(upCurves, ORANGE, 0.37, 0.04, 4, 40);
  const trunkDown = makeFlowMesh(downCurves, BLUE, -0.29, 0.034, 4, 40);

  // Colloidal conductor casing: a short copper tube with ring collars, one instanced mesh for all twelve.
  const casingLength = -KICK_Y + 0.25;
  const casings = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.24, 0.24, casingLength, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: COPPER, metalness: 0.75, roughness: 0.32, emissive: "#6b3210", emissiveIntensity: 0.55, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    WELLS.length,
  );
  const collarsPerCasing = 5;
  const collars = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.255, 0.03, 8, 24),
    new THREE.MeshStandardMaterial({ color: "#e0904a", metalness: 0.8, roughness: 0.3, emissive: "#8a4513", emissiveIntensity: 0.7 }),
    WELLS.length * collarsPerCasing,
  );
  const beams = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.02, 0.06, 2.6, 10),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
    WELLS.length,
  );
  // Reserve-slot ring at the foot of the casing, and the ten caps on it.
  const slotRings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.46, 0.028, 8, 40),
    new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.7, roughness: 0.35, emissive: "#7a5a12", emissiveIntensity: 0.7 }),
    WELLS.length,
  );
  const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), WELLS.length * PAD.branches);
  // Hot zone: concentric teal ellipses at the bottom of the probe, and the probe node.
  const hotRings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1, 0.012, 6, 72),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    WELLS.length * 3,
  );
  const probeNodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 12, 10), new THREE.MeshBasicMaterial({ color: PROBE, toneMapped: false }), WELLS.length);

  const matrix = new THREE.Matrix4();
  const flat = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const scaleM = new THREE.Matrix4();
  const slotPos = (well: Well, rank: number) => {
    const b = PAD_BRANCHES[rank];
    return new THREE.Vector3(well.pos.x + Math.cos(b.az) * 0.46, KICK_Y, well.pos.z + Math.sin(b.az) * 0.46);
  };
  WELLS.forEach((well, index) => {
    matrix.makeTranslation(well.pos.x, KICK_Y / 2 + 0.12, well.pos.z);
    casings.setMatrixAt(index, matrix);
    for (let c = 0; c < collarsPerCasing; c += 1) {
      matrix.makeTranslation(well.pos.x, 0.05 + (c / collarsPerCasing) * (KICK_Y + 0.4) * 1, well.pos.z).multiply(flat);
      collars.setMatrixAt(index * collarsPerCasing + c, matrix);
    }
    matrix.makeTranslation(well.pos.x, 1.5, well.pos.z);
    beams.setMatrixAt(index, matrix);
    matrix.makeTranslation(well.pos.x, KICK_Y, well.pos.z).multiply(flat);
    slotRings.setMatrixAt(index, matrix);
    matrix.makeTranslation(well.pos.x, probeY, well.pos.z);
    probeNodes.setMatrixAt(index, matrix);
    [1.1, 2.1, 3.3].forEach((radius, r) => {
      matrix.makeTranslation(well.pos.x, probeY + 0.3, well.pos.z).multiply(flat);
      scaleM.makeScale(radius, radius * Z_FLAT * 1.5, 1);
      matrix.multiply(scaleM);
      hotRings.setMatrixAt(index * 3 + r, matrix);
    });
  });
  [casings, collars, beams, slotRings, caps, hotRings, probeNodes].forEach((mesh) => { mesh.frustumCulled = false; });

  // Nodes at every branch end (120), plus soft glows. The reserve ones appear as their slots open.
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), ends.length);
  nodes.frustumCulled = false;
  const endGlow = makeGlowPoints(ends, 640);
  endGlow.material.uniforms.uStrength.value = 0.6;
  const glowColors = endGlow.geometry.getAttribute("aColor") as THREE.BufferAttribute;

  // Nanofoam: tiny specks along the branches, twinkling, timed to the AI model's pulses.
  const speckGeometry = new THREE.BufferGeometry();
  speckGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(specks.flatMap((s) => [s.p.x, s.p.y, s.p.z])), 3));
  speckGeometry.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(specks.map((s) => s.seed)), 1));
  speckGeometry.setAttribute("aOrder", new THREE.BufferAttribute(new Float32Array(specks.map((s) => orderOf(s.rank))), 1));
  speckGeometry.setAttribute("aT", new THREE.BufferAttribute(new Float32Array(specks.map((s) => s.t)), 1));
  const speckMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uGrow: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uDpr; uniform float uGrow;
      attribute float aPhase; attribute float aOrder; attribute float aT;
      varying float vA;
      void main() {
        float grown = clamp((uGrow - aOrder * 0.75) / 0.25, 0.0, 1.0);
        float on = step(aT, grown);
        float tw = 0.5 + 0.5 * sin(uTime * 1.7 + aPhase * 5.0 + aT * 9.0);
        vA = on * (0.35 + tw * 0.65);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((0.9 + tw * 0.9) * uDpr * 26.0 / max(-mv.z, 1.0), 1.0, 5.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.3, 1.0, r)) * vA;
        gl_FragColor = vec4(vec3(0.93, 0.95, 1.0) * 1.1, a * 0.85);
      }
    `,
  });
  const speckPoints = new THREE.Points(speckGeometry, speckMaterial);
  speckPoints.frustumCulled = false;

  const base = new THREE.Color();
  const gold = new THREE.Color(GOLD);
  let lastGrow = -1;
  /** 0 = four branches, 1 = all ten */
  const setGrow = (grow: number) => {
    if (Math.abs(grow - lastGrow) < 0.002) return;
    lastGrow = grow;
    [productionFlow, injectionFlow].forEach((flow) => { flow.material.uniforms.uGrow.value = grow; });
    speckMaterial.uniforms.uGrow.value = grow;
    ends.forEach((end, index) => {
      const g = growthOf(end.rank, grow);
      const s = g > 0.98 ? 1 : 0.0001;
      matrix.makeTranslation(end.position.x, end.position.y, end.position.z).multiply(scaleM.makeScale(s, s, s));
      nodes.setMatrixAt(index, matrix);
      nodes.setColorAt(index, end.color);
      glowColors.setXYZ(index, end.color.r * (g > 0.98 ? 1 : 0), end.color.g * (g > 0.98 ? 1 : 0), end.color.b * (g > 0.98 ? 1 : 0));
    });
    nodes.instanceMatrix.needsUpdate = true;
    if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
    glowColors.needsUpdate = true;
    WELLS.forEach((well, w) => {
      PAD_BRANCHES.forEach((b) => {
        const g = growthOf(b.rank, grow);
        const open = b.rank < PAD.initial || g > 0.02;
        const p = slotPos(well, b.rank);
        const s = open ? 0.9 : 1.1;
        matrix.makeTranslation(p.x, p.y, p.z).multiply(scaleM.makeScale(s, s, s));
        caps.setMatrixAt(w * PAD.branches + b.rank, matrix);
        base.copy(b.role === "production" ? nodeColor.production : nodeColor.injection);
        caps.setColorAt(w * PAD.branches + b.rank, open ? base : gold);
      });
    });
    caps.instanceMatrix.needsUpdate = true;
    if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
  };
  setGrow(0);

  group.add(productionFlow, injectionFlow, probeFlow, trunkUp, trunkDown, casings, collars, beams, slotRings, caps, hotRings, probeNodes, nodes, endGlow, speckPoints);
  return {
    group,
    flows: [productionFlow, injectionFlow, probeFlow, trunkUp, trunkDown],
    endGlow,
    specks: speckMaterial,
    setGrow,
    probeGlow: makeGlowPoints(WELLS.map((well) => ({ position: new THREE.Vector3(well.pos.x, probeY, well.pos.z), color: new THREE.Color(PROBE) })), 1100),
  };
}

function makeLabel(text: string, opts: { w?: number; h?: number; size?: number; color?: string; glow?: string } = {}) {
  const { w = 320, h = 120, size = 64, color = "#ffe6d2", glow = "rgba(255,120,60,0.85)" } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = `700 ${size}px 'JetBrains Mono', ui-monospace, monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = glow;
    context.shadowBlur = 14;
    context.fillStyle = color;
    context.fillText(text, w / 2, h / 2 + 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 }),
  );
  sprite.renderOrder = 20;
  return sprite;
}

function makeDimension(from: THREE.Vector3, to: THREE.Vector3, tick: THREE.Vector3) {
  const points = [from, to, from.clone().sub(tick), from.clone().add(tick), to.clone().sub(tick), to.clone().add(tick)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: "#ffd9b8", transparent: true, opacity: 0, depthTest: false, toneMapped: false }),
  );
  line.renderOrder = 19;
  return line;
}

function buildSurfaceCampus() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({
    color: "#d9dbde", emissive: "#dae2ec", emissiveIntensity: 0.1, roughness: 0.62,
  });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.65, 0.55, 56), white);
  hub.position.y = 0.28;
  group.add(hub);
  const court = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 40),
    new THREE.MeshBasicMaterial({ color: "#0f141c" }),
  );
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.57;
  group.add(court);

  // Pods are a translucent nano-lattice shell so the wellheads inside stay legible.
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: "#e6e9ee", emissive: "#cfdcf0", emissiveIntensity: 0.12, roughness: 0.5,
    transparent: true, opacity: 0.5, depthWrite: false,
  });
  const podGeometry = new THREE.CapsuleGeometry(0.85, 4.2, 6, 28);
  const latticeGeometry = new THREE.WireframeGeometry(new THREE.CapsuleGeometry(0.86, 4.2, 6, 14));
  const latticeMaterial = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.22 });
  for (let index = 0; index < 6; index += 1) {
    const angle = THREE.MathUtils.degToRad(30 + index * 60);
    const radial = new THREE.Group();
    radial.rotation.y = -angle;
    const pod = new THREE.Group();
    pod.rotation.z = Math.PI / 2;
    pod.scale.set(0.5, 1, 0.82);
    pod.position.set(POD_RADIUS, 0.05, 0);
    pod.add(new THREE.Mesh(podGeometry, shellMaterial), new THREE.LineSegments(latticeGeometry, latticeMaterial));
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.1, 1.5),
      new THREE.MeshStandardMaterial({ color: "#1d232c", roughness: 0.8 }),
    );
    floor.position.set(POD_RADIUS, 0.04, 0);
    radial.add(floor, pod);
    group.add(radial);
  }

  // Wellheads: stubby stacks with a hot ring, two per pod.
  const wellheads = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.16, 0.22, 0.5, 14),
    new THREE.MeshStandardMaterial({ color: "#aeb6c4", metalness: 0.5, roughness: 0.35, emissive: "#ff5a1f", emissiveIntensity: 0.22 }),
    WELLS.length,
  );
  const rings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.34, 0.035, 8, 28),
    new THREE.MeshBasicMaterial({ color: "#ff7a3c", toneMapped: false }),
    WELLS.length,
  );
  const matrix = new THREE.Matrix4();
  const flat = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  WELLS.forEach((well, index) => {
    matrix.makeTranslation(well.pos.x, 0.34, well.pos.z);
    wellheads.setMatrixAt(index, matrix);
    matrix.makeTranslation(well.pos.x, 0.12, well.pos.z).multiply(flat);
    rings.setMatrixAt(index, matrix);
  });
  group.add(wellheads, rings);
  const wellheadGlow = makeGlowPoints(
    WELLS.map((well) => ({ position: well.pos.clone().setY(0.55), color: new THREE.Color("#ff6a2c") })),
    1700,
  );
  group.add(wellheadGlow);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(10.1, 10.17, 96),
    new THREE.MeshBasicMaterial({ color: "#b0b9c9", transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  group.add(ring);
  return { group, wellheadGlow };
}

/** Annotations: the 50 m well spacing, the pad parts and the 5 km depth. Each fades with scroll progress. */
function buildAnnotations() {
  const group = new THREE.Group();
  const lift = new THREE.Vector3(0, 1.15, 0);
  const spacing = makeDimension(
    FEATURED_INNER.clone().add(lift),
    FEATURED_OUTER.clone().add(lift),
    new THREE.Vector3(0, 0.35, 0),
  );
  const spacingLabel = makeLabel("50 m");
  spacingLabel.position.copy(FEATURED_INNER.clone().lerp(FEATURED_OUTER, 0.5)).add(new THREE.Vector3(0, 2.0, 0));
  spacingLabel.scale.set(2.1, 0.79, 1);

  const x = FEATURED_OUTER.x + 5.9;
  const depth = makeDimension(
    new THREE.Vector3(x, 0, FEATURED_OUTER.z),
    new THREE.Vector3(x, TD_Y, FEATURED_OUTER.z),
    new THREE.Vector3(0.35, 0, 0),
  );
  const depthLabel = makeLabel("5 km");
  depthLabel.position.set(x + 1.5, TD_Y / 2, FEATURED_OUTER.z);
  depthLabel.scale.set(2.6, 0.98, 1);

  // Parts of the pad, named as in the design.
  const tag = (text: string, at: THREE.Vector3, width: number, color: string, glow: string) => {
    const cw = Math.round(text.length * 27 + 60);
    const sprite = makeLabel(text, { w: cw, h: 96, size: 44, color, glow });
    sprite.position.copy(at);
    sprite.scale.set(width, width * (96 / cw), 1);
    group.add(sprite);
    return sprite;
  };
  const o = FEATURED_OUTER;
  const casingTag = tag("COLLOIDAL CONDUCTOR CASING", new THREE.Vector3(o.x + 2.9, -1.6, o.z), 6.4, "#ffd2a6", "rgba(255,140,60,0.9)");
  const slotsTag = tag("RESERVE SLOTS · SEALED", new THREE.Vector3(o.x + 2.6, KICK_Y - 0.6, o.z), 5.4, "#ffe6a8", "rgba(233,185,73,0.9)");
  const probeTag = tag("MOTHERBORE PROBE", new THREE.Vector3(o.x - 3.4, -17, o.z), 5.2, "#aef2ff", "rgba(70,227,255,0.9)");
  const probeTag2 = tag("ACOUSTIC · THERMAL · EM", new THREE.Vector3(o.x - 3.4, -18.3, o.z), 6.0, "#7fdcec", "rgba(70,227,255,0.8)");
  const growTag = tag("BRANCHES 4 → 10 · DEEPER INTO HOTTER ROCK", new THREE.Vector3(o.x, -36.2, o.z), 12.5, "#ffb487", "rgba(255,90,31,0.9)");

  group.add(spacing, spacingLabel, depth, depthLabel);
  return { group, spacing, spacingLabel, depth, depthLabel, casingTag, slotsTag, probeTag, probeTag2, growTag };
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function buildDust(count: number) {
  const random = seededRandom(8217);
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    positions.set([(random() - 0.5) * 62, -random() * 43 + 3, (random() - 0.35) * 48], index * 3);
    phases[index] = random() * Math.PI * 2;
    sizes[index] = 0.8 + random() * 1.8;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 }, uDrift: { value: 1 }, uDpr: { value: 1 }, uOpacity: { value: 0.3 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uDrift;
      uniform float uDpr;
      attribute float aPhase;
      attribute float aSize;
      varying float vEmber;
      #include <fog_pars_vertex>
      void main() {
        vec3 p = position;
        float t = uTime * uDrift;
        p.x += (sin(t * 0.13 + aPhase) - sin(aPhase)) * 0.5;
        p.z += (cos(t * 0.10 + aPhase) - cos(aPhase)) * 0.3;
        p.y = mod(p.y + 40.0 + t * (0.08 + aSize * 0.025), 43.0) - 40.0;
        vEmber = step(1.95, aSize);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(aSize * uDpr * 23.0 / max(-mvPosition.z, 1.0), 0.8, 5.0);
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vEmber;
      #include <fog_pars_fragment>
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = exp(-r * r * 5.0) * (1.0 - smoothstep(0.75, 1.0, r));
        vec3 color = mix(vec3(0.40, 0.37, 0.32), vec3(1.0, 0.23, 0.055), vEmber);
        gl_FragColor = vec4(color, alpha * uOpacity);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const dust = new THREE.Points(geometry, material);
  dust.frustumCulled = false;
  return dust;
}

type CameraKey = { p: number; position: THREE.Vector3; target: THREE.Vector3 };
/**
 * Beats (matching BEATS in Descent.tsx): 0 surface · 0.12 well spacing · 0.24 one well pad ·
 * 0.38 four branches grow to ten · 0.53 five km down · 0.70 the whole field · 0.88 heat to compute.
 * While descending the camera stays inside the open +z wedge of the cutaway (|x| < z - 3).
 */
const cameraKeys: CameraKey[] = [
  [0, [15, 10, 36], [0, 0.5, 2]],
  [0.06, [13, 6, 27], [0, 0.3, 4.5]],
  [0.12, [11, 3.2, 13.5], [0, 0.4, 6]],
  [0.18, [8.5, -1.2, 14.2], [0, -2.2, 6]],
  [0.24, [5.2, -3.4, 15.5], [0.4, -3.6, 6.4]],
  [0.31, [6.5, -8.5, 22], [0, -9.5, 6]],
  [0.38, [7.5, -14, 29], [0, -15, 6]],
  [0.46, [8, -18, 33], [0, -18.5, 6]],
  [0.53, [9.5, -24, 32], [0, -25.5, 6]],
  [0.62, [-9, -29.5, 25], [0, -30.5, 6]],
  [0.70, [-15, -25.5, 29], [0, -33, 4]],
  [0.79, [27, -19, 42], [0, -22, 3]],
  [0.88, [32, -10, 46], [0, -16, 2]],
  [0.94, [19, -2, 30], [0, -2, 3]],
  [1, [15, 10, 36], [0, 0.5, 2]],
].map(([p, position, target]) => ({
  p: p as number,
  position: new THREE.Vector3(...(position as [number, number, number])),
  target: new THREE.Vector3(...(target as [number, number, number])),
}));

/** Non-uniform cubic Hermite interpolation gives shared, continuous velocities at every beat. */
function cameraPath(p: number): { position: THREE.Vector3; target: THREE.Vector3 } {
  const progress = clamp01(p);
  let index = 0;
  while (index < cameraKeys.length - 2 && progress > cameraKeys[index + 1].p) index += 1;
  const a = cameraKeys[index];
  const b = cameraKeys[index + 1];
  const before = cameraKeys[Math.max(0, index - 1)];
  const after = cameraKeys[Math.min(cameraKeys.length - 1, index + 2)];
  const duration = b.p - a.p;
  const t = clamp01((progress - a.p) / duration);
  const t2 = t * t;
  const t3 = t2 * t;
  const sample = (field: "position" | "target") => {
    const firstTangent = b[field].clone().sub(before[field]).multiplyScalar(duration / (b.p - before.p));
    const lastTangent = after[field].clone().sub(a[field]).multiplyScalar(duration / (after.p - a.p));
    if (index === 0) firstTangent.setScalar(0);
    if (index === cameraKeys.length - 2) lastTangent.setScalar(0);
    return a[field].clone().multiplyScalar(2 * t3 - 3 * t2 + 1)
      .addScaledVector(firstTangent, t3 - 2 * t2 + t)
      .addScaledVector(b[field], -2 * t3 + 3 * t2)
      .addScaledVector(lastTangent, t3 - t2);
  };
  return { position: sample("position"), target: sample("target") };
}

/** A 270-degree pie leaves a front-facing quarter (centred on +z) of the geology open. */
function makeCutawayLayer(radius: number, thickness: number) {
  const shape = new THREE.Shape();
  // the open face is 100° wide, centred on +z, so a fan of branches fits inside it
  const start = Math.PI * (140 / 180);
  const end = Math.PI * (400 / 180);
  shape.moveTo(0, 0);
  shape.lineTo(Math.cos(start) * radius, Math.sin(start) * radius);
  shape.absarc(0, 0, radius, start, end, false);
  shape.lineTo(0, 0);
  return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 72, steps: 1 });
}

function makeFlare() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uAspect: { value: 1 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uAspect;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - vec2(0.5, 0.56);
        p.x *= uAspect;
        float core = exp(-dot(p, p) * 4.0);
        float streak = exp(-p.y * p.y * 600.0) * exp(-p.x * p.x * 1.5);
        vec3 color = mix(vec3(1.0, 0.29, 0.075), vec3(1.0, 0.91, 0.76), core);
        gl_FragColor = vec4(color * (0.55 + core * 1.5 + streak * 0.7), uOpacity);
        #include <colorspace_fragment>
      }
    `,
  });
  const flare = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  flare.frustumCulled = false;
  flare.renderOrder = 1000;
  return flare;
}

export default function DescentScene(props: DescentSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer | undefined;
    let composer: EffectComposer | undefined;
    let bloom: UnrealBloomPass | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let frame = 0;
    let disposed = false;
    let failed = false;
    let inView = false;
    let hasSize = false;
    let previousTime = 0;
    let elapsed = 0;
    let progress = clamp01(Number.isFinite(propsRef.current.progressRef.current) ? propsRef.current.progressRef.current : 0);
    // Dev-only deterministic mode: the hero film is rendered frame by frame by driving progress and time from outside.
    const film = import.meta.env.DEV && (window as unknown as { __FILM__?: boolean }).__FILM__ === true;
    let filmP = 0;
    let filmT = 0;
    const hardwareLimited = !film && (navigator.hardwareConcurrency || 8) <= 4;
    let lowPower = !film && (window.innerWidth < 768 || hardwareLimited);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#06070a");
    scene.fog = new THREE.FogExp2("#06070a", 0.014);
    const camera = new THREE.PerspectiveCamera(49, 1, 0.08, 240);
    const billboards: Glow[] = [];
    const flowTubes: FlowTube[] = [];
    const strataMaterials: THREE.ShaderMaterial[] = [];
    const pointGlows: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
    let dust: ReturnType<typeof buildDust> | undefined;
    let flare: ReturnType<typeof makeFlare> | undefined;
    let annotations: ReturnType<typeof buildAnnotations> | undefined;
    let reservoirGlow: Glow | undefined;
    let reservoirCore: Glow | undefined;
    let ascentGlow: Glow | undefined;
    let reservoirLight: THREE.PointLight | undefined;
    let fieldRef: ReturnType<typeof buildField> | undefined;

    const pause = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    };
    const onMotionChange = (event: MediaQueryListEvent) => { reducedMotion = event.matches; };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      fail();
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      pause();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", syncLoop);
      motionQuery.removeEventListener("change", onMotionChange);
      renderer?.domElement.removeEventListener("webglcontextlost", onContextLost);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          geometries.add(object.geometry);
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach((material) => materials.add(material));
          if (object instanceof THREE.InstancedMesh) object.dispose();
        } else if (object instanceof THREE.Sprite) {
          materials.add(object.material);
          if (object.material.map) textures.add(object.material.map);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      composer?.passes.forEach((pass) => pass.dispose());
      composer?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
      scene.clear();
    };
    const fail = () => {
      if (failed || disposed) return;
      failed = true;
      dispose();
      setUnsupported(true);
      propsRef.current.onUnsupported?.();
    };

    const renderFrame = (now: number) => {
      frame = 0;
      if (disposed || (!film && (!inView || document.hidden)) || !hasSize || !renderer) return;
      try {
        const dt = film ? 1 / 24 : previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 1 / 60;
        previousTime = now;
        if (film) {
          elapsed = filmT;
          progress = filmP;
        } else {
          elapsed += dt;
          const incoming = propsRef.current.progressRef.current;
          const target = Number.isFinite(incoming) ? clamp01(incoming) : progress;
          progress += (target - progress) * (1 - Math.exp(-dt * 6));
        }
        const path = cameraPath(progress);
        // Portrait compositions keep the whole field inside a comfortable framing.
        const portrait = camera.aspect < 0.85;
        if (portrait) {
          path.position.x *= 1.28;
          path.position.z *= 1.28;
        }
        camera.position.copy(path.position);
        camera.lookAt(path.target);
        camera.updateMatrixWorld();
        billboards.forEach((billboard) => billboard.quaternion.copy(camera.quaternion));

        const energy = 0.6 + smoothstep(0.3, 0.8, progress) * 0.55;
        flowTubes.forEach((flow) => {
          flow.material.uniforms.uTime.value = elapsed * (reducedMotion ? 0.25 : 1);
          flow.material.uniforms.uEnergy.value = energy;
        });
        // The rock burns away to reveal the whole field, then heals as the camera rises.
        const dissolve = smoothstep(0.63, 0.77, progress) * (1 - smoothstep(0.9, 0.99, progress));
        // four branches are open on every pad; the six reserve slots open one by one during the "4 → 10" beat
        if (fieldRef) {
          fieldRef.setGrow(smoothstep(0.375, 0.5, progress));
          fieldRef.specks.uniforms.uTime.value = elapsed;
        }
        strataMaterials.forEach((material) => {
          material.uniforms.uHeat.value = 0.35 + smoothstep(0.18, 0.6, progress) * 0.9;
          material.uniforms.uDissolve.value = dissolve;
        });
        if (annotations) {
          const spacingOpacity = smoothstep(0.03, 0.08, progress) * (1 - smoothstep(0.15, 0.2, progress));
          const padOpacity = smoothstep(0.17, 0.22, progress) * (1 - smoothstep(0.3, 0.35, progress));
          const probeOpacity = smoothstep(0.31, 0.37, progress) * (1 - smoothstep(0.47, 0.52, progress));
          const depthOpacity = smoothstep(0.44, 0.5, progress) * (1 - smoothstep(0.6, 0.66, progress));
          const growOpacity = smoothstep(0.4, 0.46, progress) * (1 - smoothstep(0.6, 0.66, progress));
          annotations.spacing.material.opacity = spacingOpacity * 0.9;
          annotations.spacingLabel.material.opacity = spacingOpacity;
          annotations.depth.material.opacity = depthOpacity * 0.9;
          annotations.depthLabel.material.opacity = depthOpacity;
          annotations.casingTag.material.opacity = padOpacity;
          annotations.slotsTag.material.opacity = padOpacity;
          annotations.probeTag.material.opacity = probeOpacity;
          annotations.probeTag2.material.opacity = probeOpacity * 0.85;
          annotations.growTag.material.opacity = growOpacity;
        }
        if (dust) {
          dust.material.uniforms.uTime.value = elapsed;
          dust.material.uniforms.uDrift.value = reducedMotion ? 0 : 1;
          dust.material.uniforms.uOpacity.value = (0.2 + smoothstep(0.12, 0.45, progress) * 0.22) * (1 - smoothstep(0.9, 1, progress) * 0.7);
        }
        const heat = 0.48 + smoothstep(0.32, 0.56, progress) * 0.72;
        if (reservoirGlow) reservoirGlow.material.uniforms.uStrength.value = heat * (0.36 + dissolve * 0.08);
        if (reservoirCore) reservoirCore.material.uniforms.uStrength.value = heat * 0.8;
        if (reservoirLight) reservoirLight.intensity = 10 + heat * 8;
        const ascent = smoothstep(0.87, 1, progress);
        if (ascentGlow) {
          ascentGlow.position.y = THREE.MathUtils.lerp(RESERVOIR_Y, 3, ascent);
          ascentGlow.scale.setScalar(1.3 + ascent * 1.6);
          ascentGlow.material.uniforms.uStrength.value = smoothstep(0.86, 0.91, progress) * 0.3 * (1 - smoothstep(0.93, 0.98, progress));
        }
        if (flare) flare.material.uniforms.uOpacity.value = smoothstep(0.89, 0.94, progress) * 0.07 * (1 - smoothstep(0.95, 0.99, progress));
        renderer.toneMappingExposure = 1.1 + ascent * 0.05;
        if (bloom) bloom.strength = 0.5 - ascent * 0.3;
        if (composer && !lowPower) composer.render(dt);
        else renderer.render(scene, camera);
        if (!disposed && !film) frame = requestAnimationFrame(renderFrame);
      } catch {
        fail();
      }
    };
    if (film) {
      (window as unknown as { __filmFrame?: (p: number, t: number) => boolean }).__filmFrame = (p, t) => {
        filmP = p;
        filmT = t;
        renderFrame(performance.now());
        return true;
      };
    }
    function syncLoop() {
      if (disposed || film) return;
      if (inView && !document.hidden && hasSize) {
        if (!frame) frame = requestAnimationFrame(renderFrame);
      } else pause();
    }

    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: false, powerPreference: lowPower ? "low-power" : "high-performance" });
      renderer.setClearColor("#06070a", 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      // Compilation errors are reported asynchronously to avoid disposing mid-render.
      renderer.debug.onShaderError = () => { queueMicrotask(fail); };
      const canvas = renderer.domElement;
      canvas.setAttribute("aria-hidden", "true");
      Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
      canvas.addEventListener("webglcontextlost", onContextLost);
      host.appendChild(canvas);

      scene.add(new THREE.HemisphereLight("#9099ae", "#38281c", 1.3));
      const duskLight = new THREE.DirectionalLight("#ffba86", 1.4);
      duskLight.position.set(-20, 12, -18);
      scene.add(duskLight);
      reservoirLight = new THREE.PointLight("#ff6422", 25, 48, 2);
      reservoirLight.position.set(0, RESERVOIR_Y + 3, 5);
      scene.add(reservoirLight);

      const groundGeometry = new THREE.CircleGeometry(100, 128);
      groundGeometry.rotateX(-Math.PI / 2);
      const ground = new THREE.Mesh(groundGeometry, makeStrataMaterial(0));
      ground.material.uniforms.uHeat.value = 0;
      scene.add(ground);
      const surface = buildSurfaceCampus();
      scene.add(surface.group);
      pointGlows.push(surface.wellheadGlow);
      const horizon = makeGlow("#ad4e28", 0.63);
      horizon.position.set(-6, 4.5, -63);
      horizon.scale.set(190, 27, 1);
      scene.add(horizon);
      const campusGlow = makeGlow("#e5edff", 0.16);
      campusGlow.position.set(0, 0.5, 0);
      campusGlow.scale.set(17, 5.5, 1);
      billboards.push(campusGlow);
      scene.add(campusGlow);

      for (let index = 0; index < 10; index += 1) {
        const thickness = 2.9 + Math.sin(index * 1.6) * 0.12;
        const material = makeStrataMaterial(index);
        strataMaterials.push(material);
        const slab = new THREE.Mesh(makeCutawayLayer(29 + Math.sin(index * 0.9) * 1.1, thickness), material);
        slab.rotation.x = Math.PI / 2;
        slab.position.y = -0.55 - index * 3.4;
        scene.add(slab);
      }

      const field = buildField();
      scene.add(field.group);
      flowTubes.push(...field.flows);
      pointGlows.push(field.endGlow, field.probeGlow);
      scene.add(field.probeGlow);
      fieldRef = field;

      annotations = buildAnnotations();
      scene.add(annotations.group);

      reservoirGlow = makeGlow("#ff3d0a", 0.5);
      reservoirGlow.position.set(0, RESERVOIR_Y - 1, 4);
      reservoirGlow.scale.set(46, 17, 1);
      reservoirCore = makeGlow("#ffb060", 0.8);
      reservoirCore.position.set(0, RESERVOIR_Y - 0.6, 4.2);
      reservoirCore.scale.set(13, 7, 1);
      billboards.push(reservoirGlow, reservoirCore);
      scene.add(reservoirGlow, reservoirCore);
      ascentGlow = makeGlow("#ffd5a0", 0);
      ascentGlow.position.set(FEATURED_OUTER.x - 0.1, RESERVOIR_Y, FEATURED_OUTER.z + 0.1);
      billboards.push(ascentGlow);
      scene.add(ascentGlow);
      dust = buildDust(lowPower ? 200 : 620);
      scene.add(dust);
      flare = makeFlare();
      scene.add(flare);

      // On constrained devices additive shaders retain the glow without full-frame postprocessing.
      if (!lowPower) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.45, 0.72);
        composer.addPass(bloom);
        composer.addPass(new OutputPass());
      }

      const resize = () => {
        if (disposed || !renderer) return;
        try {
          const { width, height } = host.getBoundingClientRect();
          hasSize = width > 0 && height > 0;
          lowPower = window.innerWidth < 768 || hardwareLimited;
          const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
          renderer.setPixelRatio(dpr);
          renderer.setSize(Math.max(1, width), Math.max(1, height), false);
          camera.aspect = Math.max(1, width) / Math.max(1, height);
          camera.fov = camera.aspect < 0.85 ? 55 : 49;
          // On wide screens the copy sits left, so the whole scene is shifted right to keep annotations clear of it.
          if (annotations) {
            // labels shrink on narrow screens (and a little in the dev-only film render) so they never run off the edge
            const k = camera.aspect < 0.85 ? (film ? 0.5 : 0.62) : film ? 0.6 : 1;
            [annotations.casingTag, annotations.slotsTag, annotations.probeTag, annotations.probeTag2, annotations.growTag].forEach((tg) => {
              const base = (tg.userData.baseScale ??= tg.scale.clone()) as THREE.Vector3;
              tg.scale.set(base.x * k, base.y * k, base.z);
            });
          }
          if (film) {
            const off = (window as unknown as { __FILM_OFF__?: [number, number] }).__FILM_OFF__ ?? [0, 0];
            camera.setViewOffset(width, height, -width * off[0], height * off[1], width, height);
          } else if (camera.aspect > 1.3 && width >= 1024) camera.setViewOffset(width, height, -width * 0.09, 0, width, height);
          else camera.clearViewOffset();
          camera.updateProjectionMatrix();
          composer?.setPixelRatio(dpr);
          composer?.setSize(Math.max(1, width), Math.max(1, height));
          if (dust) dust.material.uniforms.uDpr.value = dpr;
          pointGlows.forEach((points) => { points.material.uniforms.uDpr.value = dpr; });
          if (flare) flare.material.uniforms.uAspect.value = camera.aspect;
          syncLoop();
        } catch {
          fail();
        }
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();
      if (disposed) return dispose;
      intersectionObserver = new IntersectionObserver((entries) => {
        if (disposed) return;
        inView = entries.some((entry) => entry.isIntersecting);
        syncLoop();
      }, { rootMargin: "200px", threshold: 0 });
      intersectionObserver.observe(host);
      document.addEventListener("visibilitychange", syncLoop);
      motionQuery.addEventListener("change", onMotionChange);
    } catch {
      fail();
    }

    return dispose;
  }, []);

  if (unsupported) return null;
  return (
    <div
      ref={hostRef}
      className={props.className}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden", background: "#06070a", pointerEvents: "none" }}
    />
  );
}
