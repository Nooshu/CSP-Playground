import { describe, expect, it } from "vitest";
import {
  ExtractCspError,
  extractCspFromText,
} from "../../src/csp/extractCspFromText";

describe("extractCspFromText", () => {
  it("extracts enforce policies from response headers", () => {
    const text = [
      "HTTP/1.1 200 OK",
      "Content-Type: text/html",
      "Content-Security-Policy: default-src 'self'; script-src 'self'",
      "Cache-Control: no-cache",
    ].join("\n");

    expect(extractCspFromText(text)).toEqual({
      policy: "default-src 'self'; script-src 'self'",
      reportOnly: false,
      source: "header-enforce",
    });
  });

  it("prefers enforce headers over report-only", () => {
    const text = [
      "Content-Security-Policy-Report-Only: default-src 'none'",
      "Content-Security-Policy: default-src 'self'",
    ].join("\n");

    expect(extractCspFromText(text)).toEqual({
      policy: "default-src 'self'",
      reportOnly: false,
      source: "header-enforce",
    });
  });

  it("extracts report-only headers when enforce is absent", () => {
    expect(
      extractCspFromText(
        "Content-Security-Policy-Report-Only: default-src 'none'",
      ),
    ).toEqual({
      policy: "default-src 'none'",
      reportOnly: true,
      source: "header-report-only",
    });
  });

  it("combines multiple enforce header lines", () => {
    const text = [
      "Content-Security-Policy: default-src 'self'",
      "Content-Security-Policy: script-src 'self'",
    ].join("\n");

    expect(extractCspFromText(text)).toEqual({
      policy: "default-src 'self'; script-src 'self'",
      reportOnly: false,
      source: "header-enforce",
    });
  });

  it("extracts CSP when header name and value are on separate lines", () => {
    expect(
      extractCspFromText(
        "Content-Security-Policy:\ndefault-src 'self'",
      ),
    ).toEqual({
      policy: "default-src 'self'",
      reportOnly: false,
      source: "header-enforce",
    });
  });

  it("extracts report-only CSP from collapsed multiline header text", () => {
    expect(
      extractCspFromText(
        "Content-Security-Policy-Report-Only:\ndefault-src 'none'",
      ),
    ).toEqual({
      policy: "default-src 'none'",
      reportOnly: true,
      source: "header-report-only",
    });
  });

  it("extracts CSP from indented response header blocks", () => {
    const text = [
      "  Access-Control-Allow-Origin: https://nooshu.com",
      "  Cache-Control: public, max-age=31536000",
      "  Content-Security-Policy: default-src 'none'; script-src 'self' https://example.com",
      "  X-Frame-Options: DENY",
    ].join("\n");

    expect(extractCspFromText(text)).toEqual({
      policy: "default-src 'none'; script-src 'self' https://example.com",
      reportOnly: false,
      source: "header-enforce",
    });
  });

  it("extracts CSP from a single pasted header line", () => {
    expect(
      extractCspFromText(
        "Content-Security-Policy: default-src 'none'; script-src 'self' https://example.com",
      ),
    ).toEqual({
      policy: "default-src 'none'; script-src 'self' https://example.com",
      reportOnly: false,
      source: "header-enforce",
    });
  });

  it("accepts a single header line paste", () => {
    expect(
      extractCspFromText(
        "Content-Security-Policy: default-src 'self'; object-src 'none'",
      ),
    ).toEqual({
      policy: "default-src 'self'; object-src 'none'",
      reportOnly: false,
      source: "header-enforce",
    });
  });

  it("accepts raw policy text", () => {
    expect(extractCspFromText("default-src 'self'; object-src 'none'")).toEqual({
      policy: "default-src 'self'; object-src 'none'",
      reportOnly: false,
      source: "raw",
    });
  });

  it("treats multiline raw policy as one value", () => {
    expect(
      extractCspFromText("default-src 'self';\nscript-src 'self' https://cdn.example.com"),
    ).toEqual({
      policy: "default-src 'self'; script-src 'self' https://cdn.example.com",
      reportOnly: false,
      source: "raw",
    });
  });

  it("throws when input is empty", () => {
    expect(() => extractCspFromText("   ")).toThrow(ExtractCspError);
    try {
      extractCspFromText("   ");
    } catch (error) {
      expect((error as ExtractCspError).code).toBe("empty");
    }
  });

  it("throws when headers contain no CSP", () => {
    expect(() =>
      extractCspFromText("HTTP/1.1 200 OK\nContent-Type: text/html"),
    ).toThrow(ExtractCspError);
    try {
      extractCspFromText("HTTP/1.1 200 OK\nContent-Type: text/html");
    } catch (error) {
      expect((error as ExtractCspError).code).toBe("no_csp");
    }
  });
});
