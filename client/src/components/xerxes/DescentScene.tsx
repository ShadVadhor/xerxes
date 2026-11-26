import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type DescentSceneProps = {
  progressRef: React.MutableRefObject<number>;
  className?: string;
  onUnsupported?: () => void;
};
type FlowTube = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
type Glow = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

const ORANGE = "#ff5a1f";
const BLUE = "#3d8bff";
const RESERVOIR_Y = -32.5;
/** Schematic geometry: six pods around a hub, two wells under each pod, ten directional branches per well. */
const POD_RADIUS = 6;
const WELL_OFFSET = 1.15; // half of the (exaggerated) 50 m spacing
const KICKOFF_Y = RESERVOIR_Y + 2.4;
const BRANCH_PRODUCTION = [true, true, false, true, true, false, true, true, false, false];
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

/** World-space noise keeps the horizontal and exposed cutaway faces coherent; uDissolve burns the rock away. */
function makeStrataMaterial(index: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uIndex: { value: index },
      uHeat: { value: 0.3 },
      uDissolve: { value: 0 },
      uDark: { value: new THREE.Color(index % 2 ? "#1a1613" : "#1b1b1e") },
      uLight: { value: new THREE.Color(index % 2 ? "#2b221c" : "#29282b") },
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

type FlowCurve = { curve: THREE.Curve<THREE.Vector3>; seed: number };

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
): FlowTube {
  const parts = curves.map(({ curve, seed }) => {
    const geometry = new THREE.TubeGeometry(curve, tubular, radius, 6, false);
    const count = geometry.getAttribute("position").count;
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(count).fill(seed), 1));
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
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      varying vec2 vUv;
      varying float vSeed;
      varying vec3 vNormal;
      varying vec3 vView;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vSeed = aSeed;
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
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vSeed;
      varying vec3 vNormal;
      varying vec3 vView;
      #include <fog_pars_fragment>
      void main() {
        float phase = fract(vUv.x * uPulseCount - uTime * uSpeed + vSeed);
        float distanceToPulse = min(phase, 1.0 - phase);
        float pulse = exp(-distanceToPulse * distanceToPulse * 360.0);
        float tailPhase = fract(vUv.x * uPulseCount - uTime * uSpeed + vSeed + 0.10);
        float tail = exp(-pow(min(tailPhase, 1.0 - tailPhase), 2.0) * 50.0);
        float facing = 0.45 + 0.55 * pow(abs(dot(normalize(vNormal), normalize(vView))), 0.7);
        float energy = (0.2 + pulse * 1.5 + tail * 0.2) * uEnergy;
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

/** The well field: 12 trunks, each fanning into 10 directional branches (120 in total). */
function buildField() {
  const group = new THREE.Group();
  const production: FlowCurve[] = [];
  const injection: FlowCurve[] = [];
  const ends: { position: THREE.Vector3; color: THREE.Color }[] = [];
  const nodeColor = { production: new THREE.Color(ORANGE), injection: new THREE.Color(BLUE) };

  WELLS.forEach((well, w) => {
    BRANCH_PRODUCTION.forEach((isProduction, b) => {
      const angle = (b / 10) * Math.PI * 2 + w * 0.43 + 0.18;
      const reach = 2.7 + Math.abs(Math.sin((w * 10 + b) * 2.7)) * 1.2 + (b % 3) * 0.35;
      const bend = Math.sin(w * 1.3 + b) * 0.6;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
      const point = (r: number, y: number, side: number) =>
        well.pos.clone().addScaledVector(direction, r).addScaledVector(tangent, side).setY(y);
      const endY = RESERVOIR_Y - 1.6 - (b % 3) * 0.75 - ((w + b) % 2) * 0.35;
      const end = point(reach, endY, bend);
      const curve = new THREE.CatmullRomCurve3([
        point(0.04, KICKOFF_Y, 0),
        point(0.5, RESERVOIR_Y + 0.5, 0),
        point(reach * 0.45, RESERVOIR_Y - 1.0 - (b % 3) * 0.3, bend * 0.5),
        point(reach * 0.78, endY - 0.12, bend * 0.85),
        end,
      ]);
      const seed = ((w * 10 + b) * 0.61803) % 1;
      (isProduction ? production : injection).push({ curve, seed });
      ends.push({ position: end, color: isProduction ? nodeColor.production : nodeColor.injection });
    });
  });

  const branchRadius = 0.062;
  const productionFlow = makeFlowMesh(production, ORANGE, -0.27, branchRadius, 3, 56);
  const injectionFlow = makeFlowMesh(injection, BLUE, 0.23, branchRadius, 3, 56);

  // Trunks: heat rises in an orange line, cooled fluid returns in a blue one, beside each other.
  const upCurves: FlowCurve[] = [];
  const downCurves: FlowCurve[] = [];
  WELLS.forEach((well, w) => {
    upCurves.push({
      curve: new THREE.LineCurve3(new THREE.Vector3(well.pos.x - 0.1, KICKOFF_Y, well.pos.z), new THREE.Vector3(well.pos.x - 0.1, 0.35, well.pos.z)),
      seed: (w * 0.37) % 1,
    });
    downCurves.push({
      curve: new THREE.LineCurve3(new THREE.Vector3(well.pos.x + 0.1, KICKOFF_Y, well.pos.z), new THREE.Vector3(well.pos.x + 0.1, 0.35, well.pos.z)),
      seed: (w * 0.53) % 1,
    });
  });
  const trunkUp = makeFlowMesh(upCurves, ORANGE, 0.37, 0.05, 6, 40);
  const trunkDown = makeFlowMesh(downCurves, BLUE, -0.29, 0.042, 6, 40);

  // Glass casings: one instanced mesh for all twelve shafts.
  const casingHeight = -KICKOFF_Y + 0.2;
  const casings = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.27, 0.27, casingHeight, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: "#8391a7", metalness: 0.25, roughness: 0.14, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    WELLS.length,
  );
  const beams = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.02, 0.06, 2.6, 10),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
    WELLS.length,
  );
  const matrix = new THREE.Matrix4();
  WELLS.forEach((well, index) => {
    matrix.makeTranslation(well.pos.x, KICKOFF_Y / 2 + 0.1, well.pos.z);
    casings.setMatrixAt(index, matrix);
    matrix.makeTranslation(well.pos.x, 1.5, well.pos.z);
    beams.setMatrixAt(index, matrix);
  });
  casings.frustumCulled = false;
  beams.frustumCulled = false;

  // Nodes at every branch end (120), plus soft glows.
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), ends.length);
  ends.forEach((end, index) => {
    matrix.makeTranslation(end.position.x, end.position.y, end.position.z);
    nodes.setMatrixAt(index, matrix);
    nodes.setColorAt(index, end.color);
  });
  nodes.frustumCulled = false;
  const endGlow = makeGlowPoints(ends, 620);
  endGlow.material.uniforms.uStrength.value = 0.6;

  group.add(productionFlow, injectionFlow, trunkUp, trunkDown, casings, beams, nodes, endGlow);
  return { group, flows: [productionFlow, injectionFlow, trunkUp, trunkDown], endGlow };
}

