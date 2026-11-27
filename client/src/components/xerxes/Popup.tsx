import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { resumeScroll, stopScroll } from "@/lib/smooth";

export const PopupTitle = Dialog.Title;
export const PopupDescription = Dialog.Description;
export const PopupClose = Dialog.Close;

/**
 * Shared pop-up shell: blurred overlay, full screen on phones, centred card on larger screens.
 * Pauses Lenis while open so wheel and touch scroll stay inside the pop-up.
 */
export default function Popup({
  open,
  onOpenChange,
  size = "lg",
  fixed = false,
  label,
  onKeyDown,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: "lg" | "md";
  /** Desktop: fixed-height card whose columns scroll on their own. */
  fixed?: boolean;
  label?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    stopScroll();
    return () => resumeScroll();
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-[#020305]/75 backdrop-blur-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          ref={content}
          aria-label={label}
          onOpenAutoFocus={event => {
            event.preventDefault();
            content.current?.focus({ preventScroll: true });
          }}
          onKeyDown={onKeyDown}
          data-lenis-prevent=""
          className={`fixed inset-0 z-[201] overflow-y-auto overscroll-contain bg-obsidian text-white shadow-[0_40px_120px_rgba(0,0,0,0.6)] outline-none duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-[calc(100vw-3rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:border-white/12 sm:data-[state=open]:zoom-in-[0.97] sm:data-[state=open]:slide-in-from-bottom-0 ${
            size === "lg" ? "sm:max-w-[1180px]" : "sm:max-w-[760px]"
          } ${fixed ? "lg:h-[min(88vh,860px)] lg:overflow-hidden" : ""}`}
        >
          <Dialog.Close
            className="mono fixed right-3 top-3 z-30 flex h-10 items-center gap-2 border border-white/20 bg-obsidian/80 px-3 text-[0.6rem] uppercase tracking-[0.2em] text-white/75 backdrop-blur transition-colors hover:border-magma hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-magma sm:absolute sm:right-4 sm:top-4"
            aria-label="Close"
          >
            Close
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
