import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type V3 = [number, number, number];
export type Tick = (t: number, dt: number, cam: THREE.PerspectiveCamera) => void;

export const COL = {
  magma: "#ff5a1f",
  amber: "#ffb347",
  led: "#3d8bff",
  ledHi: "#7cc4ff",
  cyan: "#3fd6ee",
  green: "#5be39a",
  ice: "#cfe9ff",
  warm: "#ffd9b0",
};

export type FlowOpts = {
  color: string;
  r?: number; // tube radius (m)
  spacing?: number; // metres between pulses
  speed?: number; // metres per second
  dir?: 1 | -1;
  base?: number; // base glow 0..1
  width?: number; // pulse width fraction
  alpha?: number;
  seg?: number; // tubular segments per metre (min 8)
  radial?: number;
};

class CircleCurve extends THREE.Curve<THREE.Vector3> {
  /** angle 0 = +z, increasing toward +x (same convention as Cylinder/Lathe geometry) */
  constructor(
    public radius: number,
    public y: number,
    public cw = 1,
    public cx = 0,
    public cz = 0,
    public a0 = 0,
    public a1 = Math.PI * 2
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const u = this.cw >= 0 ? t : 1 - t;
    const a = this.a0 + (this.a1 - this.a0) * u;
    return target.set(this.cx + Math.sin(a) * this.radius, this.y, this.cz + Math.cos(a) * this.radius);
  }
}
export { CircleCurve };

/** Polyline with rounded corners as a CurvePath, good for pipework. */
export function roundedPath(points: V3[], radius = 0.6): THREE.CurvePath<THREE.Vector3> {
  const pts = points.map(p => new THREE.Vector3(...p));
  const path = new THREE.CurvePath<THREE.Vector3>();
  if (pts.length < 3) {
    path.add(new THREE.LineCurve3(pts[0], pts[pts.length - 1]));
    return path;
  }
  let cursor = pts[0].clone();
  for (let i = 1; i < pts.length - 1; i += 1) {
    const prev = pts[i - 1];
    const p = pts[i];
    const next = pts[i + 1];
    const a = p.clone().sub(prev);
    const b = next.clone().sub(p);
    const ra = Math.min(radius, a.length() / 2 - 0.001);
    const rb = Math.min(radius, b.length() / 2 - 0.001);
    const start = p.clone().sub(a.clone().normalize().multiplyScalar(ra));
    const end = p.clone().add(b.clone().normalize().multiplyScalar(rb));
    if (cursor.distanceTo(start) > 1e-4) path.add(new THREE.LineCurve3(cursor.clone(), start));
    path.add(new THREE.QuadraticBezierCurve3(start, p.clone(), end));
    cursor = end;
  }
  path.add(new THREE.LineCurve3(cursor.clone(), pts[pts.length - 1]));
  return path;
}

export class Kit {
  lowPower: boolean;
  ticks: Tick[] = [];
  private flowMats = new Map<string, THREE.ShaderMaterial>();
  private flowGeos = new Map<string, THREE.BufferGeometry[]>();
  private emitMats = new Map<string, THREE.MeshBasicMaterial>();
  private disposables: { dispose(): void }[] = [];
  steel: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  graphite: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshPhysicalMaterial;
  copper: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  floorTex: THREE.CanvasTexture;
  hexTex: THREE.CanvasTexture;
  hexTexInner: THREE.CanvasTexture;

