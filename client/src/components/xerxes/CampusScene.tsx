import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildXerxes, disposeScene, makeDtf } from "@/lib/campusModels";

type Mode = "dtf" | "compare" | "xerxes";

type Layout = {
  xerxesPosition: THREE.Vector3;
  dtfPosition: THREE.Vector3;
  xerxesVisibility: number;
  dtfVisibility: number;
  target: THREE.Vector3;
  distance: number;
};

const TRANSITION_SECONDS = 1.2;
const HIDDEN_SCALE = 0.0001;

function layoutFor(mode: Mode): Layout {
  return {
    xerxesPosition: new THREE.Vector3(mode === "compare" ? 2.9 : 0, 0, 0),
    dtfPosition: new THREE.Vector3(mode === "compare" ? -6.1 : 0, 0, 0),
    xerxesVisibility: mode === "dtf" ? HIDDEN_SCALE : 1,
    dtfVisibility: mode === "xerxes" ? HIDDEN_SCALE : 1,
    target: new THREE.Vector3(mode === "compare" ? -0.1 : 0, mode === "dtf" ? -0.8 : -1.3, 0),
    distance: mode === "dtf" ? 8.4 : mode === "compare" ? 24 : 17.5,
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
      const initialDirection = new THREE.Vector3(0.3, 0.27, 0.9).normalize();
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
