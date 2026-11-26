import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STOPS, Stop, V3, ZONES } from "@/lib/walkthrough";

/** Portrait screens (phones) can swap in a different camera pose where the landscape one cannot fit the subject. */
let portrait = false;
const S = (i: number): Stop => {
  const s = STOPS[i];
  return portrait && s.portrait ? { ...s, ...s.portrait } : s;
};
import { podSection } from "./hub";
import { buildWorld, FOG_OUT, World } from "./world";

export type Mode = "guided" | "explore";

export type EngineOpts = {
  host: HTMLElement;
  hotspotLayer: HTMLElement | null;
  lowPower: boolean;
  reduced: boolean;
  still: boolean; // QA / screenshot: no autoplay, no adaptive quality
  startStop: number;
  onReady: () => void;
  onFail: (why: string) => void;
  onStop: (i: number) => void;
  onArrive: (i: number) => void;
  onZone: (name: string) => void;
  onDepth: (km: number | null) => void;
  onPose: (x: number, z: number, yaw: number, y: number) => void;
  onEnd: () => void;
};

export type Engine = {
  goTo: (i: number, instant?: boolean) => void;
  next: () => void;
  prev: () => void;
  setMode: (m: Mode) => void;
  setPlaying: (p: boolean) => void;
  refreshHotspots: () => void;
  dispose: () => void;
};

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

type Leg = {
  to: number;
  pos: THREE.Curve<THREE.Vector3>;
  look: THREE.Curve<THREE.Vector3>;
  dur: number;
  t: number;
  cut: boolean;
  fade: number; // 0..1 progress of the fade-out half (cut legs)
  jumped: boolean;
};

function curveOf(pts: V3[]): THREE.Curve<THREE.Vector3> {
  if (pts.length < 2 || pts.every(p => p[0] === pts[0][0] && p[1] === pts[0][1] && p[2] === pts[0][2])) {
    const p = v3(pts[0]);
    return new THREE.LineCurve3(p, p.clone().add(new THREE.Vector3(0.0001, 0, 0)));
  }
  return new THREE.CatmullRomCurve3(pts.map(v3), false, "centripetal", 0.5);
}

/** Build the camera/look paths for a leg between two stops. */
function planLeg(from: number, to: number, reduced: boolean): Leg {
  const adj = Math.abs(to - from) === 1;
  const fwd = to > from;
  const target = S(to);
  let cut = !adj || reduced;
  let posPts: V3[];
  let lookPts: V3[];
  if (adj && fwd) {
    cut = cut || !!target.cut;
    const via = target.via ?? [];
    posPts = target.cut ? [...via.map(w => w.p), target.cam] : [S(from).cam, ...via.map(w => w.p), target.cam];
    lookPts = target.cut ? [...via.map(w => w.l), target.look] : [S(from).look, ...via.map(w => w.l), target.look];
  } else if (adj && !fwd) {
    const src = S(from);
    cut = cut || !!src.cut;
    const via = src.via ?? [];
    posPts = src.cut ? [target.cam] : [src.cam, ...[...via].reverse().map(w => w.p), target.cam];
    lookPts = src.cut ? [target.look] : [src.look, ...[...via].reverse().map(w => w.l), target.look];
  } else {
    posPts = [target.cam];
    lookPts = [target.look];
  }
  const pos = curveOf(posPts);
  const look = curveOf(lookPts);
  const len = pos.getLength();
  const dur = reduced ? 0 : Math.min(11, Math.max(3.4, len / 24));
  return { to, pos, look, dur: cut && posPts.length < 2 ? 0 : dur, t: 0, cut, fade: 0, jumped: false };
}