  constructor(lowPower: boolean) {
    this.lowPower = lowPower;
    this.steel = this.track(new THREE.MeshStandardMaterial({ color: "#8a929d", metalness: 0.85, roughness: 0.38 }));
    this.darkSteel = this.track(new THREE.MeshStandardMaterial({ color: "#2b3039", metalness: 0.8, roughness: 0.42 }));
    this.graphite = this.track(new THREE.MeshStandardMaterial({ color: "#171b22", metalness: 0.55, roughness: 0.5 }));
    this.ceramic = this.track(
      new THREE.MeshPhysicalMaterial({ color: "#efece6", roughness: 0.42, metalness: 0.03, clearcoat: 0.3, clearcoatRoughness: 0.3 })
    );
    this.copper = this.track(new THREE.MeshStandardMaterial({ color: "#c27a42", metalness: 1, roughness: 0.32 }));
    this.glass = this.track(
      new THREE.MeshPhysicalMaterial({
        color: "#a8c8ea",
        transparent: true,
        opacity: 0.13,
        roughness: 0.06,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 0.35,
      })
    );
    this.floorTex = this.track(makeGridTexture());
    this.hexTex = this.track(makeHexTexture());
    this.hexTexInner = this.track(makeHexTexture("rgba(120,170,235,0.38)", 2.6));
  }

  track<T extends { dispose(): void }>(o: T): T {
    this.disposables.push(o);
    return o;
  }

