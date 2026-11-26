import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/smooth";

type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hue: number; sway: number; ph: number };

/**
 * Lightweight 2D ember particles drifting upward, repelled by the pointer.
 * `intensityRef` (0..1) scales brightness + spawn rate (hero phases raise it during the descent).
 */
export default function EmberField({
  intensityRef,
  active = true,
  className = "",
}: {
  intensityRef?: React.MutableRefObject<number>;
  active?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const mobile = window.innerWidth < 768;
    const MAX = mobile ? 38 : 90;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const pointer = { x: -9999, y: -9999 };
    const parts: P[] = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (initial = false): P => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      vx: (Math.random() - 0.5) * 8,
      vy: -(14 + Math.random() * 38),
      r: 0.6 + Math.random() * 1.9,
      life: 0,
      max: 5 + Math.random() * 8,
      hue: 18 + Math.random() * 28,
      sway: 6 + Math.random() * 18,
      ph: Math.random() * Math.PI * 2,
    });

    resize();
    for (let i = 0; i < MAX * 0.6; i++) parts.push(spawn(true));

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(e => (visible = e[0].isIntersecting), { threshold: 0 });
    io.observe(canvas);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || !activeRef.current || document.visibilityState !== "visible") {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const k = intensityRef?.current ?? 0.5;
      const target = Math.floor(MAX * (0.35 + 0.65 * k));
      if (parts.length < target && Math.random() < 0.6) parts.push(spawn());

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        p.ph += dt;
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 160 * 160) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 160) * 260;
          p.vx += (dx / d) * f * dt;
          p.vy += (dy / d) * f * dt;
        }
        p.vx *= 0.985;
        p.x += (p.vx + Math.sin(p.ph * 1.3) * p.sway * 0.4) * dt;
        p.y += p.vy * dt;
        const t = p.life / p.max;
        if (t >= 1 || p.y < -20) {
          if (parts.length > target) parts.splice(i, 1);
          else parts[i] = spawn();
          continue;
        }
        const a = Math.sin(Math.PI * Math.min(t, 1)) * (0.35 + 0.65 * k);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, `hsla(${p.hue},100%,68%,${a})`);
        g.addColorStop(0.25, `hsla(${p.hue},100%,55%,${a * 0.45})`);
        g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      io.disconnect();
    };
  }, [intensityRef]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
