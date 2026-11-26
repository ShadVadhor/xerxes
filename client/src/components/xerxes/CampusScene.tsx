import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Mode = "dtf" | "compare" | "xerxes";

type Campus = {
  group: THREE.Group;
  flows: THREE.ShaderMaterial[];
};

type Layout = {
  xerxesPosition: THREE.Vector3;
  dtfPosition: THREE.Vector3;
  xerxesVisibility: number;
  dtfVisibility: number;
  target: THREE.Vector3;
  distance: number;
};

const TRANSITION_SECONDS = 1.2;
// This common conversion is the same in every mode. DTF is physically 55% of
// the corresponding Xerxes module; the comparison never scales either up.
const WORLD_SCALE = 0.74;
const HIDDEN_SCALE = 0.0001;

function ceramicMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: "#efece6",
    roughness: 0.45,
    metalness: 0.025,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
  });
}

function makeHexTexture() {
  const canvas = document.createElement("canvas");
  const radius = 48;
  const rowHeight = Math.sqrt(3) * radius;
  canvas.width = radius * 1.5 * 8;
  canvas.height = Math.round(rowHeight * 8);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot create the campus canopy texture.");

  context.strokeStyle = "#2a2d33";
  context.lineWidth = 2.1;
  context.lineJoin = "round";
  // Extra cells cross every edge, making the transparent tile repeat cleanly.
  for (let column = -1; column <= 9; column += 1) {
    for (let row = -1; row <= 9; row += 1) {
      const x = column * radius * 1.5;
      const y = (row + (Math.abs(column % 2) ? 0.5 : 0)) * rowHeight;
      context.beginPath();
      for (let corner = 0; corner < 6; corner += 1) {
        const angle = (corner * Math.PI) / 3;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (corner === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1.2);
  texture.anisotropy = 4;
  return texture;
}

function makePod(hexTexture: THREE.CanvasTexture) {
  const pod = new THREE.Group();
  const shellGeometry = new THREE.CapsuleGeometry(0.88, 2.15, 12, 40);
  shellGeometry.rotateZ(-Math.PI / 2);
  const positions = shellGeometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const y = positions.getY(index);
    // Broad, gently flattened crown rather than a conventional half-cylinder.
    const normalized = Math.abs(y) / 0.88;
    const shaped = y >= 0 ? 0.52 * (1 - (1 - normalized) ** 2) : y * 0.49;
    positions.setY(index, shaped);
  }
  shellGeometry.computeVertexNormals();
  const shell = new THREE.Mesh(shellGeometry, ceramicMaterial());
  shell.position.y = 0.53;
  pod.add(shell);

  const canopyGeometry = shellGeometry.clone();
  const canopyPositions = canopyGeometry.getAttribute("position");
  const canopyIndex = canopyGeometry.getIndex();
  if (canopyIndex) {
    const roofTriangles: number[] = [];
    for (let index = 0; index < canopyIndex.count; index += 3) {
      const a = canopyIndex.getX(index);
      const b = canopyIndex.getX(index + 1);
      const c = canopyIndex.getX(index + 2);
      if (
        (canopyPositions.getY(a) + canopyPositions.getY(b) + canopyPositions.getY(c)) /
          3 >
        0.03
      ) {
        roofTriangles.push(a, b, c);
      }
    }
    canopyGeometry.setIndex(roofTriangles);
  }
  canopyGeometry.scale(1.009, 1.016, 1.009);
  const canopy = new THREE.Mesh(
    canopyGeometry,
    new THREE.MeshPhysicalMaterial({
      map: hexTexture,
      color: "#ffffff",
      roughness: 0.5,
      clearcoat: 0.2,
      transparent: true,
      opacity: 0.78,
      alphaTest: 0.035,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  canopy.position.y = shell.position.y + 0.005;
  pod.add(canopy);

  const foundationGeometry = shellGeometry.clone();
  foundationGeometry.scale(1.028, 0.17, 1.028);
  const foundation = new THREE.Mesh(
    foundationGeometry,
    new THREE.MeshStandardMaterial({ color: "#222830", roughness: 0.62, metalness: 0.2 })
  );
  foundation.position.y = 0.11;
  pod.add(foundation);
  return pod;
}

function makeBridge(length = 1.12) {
  const bridge = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.265, 0.265, length, 24),
    new THREE.MeshPhysicalMaterial({
      color: "#a5afb6",
      roughness: 0.3,
      metalness: 0.25,
      clearcoat: 0.4,
    })
  );
  body.rotation.z = Math.PI / 2;
  bridge.add(body);

  // Instancing keeps all the visible ribs to one draw call per bridge.
  const ribCount = 14;
  const ribs = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.277, 0.024, 6, 24),
    ceramicMaterial(),
    ribCount
  );
  const transform = new THREE.Object3D();
  transform.rotation.y = Math.PI / 2;
  for (let index = 0; index < ribCount; index += 1) {
    transform.position.x = -length / 2 + (index / (ribCount - 1)) * length;
    transform.updateMatrix();
    ribs.setMatrixAt(index, transform.matrix);
  }
  ribs.instanceMatrix.needsUpdate = true;
  bridge.add(ribs);
  bridge.position.y = 0.48;
  return bridge;
}

function makeHub() {
  const hub = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1.62, 0, Math.PI * 2, false);
  const court = new THREE.Path();
  court.absarc(0, 0, 0.47, 0, Math.PI * 2, true);
  shape.holes.push(court);
  const drumGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.045,
    bevelSegments: 3,
    curveSegments: 64,
    steps: 1,
  });
  drumGeometry.rotateX(-Math.PI / 2);
  const drum = new THREE.Mesh(drumGeometry, ceramicMaterial());
  drum.position.y = 0.145;
  hub.add(drum);

  const skylight = new THREE.Mesh(
    new THREE.RingGeometry(0.83, 1.29, 80),
    new THREE.MeshPhysicalMaterial({
      color: "#161c24",
      roughness: 0.16,
      metalness: 0.4,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    })
  );
  skylight.rotation.x = -Math.PI / 2;
  skylight.position.y = 0.693;
  hub.add(skylight);

  const skylightRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.31, 0.018, 6, 80),
    ceramicMaterial()
  );
  skylightRim.rotation.x = Math.PI / 2;
  skylightRim.position.y = 0.694;
  hub.add(skylightRim);

  // An actual hole in the drum, with a floor well below the roof plane.
  const courtFloor = new THREE.Mesh(
    new THREE.CircleGeometry(0.47, 40),
    new THREE.MeshStandardMaterial({ color: "#26332e", roughness: 0.9 })
  );
  courtFloor.rotation.x = -Math.PI / 2;
  courtFloor.position.y = 0.15;
  hub.add(courtFloor);
  return hub;
}

