import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

type DescentSceneProps = {
  progressRef: React.MutableRefObject<number>;
  className?: string;
  onUnsupported?: () => void;
};
type FlowTube = THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>;
type Glow = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

const ORANGE = "#ff5a1f";
const BLUE = "#3d8bff";
const RESERVOIR_Y = -32.5;
const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const smoothstep = (start: number, end: number, value: number) => {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

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

/** World-space noise keeps the horizontal and exposed cutaway faces coherent. */
function makeStrataMaterial(index: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uIndex: { value: index },
      uHeat: { value: 0.3 },
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
      uniform vec3 uDark;
      uniform vec3 uLight;
      uniform vec3 uWarm;
      varying vec3 vWorld;
      varying vec3 vNormal;
      #include <fog_pars_fragment>
      ${noiseGLSL}
      void main() {
        vec3 p = vWorld + vec3(uIndex * 3.71);
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
        vec3 emissive = uWarm * vein * broken * (0.035 + depth * depth * 0.43) * uHeat;
        gl_FragColor = vec4(stone * lighting + emissive, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Tube UV.x follows the curve, so signed speed controls the fluid direction. */
function makeFlowTube(
  curve: THREE.Curve<THREE.Vector3>,
  color: THREE.ColorRepresentation,
  speed: number,
  radius: number,
): FlowTube {
  const geometry = new THREE.TubeGeometry(curve, 112, radius, 8, false);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSpeed: { value: speed },
      uEnergy: { value: 0.75 },
      uPulseCount: { value: curve.getLength() > 28 ? 6 : 3 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
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
      varying vec3 vNormal;
      varying vec3 vView;
      #include <fog_pars_fragment>
      void main() {
        float phase = fract(vUv.x * uPulseCount - uTime * uSpeed);
        float distanceToPulse = min(phase, 1.0 - phase);
        float pulse = exp(-distanceToPulse * distanceToPulse * 360.0);
        float tailPhase = fract(vUv.x * uPulseCount - uTime * uSpeed + 0.10);
        float tail = exp(-pow(min(tailPhase, 1.0 - tailPhase), 2.0) * 50.0);
        float facing = 0.45 + 0.55 * pow(abs(dot(normalize(vNormal), normalize(vView))), 0.7);
        float energy = (0.21 + pulse * 2.5 + tail * 0.28) * uEnergy;
        gl_FragColor = vec4(uColor * energy * facing, 0.52 + pulse * 0.45);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
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

function buildBranches() {
  const group = new THREE.Group();
  const flows: FlowTube[] = [];
  const glows: Glow[] = [];
  const nodes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  const production = [true, true, false, true, true, false, true, true, false, false];

  production.forEach((isProduction, index) => {
    const angle = (index / 10) * Math.PI * 2 + 0.18;
    const radius = 15 + Math.sin(index * 2.7) * 3 + (index % 3) * 1.6;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    const point = (r: number, y: number, bend: number) =>
      direction.clone().multiplyScalar(r).addScaledVector(tangent, bend).setY(y);
    const end = point(radius, RESERVOIR_Y - 2.2 - (index % 3) * 0.85, Math.sin(index) * 3);
    const curve = new THREE.CatmullRomCurve3([
      point(0.18, RESERVOIR_Y + 2.3, 0),
      point(1.2, RESERVOIR_Y + 0.4, 0),
      point(4.5, RESERVOIR_Y - 1.5, Math.sin(index) * 0.8),
      point(radius * 0.65, end.y - 0.2, Math.sin(index) * 2),
      end,
    ]);
    const color = isProduction ? ORANGE : BLUE;
    // Production brings heat back to the well; injection carries fluid outward.
    const flow = makeFlowTube(curve, color, isProduction ? -0.27 : 0.23, 0.105);
    group.add(flow);
    flows.push(flow);

    const casing = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 88, 0.18, 8, false),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.045, depthWrite: false }),
    );
    group.add(casing);
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 12, 8),
      new THREE.MeshBasicMaterial({ color, toneMapped: false }),
    );
    node.position.copy(end);
    nodes.push(node);
    group.add(node);
    const glow = makeGlow(color, 1.1);
    glow.position.copy(end);
    glow.scale.setScalar(2.7);
    glows.push(glow);
    group.add(glow);
  });

  return { group, flows, glows, nodes };
}

function buildSurfaceCampus() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({
    color: "#d9dbde", emissive: "#dae2ec", emissiveIntensity: 0.08, roughness: 0.68,
  });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.94, 0.19, 40), white);
  hub.position.y = 0.2;
  group.add(hub);
  const pillGeometry = new THREE.CapsuleGeometry(0.27, 1.7, 4, 12);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const pill = new THREE.Mesh(pillGeometry, white);
    pill.rotation.z = Math.PI / 2;
    const radial = new THREE.Group();
    radial.rotation.y = -angle;
    pill.position.set(1.95, 0.19, 0);
    pill.scale.z = 0.72;
    radial.add(pill);
    group.add(radial);
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.05, 3.09, 64),
    new THREE.MeshBasicMaterial({ color: "#b0b9c9", transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  group.add(ring);
  return group;
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
    positions.set([(random() - 0.5) * 42, -random() * 43 + 3, (random() - 0.2) * 32], index * 3);
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
const cameraKeys: CameraKey[] = [
  [0, [10, 7, 29], [0, 0.35, 0]],
  [0.1, [6, 4.1, 18], [0, 0, 0]],
  [0.15, [3.5, 1.3, 8.7], [0, -2.4, 0]],
  [0.25, [3.2, -10, 8], [0, -13.8, 0]],
  [0.4, [6.5, -31.6, 18], [0, -34.2, 0]],
  [0.5, [-5, -32.4, 21], [0, -34.6, 0]],
  [0.6, [-15, -29.5, 27], [0, -32.5, 0]],
  [0.74, [21, -19, 34], [0, -20, 0]],
  [0.85, [26, -14, 38], [0, -19, 0]],
  [0.9, [12, -23, 20], [0, -24, 0]],
  [0.95, [4.6, -9, 11], [0, -6, 0]],
  [1, [6.8, 4.4, 12.8], [0, 0.35, 0]],
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

/** A 270-degree annulus leaves a front-facing quarter of the geology open. */
function makeCutawayLayer(radius: number, thickness: number) {
  const shape = new THREE.Shape();
  const start = Math.PI * 0.75;
  const end = Math.PI * 2.25;
  const inner = 0.98;
  shape.moveTo(Math.cos(start) * radius, Math.sin(start) * radius);
  shape.absarc(0, 0, radius, start, end, false);
  shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
  shape.absarc(0, 0, inner, end, start, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 64, steps: 1 });
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
    scene.fog = new THREE.FogExp2("#06070a", 0.016);
    const camera = new THREE.PerspectiveCamera(49, 1, 0.08, 220);
    const billboards: Glow[] = [];
    const flowTubes: FlowTube[] = [];
    const strataMaterials: THREE.ShaderMaterial[] = [];
    let dust: ReturnType<typeof buildDust> | undefined;
    let flare: ReturnType<typeof makeFlare> | undefined;
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
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
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
        // Portrait compositions keep all ten roots inside a comfortable framing.
        const portrait = camera.aspect < 0.85;
        if (portrait) {
          path.position.x *= 1.28;
          path.position.z *= 1.28;
        }
        camera.position.copy(path.position);
        camera.lookAt(path.target);
        camera.updateMatrixWorld();
        billboards.forEach((billboard) => billboard.quaternion.copy(camera.quaternion));

        const energy = 0.65 + smoothstep(0.3, 0.8, progress) * 1.25;
        flowTubes.forEach((flow) => {
          flow.material.uniforms.uTime.value = elapsed * (reducedMotion ? 0.25 : 1);
          flow.material.uniforms.uEnergy.value = energy;
        });
        strataMaterials.forEach((material) => { material.uniforms.uHeat.value = 0.35 + smoothstep(0.18, 0.6, progress) * 0.9; });
        if (dust) {
          dust.material.uniforms.uTime.value = elapsed;
          dust.material.uniforms.uDrift.value = reducedMotion ? 0 : 1;
          dust.material.uniforms.uOpacity.value = (0.2 + smoothstep(0.12, 0.45, progress) * 0.22) * (1 - smoothstep(0.9, 1, progress) * 0.7);
        }
        const heat = 0.48 + smoothstep(0.32, 0.56, progress) * 0.72;
        if (reservoirGlow) reservoirGlow.material.uniforms.uStrength.value = heat * 0.8;
        if (reservoirCore) reservoirCore.material.uniforms.uStrength.value = heat * 1.2;
        if (reservoirLight) reservoirLight.intensity = 10 + heat * 8;
        const ascent = smoothstep(0.85, 1, progress);
        if (ascentGlow) {
          ascentGlow.position.y = THREE.MathUtils.lerp(RESERVOIR_Y, 3, ascent);
          ascentGlow.scale.setScalar(1.3 + ascent * 1.6);
          ascentGlow.material.uniforms.uStrength.value = smoothstep(0.84, 0.89, progress) * 0.55 * (1 - smoothstep(0.92, 0.98, progress));
        }
        if (flare) flare.material.uniforms.uOpacity.value = smoothstep(0.88, 0.94, progress) * 0.14 * (1 - smoothstep(0.95, 0.99, progress));
        renderer.toneMappingExposure = 1.1 + ascent * 0.05;
        if (bloom) bloom.strength = 0.7 - ascent * 0.4;
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
      reservoirLight = new THREE.PointLight("#ff6422", 25, 37, 2);
      reservoirLight.position.set(0, RESERVOIR_Y + 2.5, 0);
      scene.add(reservoirLight);

      const groundGeometry = new THREE.RingGeometry(1.04, 100, 128, 8);
      groundGeometry.rotateX(-Math.PI / 2);
      const ground = new THREE.Mesh(groundGeometry, makeStrataMaterial(0));
      ground.material.uniforms.uHeat.value = 0;
      scene.add(ground);
      scene.add(buildSurfaceCampus());
      const horizon = makeGlow("#ad4e28", 0.63);
      horizon.position.set(-6, 4.5, -63);
      horizon.scale.set(190, 27, 1);
      scene.add(horizon);
      const campusGlow = makeGlow("#e5edff", 0.2);
      campusGlow.position.set(0, 0.42, 0);
      campusGlow.scale.set(4.7, 2.2, 1);
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

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 33, 32, 1, true),
        new THREE.MeshStandardMaterial({ color: "#8391a7", metalness: 0.25, roughness: 0.14, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
      );
      shaft.position.y = -16.2;
      scene.add(shaft);
      const productionCurve = new THREE.LineCurve3(new THREE.Vector3(-0.16, RESERVOIR_Y + 1, 0), new THREE.Vector3(-0.16, 5.7, 0));
      const injectionCurve = new THREE.LineCurve3(new THREE.Vector3(0.16, RESERVOIR_Y + 1, 0), new THREE.Vector3(0.16, 0.15, 0));
      const productionFlow = makeFlowTube(productionCurve, ORANGE, 0.37, 0.095);
      const injectionFlow = makeFlowTube(injectionCurve, BLUE, -0.29, 0.075);
      flowTubes.push(productionFlow, injectionFlow);
      scene.add(productionFlow, injectionFlow);
      const topBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.027, 0.065, 7, 12),
        new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      topBeam.position.y = 3.5;
      scene.add(topBeam);

      const branches = buildBranches();
      scene.add(branches.group);
      flowTubes.push(...branches.flows);
      billboards.push(...branches.glows);
      reservoirGlow = makeGlow("#ff3d0a", 0.5);
      reservoirGlow.position.set(0, RESERVOIR_Y - 1, 0);
      reservoirGlow.scale.set(26, 17, 1);
      reservoirCore = makeGlow("#ffb060", 0.8);
      reservoirCore.position.set(0, RESERVOIR_Y - 0.6, 0.15);
      reservoirCore.scale.set(7.5, 5.3, 1);
      billboards.push(reservoirGlow, reservoirCore);
      scene.add(reservoirGlow, reservoirCore);
      ascentGlow = makeGlow("#ffd5a0", 0);
      ascentGlow.position.set(-0.16, RESERVOIR_Y, 0.1);
      billboards.push(ascentGlow);
      scene.add(ascentGlow);
      dust = buildDust(lowPower ? 180 : 540);
      scene.add(dust);
      flare = makeFlare();
      scene.add(flare);

      // On constrained devices additive shaders retain the glow without full-frame postprocessing.
      if (!lowPower) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.62);
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
          camera.updateProjectionMatrix();
          composer?.setPixelRatio(dpr);
          composer?.setSize(Math.max(1, width), Math.max(1, height));
          if (dust) dust.material.uniforms.uDpr.value = dpr;
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