export function createEngine(o: EngineOpts): Engine | null {
  const { host } = o;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !o.lowPower, alpha: false, powerPreference: o.lowPower ? "low-power" : "high-performance" });
  } catch {
    o.onFail("webgl");
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor("#05060a", 1);
  const canvas = renderer.domElement;
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block", touchAction: "none" });
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const fade = document.createElement("div");
  Object.assign(fade.style, { position: "absolute", inset: "0", background: "#000", opacity: "1", pointerEvents: "none", transition: "none", zIndex: "2" });
  host.appendChild(fade);

  let disposed = false;
  let world: World | null = null;
  let composer: EffectComposer | undefined;
  let bloom: UnrealBloomPass | undefined;
  let hasSize = false;
  let dpr = Math.min(window.devicePixelRatio || 1, o.lowPower ? 1 : 1.5);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 7000);
  const lights: THREE.PointLight[] = [];
  const lightTarget: { p: THREE.Vector3; c: THREE.Color; k: number }[] = [];
  let sun: THREE.DirectionalLight;
  let hemi: THREE.HemisphereLight;
  let fog: THREE.FogExp2;

  // state
  let mode: Mode = "guided";
  let stopIdx = Math.max(0, Math.min(STOPS.length - 1, o.startStop));
  let leg: Leg | null = null;
  let dwell = 0;
  let playing = false;
  let elapsed = 0;
  let inside = 0; // 0 outside .. 1 inside
  let underFactor = 0;
  let yawOff = 0;
  let pitchOff = 0;
  let dragging = false;
  let lastPtr = { x: 0, y: 0 };
  const ex = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  const keys = new Set<string>();
  let hsEls: HTMLElement[] = [];
  let hsVisible = false;
  let poseT = 0;
  let lastZone = "";
  let lastDepth: number | null | undefined;
  let frame = 0;
  let lastTime = performance.now();
  let slow = 0;
  let fadeValue = 1;

  const setFade = (v: number) => {
    fadeValue = v;
    fade.style.opacity = String(Math.max(0, Math.min(1, v)));
  };

  const curPos = new THREE.Vector3();
  const curLook = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpC = new THREE.Vector3();

  const placeAtStop = (i: number) => {
    curPos.set(...S(i).cam);
    curLook.set(...S(i).look);
  };

  let viewW = 1;
  let viewH = 1;
  let baseFov = 58;
  const fovFor = (i: number) => (camera.aspect >= 1.2 ? STOPS[i].fov ?? baseFov : S(i).portrait ? STOPS[i].portrait?.fov ?? baseFov : baseFov);
  let offsetOn = 0; // 0..1: shifts the picture right so it sits beside the narration panel
  function applyOffset() {
    const dx = viewW >= 900 && mode === "guided" ? Math.round(-viewW * 0.085 * offsetOn) : 0;
    if (dx !== 0) camera.setViewOffset(viewW, viewH, dx, 0, viewW, viewH);
    else camera.clearViewOffset();
  }

  function resize() {
    if (disposed) return;
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    hasSize = r.width > 0 && r.height > 0;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.9;
    baseFov = camera.aspect < 0.8 ? 72 : camera.aspect < 1.2 ? 64 : 58;
    camera.fov = fovFor(stopIdx);
    viewW = w;
    viewH = h;
    applyOffset();
    camera.updateProjectionMatrix();
    composer?.setPixelRatio(dpr);
    composer?.setSize(w, h);
  }

  function updateLights(dt: number) {
    if (!world) return;
    const pool = underFactor > 0.5 ? world.underAnchors : world.anchors;
    const p = camera.position;
    const scored = pool
      .map(a => ({ a, d: a.p.distanceToSquared(p) / (0.5 + a.k * 0.5) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, lights.length);
    scored.forEach((s, i) => {
      lightTarget[i].p.copy(s.a.p);
      lightTarget[i].c.copy(s.a.c);
      lightTarget[i].k = s.a.k;
    });
    const k = 1 - Math.exp(-dt * 3.5);
    lights.forEach((l, i) => {
      const t = lightTarget[i];
      if (i >= scored.length) {
        l.intensity *= 1 - k;
        return;
      }
      l.position.lerp(t.p, k);
      l.color.lerp(t.c, k);
      const want = t.k * (underFactor > 0.5 ? 900 : 260 - inside * 110);
      l.intensity += (want - l.intensity) * k;
    });
  }

  function setLooks(dt: number) {
    // outside/inside/under blend
    const p = camera.position;
    let ins = 0;
    if (p.y > -0.5) {
      const hubR = Math.hypot(p.x, p.z);
      if (hubR < 35 && p.y < 14.5) ins = 1;
      else if (Math.abs(p.x) < 4.6 && p.z > 30 && p.z < 64 && p.y < 7.5) ins = 1;
      else if (p.z > 58 && p.z < 252) {
        const s = podSection(p.z);
        if (Math.abs(p.x) < s.w - 0.4 && p.y < s.h - 0.3) ins = 1;
      }
    }
    const underWant = p.y < -1 ? 1 : 0;
    const kk = 1 - Math.exp(-dt * 5);
    inside += (ins - inside) * kk;
    underFactor += (underWant - underFactor) * Math.min(1, kk * 3);
    if (!world) return;
    const isUnder = p.y < -1;
    world.under.visible = isUnder;
    world.surface.visible = !isUnder;
    world.sky.visible = !isUnder;
    const out = 1 - inside;
    sun.intensity = isUnder ? 0 : 0.85 * out;
    hemi.intensity = isUnder ? 0.1 : 0.32 * out + 0.05 * inside;
    (world.scene as THREE.Scene).environmentIntensity = isUnder ? 0.16 : 0.3 * out + 0.13 * inside;
    const fc = new THREE.Color();
    if (isUnder) {
      fc.set("#150b07");
      fog.density = 0.0085;
    } else {
      fc.set(FOG_OUT).lerp(new THREE.Color("#0b0d13"), inside);
      fog.density = 0.0012 + inside * 0.0058;
    }
    fog.color.lerp(fc, 1 - Math.exp(-dt * 6));
    renderer.setClearColor(fog.color, 1);
    renderer.toneMappingExposure = isUnder ? 1.25 : 1.0 - inside * 0.12;
  }

  function startLeg(to: number, instant = false) {
    const from = stopIdx;
    const l = planLeg(from, to, o.reduced || instant);
    if (instant) {
      l.cut = true;
      l.dur = 0;
    }
    leg = l;
    hsVisible = false;
    setHotspotVis(false);
    stopIdx = to;
    dwell = 0;
    o.onStop(to);
    if (instant) {
      // place directly
      placeAtStop(to);
      leg = null;
      setFade(0);
      afterArrive();
    }
  }

  function afterArrive() {
    dwell = 0;
    hsVisible = true;
    setHotspotVis(true);
    o.onArrive(stopIdx);
  }

  function setHotspotVis(v: boolean) {
    hsEls.forEach(e => {
      e.style.opacity = v && mode === "guided" ? "1" : "0";
    });
  }

  function projectHotspots() {
    if (!hsEls.length) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    for (const el of hsEls) {
      if (!hsVisible || mode !== "guided") {
        el.style.visibility = "hidden";
        continue;
      }
      tmpC.set(parseFloat(el.dataset.x || "0"), parseFloat(el.dataset.y || "0"), parseFloat(el.dataset.z || "0")).project(camera);
      const vis = tmpC.z < 1 && Math.abs(tmpC.x) < 1.05 && Math.abs(tmpC.y) < 1.05;
      el.style.visibility = vis ? "visible" : "hidden";
      if (vis) {
        const px = ((tmpC.x + 1) / 2) * w;
        el.style.transform = `translate3d(${px}px, ${((1 - tmpC.y) / 2) * h}px, 0)`;
        const side = px < w * 0.28 ? "r" : px > w * 0.72 ? "l" : "c";
        if (el.dataset.side !== side) el.dataset.side = side;
      }
    }
  }

  function stepGuided(dt: number) {
    if (leg) {
      const l = leg;
      if (l.cut && !l.jumped) {
        // fade out, then jump to the start of the new path
        l.fade += dt / 0.45;
        setFade(Math.min(1, l.fade));
        if (l.fade >= 1) {
          l.jumped = true;
          l.t = 0;
          curPos.copy(l.pos.getPoint(0));
          curLook.copy(l.look.getPoint(0));
        } else return;
      }
      if (l.dur <= 0) {
        placeAtStop(l.to);
        leg = null;
        setFade(0);
        afterArrive();
        return;
      }
      l.t += dt;
      const s = Math.min(1, l.t / l.dur);
      const u = ease(s);
      l.pos.getPoint(u, curPos);
      l.look.getPoint(u, curLook);
      if (l.cut) setFade(Math.max(0, 1 - l.t / 0.7));
      if (s >= 1) {
        leg = null;
        afterArrive();
      }
      return;
    }
    dwell += dt;
    if (playing && dwell > STOPS[stopIdx].dwell && !o.still) {
      if (stopIdx < STOPS.length - 1) startLeg(stopIdx + 1);
      else {
        playing = false;
        o.onEnd();
      }
    }
  }

  function stepExplore(dt: number) {
    const sprint = keys.has("shift") ? 3.2 : 1;
    const sp = 8 * sprint * dt;
    const f = tmpA.set(-Math.sin(ex.yaw), 0, -Math.cos(ex.yaw));
    const r = tmpB.set(Math.cos(ex.yaw), 0, -Math.sin(ex.yaw));
    if (keys.has("w") || keys.has("arrowup")) ex.pos.addScaledVector(f, sp);
    if (keys.has("s") || keys.has("arrowdown")) ex.pos.addScaledVector(f, -sp);
    if (keys.has("d") || keys.has("arrowright")) ex.pos.addScaledVector(r, sp);
    if (keys.has("a") || keys.has("arrowleft")) ex.pos.addScaledVector(r, -sp);
    if (keys.has(" ") || keys.has("e")) ex.pos.y += sp;
    if (keys.has("c") || keys.has("q")) ex.pos.y -= sp;
    const under = ex.pos.y < -1;
    ex.pos.x = Math.max(-900, Math.min(900, ex.pos.x));
    ex.pos.z = Math.max(-900, Math.min(900, ex.pos.z));
    ex.pos.y = under ? Math.max(-212, Math.min(-1.2, ex.pos.y)) : Math.max(1.0, Math.min(520, ex.pos.y));
    curPos.copy(ex.pos);
    curLook.copy(ex.pos).add(tmpA.set(-Math.sin(ex.yaw) * Math.cos(ex.pitch), Math.sin(ex.pitch), -Math.cos(ex.yaw) * Math.cos(ex.pitch)));
  }

  function render(dt: number) {
    elapsed += dt;
    if (mode === "guided") stepGuided(dt);
    else stepExplore(dt);

    const wantFov = mode === "guided" ? fovFor(stopIdx) : baseFov;
    if (Math.abs(camera.fov - wantFov) > 0.05) {
      camera.fov += (wantFov - camera.fov) * (1 - Math.exp(-dt * 2.2));
      camera.updateProjectionMatrix();
    }
    const wantOff = mode === "guided" ? 1 : 0;
    if (Math.abs(offsetOn - wantOff) > 0.002) {
      offsetOn += (wantOff - offsetOn) * (1 - Math.exp(-dt * 3));
      applyOffset();
      camera.updateProjectionMatrix();
    }
    camera.position.copy(curPos);
    if (mode === "guided" && !leg) {
      camera.position.x += Math.sin(elapsed * 0.31) * 0.28;
      camera.position.y += Math.sin(elapsed * 0.23) * 0.1;
      camera.position.z += Math.cos(elapsed * 0.27) * 0.22;
    }
    camera.lookAt(curLook);
    if (mode === "guided") {
      if (!dragging) {
        const d = Math.exp(-dt * 1.6);
        yawOff *= d;
        pitchOff *= d;
      }
      camera.rotateOnWorldAxis(tmpA.set(0, 1, 0), yawOff);
      camera.rotateX(pitchOff);
    }
    camera.updateMatrixWorld();

    setLooks(dt);
    updateLights(dt);
    world?.update(elapsed, dt, camera);

    if (composer && !o.lowPower) composer.render(dt);
    else renderer.render(world!.scene, camera);
    projectHotspots();

    // callbacks, throttled
    poseT += dt;
    if (poseT > 0.09) {
      poseT = 0;
      const dirv = tmpA.set(0, 0, -1).applyQuaternion(camera.quaternion);
      o.onPose(camera.position.x, camera.position.z, Math.atan2(dirv.x, -dirv.z), camera.position.y);
      let zone = "Campus";
      for (const z of ZONES) {
        if (z.test(camera.position.x, camera.position.y, camera.position.z)) {
          zone = z.name;
          break;
        }
      }
      if (zone !== lastZone) {
        lastZone = zone;
        o.onZone(zone);
      }
      const depth = camera.position.y < -1 ? -camera.position.y / 40 : null;
      if (depth !== lastDepth && (depth === null || lastDepth == null || Math.abs((depth ?? 0) - (lastDepth ?? 0)) > 0.02)) {
        lastDepth = depth;
        o.onDepth(depth);
      }
    }
  }

  function loop() {
    if (disposed) return;
    frame = requestAnimationFrame(loop);
    const now = performance.now();
    const raw = (now - lastTime) / 1000;
    lastTime = now;
    if (document.hidden || !hasSize || !world) return;
    const dt = Math.min(0.05, raw);
    render(dt);
    // adaptive quality (not during QA stills)
    if (!o.still) {
      slow = raw > 0.04 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 50) {
        slow = 0;
        if (dpr > 0.8) {
          dpr = Math.max(0.75, dpr - 0.25);
          resize();
        } else if (bloom && composer) {
          composer.removePass(bloom);
          bloom = undefined;
        }
      }
    }
  }

  // input
  const onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-ui]")) return;
    dragging = true;
    lastPtr = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPtr.x;
    const dy = e.clientY - lastPtr.y;
    lastPtr = { x: e.clientX, y: e.clientY };
    if (mode === "explore") {
      ex.yaw -= dx * 0.0045;
      ex.pitch = Math.max(-1.4, Math.min(1.4, ex.pitch - dy * 0.0038));
    } else {
      yawOff = Math.max(-0.7, Math.min(0.7, yawOff + dx * 0.0035));
      pitchOff = Math.max(-0.45, Math.min(0.45, pitchOff + dy * 0.003));
    }
  };
  const onUp = () => {
    dragging = false;
  };
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (e.type === "keydown") {
      if (["w", "a", "s", "d", "q", "e", "c", " ", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) && mode === "explore") {
        keys.add(k);
        if (k === " " || k.startsWith("arrow")) e.preventDefault();
      }
    } else keys.delete(k);
  };
  const onBlur = () => keys.clear();
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", onBlur);
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const onLost = (e: Event) => {
    e.preventDefault();
    o.onFail("context");
  };
  canvas.addEventListener("webglcontextlost", onLost);
  renderer.debug.onShaderError = () => queueMicrotask(() => o.onFail("shader"));

  // build the world after a frame so the intro can paint first
  const buildTimer = window.setTimeout(() => {
    if (disposed) return;
    try {
      world = buildWorld(o.lowPower);
      const pm = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const envTex = pm.fromScene(room, 0.04).texture;
      world.scene.environment = envTex;
      room.dispose();
      pm.dispose();
      fog = new THREE.FogExp2(FOG_OUT, 0.0011);
      world.scene.fog = fog;
      hemi = new THREE.HemisphereLight("#8f9bb8", "#2b2320", 0.32);
      sun = new THREE.DirectionalLight("#ffc9a0", 0.85);
      sun.position.set(-260, 300, -140);
      world.scene.add(hemi, sun);
      const nLights = o.lowPower ? 3 : 5;
      for (let i = 0; i < nLights; i += 1) {
        const l = new THREE.PointLight("#ffffff", 0, 95, 1.6);
        world.scene.add(l);
        lights.push(l);
        lightTarget.push({ p: new THREE.Vector3(), c: new THREE.Color("#ffffff"), k: 1 });
      }
      if (!o.lowPower) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(world.scene, camera));
        bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.55, 0.9);
        composer.addPass(bloom);
        composer.addPass(new OutputPass());
      }
      resize();
      placeAtStop(stopIdx);
      camera.position.copy(curPos);
      camera.lookAt(curLook);
      o.onReady();
      // warm the first frames then reveal
      o.onStop(stopIdx);
      render(0.016);
      window.setTimeout(() => {
        if (disposed) return;
        if (o.still) {
          offsetOn = 1;
          applyOffset();
          camera.updateProjectionMatrix();
        } else fade.style.transition = "opacity 0.9s ease";
        setFade(0);
        afterArrive();
        host.dataset.ready = "1";
      }, 60);
    } catch (err) {
      console.error(err);
      o.onFail("build");
    }
  }, 40);
  frame = requestAnimationFrame(loop);

  return {
    goTo: (i, instant = false) => {
      if (!world) return;
      const t = Math.max(0, Math.min(STOPS.length - 1, i));
      if (mode === "explore") {
        stopIdx = t;
        ex.pos.set(...S(t).cam);
        const d = tmpA.set(...S(t).look).sub(tmpB.set(...S(t).cam));
        ex.yaw = Math.atan2(-d.x, -d.z);
        ex.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
        o.onStop(t);
        return;
      }
      if (t === stopIdx && !leg) return;
      startLeg(t, instant);
    },
    next: () => {
      if (stopIdx < STOPS.length - 1) startLeg(stopIdx + 1);
    },
    prev: () => {
      if (stopIdx > 0) startLeg(stopIdx - 1);
    },
    setMode: m => {
      if (m === mode) return;
      mode = m;
      keys.clear();
      if (m === "explore") {
        leg = null;
        setFade(0);
        ex.pos.copy(camera.position);
        const d = tmpA.set(0, 0, -1).applyQuaternion(camera.quaternion);
        ex.yaw = Math.atan2(-d.x, -d.z);
        ex.pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
        playing = false;
        setHotspotVis(false);
      } else {
        yawOff = pitchOff = 0;
        startLeg(stopIdx, true);
      }
    },
    setPlaying: p => {
      playing = p && mode === "guided";
      if (playing && !leg) dwell = Math.max(dwell, STOPS[stopIdx].dwell - 2);
    },
    refreshHotspots: () => {
      hsEls = o.hotspotLayer ? Array.from(o.hotspotLayer.querySelectorAll<HTMLElement>("[data-hs]")) : [];
      setHotspotVis(hsVisible);
    },
    dispose: () => {
      disposed = true;
      window.clearTimeout(buildTimer);
      cancelAnimationFrame(frame);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      composer?.passes.forEach(p => (p as { dispose?: () => void }).dispose?.());
      composer?.dispose();
      world?.dispose();
      world?.scene.environment?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      fade.remove();
    },
  };
}

export type { Stop };