function makePlatform(radius: number) {
  const platform = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.06, 96),
    new THREE.MeshPhysicalMaterial({
      color: "#17202b",
      roughness: 0.28,
      metalness: 0.12,
      clearcoat: 0.65,
      transparent: true,
      opacity: 0.27,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  glass.position.y = -0.03;
  platform.add(glass);

  const grid = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 96),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float ringDistance = abs(fract(r * 8.0 + 0.5) - 0.5);
          float ringWidth = max(fwidth(r * 8.0), 0.012);
          float rings = 1.0 - smoothstep(0.008, ringWidth + 0.008, ringDistance);
          float angle = atan(p.y, p.x);
          float spokes = 1.0 - smoothstep(0.005, 0.036, abs(sin(angle * 12.0)));
          float edge = 1.0 - smoothstep(0.9, 1.0, r);
          float center = smoothstep(0.03, 0.15, r);
          float alpha = (rings * 0.18 + spokes * 0.055 * center) * edge;
          gl_FragColor = vec4(0.30, 0.40, 0.53, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.006;
  platform.add(grid);

  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.013, 6, 96),
    new THREE.MeshBasicMaterial({
      color: "#7290aa",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  edge.rotation.x = Math.PI / 2;
  edge.position.y = -0.012;
  platform.add(edge);
  return platform;
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
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })
  );
  sprite.scale.set(1.5, 0.56, 1);
  sprite.renderOrder = 20;
  return sprite;
}

/* ---------------------------------------------------------------------------------------------
 * Flow shader: one material drives every branch in a set. Direction, phase and "ghost" (planned,
 * not yet drilled) state are per-vertex attributes, so 120 branches are a single draw call.
 * ------------------------------------------------------------------------------------------- */

type Branch = { curve: THREE.Curve<THREE.Vector3>; dir: number; phase: number; ghost?: boolean };

