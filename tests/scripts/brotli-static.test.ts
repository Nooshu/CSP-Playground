import { describe, expect, it } from "vitest";
import {
  FINGERPRINTED_ASSET_CACHE_CONTROL,
  getStaticAssetCacheControl,
  getStaticAssetContentType,
  isFingerprintedAsset,
  requestAcceptsBrotli,
  resolveStaticAssetPath,
} from "../../scripts/lib/brotli-static.mjs";

describe("scripts/lib/brotli-static", () => {
  it("matches Cloudflare static asset path rules", () => {
    expect(resolveStaticAssetPath("/")).toBe("/index.html");
    expect(resolveStaticAssetPath("/why-csp.html")).toBe("/why-csp.html");
    expect(getStaticAssetContentType("/assets/main-abc12345.js")).toBe(
      "text/javascript; charset=UTF-8",
    );
    expect(isFingerprintedAsset("/assets/main-abc12345.js")).toBe(true);
    expect(isFingerprintedAsset("/assets/main-abc12345.css")).toBe(true);
    expect(isFingerprintedAsset("/site-footer-year.mjs")).toBe(false);
    expect(getStaticAssetCacheControl("/assets/main-abc12345.js")).toBe(
      FINGERPRINTED_ASSET_CACHE_CONTROL,
    );
  });

  it("detects brotli acceptance", () => {
    expect(
      requestAcceptsBrotli({
        headers: { "accept-encoding": "gzip, br" },
      } as never),
    ).toBe(true);
    expect(
      requestAcceptsBrotli({
        headers: { "accept-encoding": "gzip" },
      } as never),
    ).toBe(false);
  });
});
