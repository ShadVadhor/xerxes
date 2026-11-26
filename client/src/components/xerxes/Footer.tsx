import { ArrowUpRight } from "lucide-react";
import { ACCESS, CHAPTERS, COMPANY, NAV, SITE } from "@/lib/content";
import { scrollToId } from "@/lib/smooth";
import { Logo } from "./ui";

// Required footer microcopy is not yet represented in the shared content module.
export const FOOTER_UI = {
  backToTop: "Back to top",
  programme: "KSA programme: on standby — resuming with partners",
  related: [
    { label: "DARKTOKENFACTORY.COM", href: "https://www.darktokenfactory.com" },
    { label: "GEIOS.ENERGY", href: "https://www.geios.energy" },
  ],
  disclaimer: "Performance figures are design targets and modelled values per White Paper V-1F (02 May 2025), not audited operating data. Renders are illustrative.",
};

const links = [
  ...NAV,
  { id: "access", label: ACCESS.eyebrow.split(" ").at(-1)!.replace(/^./, letter => letter.toUpperCase()) },
  { id: "contact", label: CHAPTERS.find(chapter => chapter.id === "contact")!.label },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-obsidian pt-14 sm:pt-20">
      <div className="wrap">
        <div className="grid gap-12 border-b border-border pb-12 md:grid-cols-[1fr_1.2fr_auto] md:gap-8 lg:pb-16">
          <div>
            <a href="#top" onClick={event => { event.preventDefault(); scrollToId("top"); }} className="inline-block transition-colors hover:text-magma-hi focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-magma-hi" aria-label={SITE.name}>
              <Logo size={38} />
            </a>
            <p className="mt-6 max-w-[27ch] text-sm leading-relaxed text-muted-foreground">{SITE.tagline}</p>
          </div>
          <nav aria-label={SITE.descriptor}>
            <ul className="grid grid-cols-2 gap-x-7 gap-y-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
              {links.map(link => (
                <li key={link.id}>
                  <a href={`#${link.id}`} onClick={event => { event.preventDefault(); scrollToId(link.id); }} className="group inline-flex items-center gap-2 text-[0.85rem] text-ceramic/70 transition-colors hover:text-magma-hi focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-magma-hi">
                    {link.label}<ArrowUpRight size={12} strokeWidth={1} className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="md:justify-self-end">
            <button type="button" onClick={() => scrollToId("top")} className="btn-ghost whitespace-nowrap !px-5 !text-[0.6rem] !tracking-[0.09em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-magma-hi">
              {FOOTER_UI.backToTop}<ArrowUpRight size={16} strokeWidth={1.25} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="my-9 flex flex-wrap items-center gap-x-10 gap-y-5">
        <a href="#programme" onClick={event => { event.preventDefault(); scrollToId("programme"); }} className="group inline-flex max-w-full items-center gap-4 focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-magma-hi">
          <span className="pulse-dot ml-1 inline-block shrink-0" aria-hidden="true" />
          <span className="mono text-[0.6rem] leading-relaxed tracking-[0.05em] text-muted-foreground transition-colors group-hover:text-magma-hi sm:text-[0.65rem]">{FOOTER_UI.programme}</span>
          <ArrowUpRight size={14} strokeWidth={1} className="hidden shrink-0 text-magma-hi sm:block" aria-hidden="true" />
        </a>
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {FOOTER_UI.related.map(item => (
            <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className="mono group inline-flex items-center gap-1.5 text-[0.6rem] tracking-[0.08em] text-ceramic/55 transition-colors hover:text-magma-hi focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-magma-hi sm:text-[0.65rem]">
              {item.label}<ArrowUpRight size={12} strokeWidth={1} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </p>
        </div>
        <div className="grid gap-5 border-t border-border py-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <p className="mono text-[0.55rem] leading-relaxed tracking-[0.03em] text-ceramic/45">© 2026 {COMPANY.entities.map(entity => entity.name).join(" · ")}</p>
          <p className="mono max-w-[95ch] text-[0.55rem] leading-relaxed tracking-[0.015em] text-ceramic/35">{FOOTER_UI.disclaimer}</p>
        </div>
      </div>
      <div className="pointer-events-none -mb-[0.09em] mt-3 flex w-full select-none items-end justify-center overflow-hidden px-[1vw] font-display text-[22vw] font-bold leading-[0.8] tracking-[-0.085em] sm:mt-8" aria-hidden="true">
        <span className="block translate-y-[0.14em] bg-[linear-gradient(to_bottom,rgba(236,232,224,0.2)_5%,rgba(236,232,224,0.035)_75%,transparent_100%)] bg-clip-text pr-[0.04em] text-transparent">{SITE.name}</span>
      </div>
    </footer>
  );
}
