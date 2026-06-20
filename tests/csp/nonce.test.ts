import { describe, expect, it } from "vitest";
import {
  buildExternalScriptSnippet,
  buildExternalStylesheetSnippet,
  buildInlineScriptSnippet,
  buildInlineStyleSnippet,
  formatNonceForCsp,
  generateNonce,
  hostSourceFromScriptUrl,
  hostSourceFromUrl,
  parseScriptUrl,
  parseStylesheetUrl,
} from "../../src/csp/nonce";

describe("nonce helpers", () => {
  it("generates url-safe nonces", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(formatNonceForCsp(nonce)).toBe(`'nonce-${nonce}'`);
  });

  it("derives host sources from URLs", () => {
    expect(hostSourceFromUrl("https://cdn.example.com/app.js")).toBe(
      "https://cdn.example.com",
    );
    expect(hostSourceFromScriptUrl("https://cdn.example.com/app.js")).toBe(
      "https://cdn.example.com",
    );
  });

  it("builds escaped HTML snippets", () => {
    const nonce = "abc123";
    expect(
      buildExternalScriptSnippet(nonce, 'https://x.com/a"&<.js'),
    ).toContain("a&quot;&amp;&lt;.js");
    expect(buildInlineScriptSnippet(nonce, "  alert(1)  ")).toBe(
      `<script nonce="${nonce}">\nalert(1)\n</script>`,
    );
    expect(
      buildExternalStylesheetSnippet(nonce, 'https://x.com/s"&<.css'),
    ).toContain("s&quot;&amp;&lt;.css");
    expect(buildInlineStyleSnippet(nonce, "  body{}  ")).toBe(
      `<style nonce="${nonce}">\nbody{}\n</style>`,
    );
  });

  it("validates script URLs", () => {
    expect(parseScriptUrl("https://example.com/app.js")).toBe(
      "https://example.com/app.js",
    );
    expect(() => parseScriptUrl("")).toThrow("Enter the URL of the script.");
    expect(() => parseScriptUrl("ftp://example.com/a.js")).toThrow(
      "Only HTTP and HTTPS script URLs are supported.",
    );
    expect(() => parseScriptUrl("not-a-url")).toThrow(
      "Enter a valid script URL.",
    );
  });

  it("validates stylesheet URLs", () => {
    expect(parseStylesheetUrl("http://example.com/s.css")).toBe(
      "http://example.com/s.css",
    );
    expect(() => parseStylesheetUrl("")).toThrow(
      "Enter the URL of the stylesheet.",
    );
    expect(() => parseStylesheetUrl("javascript:alert(1)")).toThrow(
      "Only HTTP and HTTPS stylesheet URLs are supported.",
    );
  });
});
