import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CspLookupError,
  lookupCspForUrl,
  normalizeLookupUrl,
} from "../../server/fetchCsp";

function mockResponse(
  init: Partial<Response> & {
    headers?: Record<string, string>;
    text?: string;
    url?: string;
  },
): Response {
  const headers = new Headers(init.headers);
  return {
    status: init.status ?? 200,
    url: init.url ?? "https://example.com/",
    headers,
    text: async () => init.text ?? "",
  } as Response;
}

describe("normalizeLookupUrl", () => {
  it("normalizes valid public URLs", () => {
    const url = normalizeLookupUrl("example.com");
    expect(url.hostname).toBe("example.com");
    expect(url.protocol).toBe("https:");
  });

  it("allows public IPv4 hostnames", () => {
    expect(normalizeLookupUrl("https://8.8.8.8/path").hostname).toBe("8.8.8.8");
  });

  it("rejects invalid, blocked, and credential-bearing URLs", () => {
    expect(() => normalizeLookupUrl("")).toThrow(CspLookupError);
    expect(() => normalizeLookupUrl("not a url")).toThrow(/not valid/);
    expect(() => normalizeLookupUrl("ftp://example.com")).toThrow(
      /HTTP and HTTPS/,
    );
    expect(() => normalizeLookupUrl("https://user:pass@example.com")).toThrow(
      /credentials/,
    );
    expect(() => normalizeLookupUrl("https://localhost/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://app.localhost/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://device.local/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://10.0.0.5/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://127.0.0.1/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://192.168.1.1/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://172.16.0.1/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://169.254.0.1/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://0.0.0.0/path")).toThrow(
      /security reasons/,
    );
    expect(() => normalizeLookupUrl("https://999.999.999.999/path")).toThrow(
      /not valid/,
    );
  });
});

describe("lookupCspForUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns CSP from HEAD response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse({
          headers: {
            "content-security-policy": "default-src 'self'",
          },
        }),
      ),
    );

    const result = await lookupCspForUrl("https://example.com");
    expect(result.source).toBe("header-enforce");
    expect(result.policy).toBe("default-src 'self'");
  });

  it("treats redirects without a location header as errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse({
          status: 302,
          headers: {},
        }),
      ),
    );

    await expect(lookupCspForUrl("https://example.com")).rejects.toThrow(
      /invalid redirect/i,
    );
  });

  it("reports timeouts as fetch failures", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const abort = Object.assign(new Error("aborted"), {
                name: "AbortError",
              });
              reject(abort);
            });
          }),
      ),
    );

    const lookup = lookupCspForUrl("https://example.com");
    const assertion = expect(lookup).rejects.toMatchObject({
      code: "fetch_failed",
      message: /timed out/,
    });
    await vi.advanceTimersByTimeAsync(12_001);
    await assertion;
    vi.useRealTimers();
  });

  it("falls back to the normalized URL when responses omit a final URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse({
          url: "",
          headers: {
            "content-security-policy": "default-src 'self'",
          },
        }),
      ),
    );

    const result = await lookupCspForUrl("https://example.com/path");
    expect(result.url).toBe("https://example.com/path");
  });

  it("returns report-only CSP from HEAD response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse({
          headers: {
            "content-security-policy-report-only": "default-src 'none'",
          },
        }),
      ),
    );

    const result = await lookupCspForUrl("https://example.com");
    expect(result.reportOnly).toBe(true);
    expect(result.source).toBe("header-report-only");
  });

  it("follows redirects and reads CSP from GET headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(mockResponse({ status: 200 }))
        .mockResolvedValueOnce(
          mockResponse({
            headers: { "content-security-policy": "default-src 'self'" },
          }),
        ),
    );

    const result = await lookupCspForUrl("https://example.com");
    expect(result.source).toBe("header-enforce");
  });

  it("reads CSP from HTML meta tags when headers are absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(mockResponse({ status: 200 }))
        .mockResolvedValueOnce(
          mockResponse({
            status: 200,
            text: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`,
          }),
        ),
    );

    const result = await lookupCspForUrl("https://example.com");
    expect(result.source).toBe("meta-enforce");
  });

  it("reads report-only meta CSP", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(mockResponse({ status: 200 }))
        .mockResolvedValueOnce(
          mockResponse({
            status: 200,
            text: `<meta http-equiv="Content-Security-Policy-Report-Only" content="default-src 'none'">`,
          }),
        ),
    );

    const result = await lookupCspForUrl("https://example.com");
    expect(result.source).toBe("meta-report-only");
    expect(result.reportOnly).toBe(true);
  });

  it("throws when no CSP is found or fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(mockResponse({ status: 200 }))
        .mockResolvedValueOnce(
          mockResponse({
            status: 200,
            url: "",
            text: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`,
          }),
        ),
    );
    const metaResult = await lookupCspForUrl("https://example.com/page");
    expect(metaResult.source).toBe("meta-enforce");
    expect(metaResult.url).toBe("https://example.com/page");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(mockResponse({ status: 200 }))
        .mockResolvedValueOnce(
          mockResponse({ status: 200, text: "<html></html>" }),
        ),
    );
    await expect(lookupCspForUrl("https://example.com")).rejects.toMatchObject({
      code: "no_csp",
    });

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(mockResponse({ status: 200 }))
        .mockResolvedValueOnce(mockResponse({ status: 404 })),
    );
    await expect(lookupCspForUrl("https://example.com")).rejects.toMatchObject({
      code: "fetch_failed",
    });
  });

  it("handles redirect, timeout, and network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse({ status: 302, headers: {} })),
    );
    await expect(lookupCspForUrl("https://example.com")).rejects.toMatchObject({
      code: "fetch_failed",
    });

    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));
    await expect(lookupCspForUrl("https://example.com")).rejects.toMatchObject({
      code: "fetch_failed",
      message: /timed out/,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    await expect(lookupCspForUrl("https://example.com")).rejects.toMatchObject({
      code: "fetch_failed",
      message: /Could not reach/,
    });

    let redirectCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        redirectCount += 1;
        return Promise.resolve(
          mockResponse({
            status: 302,
            headers: { location: "/loop" },
          }),
        );
      }),
    );
    await expect(lookupCspForUrl("https://example.com")).rejects.toMatchObject({
      code: "fetch_failed",
      message: /Too many redirects/,
    });
    expect(redirectCount).toBeGreaterThan(5);
  });
});
