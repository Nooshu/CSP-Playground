import { describe, expect, it, vi } from "vitest";
import {
  getStaticAssetCacheControl,
  getStaticAssetContentType,
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
    expect(getStaticAssetCacheControl("/assets/main-abc12345.js")).toBe(
      "public, max-age=31536000, immutable, no-transform",
    );
    expect(getStaticAssetCacheControl("/index.html")).toContain(
      "must-revalidate",
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

    expect(assets.fetch).not.toHaveBeenCalled();
  });
});
