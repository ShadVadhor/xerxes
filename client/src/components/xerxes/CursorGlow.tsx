import { useEffect, useRef } from "react";
import { gsap } from "@/lib/smooth";

/** Soft magma glow that trails the pointer (fine-pointer devices only). */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.display = "none";
      return;
    }
    const x = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      el.style.opacity = "1";
      x(e.clientX - 150);
      y(e.clientY - 150);
    };
    const leave = () => (el.style.opacity = "0");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-30 h-[300px] w-[300px] rounded-full opacity-0 mix-blend-screen transition-opacity duration-500"
      style={{ background: "radial-gradient(closest-side, rgba(255,90,31,0.14), transparent)" }}
    />
  );
}