function makeFlowMaterial(hot: string, cold: string, alpha = 1, speed = 0.13) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uAlpha: { value: alpha },
      uHot: { value: new THREE.Color(hot) },
      uCold: { value: new THREE.Color(cold) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute float aDir;
      attribute float aGhost;
      varying vec2 vUv;
      varying float vPhase;
      varying float vDir;
      varying float vGhost;
      void main() {
        vUv = uv;
        vPhase = aPhase;
        vDir = aDir;
        vGhost = aGhost;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uAlpha;
      uniform vec3 uHot;
      uniform vec3 uCold;
      varying vec2 vUv;
      varying float vPhase;
      varying float vDir;
      varying float vGhost;
      void main() {
        float d = abs(fract(vUv.x - uTime * uSpeed * vDir + vPhase) - 0.5);
        float pulse = exp(-pow(d / 0.025, 2.0));
        float endFade = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.96, 1.0, vUv.x));
        vec3 base = vDir < 0.0 ? uHot : uCold;
        // Planned branches are drawn as a dashed, dim outline with a slow pulse.
        float dash = step(0.5, fract(vUv.x * 26.0));
        float ghostAlpha = 0.07 + 0.3 * dash;
        float a = (0.58 + pulse * 0.32) * endFade * uAlpha;
        a = mix(a, ghostAlpha * endFade, vGhost);
        vec3 light = base * (0.82 + pulse * 0.45) + vec3(pulse * 0.22);
        gl_FragColor = vec4(light, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

function mergeTubes(branches: Branch[], radius: number, tubular: number, radial: number, tint?: (b: Branch) => THREE.Color) {
  const parts = branches.map(b => {
    const geometry = new THREE.TubeGeometry(b.curve, tubular, radius, radial, false);
    const count = geometry.getAttribute("position").count;
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(count).fill(b.phase), 1));
    geometry.setAttribute("aDir", new THREE.BufferAttribute(new Float32Array(count).fill(b.dir), 1));
    geometry.setAttribute("aGhost", new THREE.BufferAttribute(new Float32Array(count).fill(b.ghost ? 1 : 0), 1));
    if (tint) {
      const c = tint(b);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) colors.set([c.r, c.g, c.b], i * 3);
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    return geometry;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  if (!merged) throw new Error("Cannot merge branch geometry.");
  return merged;
}

function makeHalo(branches: Branch[], radius: number, opacity: number) {
  const hot = new THREE.Color("#ff5a1f");
  const cold = new THREE.Color("#3d8bff");
  const geometry = mergeTubes(branches, radius, 24, 4, b => (b.dir < 0 ? hot : cold));
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  mesh.frustumCulled = false;
  return mesh;
}

/** A sidetrack leaving a well's kick-off point: drops, then runs out nearly level into hot rock. */
function branchCurve(origin: THREE.Vector3, azimuth: number, reach: number, drop: number) {
  const p = (r: number, dy: number, bend = 0) =>
    new THREE.Vector3(
      origin.x + Math.cos(azimuth + bend) * r,
      origin.y - dy,
      origin.z + Math.sin(azimuth + bend) * r
    );
  return new THREE.CatmullRomCurve3([
    p(0, 0),
    p(reach * 0.14, drop * 0.34, 0.02),
    p(reach * 0.42, drop * 0.8, 0.07),
    p(reach * 0.76, drop * 1.0, 0.1),
    p(reach, drop * 1.05, 0.12),
  ]);
}

function glowMaterial(color: string, opacity = 0.7) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

/* ---------------------------------------------------------------------------------------------
 * Xerxes: hub + six pods, two wells under every pod, ten branches per well = 120.
 * ------------------------------------------------------------------------------------------- */

const POD_RADIUS = 4.45;
const WELL_SPAN = 0.95; // half the distance between a pod's two wells (pre-scale units)
const XERXES_KICKOFF = 1.5;

function makeXerxesField() {
  const group = new THREE.Group();
  const branches: Branch[] = [];
  const wells: THREE.Vector3[] = [];
  const dimension: { a: THREE.Vector3; b: THREE.Vector3 } = { a: new THREE.Vector3(), b: new THREE.Vector3() };

  for (let pod = 0; pod < 6; pod += 1) {
    const angle = (pod * Math.PI * 2) / 6;
    for (const side of [-1, 1]) {
      const radial = POD_RADIUS + side * WELL_SPAN;
      const well = new THREE.Vector3(Math.cos(angle) * radial, 0, Math.sin(angle) * radial);
      const index = wells.length;
      wells.push(well);
      if (pod === 1) (side < 0 ? dimension.a : dimension.b).copy(well);
      const origin = new THREE.Vector3(well.x, -XERXES_KICKOFF, well.z);
      for (let k = 0; k < 10; k += 1) {
        const azimuth = (k / 10) * Math.PI * 2 + index * 0.41;
        const reach = 1.15 + ((k * 7 + index * 3) % 5) * 0.16;
        const drop = 0.7 + ((k * 3 + index) % 4) * 0.2;
        branches.push({
          curve: branchCurve(origin, azimuth, reach, drop),
          dir: k % 2 === 0 ? -1 : 1,
          phase: ((index * 10 + k) * 0.6180339) % 1,
        });
      }
    }
  }

  const material = makeFlowMaterial("#ff5a1f", "#3d8bff", 1);
  const flow = new THREE.Mesh(mergeTubes(branches, 0.023, 40, 5), material);
  flow.frustumCulled = false;
  group.add(flow, makeHalo(branches, 0.055, 0.06));

  // Twelve shafts and their kick-off nodes.
  const shaft = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.036, 0.036, XERXES_KICKOFF, 10, 1, true), glowMaterial("#ff9055", 0.62), wells.length);
  const node = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 14, 10), glowMaterial("#ffd3ae", 0.95), wells.length);
  const t = new THREE.Object3D();
  wells.forEach((w, i) => {
    t.position.set(w.x, -XERXES_KICKOFF / 2, w.z);
    t.updateMatrix();
    shaft.setMatrixAt(i, t.matrix);
    t.position.set(w.x, -XERXES_KICKOFF, w.z);
    t.updateMatrix();
    node.setMatrixAt(i, t.matrix);
  });
  shaft.instanceMatrix.needsUpdate = true;
  node.instanceMatrix.needsUpdate = true;
  group.add(shaft, node);

  // "50 m" dimension between the two wells of the featured pod.
  const dim = new THREE.Group();
  const y = -0.62;
  const a = new THREE.Vector3(dimension.a.x, y, dimension.a.z);
  const b = new THREE.Vector3(dimension.b.x, y, dimension.b.z);
  const along = b.clone().sub(a).normalize();
  const side = new THREE.Vector3(-along.z, 0, along.x).multiplyScalar(0.12);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    a, b,
    a.clone().sub(side), a.clone().add(side),
    b.clone().sub(side), b.clone().add(side),
  ]);
  lineGeometry.setIndex([0, 1, 2, 3, 4, 5]);
  const line = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({ color: "#ffd9b8", transparent: true, opacity: 0.9, depthTest: false, toneMapped: false })
  );
  line.renderOrder = 19;
  const label = makeLabel("50 m");
  label.position.copy(a).lerp(b, 0.5).add(new THREE.Vector3(0, -0.3, 0));
  dim.add(line, label);
  group.add(dim);

  return { group, material };
}

