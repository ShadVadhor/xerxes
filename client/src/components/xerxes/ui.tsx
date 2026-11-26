import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { A } from "@/lib/assets";
import { gsap, prefersReducedMotion } from "@/lib/smooth";

/** Hexagon double-X mark + wordmark lockup */
export function Logo({ size = 30, showWord = true, className = "" }: { size?: number; showWord?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img src={A.mark} alt="" width={size} height={size * 1.157} style={{ height: size * 1.157, width: "auto" }} draggable={false} />
      {showWord && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.05rem] font-bold tracking-[0.34em]">XERXES</span>
          <span className="mono mt-1 text-[0.5rem] tracking-[0.5em] opacity-60">DATA CENTERS</span>
        </span>
      )}
    </span>
  );
}

/** Count a number up once when it scrolls into view */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.8,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const [text, setText] = useState(() => (prefersReducedMotion() ? fmt(value) : fmt(0)));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setText(fmt(value));
      return;
    }
    let tween: gsap.core.Tween | null = null;
    const io = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const o = { v: 0 };
        tween = gsap.to(o, {
          v: value,
          duration,
          ease: "power3.out",
          onUpdate: () => setText(fmt(o.v)),
          onComplete: () => setText(fmt(value)),
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tween?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}

/** Mount children only once the wrapper is near the viewport (keeps WebGL off the critical path) */
export function LazyMount({
  children,
  rootMargin = "600px",
  className = "",
  style,
}: {
  children: ReactNode;
  rootMargin?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return (
    <div ref={ref} className={className} style={style}>
      {show ? children : null}
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`eyebrow inline-flex items-center gap-3 ${className}`}>
      <span className="inline-block h-px w-8 bg-magma" />
      {children}
    </span>
  );
}

/** Small arrow icon used on buttons */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden>
      <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Local boundary for lazy 3D scenes: a failed chunk or runtime error falls back to the still image, never the page-wide error screen. */
export class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
