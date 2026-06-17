#!/usr/bin/env node
/**
 * Pre-compresses build output with Brotli quality 11.
 *
 * @remarks
 * Uses Node's built-in `node:zlib` (`brotliCompressSync`) only — no third-party
 * compression packages. Writes `<file>.br` sidecars next to each compressible
 * asset in `dist/`. Cloudflare Pages Functions serve these via
 * `functions/_middleware.ts`.
 */

import { brotliCompressSync, constants } from "node:zlib";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

if (typeof brotliCompressSync !== "function") {
  console.error(
    "compress-dist-brotli: node:zlib brotliCompressSync is unavailable in this Node build.",
  );
  process.exit(1);
}

const root = join(fileURLToPath(import.meta.url), "..", "..");
const distDir = join(root, "dist");

const COMPRESSIBLE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);

const SKIP_EXTENSIONS = new Set([
  ".br",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
  ".woff",
  ".woff2",
]);

/**
 * @param {string} filePath
 */
function compressFile(filePath) {
  if (basename(filePath) === "_headers") {
    return;
  }

  const extension = extname(filePath).toLowerCase();
  if (SKIP_EXTENSIONS.has(extension) || extension === ".br") {
    return;
  }

  if (extension && !COMPRESSIBLE_EXTENSIONS.has(extension)) {
    return;
  }

  const source = readFileSync(filePath);
  if (source.length === 0) {
    return;
  }

  const compressed = brotliCompressSync(source, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
    },
  });

  writeFileSync(`${filePath}.br`, compressed);
}

/**
 * @param {string} directory
 */
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    compressFile(entryPath);
  }
}

if (!statSync(distDir, { throwIfNoEntry: false })) {
  console.error("compress-dist-brotli: dist/ not found. Run vite build first.");
  process.exit(1);
}

walk(distDir);
console.log("compress-dist-brotli: wrote Brotli 11 sidecars in dist/");