/** Wind and cold arriving over each pod roof: cold-blue streaks that sweep in and settle into the shell. */
function makeColdStreaks() {
  const branches: Branch[] = [];
  for (let pod = 0; pod < 6; pod += 1) {
    const angle = (pod * Math.PI * 2) / 6;
    for (let s = 0; s < 3; s += 1) {
      const z = (s - 1) * 0.5;
      const lift = 1.5 + s * 0.14;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(9.1, lift + 0.7, z * 2.1),
        new THREE.Vector3(7.2, lift + 0.35, z * 1.7),
        new THREE.Vector3(5.6, lift - 0.1, z * 1.1),
        new THREE.Vector3(4.45, 1.12 + s * 0.02, z * 0.7),
        new THREE.Vector3(3.4, 0.86, z * 0.35),
      ]);
      // rotate the sampled curve into the pod's frame
      const pts = curve.getPoints(40).map(v => new THREE.Vector3(v.x * Math.cos(angle) - v.z * Math.sin(angle), v.y, v.x * Math.sin(angle) + v.z * Math.cos(angle)));
      branches.push({ curve: new THREE.CatmullRomCurve3(pts), dir: 1, phase: ((pod * 3 + s) * 0.37) % 1 });
    }
  }
  const material = makeFlowMaterial("#cfeaff", "#8fd0ff", 0.9, 0.2);
  const mesh = new THREE.Mesh(mergeTubes(branches, 0.014, 56, 4), material);
  mesh.frustumCulled = false;
  return { mesh, material };
}

function buildXerxes(): Campus {
  const group = new THREE.Group();
  const content = new THREE.Group();
  content.scale.setScalar(WORLD_SCALE);
  group.add(content);
  const architecture = new THREE.Group();
  const hexTexture = makeHexTexture();
  architecture.add(makeHub());

  for (let index = 0; index < 6; index += 1) {
    const angle = (index * Math.PI * 2) / 6;
    const radialModule = new THREE.Group();
    radialModule.rotation.y = -angle;
    const pod = makePod(hexTexture);
    pod.position.x = POD_RADIUS;
    const bridge = makeBridge();
    bridge.position.x = 2.045;
    radialModule.add(pod, bridge);
    architecture.add(radialModule);
  }

  const field = makeXerxesField();
  const streaks = makeColdStreaks();
  content.add(makePlatform(7.5), architecture, field.group, streaks.mesh);
  return { group, flows: [field.material, streaks.material] };
}

/* ---------------------------------------------------------------------------------------------
 * DTF — Dark Token Factory: one stationary pad, one prefabricated two-level building (Level 2
 * compute under a robotic gantry, Level 1 power / cooling / stimulation), a green steel wellhead,
 * and one re-entered well: a ten-slot neck with ten branches around a 3-inch sensor core.
 * ------------------------------------------------------------------------------------------- */

const DTF_NECK = 1.15;
const DTF_CORE_END = 2.05;
const PAD_TOP = 0.07;

