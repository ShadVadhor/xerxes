import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { CONTACT } from "@/lib/content";
import { useInterest } from "@/lib/interest";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { trpc } from "@/lib/trpc";
import { Arrow, Eyebrow } from "./ui";

// Required UI microcopy is not yet represented in the shared content module.
export const CONTACT_UI = {
  name: "Name",
  organization: "Organisation",
  email: "Email",
  interest: "Interest",
  message: "Message",
  optional: "Optional",
  submit: "Send message",
  pending: "Sending…",
  nameError: "Please enter your name (at least 2 characters).",
  emailError: "Please enter a valid email address.",
  success: "Message received",
  successBody: "A member of the team will reply personally.",
  another: "Send another",
  privacy: "Your message goes to the Xerxes team at GEIOS. We never share your details.",
};

type Fields = { name: string; organization: string; email: string; interest: string; message: string; website: string };
type Errors = Partial<Record<"name" | "email", string>>;
const emptyFields = (): Fields => ({ name: "", organization: "", email: "", interest: CONTACT.interests[0], message: "", website: "" });
const labelClass = "mono block text-[0.62rem] uppercase tracking-[0.16em] text-ceramic/65";
const inputClass = "mt-3 w-full rounded-none border-0 border-b border-input bg-transparent px-0 pb-3 pt-1 text-[0.95rem] text-ceramic outline-none transition-colors placeholder:text-ceramic/25 focus:border-magma-hi focus:ring-0 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-magma-hi disabled:opacity-50";

