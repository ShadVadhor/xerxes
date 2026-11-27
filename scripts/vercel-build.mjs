// Builds the site for Vercel with the Build Output API (https://vercel.com/docs/build-output-api/v3):
//   .vercel/output/static                  the Vite build (client/public is copied in, media included)
//   .vercel/output/functions/api/trpc.func the tRPC API (contact form), bundled into one CommonJS file
//   .vercel/output/config.json             routes
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const out = ".vercel/output";
const fn = `${out}/functions/api/trpc.func`;

execSync("pnpm exec vite build", { stdio: "inherit" });

rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });
cpSync("dist/public", `${out}/static`, {
  recursive: true,
  // the Manus debug collector is a development tool and not part of the site
  filter: source => !source.includes("__manus__") && !source.endsWith(".gitkeep"),
});

await build({
  entryPoints: ["server/vercel.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: `${fn}/index.js`,
  footer: { js: "module.exports = module.exports.default;" },
  logLevel: "info",
});
// the project is an ES module package; the bundled function is CommonJS
writeFileSync(`${fn}/package.json`, JSON.stringify({ type: "commonjs" }));
writeFileSync(
  `${fn}/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.js", launcherType: "Nodejs", shouldAddHelpers: false }, null, 2)
);

const immutable = { "cache-control": "public, max-age=31536000, immutable" };
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/assets/(.*)$", headers: immutable, continue: true },
        { src: "^/manus-storage/(.*)$", headers: immutable, continue: true },
        { src: "^/api/(trpc|health)(?:/.*)?$", dest: "/api/trpc" },
        { handle: "filesystem" },
        { src: "^/(?!api/).*$", dest: "/index.html" },
      ],
    },
    null,
    2
  )
);
console.log("Vercel output ready in .vercel/output");
