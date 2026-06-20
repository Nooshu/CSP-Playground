import { describe, expect, it, vi } from "vitest";
import {
  getStaticAssetCacheControl,
  getStaticAssetContentType,
  isBrotliCompressibleAsset,
  resolveStaticAssetPath,
  tryServeBrotliAsset,
} from "../../server/serveBrotliStatic";

describe("serveBrotliStatic", () => {
  it("resolves HTML document paths", () => {
    expect(resolveStaticAssetPath("/")).toBe("/index.html");
    expect(resolveStaticAssetPath("/docs/")).toBe("/docs/index.html");
    expect(resolveStaticAssetPath("/why-csp.html")).toBe("/why-csp.html");
  });

  it("returns content types and cache headers for assets", () => {
    expect(getStaticAssetContentType("/index.html")).toBe(
      "text/html; charset=UTF-8",
    );
    expect(getStaticAssetContentType("/assets/main-abc12345.js")).toBe(
      "text/javascript; charset=UTF-8",
    );
    expect(getStaticAssetContentType("/favicon-32x32.png")).toBe("image/png");
    expect(getStaticAssetContentType("/favicon.ico")).toBe(
      "image/vnd.microsoft.icon",
    );
    expect(getStaticAssetContentType("/unknown/asset.dat")).toBe(
      "application/octet-stream",
    );
    expect(isBrotliCompressibleAsset("/index.html")).toBe(true);
    expect(isBrotliCompressibleAsset("/favicon-32x32.png")).toBe(false);
    expect(getStaticAssetCacheControl("/assets/main-abc12345.js")).toBe(
      "public, max-age=31536000, immutable, no-transform",
    );
    expect(getStaticAssetCacheControl("/index.html")).toContain(
      "must-revalidate",
    );
    expect(getStaticAssetCacheControl("/robots.txt")).toBe(
      "public, max-age=86400, no-transform",
    );
  });

  it("serves pre-compressed assets with manual encoding", async () => {
    const assets = {
      fetch: vi.fn(async (url: string) => {
        if (url.endsWith("/index.html.br")) {
          return new Response("br-body", { status: 200 });
        }
        return new Response("missing", { status: 404 });
      }),
    } as unknown as Fetcher;

    const request = new Request("https://example.com/", {
      headers: { "Accept-Encoding": "gzip, br" },
    });

    const response = await tryServeBrotliAsset(request, assets);
    expect(response).not.toBeNull();
    expect(response?.headers.get("Content-Encoding")).toBe("br");
    expect(response?.headers.get("Content-Type")).toBe(
      "text/html; charset=UTF-8",
    );
    expect(response?.headers.get("Vary")).toBe("Accept-Encoding");
  });

  it("falls through for API routes and non-brotli clients", async () => {
    const assets = { fetch: vi.fn() } as unknown as Fetcher;

    await expect(
      tryServeBrotliAsset(
        new Request("https://example.com/api/csp-lookup", { method: "POST" }),
        assets,
      ),
    ).resolves.toBeNull();

    await expect(
      tryServeBrotliAsset(
        new Request("https://example.com/", {
          headers: { "Accept-Encoding": "gzip" },
        }),
        assets,
      ),
    ).resolves.toBeNull();

    await expect(
      tryServeBrotliAsset(new Request("https://example.com/", {}), assets),
    ).resolves.toBeNull();

    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it("falls through for assets without brotli sidecars", async () => {
    const assets = {
      fetch: vi.fn(async () => new Response("br-body", { status: 200 })),
    } as unknown as Fetcher;

    const response = await tryServeBrotliAsset(
      new Request("https://example.com/favicon-32x32.png", {
        headers: { "Accept-Encoding": "gzip, br" },
      }),
      assets,
    );

    expect(response).toBeNull();
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it("falls through for GET API routes", async () => {
    const assets = { fetch: vi.fn() } as unknown as Fetcher;

    await expect(
      tryServeBrotliAsset(
        new Request("https://example.com/api/csp-lookup", { method: "GET" }),
        assets,
      ),
    ).resolves.toBeNull();
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it("falls through when the brotli sidecar fetch fails", async () => {
    const assets = {
      fetch: vi.fn(async () => new Response("missing", { status: 404 })),
    } as unknown as Fetcher;

    const response = await tryServeBrotliAsset(
      new Request("https://example.com/", {
        headers: { "Accept-Encoding": "gzip, br" },
      }),
      assets,
    );

    expect(response).toBeNull();
  });

  it("forwards etag headers and supports HEAD requests", async () => {
    const assets = {
      fetch: vi.fn(
        async () =>
          new Response("br-body", {
            status: 200,
            headers: { etag: '"abc123"' },
          }),
      ),
    } as unknown as Fetcher;

    const headResponse = await tryServeBrotliAsset(
      new Request("https://example.com/", {
        method: "HEAD",
        headers: { "Accept-Encoding": "br" },
      }),
      assets,
    );

    expect(headResponse?.status).toBe(200);
    expect(headResponse?.headers.get("etag")).toBe('"abc123"');
    expect(await headResponse?.text()).toBe("");
  });
});
