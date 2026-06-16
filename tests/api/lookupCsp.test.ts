import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupCspFromUrl } from "../../src/api/lookupCsp";

describe("lookupCspFromUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns successful lookup payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          url: "https://example.com",
          policy: "default-src 'self'",
          reportOnly: false,
          source: "header-enforce",
        }),
      }),
    );

    await expect(lookupCspFromUrl("https://example.com")).resolves.toEqual({
      url: "https://example.com",
      policy: "default-src 'self'",
      reportOnly: false,
      source: "header-enforce",
    });
  });

  it("throws lookup failures from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "no_csp",
          message: "No policy found.",
        }),
      }),
    );

    await expect(lookupCspFromUrl("https://example.com")).rejects.toEqual({
      error: "no_csp",
      message: "No policy found.",
    });
  });
});
