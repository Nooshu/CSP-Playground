/**
 * Shared Brotli static asset helpers for local preview.
 *
 * @remarks
 * Keep in sync with `server/serveBrotliStatic.ts` (Cloudflare Pages middleware).
 */

/** Long-lived cache for Vite fingerprinted files under `/assets/`. */
export const FINGERPRINTED_ASSET_CACHE_CONTROL =
  "public, max-age=31536000, immutable, no-transform";

/** Vite output: `/assets/[name]-[hash].[ext]` */
const FINGERPRINTED_ASSET_PATTERN =
  /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/;

/** @type {Record<string, string>} */
export const CONTENT_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".mjs": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=UTF-8",
  ".txt": "text/plain; charset=UTF-8",
};

/**
 * @param {string} pathname
 */
export function resolveStaticAssetPath(pathname) {
  if (pathname === "/") return "/index.html";
  if (pathname.endsWith("/")) return `${pathname}index.html`;
  return pathname;
}

/**
 * @param {string} assetPath
 */
export function getStaticAssetContentType(assetPath) {
  const extension = assetPath.slice(assetPath.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

/**
 * @param {string} assetPath
 */
export function isFingerprintedAsset(assetPath) {
  return FINGERPRINTED_ASSET_PATTERN.test(assetPath);
}

/**
 * @param {string} assetPath
 */
export function getStaticAssetCacheControl(assetPath) {
  if (isFingerprintedAsset(assetPath)) {
    return FINGERPRINTED_ASSET_CACHE_CONTROL;
  }

  if (assetPath.endsWith(".html")) {
    return "public, max-age=0, must-revalidate, no-transform";
  }

  return "public, max-age=86400, no-transform";
}

/**
 * @param {import("node:http").IncomingMessage} request
 */
export function requestAcceptsBrotli(request) {
  const acceptEncoding = request.headers["accept-encoding"];
  const value = Array.isArray(acceptEncoding)
    ? acceptEncoding.join(",")
    : (acceptEncoding ?? "");
  return value.includes("br");
}
