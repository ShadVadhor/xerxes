import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Mode = "dtf" | "compare" | "xerxes";

type WellsConfig = {
  production: number;
  injection: number;
  radius: number;
  depth: number;
};

type Campus = {
  group: THREE.Group;
  pulseMaterials: THREE.ShaderMaterial[];
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

function makeWells(config: WellsConfig) {
  const group = new THREE.Group();
  const pulseMaterials: THREE.ShaderMaterial[] = [];
  const count = config.production + config.injection;

  const shaftGeometry = new THREE.CylinderGeometry(0.044, 0.044, 1.3, 12);
  const shaft = new THREE.Mesh(
    shaftGeometry,
    new THREE.MeshBasicMaterial({
      color: "#ff9055",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  shaft.position.y = -0.7;
  group.add(shaft);

  // Interleave production/injection around the fan, rather than hiding all
  // injection branches at the back of the model.
  let productionLeft = config.production;
  let injectionLeft = config.injection;
  for (let index = 0; index < count; index += 1) {
    const isProduction =
      productionLeft > 0 && (index % 2 === 0 || injectionLeft === 0);
    if (isProduction) productionLeft -= 1;
    else injectionLeft -= 1;
    const color = new THREE.Color(isProduction ? "#ff5a1f" : "#3d8bff");
    const angle = (index / count) * Math.PI * 2 + Math.PI / 10;
    const reach = config.radius * (0.88 + (index % 3) * 0.055);
    const depth = config.depth * (0.86 + (index % 3) * 0.07);
    const point = (radius: number, y: number, offset = 0) =>
      new THREE.Vector3(
        Math.cos(angle + offset) * radius,
        y,
        Math.sin(angle + offset) * radius
      );
    const curve = new THREE.CatmullRomCurve3([
      point(0.025, -0.83),
      point(0.22, -1.32),
      point(reach * 0.2, -depth * 0.72, 0.04),
      point(reach * 0.53, -depth, 0.07),
      point(reach * 0.81, -depth * 1.035, 0.1),
      point(reach, -depth * 1.02, 0.12),
    ]);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPhase: { value: index * 0.173 },
        uDirection: { value: isProduction ? -1 : 1 },
        uColor: { value: color },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform float uDirection;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float d = abs(fract(vUv.x - uTime * 0.13 * uDirection + uPhase) - 0.5);
          float pulse = exp(-pow(d / 0.025, 2.0));
          float endFade = smoothstep(0.0, 0.06, vUv.x) *
            (1.0 - smoothstep(0.96, 1.0, vUv.x));
          vec3 lightColor = uColor * (0.82 + pulse * 0.45) + vec3(pulse * 0.22);
          gl_FragColor = vec4(lightColor, (0.58 + pulse * 0.32) * endFade);
          #include <colorspace_fragment>
        }
      `,
    });
    pulseMaterials.push(material);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.029, 7, false), material));
    const halo = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.071, 6, false),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    group.add(halo);
  }
  return { group, pulseMaterials };
}

function buildCampus(podCount: number, scale: number, wellsConfig: WellsConfig): Campus {
  const group = new THREE.Group();
  const content = new THREE.Group();
  content.scale.setScalar(scale);
  group.add(content);
  const architecture = new THREE.Group();
  const hexTexture = makeHexTexture();
  architecture.add(makeHub());

  for (let index = 0; index < podCount; index += 1) {
    const angle = (index * Math.PI * 2) / 6;
    const radialModule = new THREE.Group();
    radialModule.rotation.y = -angle;
    const pod = makePod(hexTexture);
    pod.position.x = 4.45;
    const bridge = makeBridge();
    bridge.position.x = 2.045;
    radialModule.add(pod, bridge);
    architecture.add(radialModule);
  }

  const wells = makeWells(wellsConfig);
  const isSmall = podCount === 1;
  // Center the one-pod silhouette (not its hub) without changing dimensions.
  // The small platform is centered beneath the complete compact unit.
  const offset = isSmall ? -2.2 : 0;
  architecture.position.x = offset;
  wells.group.position.x = offset;
  const platform = makePlatform(isSmall ? 4.7 : 7);
  content.add(platform, architecture, wells.group);
  return { group, pulseMaterials: wells.pulseMaterials };
}

function layoutFor(mode: Mode): Layout {
  return {
    xerxesPosition: new THREE.Vector3(mode === "compare" ? 2.2 : 0, 0, 0),
    dtfPosition: new THREE.Vector3(mode === "compare" ? -5.2 : 0, 0, 0),
    xerxesVisibility: mode === "dtf" ? HIDDEN_SCALE : 1,
    dtfVisibility: mode === "xerxes" ? HIDDEN_SCALE : 1,
    target: new THREE.Vector3(mode === "compare" ? 0.1 : 0, mode === "dtf" ? -0.35 : -0.75, 0),
    distance: mode === "dtf" ? 7.1 : mode === "compare" ? 21.1 : 14.3,
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
      canvas.setAttribute("aria-label", "Interactive illustrative data-center campus and geothermal well model");
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

      const xerxes = buildCampus(6, WORLD_SCALE, {
        production: 6,
        injection: 4,
        radius: 4.8,
        depth: 4.15,
      });
      scene.add(xerxes.group);
      const dtf = buildCampus(1, WORLD_SCALE * 0.55, {
        production: 2,
        injection: 2,
        radius: 3.3,
        depth: 3.4,
      });
      scene.add(dtf.group);
      xerxes.group.name = "xerxesGroup";
      dtf.group.name = "dtfGroup";
      const pulseMaterials = [...xerxes.pulseMaterials, ...dtf.pulseMaterials];

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
