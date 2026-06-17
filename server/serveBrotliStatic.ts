/**
 * Content negotiation for pre-compressed Brotli static assets on Cloudflare Pages.
 *
 * @remarks
 * Cloudflare Pages does not serve `.br` sidecars automatically. A Pages Function
 * must return the pre-compressed body with `encodeBody: "manual"` so the edge
 * does not re-compress the response.
 *
 * Keep in sync with `scripts/lib/brotli-static.mjs` (local preview server).
 */

/** Long-lived cache for Vite fingerprinted files under `/assets/`. */
export const FINGERPRINTED_ASSET_CACHE_CONTROL =
  "public, max-age=31536000, immutable, no-transform";

/** Vite output: `/assets/[name]-[hash].[ext]` */
const FINGERPRINTED_ASSET_PATTERN =
  /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/;

/**
 * Extensions pre-compressed during `yarn build`.
 *
 * @remarks
 * Keep in sync with `scripts/compress-dist-brotli.mjs` and
 * `scripts/lib/brotli-static.mjs`. Do not request `.br` sidecars for other
 * types — Pages may return an unrelated asset (for example `index.html.br`).
 */
const BROTLI_COMPRESSIBLE_EXTENSIONS = new Set([
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

/** MIME types for static assets served from `dist/`. */
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".mjs": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/vnd.microsoft.icon",
  ".webmanifest": "application/manifest+json; charset=UTF-8",
  ".txt": "text/plain; charset=UTF-8",
};

/**
 * Maps a request pathname to the underlying static asset path.
 *
 * @param pathname - URL pathname from the incoming request.
 * @returns Normalized asset path (for example `/index.html`).
 */
export function resolveStaticAssetPath(pathname: string): string {
  if (pathname === "/") return "/index.html";
  if (pathname.endsWith("/")) return `${pathname}index.html`;
  return pathname;
}

/**
 * Returns the `Content-Type` header for a static asset path.
 *
 * @param assetPath - Normalized asset path.
 */
export function getStaticAssetContentType(assetPath: string): string {
  const extension = assetPath.slice(assetPath.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

/**
 * Whether a build step writes a `.br` sidecar for this asset path.
 *
 * @param assetPath - Normalized asset path.
 */
export function isBrotliCompressibleAsset(assetPath: string): boolean {
  const extension = assetPath.slice(assetPath.lastIndexOf(".")).toLowerCase();
  return BROTLI_COMPRESSIBLE_EXTENSIONS.has(extension);
}

/**
 * Whether the path is a content-hashed Vite asset in `/assets/`.
 *
 * @param assetPath - Normalized asset path.
 */
export function isFingerprintedAsset(assetPath: string): boolean {
  return FINGERPRINTED_ASSET_PATTERN.test(assetPath);
}

/**
 * Returns cache directives aligned with fingerprinted vs document assets.
 *
 * @param assetPath - Normalized asset path.
 */
export function getStaticAssetCacheControl(assetPath: string): string {
  if (isFingerprintedAsset(assetPath)) {
    return FINGERPRINTED_ASSET_CACHE_CONTROL;
  }

  if (assetPath.endsWith(".html")) {
    return "public, max-age=0, must-revalidate, no-transform";
  }

  return "public, max-age=86400, no-transform";
}

/**
 * Attempts to serve a pre-compressed `.br` asset when the client accepts Brotli.
 *
 * @param request - Incoming HTTP request.
 * @param assets - Cloudflare Pages static asset fetcher.
 * @returns A Brotli-encoded response, or `null` to fall through to the next handler.
 */
export async function tryServeBrotliAsset(
  request: Request,
  assets: Fetcher,
): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null;
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    return null;
  }

  const acceptEncoding = request.headers.get("Accept-Encoding") ?? "";
  if (!acceptEncoding.includes("br")) {
    return null;
  }

  const assetPath = resolveStaticAssetPath(url.pathname);
  if (!isBrotliCompressibleAsset(assetPath)) {
    return null;
  }

  const brResponse = await assets.fetch(
    new URL(`${assetPath}.br`, url.origin).toString(),
    { method: "GET" },
  );

  if (!brResponse.ok) {
    return null;
  }

  const headers = new Headers();
  headers.set("Content-Encoding", "br");
  headers.set("Content-Type", getStaticAssetContentType(assetPath));
  headers.set("Vary", "Accept-Encoding");
  headers.set("Cache-Control", getStaticAssetCacheControl(assetPath));

  const etag = brResponse.headers.get("etag");
  if (etag) {
    headers.set("etag", etag);
  }

  if (request.method === "HEAD") {
    return new Response(null, {
      status: brResponse.status,
      headers,
      encodeBody: "manual",
    });
  }

  return new Response(brResponse.body, {
    status: brResponse.status,
    headers,
    encodeBody: "manual",
  });
}