  emit(color: string, k = 1.6) {
    const key = `${color}|${k}`;
    let m = this.emitMats.get(key);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
      this.emitMats.set(key, m);
      this.disposables.push(m);
    }
    return m;
  }

  glow(color: string, opacity = 0.6) {
    return this.track(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
  }

  std(color: string, metalness = 0.6, roughness = 0.45) {
    return this.track(new THREE.MeshStandardMaterial({ color, metalness, roughness }));
  }

  /** Polished dark floor with a faint tile grid; `tile` is the tile edge in metres. */
  floorMaterial(tile = 6, uvSpan = 1, color = "#2c323d") {
    const tex = this.track(this.floorTex.clone());
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(uvSpan / tile, uvSpan / tile);
    return this.track(new THREE.MeshStandardMaterial({ color, map: tex, metalness: 0.45, roughness: 0.42 }));
  }

  box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    this.disposables.push(m.geometry);
    m.position.set(x, y, z);
    parent?.add(m);
    return m;
  }

  cyl(rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D, seg = 28) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, this.lowPower ? Math.min(seg, 18) : seg), mat);
    this.disposables.push(m.geometry);
    m.position.set(x, y, z);
    parent?.add(m);
    return m;
  }

  /** Horizontal cylinder along Z (or X when axis = "x"). */
  hcyl(r: number, len: number, mat: THREE.Material, x: number, y: number, z: number, axis: "z" | "x" = "z", parent?: THREE.Object3D) {
    const m = this.cyl(r, r, len, mat, x, y, z, parent);
    if (axis === "z") m.rotation.x = Math.PI / 2;
    else m.rotation.z = Math.PI / 2;
    return m;
  }

  flowMat(o: FlowOpts) {
    const key = [o.color, o.spacing ?? 3, o.speed ?? 3, o.dir ?? 1, o.base ?? 0.4, o.width ?? 0.16, o.alpha ?? 1].join("|");
    let m = this.flowMats.get(key);
    if (m) return m;
    m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(o.color) },
        uSpacing: { value: o.spacing ?? 3 },
        uSpeed: { value: (o.speed ?? 3) * (o.dir ?? 1) },
        uBase: { value: o.base ?? 0.4 },
        uWidth: { value: o.width ?? 0.16 },
        uAlpha: { value: o.alpha ?? 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: /* glsl */ `
        attribute float aLen;
        varying float vS;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vS = uv.x * aLen;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uSpacing, uSpeed, uBase, uWidth, uAlpha;
        uniform vec3 uColor;
        varying float vS;
        varying vec2 vUv;
        void main() {
          float x = fract((vS - uTime * uSpeed) / uSpacing);
          float d = abs(x - 0.5);
          float pulse = smoothstep(uWidth, 0.0, d);
          float rim = 0.55 + 0.45 * sin(vUv.y * 6.2831853 * 1.0 + 1.5707963);
          float a = (uBase + pulse * (1.0 - uBase)) * uAlpha * (0.6 + 0.4 * rim);
          vec3 c = uColor * (0.85 + pulse * 1.1);
          gl_FragColor = vec4(c, a);
          #include <colorspace_fragment>
        }
      `,
    });
    this.flowMats.set(key, m);
    this.disposables.push(m);
    this.ticks.push(t => {
      m!.uniforms.uTime.value = t;
    });
    return m;
  }

  /** Queue a glowing pulse tube along a curve (world coordinates). Call flush(parent) once at the end. */
  flow(path: THREE.Curve<THREE.Vector3> | V3[], o: FlowOpts, closed = false) {
    const curve = Array.isArray(path) ? new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(...p)), closed, "centripetal") : path;
    const len = curve.getLength();
    const segs = Math.max(10, Math.min(420, Math.round(len * (o.seg ?? (this.lowPower ? 0.6 : 1.1)))));
    const g = new THREE.TubeGeometry(curve, segs, o.r ?? 0.12, o.radial ?? (this.lowPower ? 5 : 7), closed);
    const n = g.getAttribute("position").count;
    g.setAttribute("aLen", new THREE.BufferAttribute(new Float32Array(n).fill(len), 1));
    const mat = this.flowMat(o);
    const key = [...this.flowMats.entries()].find(([, v]) => v === mat)?.[0] as string;
    const list = this.flowGeos.get(key) ?? [];
    list.push(g);
    this.flowGeos.set(key, list);
    return len;
  }

  /** Solid pipe body (physically shaded) along a path. */
  tubeBody(path: THREE.Curve<THREE.Vector3>, r: number, color: string, parent: THREE.Object3D, metalness = 0.85, roughness = 0.35) {
    const len = path.getLength();
    const segs = Math.max(8, Math.min(300, Math.round(len * 0.9)));
    const geo = new THREE.TubeGeometry(path, segs, r, this.lowPower ? 6 : 10, false);
    this.disposables.push(geo);
    const m = new THREE.Mesh(geo, this.std(color, metalness, roughness));
    parent.add(m);
    return m;
  }

  flush(parent: THREE.Object3D) {
    this.flowGeos.forEach((geos, key) => {
      const mat = this.flowMats.get(key)!;
      const merged = mergeGeometries(geos, false);
      geos.forEach(g => g.dispose());
      if (!merged) return;
      this.disposables.push(merged);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 4;
      parent.add(mesh);
    });
    this.flowGeos.clear();
  }

  /** Rack-face LED material: rows of blinking indicator lights, instanced. */
  ledMat(color: string, edge: string, rows = 24, rate = 1) {
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color).multiplyScalar(2.1) },
          uEdge: { value: new THREE.Color(edge).multiplyScalar(1.6) },
          uRows: { value: rows },
          uRate: { value: rate },
        },
      ]),
      fog: true,
      toneMapped: false,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        varying vec2 vUv;
        varying float vSeed;
        #include <fog_pars_vertex>
        void main() {
          vUv = uv;
          vSeed = aSeed;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uRows, uRate;
        uniform vec3 uColor, uEdge;
        varying vec2 vUv;
        varying float vSeed;
        #include <fog_pars_fragment>
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          vec2 g = vec2(vUv.x * 7.0, vUv.y * uRows);
          vec2 id = floor(g);
          vec2 f = fract(g);
          float r = h(id + vSeed * 31.0);
          float on = step(0.32, fract(r * 9.0 + uTime * uRate * (0.25 + r * 0.9)));
          float live = step(0.12, r);
          float d = length((f - 0.5) * vec2(1.0, 1.25));
          float led = smoothstep(0.32, 0.12, d) * on * live;
          float tray = step(0.1, f.y) * step(f.y, 0.9);
          vec3 base = vec3(0.020, 0.024, 0.032) + 0.014 * h(id + 3.7) + 0.02 * step(0.9, f.y);
          vec3 col = base + uColor * led * tray;
          col += uEdge * smoothstep(0.045, 0.0, abs(vUv.x - 0.035)) * 0.9;
          col += uEdge * 0.25 * smoothstep(0.02, 0.0, abs(vUv.y - 0.5)) * 0.0;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
    this.disposables.push(m);
    this.ticks.push(t => {
      m.uniforms.uTime.value = t;
    });
    return m;
  }

  /** Billboard text sign (canvas sprite). */
  sign(text: string, color = "#ffe6d2", glowColor = "rgba(255,120,60,0.8)", width = 4, accent = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      let px = accent ? 78 : 70;
      ctx.font = `600 ${px}px 'JetBrains Mono', ui-monospace, monospace`;
      const tw = ctx.measureText(text).width;
      if (tw > 590) {
        px = Math.floor((px * 590) / tw);
        ctx.font = `600 ${px}px 'JetBrains Mono', ui-monospace, monospace`;
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 22;
      ctx.fillStyle = color;
      ctx.fillText(text, 320, 84);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(tex);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
    this.disposables.push(mat);
    const s = new THREE.Sprite(mat);
    s.scale.set(width, width / 4, 1);
    s.renderOrder = 30;
    return s;
  }

  dust(count: number, min: V3, max: V3, size = 0.07, color = "#bcd3ff", opacity = 0.5) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = min[0] + Math.random() * (max[0] - min[0]);
      pos[i * 3 + 1] = min[1] + Math.random() * (max[1] - min[1]);
      pos[i * 3 + 2] = min[2] + Math.random() * (max[2] - min[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.disposables.push(g, m);
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    this.ticks.push(t => {
      p.position.y = Math.sin(t * 0.17) * 0.35;
      p.position.x = Math.cos(t * 0.11) * 0.3;
    });
    return p;
  }

  /** Instanced mesh from a list of transforms. */
  inst(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: { p: V3; r?: V3; s?: V3 }[],
    parent?: THREE.Object3D,
    seeds = false
  ) {
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const E = new THREE.Euler();
    const P = new THREE.Vector3();
    const S = new THREE.Vector3();
    items.forEach((it, i) => {
      P.set(...it.p);
      E.set(...(it.r ?? [0, 0, 0]));
      Q.setFromEuler(E);
      S.set(...(it.s ?? [1, 1, 1]));
      M.compose(P, Q, S);
      m.setMatrixAt(i, M);
    });
    m.instanceMatrix.needsUpdate = true;
    if (seeds) {
      const a = new Float32Array(items.length);
      for (let i = 0; i < a.length; i += 1) a[i] = Math.random();
      geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(a, 1));
    }
    this.disposables.push(geo);
    parent?.add(m);
    return m;
  }

  dispose() {
    this.disposables.forEach(d => {
      try {
        d.dispose();
      } catch {
        /* already disposed */
      }
    });
    this.disposables = [];
  }
}

