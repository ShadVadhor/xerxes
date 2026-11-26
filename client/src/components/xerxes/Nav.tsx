import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { NAV } from "@/lib/content";
import { requestContact } from "@/lib/interest";
import { gsap, scrollToId } from "@/lib/smooth";
import { Arrow, Logo } from "./ui";

export default function Nav({ ready }: { ready: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      if (y > 420 && y > lastY.current + 6) setHidden(true);
      else if (y < lastY.current - 6 || y < 420) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open && menu.current) {
      gsap.fromTo(
        menu.current.querySelectorAll("[data-menu-item]"),
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: "power3.out", delay: 0.15 }
      );
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape closes the menu and focus moves into it when it opens
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const first = menu.current?.querySelector<HTMLElement>("button");
    const raf = requestAnimationFrame(() => first?.focus({ preventScroll: true }));
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [open]);
  const go = (id: string) => {
    setOpen(false);
    setTimeout(() => scrollToId(id), open ? 250 : 0);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)" }}
      >
        <div
          className={`mx-auto flex items-center justify-between gap-6 px-5 py-4 transition-colors duration-500 sm:px-8 ${
            scrolled ? "border-b border-white/10 bg-obsidian/70 backdrop-blur-xl" : "border-b border-transparent"
          }`}
        >
          <button type="button" onClick={() => go("top")} aria-label="Xerxes Data Centers — back to top" className="text-white">
            <Logo size={26} />
          </button>

          <nav aria-label="Primary" className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md xl:flex">
            {NAV.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => go(n.id)}
                className="mono rounded-full px-4 py-2 text-[0.66rem] uppercase tracking-[0.18em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {n.label}
              </button>
            ))}
            <Link
              href="/walkthrough"
              className="mono inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-magma/40 px-4 py-2 text-[0.66rem] uppercase tracking-[0.18em] text-magma-hi transition-colors hover:bg-magma/15 hover:text-white"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-magma" aria-hidden="true" />
              3D walkthrough
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => requestContact("Partnership", "nav")}
              className="btn-magma hidden !px-5 !py-3 sm:inline-flex"
            >
              Request access <Arrow />
            </button>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen(o => !o)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white xl:hidden"
            >
              <span className="relative block h-3 w-5">
                <span className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-500 ${open ? "translate-y-[6px] rotate-45" : ""}`} />
                <span className={`absolute left-0 top-[11px] h-px w-full bg-current transition-transform duration-500 ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* mobile menu */}
      <div
        ref={menu}
        className={`fixed inset-0 z-40 flex flex-col justify-center bg-obsidian/96 px-8 backdrop-blur-2xl transition-opacity duration-500 xl:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="strata-lines absolute inset-0 opacity-30" />
        <ul className="relative space-y-1">
          {NAV.map((n, i) => (
            <li key={n.id} data-menu-item>
              <button
                type="button"
                onClick={() => go(n.id)}
                className="flex w-full items-baseline gap-4 border-b border-white/10 py-4 text-left"
              >
                <span className="mono text-[0.65rem] text-magma-hi">{String(i + 2).padStart(2, "0")}</span>
                <span className="display text-[2.4rem] text-white">{n.label}</span>
              </button>
            </li>
          ))}
          <li data-menu-item>
            <Link href="/walkthrough" className="flex w-full items-baseline gap-4 border-b border-white/10 py-4 text-left">
              <span className="mono text-[0.65rem] text-magma-hi">3D</span>
              <span className="display text-[2.4rem] text-white">Walkthrough</span>
            </Link>
          </li>
        </ul>
        <button
          data-menu-item
          type="button"
          className="btn-magma relative mt-10 w-fit"
          onClick={() => {
            setOpen(false);
            setTimeout(() => requestContact("Partnership", "nav"), 250);
          }}
        >
          Request access <Arrow />
        </button>
      </div>
    </>
  );
}
