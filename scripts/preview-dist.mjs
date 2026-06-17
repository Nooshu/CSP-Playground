#!/usr/bin/env node
/**
 * Local static preview server for the production `dist/` output.
 *
 * @remarks
 * Serves pre-compressed Brotli 11 `.br` sidecars when the client sends
 * `Accept-Encoding: br`, matching Cloudflare Pages middleware behaviour.
 *
 * Usage:
 *   yarn build && yarn preview:dist
 *   yarn preview:brotli
 *
 * For Pages Functions (including `/api/*`), use `yarn pages:dev` instead.
 */

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getStaticAssetCacheControl,
  getStaticAssetContentType,
  isBrotliCompressibleAsset,
  requestAcceptsBrotli,
  resolveStaticAssetPath,
} from "./lib/brotli-static.mjs";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const distDir = join(root, "dist");
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);

if (!statSync(distDir, { throwIfNoEntry: false })) {
  console.error("preview-dist: dist/ not found. Run yarn build first.");
  process.exit(1);
}

/**
 * @param {string} pathname
 */
function resolveDistFile(pathname) {
  const assetPath = resolveStaticAssetPath(pathname);
  const relativePath = assetPath.replace(/^\/+/, "");
  const filePath = normalize(join(distDir, relativePath));

  if (!filePath.startsWith(distDir + sep) && filePath !== distDir) {
    return null;
  }

  return { assetPath, filePath };
}

/**
 * @param {string} filePath
 * @param {boolean} acceptsBrotli
 */
function readResponseBody(filePath, assetPath, acceptsBrotli) {
  const brotliPath = `${filePath}.br`;
  if (
    acceptsBrotli &&
    isBrotliCompressibleAsset(assetPath) &&
    existsSync(brotliPath)
  ) {
    return {
      body: readFileSync(brotliPath),
      encoding: "br",
      sourcePath: brotliPath,
    };
  }

  if (existsSync(filePath)) {
    return {
      body: readFileSync(filePath),
      encoding: null,
      sourcePath: filePath,
    };
  }

  return null;
}

const server = createServer((request, response) => {
  if (!request.url || !request.method) {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? host}`);
  if (url.pathname.startsWith("/api/")) {
    response.writeHead(501);
    response.end("API routes require yarn pages:dev");
    return;
  }

  const resolved = resolveDistFile(url.pathname);
  if (!resolved) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const payload = readResponseBody(
    resolved.filePath,
    resolved.assetPath,
    requestAcceptsBrotli(request),
  );

  if (!payload) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  /** @type {Record<string, string | number>} */
  const headers = {
    "Content-Type": getStaticAssetContentType(resolved.assetPath),
    "Cache-Control": getStaticAssetCacheControl(resolved.assetPath),
    Vary: "Accept-Encoding",
  };

  if (payload.encoding) {
    headers["Content-Encoding"] = payload.encoding;
  }

  if (request.method === "HEAD") {
    response.writeHead(200, headers);
    response.end();
    return;
  }

  response.writeHead(200, headers);
  response.end(payload.body);
});

server.listen(port, host, () => {
  console.log(`preview-dist: serving ${distDir}`);
  console.log(`preview-dist: http://${host}:${port}/`);
  console.log("preview-dist: send Accept-Encoding: br to receive .br sidecars");
});