function makeDtf(): Campus {
  const group = new THREE.Group();
  const content = new THREE.Group();
  content.scale.setScalar(WORLD_SCALE);
  group.add(content);

  const slate = new THREE.MeshStandardMaterial({ color: "#2a313b", roughness: 0.6, metalness: 0.25 });
  const graphite = new THREE.MeshStandardMaterial({ color: "#3b424d", roughness: 0.48, metalness: 0.42 });
  const steel = new THREE.MeshStandardMaterial({ color: "#aeb6c0", roughness: 0.32, metalness: 0.75 });
  const green = new THREE.MeshStandardMaterial({ color: "#2f8a55", roughness: 0.45, metalness: 0.3 });
  const glow = (color: string) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  const pad = new THREE.Group();
  content.add(makePlatform(4.1), pad);
  add(pad, new RoundedBoxGeometry(5.2, 0.08, 3.9, 2, 0.02), new THREE.MeshStandardMaterial({ color: "#1b2129", roughness: 0.85 }), 0, 0.03, 0);

  // The building. Level 1 (power, cooling, stimulation, storage): four bays, one colour slit each.
  const bx = -1.2;
  const bz = -0.6;
  add(pad, new RoundedBoxGeometry(1.9, 0.46, 1.05, 3, 0.03), graphite, bx, PAD_TOP + 0.23, bz);
  const bays = [
    { dx: -0.71, color: "#ff7a3a" }, // Native ORC-DC
    { dx: -0.24, color: "#e4ad3c" }, // GEOFLEX BESS
    { dx: 0.24, color: "#4fc3e8" }, // absorption cooling
    { dx: 0.71, color: "#c4cad2" }, // stimulation unit
  ];
  bays.forEach(bay => add(pad, new THREE.BoxGeometry(0.34, 0.026, 0.01), glow(bay.color), bx + bay.dx, PAD_TOP + 0.24, bz + 0.53));
  [-0.475, 0, 0.475].forEach(dx => add(pad, new THREE.BoxGeometry(0.014, 0.4, 0.012), slate, bx + dx, PAD_TOP + 0.23, bz + 0.527));

  // Level 2 (compute): Module A and Module B side by side, each with its own LED slit.
  [-0.47, 0.47].forEach(dx => {
    add(pad, new RoundedBoxGeometry(0.89, 0.44, 0.97, 3, 0.03), graphite, bx + dx, PAD_TOP + 0.68, bz);
    add(pad, new THREE.BoxGeometry(0.62, 0.026, 0.01), glow("#4a96ff"), bx + dx, PAD_TOP + 0.7, bz + 0.49);
  });
  // robotic gantry: two rails along the roof, a cross beam and a carriage
  add(pad, new THREE.BoxGeometry(1.86, 0.025, 0.04), slate, bx, PAD_TOP + 0.915, bz - 0.28);
  add(pad, new THREE.BoxGeometry(1.86, 0.025, 0.04), slate, bx, PAD_TOP + 0.915, bz + 0.28);
  add(pad, new THREE.BoxGeometry(0.05, 0.03, 0.62), slate, bx + 0.25, PAD_TOP + 0.94, bz);
  add(pad, new THREE.BoxGeometry(0.1, 0.05, 0.1), steel, bx + 0.25, PAD_TOP + 0.98, bz);
  add(pad, new THREE.SphereGeometry(0.026, 10, 8), glow("#8fd0ff"), bx + 0.25, PAD_TOP + 1.02, bz);
  // the two service links between the levels: native DC (warm) and cooling (cool)
  add(pad, new THREE.BoxGeometry(0.012, 0.2, 0.03), glow("#ff7a3a"), bx + 0.953, PAD_TOP + 0.46, bz - 0.18);
  add(pad, new THREE.BoxGeometry(0.012, 0.2, 0.03), glow("#4fc3e8"), bx + 0.953, PAD_TOP + 0.46, bz + 0.18);

  // Battery containers (2 × 5 MW), absorption-cooling vessels and the ORC skid.
  const bess = new THREE.MeshPhysicalMaterial({ color: "#e4e6ea", roughness: 0.4, metalness: 0.1, clearcoat: 0.3 });
  [-1.5, -0.8].forEach(x => {
    add(pad, new RoundedBoxGeometry(0.62, 0.34, 0.36, 2, 0.02), bess, x, PAD_TOP + 0.17, 1.05);
    add(pad, new THREE.BoxGeometry(0.5, 0.018, 0.01), glow("#4a96ff"), x, PAD_TOP + 0.2, 1.235);
  });
  add(pad, new RoundedBoxGeometry(0.9, 0.3, 0.5, 2, 0.02), slate, 1.5, PAD_TOP + 0.15, 1.0);
  add(pad, new THREE.BoxGeometry(0.7, 0.018, 0.01), glow("#ff7a3a"), 1.5, PAD_TOP + 0.2, 1.255);
  [0.12, 0.34].forEach(y => {
    const tank = add(pad, new THREE.CylinderGeometry(0.1, 0.1, 0.86, 22), steel, -0.05, PAD_TOP + y, 1.0);
    tank.rotation.z = Math.PI / 2;
    const ring = add(pad, new THREE.TorusGeometry(0.102, 0.008, 6, 28), glow("#4fc3e8"), -0.05, PAD_TOP + y, 1.0);
    ring.rotation.y = Math.PI / 2;
  });

  // Green steel wellhead: stack, side arms and hand-wheels.
  const wx = 0.62;
  const wz = 0.3;
  add(pad, new THREE.CylinderGeometry(0.2, 0.23, 0.07, 28), slate, wx, PAD_TOP + 0.035, wz);
  add(pad, new THREE.CylinderGeometry(0.05, 0.05, 0.42, 14), green, wx, PAD_TOP + 0.28, wz);
  add(pad, new THREE.SphereGeometry(0.058, 12, 10), green, wx, PAD_TOP + 0.5, wz);
  [0.18, 0.31].forEach(y => {
    const arm = add(pad, new THREE.CylinderGeometry(0.028, 0.028, 0.3, 10), green, wx, PAD_TOP + y, wz);
    arm.rotation.z = Math.PI / 2;
    add(pad, new THREE.CylinderGeometry(0.036, 0.036, 0.04, 12), steel, wx + 0.17, PAD_TOP + y, wz).rotation.z = Math.PI / 2;
    const wheel = add(pad, new THREE.TorusGeometry(0.05, 0.007, 6, 18), steel, wx, PAD_TOP + y + 0.06, wz + 0.0);
    wheel.rotation.x = Math.PI / 2;
  });
  const flowline = add(pad, new THREE.CylinderGeometry(0.026, 0.026, 0.86, 10), steel, wx - 0.43, PAD_TOP + 0.045, wz + 0.1);
  flowline.rotation.z = Math.PI / 2;
  add(pad, new THREE.TorusGeometry(0.17, 0.011, 8, 40), glow("#ff7a3a"), wx, PAD_TOP + 0.075, wz).rotation.x = Math.PI / 2;

  // Fence with a gate on the service side.
  const hx = 2.35;
  const hz = 1.75;
  const posts: THREE.Vector3[] = [];
  const rails: THREE.Vector3[] = [];
  const edgePoints = (x0: number, z0: number, x1: number, z1: number, step: number, skipGate = false) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i <= n; i += 1) {
      const x = x0 + ((x1 - x0) * i) / n;
      const z = z0 + ((z1 - z0) * i) / n;
      if (skipGate && Math.abs(x) < 0.5) continue;
      posts.push(new THREE.Vector3(x, 0, z));
    }
    for (let i = 0; i < n; i += 1) {
      const xa = x0 + ((x1 - x0) * i) / n;
      const za = z0 + ((z1 - z0) * i) / n;
      const xb = x0 + ((x1 - x0) * (i + 1)) / n;
      const zb = z0 + ((z1 - z0) * (i + 1)) / n;
      if (skipGate && Math.abs((xa + xb) / 2) < 0.5) continue;
      for (const h of [0.15, 0.27]) {
        rails.push(new THREE.Vector3(xa, PAD_TOP + h, za), new THREE.Vector3(xb, PAD_TOP + h, zb));
      }
    }
  };
  edgePoints(-hx, -hz, hx, -hz, 0.47);
  edgePoints(hx, -hz, hx, hz, 0.44);
  edgePoints(hx, hz, -hx, hz, 0.47, true);
  edgePoints(-hx, hz, -hx, -hz, 0.44);
  const fencePosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.028, 0.3, 0.028), slate, posts.length);
  const pt = new THREE.Object3D();
  posts.forEach((p, i) => {
    pt.position.set(p.x, PAD_TOP + 0.15, p.z);
    pt.updateMatrix();
    fencePosts.setMatrixAt(i, pt.matrix);
  });
  fencePosts.instanceMatrix.needsUpdate = true;
  pad.add(fencePosts);
  pad.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(rails),
      new THREE.LineBasicMaterial({ color: "#9aa3ad", transparent: true, opacity: 0.55 })
    )
  );
  [-0.5, 0.5].forEach(x => {
    add(pad, new THREE.BoxGeometry(0.05, 0.34, 0.05), slate, x, PAD_TOP + 0.17, hz);
    add(pad, new THREE.BoxGeometry(0.06, 0.02, 0.06), glow("#ff7a3a"), x, PAD_TOP + 0.35, hz);
  });

  // Underground: one re-entered well. A ten-slot neck (six slots in the upper half, four in the lower),
  // ten branches sidetracked from those slots, and the 3-inch sensor core running on below them all.
  const under = new THREE.Group();
  const slotY = Array.from({ length: 10 }, (_, k) => (k < 6 ? -(0.1 + k * 0.095) : -(0.7 + (k - 6) * 0.12)));
  const branches: Branch[] = [];
  for (let k = 0; k < 10; k += 1) {
    const origin = new THREE.Vector3(wx, slotY[k], wz);
    const endDepth = 1.78 + (k % 4) * 0.09;
    branches.push({
      curve: branchCurve(origin, (k / 10) * Math.PI * 2 + 0.3, 1.2 + (k % 3) * 0.13, (endDepth + slotY[k]) / 1.05),
      dir: k % 2 === 0 ? -1 : 1,
      phase: (k * 0.6180339) % 1,
    });
  }
  const material = makeFlowMaterial("#ff5a1f", "#3d8bff", 1);
  const flow = new THREE.Mesh(mergeTubes(branches, 0.03, 56, 6), material);
  flow.frustumCulled = false;
  under.add(flow, makeHalo(branches, 0.07, 0.09));
  // the neck: a darker sleeve with ten amber slot ports
  add(under, new THREE.CylinderGeometry(0.075, 0.075, DTF_NECK, 16, 1, true), glowMaterial("#7a4a2a", 0.4), wx, -DTF_NECK / 2, wz);
  slotY.forEach((y, k) => add(under, new THREE.BoxGeometry(0.05, 0.026, 0.05), glow("#ffc27a"), wx + (k % 2 === 0 ? -0.075 : 0.075), y, wz));
  // the central sensor core
  add(under, new THREE.CylinderGeometry(0.03, 0.03, DTF_CORE_END, 10, 1, true), glowMaterial("#ffd9bd", 0.85), wx, -DTF_CORE_END / 2, wz);
  add(under, new THREE.SphereGeometry(0.085, 16, 12), glowMaterial("#fff1e0", 0.95), wx, -DTF_CORE_END, wz);
  add(under, new THREE.SphereGeometry(0.2, 16, 12), glowMaterial("#ff7a3a", 0.16), wx, -DTF_CORE_END, wz);
  content.add(under);

  return { group, flows: [material] };
}