export default function Contact() {
  const { interest, source, nonce } = useInterest();
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);
  const mutation = trpc.inquiry.submit.useMutation({
    onSuccess: () => {
      setServerError("");
      setSuccess(true);
    },
    onError: error => {
      setServerError(error.message);
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!interest) return;
    setFields(current => ({ ...current, interest }));
    setSuccess(false);
    const timeout = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 900);
    return () => window.clearTimeout(timeout);
  }, [nonce, interest]);

  useEffect(() => {
    if (!success) return;
    successRef.current?.focus({ preventScroll: true });
    if (prefersReducedMotion() || !checkRef.current) return;
    const paths = checkRef.current.querySelectorAll("path");
    const tween = gsap.fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, stagger: 0.18, ease: "power2.inOut" });
    return () => { tween.kill(); };
  }, [success]);

  const update = (key: keyof Fields, value: string) => {
    setFields(current => ({ ...current, [key]: value }));
    if (key === "name" || key === "email") setErrors(current => ({ ...current, [key]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const nextErrors: Errors = {};
    if (fields.name.trim().length < 2) nextErrors.name = CONTACT_UI.nameError;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) nextErrors.email = CONTACT_UI.emailError;
    setErrors(nextErrors);
    setServerError("");
    if (Object.keys(nextErrors).length) {
      if (nextErrors.name) nameRef.current?.focus({ preventScroll: true });
      else document.getElementById("inquiry-email")?.focus({ preventScroll: true });
      return;
    }
    mutation.mutate({ ...fields, name: fields.name.trim(), organization: fields.organization.trim(), email: fields.email.trim(), message: fields.message.trim(), source: source || "contact", website: fields.website });
  };

  const sendAnother = () => {
    mutation.reset();
    setFields({ ...emptyFields(), interest: interest || CONTACT.interests[0] });
    setErrors({});
    setServerError("");
    setSuccess(false);
    window.requestAnimationFrame(() => nameRef.current?.focus({ preventScroll: true }));
  };

  return (
    <section id="contact" aria-labelledby="contact-heading" className="relative isolate overflow-hidden bg-obsidian py-24 sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_45%_at_65%_100%,rgba(255,90,31,0.13),transparent)]" aria-hidden="true" />
      <div className="wrap">
        <div className="grid items-start gap-16 lg:grid-cols-[1fr_1fr] lg:gap-[6vw]">
          <div>
            <div data-reveal><Eyebrow>{CONTACT.eyebrow}</Eyebrow></div>
            <h2 id="contact-heading" className="display mt-8 text-[clamp(2.6rem,6.4vw,6.2rem)]" data-reveal>
              {CONTACT.title}<span className="accent-serif text-magma-grad mt-3 block">{CONTACT.titleAccent}</span>
            </h2>
            <p className="mt-8 max-w-[56ch] text-[1.05rem] leading-relaxed text-muted-foreground" data-reveal>{CONTACT.intro}</p>
            <div className="mt-14 space-y-8 sm:mt-16">
              {CONTACT.offices.map((office, index) => (
                <address key={office.name} className="grid gap-3 border-t border-border pt-6 not-italic sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:gap-5" data-reveal data-reveal-delay={String(index * 0.08)}>
                  <h3 className="font-display text-base font-semibold leading-snug">{office.name}</h3>
                  <div className="text-[0.8rem] leading-relaxed text-muted-foreground">
                    {office.lines.map(line => <span key={line} className="block">{line}</span>)}
                    <a href={`mailto:${office.email}`} className="mono mt-3 inline-block break-all text-[0.64rem] text-magma-hi underline decoration-magma/35 underline-offset-4 transition-colors hover:text-ember focus-visible:outline-magma-hi">{office.email}</a>
                  </div>
                </address>
              ))}
            </div>
          </div>

          <div className="relative min-w-0 border border-ceramic/15 bg-basalt/70 p-6 backdrop-blur-lg sm:p-9 lg:mt-12 xl:p-12" data-reveal data-reveal-delay="0.15">
            <div className="brackets"><i /></div>
            <div className="pointer-events-none absolute -left-px top-12 h-14 w-px bg-magma" aria-hidden="true" />
            {success ? (
              <div role="status" aria-live="polite" className="flex min-h-[580px] flex-col items-center justify-center py-12 text-center">
                <svg ref={checkRef} viewBox="0 0 100 114" className="mb-9 h-28 w-24 text-magma-hi" fill="none" aria-hidden="true">
                  <path d="M50 3 97 30v54l-47 27L3 84V30Z" pathLength="1" stroke="currentColor" strokeWidth="1" strokeDasharray="1" />
                  <path d="m30 56 14 14 28-29" pathLength="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" />
                </svg>
                <h3 ref={successRef} tabIndex={-1} className="font-display text-[2rem] font-semibold tracking-[-0.035em] outline-none">{CONTACT_UI.success}</h3>
                <p className="mt-5 max-w-[30ch] text-base leading-relaxed text-muted-foreground">{CONTACT_UI.successBody}</p>
                <button type="button" onClick={sendAnother} className="btn-ghost mt-10 !text-[0.65rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-magma-hi">{CONTACT_UI.another}<Arrow /></button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate aria-busy={mutation.isPending}>
                <fieldset disabled={mutation.isPending} className="m-0 min-w-0 border-0 p-0">
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor="inquiry-name" className={labelClass}>{CONTACT_UI.name}</label>
                      <input ref={nameRef} id="inquiry-name" name="name" type="text" autoComplete="name" required maxLength={160} value={fields.name} onChange={event => update("name", event.target.value)} className={inputClass} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "inquiry-name-error" : undefined} />
                      {errors.name && <p id="inquiry-name-error" className="mt-2 text-xs leading-relaxed text-magma-hi">{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="inquiry-organization" className={labelClass}>{CONTACT_UI.organization}<span className="ml-2 text-[0.5rem] normal-case tracking-normal text-muted-foreground">({CONTACT_UI.optional})</span></label>
                      <input id="inquiry-organization" name="organization" type="text" autoComplete="organization" maxLength={200} value={fields.organization} onChange={event => update("organization", event.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="mt-8">
                    <label htmlFor="inquiry-email" className={labelClass}>{CONTACT_UI.email}</label>
                    <input id="inquiry-email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={320} value={fields.email} onChange={event => update("email", event.target.value)} className={inputClass} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "inquiry-email-error" : undefined} />
                    {errors.email && <p id="inquiry-email-error" className="mt-2 text-xs leading-relaxed text-magma-hi">{errors.email}</p>}
                  </div>
                  <div className="relative mt-8">
                    <label htmlFor="inquiry-interest" className={labelClass}>{CONTACT_UI.interest}</label>
                    <select id="inquiry-interest" name="interest" required value={fields.interest} onChange={event => update("interest", event.target.value)} className={`${inputClass} appearance-none pr-7 text-[0.86rem]`}>
                      {CONTACT.interests.map(option => <option key={option} value={option} className="bg-basalt text-ceramic">{option}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute bottom-4 right-1 text-magma-hi" size={15} strokeWidth={1.25} aria-hidden="true" />
                  </div>
                  <div className="mt-8">
                    <label htmlFor="inquiry-message" className={labelClass}>{CONTACT_UI.message}<span className="ml-2 text-[0.5rem] normal-case tracking-normal text-muted-foreground">({CONTACT_UI.optional})</span></label>
                    <textarea id="inquiry-message" name="message" rows={4} maxLength={4000} value={fields.message} onChange={event => update("message", event.target.value)} className={`${inputClass} min-h-28 resize-y`} data-lenis-prevent />
                  </div>
                  <div className="sr-only" aria-hidden="true">
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-label="website" value={fields.website} onChange={event => update("website", event.target.value)} />
                  </div>
                </fieldset>
                {serverError && <p role="alert" className="mt-6 border-l border-magma bg-magma/5 px-4 py-3 text-sm leading-relaxed text-magma-hi">{serverError}</p>}
                <button type="submit" disabled={mutation.isPending} className="btn-magma mt-9 w-full justify-between !text-[0.65rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-magma-hi disabled:cursor-wait disabled:opacity-65" aria-describedby="inquiry-privacy">
                  {mutation.isPending ? <><span>{CONTACT_UI.pending}</span><LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /></> : <><span>{CONTACT_UI.submit}</span><Arrow /></>}
                </button>
              </form>
            )}
            <p id="inquiry-privacy" className="mono mt-6 border-t border-border pt-5 text-[0.55rem] leading-relaxed tracking-[0.02em] text-muted-foreground">{CONTACT_UI.privacy}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
