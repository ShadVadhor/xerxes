import { useEffect, useState } from "react";
import Access from "@/components/xerxes/Access";
import ChapterRail from "@/components/xerxes/ChapterRail";
import Company from "@/components/xerxes/Company";
import Contact from "@/components/xerxes/Contact";
import CursorGlow from "@/components/xerxes/CursorGlow";
import DataHall from "@/components/xerxes/DataHall";
import Descent from "@/components/xerxes/Descent";
import Footer from "@/components/xerxes/Footer";
import Gms from "@/components/xerxes/Gms";
import Hero from "@/components/xerxes/Hero";
import Impact from "@/components/xerxes/Impact";
import Manifesto from "@/components/xerxes/Manifesto";
import Models from "@/components/xerxes/Models";
import Nav from "@/components/xerxes/Nav";
import PadSection from "@/components/xerxes/PadSection";
import Preloader, { shouldPlayIntro } from "@/components/xerxes/Preloader";
import Programme from "@/components/xerxes/Programme";
import Sovereignty from "@/components/xerxes/Sovereignty";
import WalkTeaser from "@/components/xerxes/WalkTeaser";
import { gsap, prefersReducedMotion, ScrollTrigger, scrollToId, startSmooth } from "@/lib/smooth";

export default function Home() {
  const [intro] = useState(() => shouldPlayIntro());
  const [ready, setReady] = useState(!intro);

  // smooth scrolling (Lenis ↔ ScrollTrigger)
  useEffect(() => startSmooth(), []);
  // arriving from another route with a hash (for example /#contact from the walkthrough)
  useEffect(() => {
    if (!ready) return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const t = window.setTimeout(() => scrollToId(id), 700);
    return () => window.clearTimeout(t);
  }, [ready]);

  // global entrance reveals for every [data-reveal] element
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const els = gsap.utils.toArray<HTMLElement>("[data-reveal]");
    const timers = new Set<number>();
    // Independent failsafe, installed first and with no ScrollTrigger dependency: anything that has been
    // on screen for a while yet is still invisible is revealed, so content can never stay hidden.
    const rescue = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          rescue.unobserve(el);
          const id = window.setTimeout(() => {
            timers.delete(id);
            if (parseFloat(getComputedStyle(el).opacity) < 0.05) gsap.to(el, { opacity: 1, y: 0, duration: 0.6, overwrite: "auto" });
          }, 2800);
          timers.add(id);
        });
      },
      { threshold: 0.02 }
    );
    els.forEach(el => rescue.observe(el));
    let batches: ScrollTrigger[] = [];
    try {
      gsap.set(els, { y: 36 });
      batches = ScrollTrigger.batch(els, {
        start: "top 90%",
        once: true,
        onEnter: batch => {
          batch.forEach((el, i) => {
            const extra = parseFloat((el as HTMLElement).dataset.revealDelay || "0");
            gsap.to(el, { opacity: 1, y: 0, duration: 1.15, ease: "power3.out", delay: i * 0.08 + extra, overwrite: "auto" });
          });
        },
      });
    } catch {
      // if the animation layer fails to start, show everything immediately
      els.forEach(el => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 1800);
    return () => {
      window.removeEventListener("load", refresh);
      clearTimeout(t);
      rescue.disconnect();
      timers.forEach(id => window.clearTimeout(id));
      batches.forEach(b => b.kill());
    };
  }, []);

  return (
    <div className="relative bg-obsidian text-foreground">
      {intro && !ready && <Preloader onDone={() => setReady(true)} />}
      <CursorGlow />
      <Nav ready={ready} />
      <ChapterRail ready={ready} />
      <main>
        <Hero ready={ready} />
        <Manifesto />
        <Models />
        <Descent />
        <PadSection />
        <DataHall />
        <WalkTeaser />
        <Gms />
        <Impact />
        <Sovereignty />
        <Programme />
        <Company />
        <Access />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
