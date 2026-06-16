import { describe, expect, it } from "vitest";
import {
  extractMetaCsp,
  parsePolicyString,
} from "../../src/csp/parsePolicy";

describe("parsePolicyString", () => {
  it("parses quoted and unquoted source values", () => {
    const parsed = parsePolicyString(
      "default-src 'self' https://cdn.example.com; script-src 'nonce-abc' data:",
    );
    expect(parsed.directives["default-src"]).toEqual([
      "'self'",
      "https://cdn.example.com",
    ]);
    expect(parsed.directives["script-src"]).toEqual(["'nonce-abc'", "data:"]);
    expect(parsed.reportOnly).toBe(false);
  });

  it("parses boolean directives and empty segments", () => {
    const parsed = parsePolicyString(
      "upgrade-insecure-requests; block-all-mixed-content; ; sandbox",
    );
    expect(parsed.directives["upgrade-insecure-requests"]).toEqual([]);
    expect(parsed.directives["block-all-mixed-content"]).toEqual([]);
    expect(parsed.directives.sandbox).toEqual([]);
  });

  it("ignores segments without a name", () => {
    expect(parsePolicyString("   ").directives).toEqual({});
  });
});

describe("extractMetaCsp", () => {
  it("prefers enforce meta over report-only", () => {
    const html = `
      <meta http-equiv="Content-Security-Policy-Report-Only" content="default-src none">
      <meta http-equiv="Content-Security-Policy" content="default-src self">
    `;
    expect(extractMetaCsp(html)).toEqual({
      policy: "default-src self",
      reportOnly: false,
    });
  });

  it("reads report-only meta when enforce is absent", () => {
    const html = `
      <meta http-equiv="Content-Security-Policy-Report-Only" content="default-src none">
    `;
    expect(extractMetaCsp(html)).toEqual({
      policy: "default-src none",
      reportOnly: true,
    });
  });

  it("reads reversed attribute order", () => {
    const html = `
      <meta content="default-src self" http-equiv="Content-Security-Policy">
    `;
    expect(extractMetaCsp(html)).toEqual({
      policy: "default-src self",
      reportOnly: false,
    });
  });

  it("skips empty content and returns null when absent", () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="">`;
    expect(extractMetaCsp(html)).toEqual({
      policy: null,
      reportOnly: false,
    });
  });
});