function layoutFor(mode: Mode): Layout {
  return {
    xerxesPosition: new THREE.Vector3(mode === "compare" ? 2.9 : 0, 0, 0),
    dtfPosition: new THREE.Vector3(mode === "compare" ? -6.1 : 0, 0, 0),
    xerxesVisibility: mode === "dtf" ? HIDDEN_SCALE : 1,
    dtfVisibility: mode === "xerxes" ? HIDDEN_SCALE : 1,
    target: new THREE.Vector3(mode === "compare" ? -0.1 : 0, mode === "dtf" ? -0.5 : -0.75, 0),
    distance: mode === "dtf" ? 7.8 : mode === "compare" ? 22.5 : 15.8,
  };
}

function cloneLayout(layout: Layout): Layout {
  return {
    ...layout,
    xerxesPosition: layout.xerxesPosition.clone(),
    dtfPosition: layout.dtfPosition.clone(),
    target: layout.target.clone(),
  };
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse(object => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points
    ) {
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach(material => materials.add(material));
      if (object instanceof THREE.InstancedMesh) object.dispose();
    }
  });
  materials.forEach(material => {
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) textures.add(value);
    });
    material.dispose();
  });
  geometries.forEach(geometry => geometry.dispose());
  textures.forEach(texture => texture.dispose());
  scene.clear();
}