export function makeGridTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "rgba(60,66,78,0.55)";
  x.lineWidth = 3;
  x.strokeRect(1.5, 1.5, 253, 253);
  x.strokeStyle = "rgba(60,66,78,0.18)";
  x.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    x.beginPath();
    x.moveTo((i * 256) / 4, 0);
    x.lineTo((i * 256) / 4, 256);
    x.moveTo(0, (i * 256) / 4);
    x.lineTo(256, (i * 256) / 4);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function makeHexTexture(stroke = "#2a2d33", lw = 2.4) {
  const canvas = document.createElement("canvas");
  const radius = 48;
  const rowHeight = Math.sqrt(3) * radius;
  canvas.width = radius * 1.5 * 8;
  canvas.height = Math.round(rowHeight * 8);
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  for (let column = -1; column <= 9; column += 1) {
    for (let row = -1; row <= 9; row += 1) {
      const x = column * radius * 1.5;
      const y = (row + (Math.abs(column % 2) ? 0.5 : 0)) * rowHeight;
      ctx.beginPath();
      for (let corner = 0; corner < 6; corner += 1) {
        const angle = (corner * Math.PI) / 3;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (corner === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export function makeNoiseTexture(base = "#0e0f12", speck = "#1a1b1f", n = 900) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = base;
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < n; i += 1) {
    x.fillStyle = speck;
    x.globalAlpha = 0.25 + Math.random() * 0.5;
    const s = 1 + Math.random() * 5;
    x.fillRect(Math.random() * 512, Math.random() * 512, s, s);
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Small deterministic PRNG so the world is identical on every load. */
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
