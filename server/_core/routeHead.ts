import { WALK_META } from "../../client/src/lib/walkthrough";

/**
 * Route-specific <head> tags written into the initial HTML, so crawlers and link previews that do not
 * run JavaScript see the right title, description and canonical URL for the page they fetched.
 * The SPA also sets them client-side after hydration.
 */
const ORIGIN = "https://www.xerxes.nexus";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function setMeta(html: string, attr: "name" | "property", key: string, content: string) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
  return html.replace(re, (_m, a: string, b: string) => `${a}${esc(content)}${b}`);
}

export function applyRouteHead(html: string, url: string): string {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path !== WALK_META.path) return html;
  const canonical = `${ORIGIN}${WALK_META.path}`;
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(WALK_META.title)}</title>`);
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`);
  out = setMeta(out, "name", "description", WALK_META.description);
  out = setMeta(out, "property", "og:title", WALK_META.title);
  out = setMeta(out, "property", "og:description", WALK_META.description);
  out = setMeta(out, "property", "og:url", canonical);
  out = setMeta(out, "name", "twitter:title", WALK_META.title);
  out = setMeta(out, "name", "twitter:description", WALK_META.description);
  return out;
}
