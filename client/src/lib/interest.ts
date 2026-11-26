import { useSyncExternalStore } from "react";
import { scrollToId } from "./smooth";

/**
 * Tiny shared store so any CTA on the page (access cards, programme, models)
 * can pre-select the contact form's interest before scrolling to it.
 */
type InterestState = { interest: string; source: string; nonce: number };

let state: InterestState = { interest: "", source: "contact", nonce: 0 };
const listeners = new Set<() => void>();

export function setInterest(interest: string, source = "contact") {
  state = { interest, source, nonce: state.nonce + 1 };
  listeners.forEach(l => l());
}

/** Pre-select an interest and glide to the contact form. */
export function requestContact(interest: string, source = "contact") {
  setInterest(interest, source);
  scrollToId("contact");
}

export function useInterest() {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state
  );
}
