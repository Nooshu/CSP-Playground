#!/usr/bin/env node
/**
 * Writes Cloudflare Pages `_routes.json` so static assets bypass Functions.
 *
 * @remarks
 * With `_middleware.ts`, Pages defaults to invoking Functions on every path.
 * Soft-404 HTML for a missing or mis-negotiated `/assets/*.js` request then
 * inherits `/assets/*` immutable `_headers` and breaks module loading
 * (`disallowed MIME type ("text/html")`). Excluding fingerprinted and other
 * static files restores direct asset serving (and proper 404s).
 */

import { statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const distDir = join(fileURLToPath(import.meta.url), "..", "..", "dist");

/**
 * Routes that may invoke Pages Functions (`_middleware`, `/api/*`).
 *
 * @type {{ version: number, include: string[], exclude: string[] }}
 */
export const PAGES_ROUTES = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/assets/*",
    "/data/*",
    "/*.js",
    "/*.js.br",
    "/*.css",
    "/*.css.br",
    "/*.mjs",
    "/*.mjs.br",
    "/*.map",
    "/*.png",
    "/*.ico",
    "/*.jpg",
    "/*.jpeg",
    "/*.svg",
    "/*.svg.br",
    "/*.txt",
    "/*.txt.br",
    "/*.webmanifest",
    "/*.webmanifest.br",
    "/*.json",
    "/*.json.br",
  ],
};

/**
 * Writes `_routes.json` into a build output directory.
 *
 * @param {string} directory - Absolute path to `dist/` (or equivalent).
 */
export function writePagesRoutes(directory) {
  writeFileSync(
    join(directory, "_routes.json"),
    `${JSON.stringify(PAGES_ROUTES, null, 2)}\n`,
    "utf8",
  );
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  if (!statSync(distDir, { throwIfNoEntry: false })) {
    console.error(
      "generate-dist-routes: dist/ not found. Run vite build first.",
    );
    process.exit(1);
  }

  writePagesRoutes(distDir);
  console.log("generate-dist-routes: wrote dist/_routes.json");
}
