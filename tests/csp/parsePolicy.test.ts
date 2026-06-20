import { describe, expect, it } from "vitest";
import {
  extractMetaCsp,
  parsePolicyString,
  parseSourceValues,
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

  it("parses double-quoted source values and unclosed quotes", () => {
    const parsed = parsePolicyString("default-src \"cdn.example.com\" 'self'");
    expect(parsed.directives["default-src"]).toEqual([
      '"cdn.example.com"',
      "'self'",
    ]);
    expect(parseSourceValues('"open-only')).toEqual(['"open-only"']);
  });

  it("tokenizes mixed quoting styles and whitespace", () => {
    expect(parseSourceValues("'self' \"cdn.example\" https://a.test")).toEqual([
      "'self'",
      '"cdn.example"',
      "https://a.test",
    ]);
    expect(parseSourceValues("   ")).toEqual([]);
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
    expect(
      parsePolicyString("  ; default-src 'self'").directives["default-src"],
    ).toEqual(["'self'"]);
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

  it("reads reversed report-only meta tags", () => {
    const html = `
      <meta content="default-src none" http-equiv="Content-Security-Policy-Report-Only">
    `;
    expect(extractMetaCsp(html)).toEqual({
      policy: "default-src none",
      reportOnly: true,
    });
  });

  it("skips empty content and returns null when absent", () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="">`;
    expect(extractMetaCsp(html)).toEqual({
      policy: null,
      reportOnly: false,
    });
  });

  it("reads enforce policy from reversed-order meta tags only", () => {
    const html = `
      <meta content="default-src self" http-equiv="Content-Security-Policy">
    `;
    expect(extractMetaCsp(html)).toEqual({
      policy: "default-src self",
      reportOnly: false,
    });
  });

  it("ignores unrelated meta tags and empty reversed content", () => {
    const html = `
      <meta http-equiv="Refresh" content="0">
      <meta content="" http-equiv="Content-Security-Policy">
      <meta content="default-src none" http-equiv="Content-Security-Policy-Report-Only">
    `;
    expect(extractMetaCsp(html)).toEqual({
      policy: "default-src none",
      reportOnly: true,
    });
  });
});