function makeLabel(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 120;
  const context = canvas.getContext("2d");
  if (context) {
    context.font = "700 64px 'JetBrains Mono', ui-monospace, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(255,120,60,0.85)";
    context.shadowBlur = 14;
    context.fillStyle = "#ffe6d2";
    context.fillText(text, 160, 62);
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

/** Annotations: the 50 m well spacing and the 5 km depth. Fade with scroll progress. */
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

  const x = FEATURED_OUTER.x + 1.15;
  const depth = makeDimension(
    new THREE.Vector3(x, 0, FEATURED_OUTER.z),
    new THREE.Vector3(x, RESERVOIR_Y - 2.6, FEATURED_OUTER.z),
    new THREE.Vector3(0.35, 0, 0),
  );
  const depthLabel = makeLabel("5 km");
  depthLabel.position.set(x + 1.5, (RESERVOIR_Y - 2.6) / 2, FEATURED_OUTER.z);
  depthLabel.scale.set(2.6, 0.98, 1);

  group.add(spacing, spacingLabel, depth, depthLabel);
  return { group, spacing, spacingLabel, depth, depthLabel };
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
 * Beats (matching BEATS in Descent.tsx): 0 surface · 0.14 well spacing · 0.27 five km down ·
 * 0.45 ten branches · 0.65 the whole field · 0.87 heat to compute.
 * While descending the camera stays inside the open +z wedge of the cutaway (|x| < z - 3).
 */
const cameraKeys: CameraKey[] = [
  [0, [15, 10, 36], [0, 0.5, 2]],
  [0.07, [13, 6, 27], [0, 0.3, 4.5]],
  [0.14, [11, 3.2, 13.5], [0, 0.4, 6]],
  [0.2, [10, -3, 15], [0, -3, 6]],
  [0.27, [9, -11, 16], [0, -13, 6]],
  [0.36, [10, -22, 19], [0, -24, 6]],
  [0.45, [12, -30.2, 21], [0, -33.2, 6]],
  [0.55, [-9, -31.8, 20], [0, -34, 6]],
  [0.65, [-15, -25.5, 29], [0, -33, 4]],
  [0.76, [27, -19, 42], [0, -22, 3]],
  [0.87, [32, -10, 46], [0, -16, 2]],
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
  const start = Math.PI * 0.75;
  const end = Math.PI * 2.25;
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
    const hardwareLimited = (navigator.hardwareConcurrency || 8) <= 4;
    let lowPower = window.innerWidth < 768 || hardwareLimited;
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
      if (disposed || !inView || document.hidden || !hasSize || !renderer) return;
      try {
        const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 1 / 60;
        previousTime = now;
        elapsed += dt;
        const incoming = propsRef.current.progressRef.current;
        const target = Number.isFinite(incoming) ? clamp01(incoming) : progress;
        progress += (target - progress) * (1 - Math.exp(-dt * 6));
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
        const dissolve = smoothstep(0.56, 0.72, progress) * (1 - smoothstep(0.9, 0.99, progress));
        strataMaterials.forEach((material) => {
          material.uniforms.uHeat.value = 0.35 + smoothstep(0.18, 0.6, progress) * 0.9;
          material.uniforms.uDissolve.value = dissolve;
        });
        if (annotations) {
          const spacingOpacity = smoothstep(0.03, 0.09, progress) * (1 - smoothstep(0.26, 0.32, progress));
          const depthOpacity = smoothstep(0.17, 0.23, progress) * (1 - smoothstep(0.43, 0.5, progress));
          annotations.spacing.material.opacity = spacingOpacity * 0.9;
          annotations.spacingLabel.material.opacity = spacingOpacity;
          annotations.depth.material.opacity = depthOpacity * 0.9;
          annotations.depthLabel.material.opacity = depthOpacity;
        }
        if (dust) {
          dust.material.uniforms.uTime.value = elapsed;
          dust.material.uniforms.uDrift.value = reducedMotion ? 0 : 1;
          dust.material.uniforms.uOpacity.value = (0.2 + smoothstep(0.12, 0.45, progress) * 0.22) * (1 - smoothstep(0.9, 1, progress) * 0.7);
        }
        const heat = 0.48 + smoothstep(0.32, 0.56, progress) * 0.72;
        if (reservoirGlow) reservoirGlow.material.uniforms.uStrength.value = heat * (0.5 + dissolve * 0.12);
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
        if (!disposed) frame = requestAnimationFrame(renderFrame);
      } catch {
        fail();
      }
    };
    function syncLoop() {
      if (disposed) return;
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

      for (let index = 0; index < 9; index += 1) {
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
      pointGlows.push(field.endGlow);

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
          if (camera.aspect > 1.3 && width >= 1024) camera.setViewOffset(width, height, -width * 0.09, 0, width, height);
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