export default function CampusScene(props: {
  mode: "dtf" | "compare" | "xerxes";
  className?: string;
  onUnsupported?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(props.mode);
  const unsupportedCallbackRef = useRef(props.onUnsupported);
  const unsupportedReportedRef = useRef(false);
  const [unsupported, setUnsupported] = useState(false);
  modeRef.current = props.mode;
  unsupportedCallbackRef.current = props.onUnsupported;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let environmentTarget: THREE.WebGLRenderTarget | undefined;
    let frameId: number | null = null;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    function cleanup() {
      if (disposed) return;
      disposed = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      cleanups.forEach(remove => remove());
      controls?.dispose();
      scene.environment = null;
      disposeScene(scene);
      environmentTarget?.dispose();
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
      if (!unsupportedReportedRef.current) {
        unsupportedReportedRef.current = true;
        unsupportedCallbackRef.current?.();
      }
    }

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      const activeRenderer = renderer;
      activeRenderer.setClearColor(0x000000, 0);
      activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
      activeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      activeRenderer.toneMappingExposure = 1.05;
      const canvas = activeRenderer.domElement;
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Interactive illustration: a small DTF well pad beside the Xerxes campus with twelve wells and 120 geothermal branches");
      host.appendChild(canvas);

      const room = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(activeRenderer);
      try {
        environmentTarget = pmrem.fromScene(room, 0.04);
        scene.environment = environmentTarget.texture;
        scene.environmentIntensity = 0.78;
      } finally {
        room.dispose();
        pmrem.dispose();
      }
      const warmLight = new THREE.DirectionalLight("#ffd9b0", 3);
      warmLight.position.set(-7, 6, 5);
      const rimLight = new THREE.DirectionalLight("#6aa8ff", 2);
      rimLight.position.set(5, 5, -7);
      scene.add(warmLight, rimLight, new THREE.HemisphereLight("#dae8ff", "#1a202b", 0.55));

      const xerxes = buildXerxes();
      scene.add(xerxes.group);
      const dtf = makeDtf();
      scene.add(dtf.group);
      xerxes.group.name = "xerxesGroup";
      dtf.group.name = "dtfGroup";
      const pulseMaterials = [...xerxes.flows, ...dtf.flows];

      let currentMode = modeRef.current;
      const current = layoutFor(currentMode);
      let start = cloneLayout(current);
      let destination = layoutFor(currentMode);
      let transitionT = 1;
      let transitionElapsed = TRANSITION_SECONDS;
      let width = 0;
      let height = 0;
      let framingFactor = 1;
      let onScreen = typeof IntersectionObserver === "undefined";
      let documentVisible = document.visibilityState === "visible";
      let previousTime = 0;
      let animationTime = 0;
      let interacting = false;
      let pauseUntil = 0;
      const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reducedMotion = motionPreference.matches;
      const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 150);
      const initialDirection = new THREE.Vector3(0.24, 0.57, 0.79).normalize();
      camera.position.copy(current.target).addScaledVector(initialDirection, current.distance);
      controls = new OrbitControls(camera, canvas);
      const orbit = controls;
      orbit.target.copy(current.target);
      orbit.enableZoom = false;
      orbit.enablePan = false;
      orbit.enableDamping = !reducedMotion;
      orbit.dampingFactor = 0.065;
      orbit.minPolarAngle = Math.PI * 0.2;
      orbit.maxPolarAngle = Math.PI * 0.62;
      orbit.autoRotateSpeed = 0.6;
      orbit.touches = { ONE: THREE.TOUCH.ROTATE };
      // OrbitControls sets touch-action:none during construction: restore it.
      canvas.style.touchAction = "pan-y";
      orbit.update();
      const cameraOffset = new THREE.Vector3();

      function isActive() {
        return !disposed && onScreen && documentVisible && width > 0 && height > 0;
      }

      function updateLoopState() {
        if (isActive()) {
          if (frameId === null) {
            previousTime = 0;
            frameId = requestAnimationFrame(render);
          }
        } else if (frameId !== null) {
          cancelAnimationFrame(frameId);
          frameId = null;
          previousTime = 0;
        }
      }

      function render(time: number) {
        frameId = null;
        if (!isActive()) return;
        const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
        previousTime = time;

        if (currentMode !== modeRef.current) {
          currentMode = modeRef.current;
          start = cloneLayout(current);
          destination = layoutFor(currentMode);
          transitionT = 0;
          transitionElapsed = 0;
        }
        // Lerp progress toward 1 over the remaining duration, then ease it.
        // Unlike a fixed per-frame multiplier, this lasts 1.2s at any frame rate.
        if (reducedMotion) {
          transitionT = 1;
          transitionElapsed = TRANSITION_SECONDS;
        } else if (transitionT < 1) {
          const remaining = Math.max(TRANSITION_SECONDS - transitionElapsed, delta);
          transitionT = THREE.MathUtils.lerp(transitionT, 1, Math.min(1, delta / remaining));
          transitionElapsed += delta;
          if (transitionElapsed >= TRANSITION_SECONDS) transitionT = 1;
        }
        const t = transitionT * transitionT * (3 - 2 * transitionT);
        current.xerxesPosition.lerpVectors(start.xerxesPosition, destination.xerxesPosition, t);
        current.dtfPosition.lerpVectors(start.dtfPosition, destination.dtfPosition, t);
        current.target.lerpVectors(start.target, destination.target, t);
        current.xerxesVisibility = THREE.MathUtils.lerp(start.xerxesVisibility, destination.xerxesVisibility, t);
        current.dtfVisibility = THREE.MathUtils.lerp(start.dtfVisibility, destination.dtfVisibility, t);
        current.distance = THREE.MathUtils.lerp(start.distance, destination.distance, t);
        xerxes.group.position.copy(current.xerxesPosition);
        dtf.group.position.copy(current.dtfPosition);
        xerxes.group.scale.setScalar(current.xerxesVisibility);
        dtf.group.scale.setScalar(current.dtfVisibility);
        xerxes.group.visible = current.xerxesVisibility > HIDDEN_SCALE * 1.1;
        dtf.group.visible = current.dtfVisibility > HIDDEN_SCALE * 1.1;

        // Preserve the user's azimuth/polar angle while tweening target/radius.
        cameraOffset.copy(camera.position).sub(orbit.target);
        cameraOffset.setLength(current.distance * framingFactor);
        orbit.target.copy(current.target);
        camera.position.copy(orbit.target).add(cameraOffset);
        orbit.autoRotate = !reducedMotion && !interacting && time > pauseUntil;
        orbit.update(delta);
        if (!reducedMotion) animationTime += delta;
        pulseMaterials.forEach(material => {
          material.uniforms.uTime.value = animationTime;
        });
        activeRenderer.render(scene, camera);
        if (isActive()) frameId = requestAnimationFrame(render);
      }

      function resize() {
        const bounds = host!.getBoundingClientRect();
        width = Math.round(bounds.width);
        height = Math.round(bounds.height);
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          // The narrow dimension must still contain the complete campus.
          framingFactor = Math.max(1, 1 / camera.aspect);
          camera.far = Math.max(150, 70 * framingFactor);
          camera.updateProjectionMatrix();
          activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          activeRenderer.setSize(width, height, false);
        }
        updateLoopState();
      }

      const onStart = () => {
        interacting = true;
        orbit.autoRotate = false;
      };
      const onEnd = () => {
        interacting = false;
        pauseUntil = performance.now() + 2500;
      };
      orbit.addEventListener("start", onStart);
      orbit.addEventListener("end", onEnd);
      cleanups.push(() => {
        orbit.removeEventListener("start", onStart);
        orbit.removeEventListener("end", onEnd);
      });

      const onMotionChange = (event: MediaQueryListEvent) => {
        reducedMotion = event.matches;
        orbit.enableDamping = !reducedMotion;
        orbit.autoRotate = false;
        updateLoopState();
      };
      motionPreference.addEventListener("change", onMotionChange);
      cleanups.push(() => motionPreference.removeEventListener("change", onMotionChange));

      const onVisibilityChange = () => {
        documentVisible = document.visibilityState === "visible";
        updateLoopState();
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVisibilityChange));

      if (typeof IntersectionObserver !== "undefined") {
        const intersectionObserver = new IntersectionObserver(
          entries => {
            onScreen = entries.some(entry => entry.isIntersecting);
            updateLoopState();
          },
          { threshold: 0 }
        );
        intersectionObserver.observe(host);
        cleanups.push(() => intersectionObserver.disconnect());
      }
      if (typeof ResizeObserver !== "undefined") {
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        cleanups.push(() => resizeObserver.disconnect());
      } else {
        window.addEventListener("resize", resize);
        cleanups.push(() => window.removeEventListener("resize", resize));
      }
      const onContextLost = (event: Event) => {
        event.preventDefault();
        reportUnsupported();
      };
      canvas.addEventListener("webglcontextlost", onContextLost);
      cleanups.push(() => canvas.removeEventListener("webglcontextlost", onContextLost));
      resize();
    } catch {
      reportUnsupported();
    }
    return cleanup;
  }, []);

  if (unsupported) return null;
  return (
    <div
      ref={hostRef}
      className={props.className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
