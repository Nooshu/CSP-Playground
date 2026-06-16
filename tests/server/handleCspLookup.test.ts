import { describe, expect, it, vi } from "vitest";
import {
  cspLookupJsonResponse,
  handleCspLookupRequest,
} from "../../server/handleCspLookup";
import { CspLookupError } from "../../server/fetchCsp";

vi.mock("../../server/fetchCsp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../server/fetchCsp")>();
  return {
    ...actual,
    lookupCspForUrl: vi.fn(),
  };
});

import { lookupCspForUrl } from "../../server/fetchCsp";

const mockedLookup = vi.mocked(lookupCspForUrl);

describe("handleCspLookupRequest", () => {
  it("rejects oversized and invalid JSON bodies", async () => {
    expect(await handleCspLookupRequest("x".repeat(5000))).toEqual({
      status: 413,
      body: { error: "invalid_url", message: "Request body is too large." },
    });

    expect(await handleCspLookupRequest("{")).toEqual({
      status: 400,
      body: { error: "invalid_url", message: "Request body must be valid JSON." },
    });
  });

  it("returns lookup results and mapped errors", async () => {
    mockedLookup.mockResolvedValueOnce({
      url: "https://example.com",
      policy: "default-src 'self'",
      reportOnly: false,
      source: "header-enforce",
    });
    expect(await handleCspLookupRequest(JSON.stringify({ url: "https://example.com" })))
      .toEqual({
        status: 200,
        body: {
          url: "https://example.com",
          policy: "default-src 'self'",
          reportOnly: false,
          source: "header-enforce",
        },
      });

    mockedLookup.mockRejectedValueOnce(
      new CspLookupError("no_csp", "No policy found."),
    );
    expect(await handleCspLookupRequest(JSON.stringify({ url: "https://example.com" })))
      .toEqual({
        status: 404,
        body: { error: "no_csp", message: "No policy found." },
      });

    mockedLookup.mockRejectedValueOnce(
      new CspLookupError("blocked_url", "Blocked."),
    );
    expect(await handleCspLookupRequest(JSON.stringify({ url: "https://example.com" })))
      .toEqual({
        status: 400,
        body: { error: "blocked_url", message: "Blocked." },
      });

    mockedLookup.mockRejectedValueOnce(new Error("boom"));
    expect(await handleCspLookupRequest(JSON.stringify({ url: "https://example.com" })))
      .toEqual({
        status: 500,
        body: {
          error: "fetch_failed",
          message: "An unexpected error occurred while looking up the URL.",
        },
      });
  });
});

describe("cspLookupJsonResponse", () => {
  it("serializes JSON responses with headers", async () => {
    const response = cspLookupJsonResponse(200, { policy: "default-src 'self'" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.text()).toContain("default-src 'self'");
  });
});
