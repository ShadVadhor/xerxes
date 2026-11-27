/**
 * Shared 3D builders for the Xerxes campus and the DTF well pad. Used by the Models comparison
 * (CampusScene) and the AI GMS digital twin (TwinScene), so both always show the same geometry.
 */
import * as THREE from "three";
import { PAD, PAD_BRANCHES, branchProfile } from "@/lib/wellpad";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Campus = {
  group: THREE.Group;
  flows: THREE.ShaderMaterial[];
};

// This common conversion is the same in every mode. DTF is physically 55% of
// the corresponding Xerxes module; the comparison never scales either up.
export const WORLD_SCALE = 0.74;

export function ceramicMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: "#efece6",
    roughness: 0.45,
    metalness: 0.025,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
  });
}

export function makeHexTexture() {
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

export function makePod(hexTexture: THREE.CanvasTexture) {
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

export function makeBridge(length = 1.12) {
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

export function makeHub() {
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

export function makePlatform(radius: number) {
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


export function makeLabel(text: string) {
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

export type Branch = { curve: THREE.Curve<THREE.Vector3>; dir: number; phase: number; ghost?: boolean };

export function makeFlowMaterial(hot: string, cold: string, alpha = 1, speed = 0.13) {
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

export function mergeTubes(branches: Branch[], radius: number, tubular: number, radial: number, tint?: (b: Branch) => THREE.Color) {
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

export function makeHalo(branches: Branch[], radius: number, opacity: number) {
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

export function glowMaterial(color: string, opacity = 0.7) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

/**
 * The client's well pad, drawn underground: a short copper conductor casing, a ring of ten slots at its foot,
 * a fountain of ten branches that peel off the bundle (outer ones flare wide and stop shallower, inner ones run
 * deepest), a motherbore probe down the middle and a teal hot zone at the bottom.
 * `ghostReserve` shows the six reserve slots as sealed gold caps with dashed "planned" branches (4 → 10).
 */
export function makePadUnder(
  wells: THREE.Vector3[],
  o: { depth: number; reach: number; casingR: number; tube: number; ghostReserve: boolean },
) {
  const group = new THREE.Group();
  const branches: Branch[] = [];
  const kick = -o.depth * PAD.casing;
  const ringR = o.casingR * 2.1;
  const gold = new THREE.Color("#e9b949");
  const hot = new THREE.Color("#ff5a1f");
  const cold = new THREE.Color("#3d8bff");

  const casing = new THREE.InstancedMesh(new THREE.CylinderGeometry(o.casingR, o.casingR, -kick, 18, 1, true), glowMaterial("#c8773a", 0.6), wells.length);
  const collars = new THREE.InstancedMesh(new THREE.TorusGeometry(o.casingR * 1.1, o.casingR * 0.13, 6, 20), glowMaterial("#e0904a", 0.9), wells.length * 4);
  const ring = new THREE.InstancedMesh(new THREE.TorusGeometry(ringR, o.casingR * 0.14, 6, 36), glowMaterial("#e9b949", 0.85), wells.length);
  const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(o.casingR * 0.34, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), wells.length * PAD.branches);
  const probeY = -o.depth * 0.955;
  const probe = new THREE.InstancedMesh(new THREE.CylinderGeometry(o.casingR * 0.1, o.casingR * 0.1, probeY - kick, 8, 1, true), glowMaterial("#46e3ff", 0.75), wells.length);
  const probeNode = new THREE.InstancedMesh(new THREE.SphereGeometry(o.casingR * 0.5, 14, 10), glowMaterial("#c8f6ff", 0.95), wells.length);
  const hotRings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1, 0.006, 6, 64),
    new THREE.MeshBasicMaterial({ color: "#2fd0c0", transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    wells.length * 3,
  );
  const t = new THREE.Object3D();
  const set = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, rx = 0, sx = 1, sy = 1, sz = 1) => {
    t.position.set(x, y, z);
    t.rotation.set(rx, 0, 0);
    t.scale.set(sx, sy, sz);
    t.updateMatrix();
    mesh.setMatrixAt(i, t.matrix);
  };

  wells.forEach((well, wi) => {
    set(casing, wi, well.x, kick / 2, well.z);
    for (let c = 0; c < 4; c += 1) set(collars, wi * 4 + c, well.x, kick * (0.1 + c * 0.27), well.z, Math.PI / 2);
    set(ring, wi, well.x, kick, well.z, Math.PI / 2);
    set(probe, wi, well.x, (kick + probeY) / 2, well.z);
    set(probeNode, wi, well.x, probeY, well.z);
    [0.9, 1.7, 2.7].forEach((k, r) => set(hotRings, wi * 3 + r, well.x, probeY + 0.03, well.z, Math.PI / 2, o.reach * k * 0.5, o.reach * k * 0.5, 1));

    PAD_BRANCHES.forEach(b => {
      const open = !o.ghostReserve || b.initial;
      const tipY = -o.depth * b.tip;
      const pts = branchProfile(b, 22).map(([u, s]) => {
        const lateral = ringR * 0.9 + u * b.reach * o.reach;
        return new THREE.Vector3(well.x + Math.cos(b.az) * lateral, kick + s * (tipY - kick), well.z + Math.sin(b.az) * lateral);
      });
      branches.push({
        curve: new THREE.CatmullRomCurve3(pts, false, "centripetal"),
        dir: b.role === "production" ? -1 : 1,
        phase: ((wi * 10 + b.rank) * 0.6180339) % 1,
        ghost: !open,
      });
      const slot = new THREE.Vector3(well.x + Math.cos(b.az) * ringR, kick, well.z + Math.sin(b.az) * ringR);
      set(caps, wi * PAD.branches + b.rank, slot.x, slot.y, slot.z);
      caps.setColorAt(wi * PAD.branches + b.rank, open ? (b.role === "production" ? hot : cold) : gold);
    });
  });
  [casing, collars, ring, caps, probe, probeNode, hotRings].forEach(mesh => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
  });
  if (caps.instanceColor) caps.instanceColor.needsUpdate = true;

  const material = makeFlowMaterial("#ff5a1f", "#3d8bff", 1);
  const flow = new THREE.Mesh(mergeTubes(branches, o.tube, 56, 5), material);
  flow.frustumCulled = false;
  group.add(flow, makeHalo(branches.filter(b => !b.ghost), o.tube * 2.3, 0.07), casing, collars, ring, caps, probe, probeNode, hotRings);
  return { group, material };
}

/* ---------------------------------------------------------------------------------------------
 * Xerxes: hub + six pods, two wells under every pod, ten branches per well = 120.
 * ------------------------------------------------------------------------------------------- */

export const POD_RADIUS = 4.45;
export const WELL_SPAN = 0.95; // half the distance between a pod's two wells (pre-scale units)

export function makeXerxesField() {
  const group = new THREE.Group();
  const wells: THREE.Vector3[] = [];
  const dimension: { a: THREE.Vector3; b: THREE.Vector3 } = { a: new THREE.Vector3(), b: new THREE.Vector3() };

  for (let pod = 0; pod < 6; pod += 1) {
    const angle = (pod * Math.PI * 2) / 6;
    for (const side of [-1, 1]) {
      const radial = POD_RADIUS + side * WELL_SPAN;
      const well = new THREE.Vector3(Math.cos(angle) * radial, 0, Math.sin(angle) * radial);
      wells.push(well);
      if (pod === 1) (side < 0 ? dimension.a : dimension.b).copy(well);
    }
  }

  // Twelve well pads, each with its casing, ring of ten slots, ten fountain branches and motherbore probe.
  const under = makePadUnder(wells, { depth: 3.7, reach: 1.9, casingR: 0.05, tube: 0.021, ghostReserve: false });
  const material = under.material;
  group.add(under.group);

  // "50 m" dimension between the two wells of the featured pod.
  const dim = new THREE.Group();
  const y = -0.2;
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
export function makeColdStreaks() {
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

export function buildXerxes(): Campus {
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
 * and one re-entered well: a ring of ten slots, ten branches (six production, four injection) and a motherbore probe down the middle.
 * ------------------------------------------------------------------------------------------- */

export const PAD_TOP = 0.07;

export function makeDtf(): Campus {
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

  // Underground: one re-entered well on the same API. Four branches are open; six reserve slots stay sealed
  // (gold caps, dashed "planned" branches) until the pad grows from 4 to 10, each one deeper into hotter rock.
  const dtfWell = new THREE.Vector3(wx, 0, wz);
  const under = makePadUnder([dtfWell], { depth: 3.1, reach: 1.45, casingR: 0.058, tube: 0.026, ghostReserve: true });
  const material = under.material;
  content.add(under.group);

  return { group, flows: [material] };
}

export function disposeScene(scene: THREE.Scene) {
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
