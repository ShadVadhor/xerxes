import * as THREE from "three";
import { Kit, makeNoiseTexture, rng } from "./kit";
import { Anchor, buildCampusShells, buildCorridor, buildHub, podShellGeometry } from "./hub";
import { buildCooling, buildEnergy, buildHall, buildPodShell, buildStorage, buildVault } from "./pod";
import { buildDac, buildRoof, buildUnder, buildYard } from "./site";

export type World = {
  scene: THREE.Scene;
  surface: THREE.Group;
  under: THREE.Group;
  sky: THREE.Mesh;
  anchors: Anchor[];
  underAnchors: Anchor[];
  kit: Kit;
  update: (t: number, dt: number, cam: THREE.PerspectiveCamera) => void;
  dispose: () => void;
};

export const FOG_OUT = "#231c25";

function buildSky(kit: Kit) {
  const uniforms = {
    uHaze: { value: new THREE.Color(FOG_OUT) },
    uGlow: { value: new THREE.Color("#ff6a2c") },
    uMid: { value: new THREE.Color("#101830") },
    uZenith: { value: new THREE.Color("#04060d") },
  };
  const mat = kit.track(
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uHaze; uniform vec3 uGlow; uniform vec3 uMid; uniform vec3 uZenith;
        varying vec3 vDir;
        void main(){
          float h = max(vDir.y, 0.0);
          vec3 c = mix(uHaze, uMid, smoothstep(0.0, 0.32, h));
          c = mix(c, uZenith, smoothstep(0.22, 0.85, h));
          float ramp = smoothstep(0.0, 0.05, h);
          c += uGlow * 0.5 * ramp * exp(-pow((h - 0.07) / 0.08, 2.0));
          c += uGlow * 0.1 * ramp * exp(-pow(h / 0.32, 2.0));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), mat);
  kit.track(sky.geometry);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  // stars
  const R = rng(3);
  const n = 650;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const a = R() * Math.PI * 2;
    const y = 0.16 + R() * 0.84;
    const r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 1700;
    pos[i * 3 + 1] = y * 1700;
    pos[i * 3 + 2] = Math.sin(a) * r * 1700;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: "#cfd8ff", size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.6, fog: false, depthWrite: false, toneMapped: false }));
  stars.frustumCulled = false;
  kit.track(g);
  kit.track(stars.material as THREE.Material);
  sky.add(stars);
  return sky;
}

export function buildWorld(lowPower: boolean): World {
  const kit = new Kit(lowPower);
  const scene = new THREE.Scene();
  const surface = new THREE.Group();
  const under = new THREE.Group();
  under.visible = false;
  scene.add(surface, under);
  const anchors: Anchor[] = [];
  const underAnchors: Anchor[] = [];

  const sky = buildSky(kit);
  scene.add(sky);

  // desert ground + campus pad
  const sand = makeNoiseTexture("#16151a", "#24222a", 1400);
  sand.repeat.set(70, 70);
  kit.track(sand);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(6000, 48),
    kit.track(new THREE.MeshStandardMaterial({ map: sand, color: "#6a645f", roughness: 0.95, metalness: 0.0 }))
  );
  kit.track(ground.geometry);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  surface.add(ground);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(285, 120), kit.floorMaterial(12, 570, "#2a2e36"));
  kit.track(pad.geometry);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -0.02;
  surface.add(pad);
  // pad edge light ring
  const edge = new THREE.Mesh(new THREE.RingGeometry(284, 285.6, 160), kit.emit("#ffb347", 0.8));
  kit.track(edge.geometry);
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = 0.0;
  surface.add(edge);

  const shell = podShellGeometry();
  kit.track(shell);
  buildCampusShells(kit, surface, shell);
  buildHub(kit, surface, anchors);
  buildCorridor(kit, surface, anchors);
  buildPodShell(kit, surface, shell, anchors);
  buildHall(kit, surface, anchors);
  buildStorage(kit, surface, anchors);
  buildCooling(kit, surface, anchors);
  buildVault(kit, surface, anchors);
  buildEnergy(kit, surface, anchors, []);
  buildYard(kit, surface, anchors);
  buildDac(kit, surface, anchors);
  buildRoof(kit, surface);
  kit.flush(surface);

  buildUnder(kit, under, underAnchors);
  kit.flush(under);

  const update = (t: number, dt: number, cam: THREE.PerspectiveCamera) => {
    sky.position.copy(cam.position);
    for (const tick of kit.ticks) tick(t, dt, cam);
  };
  const dispose = () => {
    kit.dispose();
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  };
  return { scene, surface, under, sky, anchors, underAnchors, kit, update, dispose };
}
