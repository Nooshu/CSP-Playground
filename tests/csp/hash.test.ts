import { describe, expect, it } from "vitest";
import {
  buildInlineStyleAttributeSnippet,
  formatSha256HashForCsp,
  sha256Base64FromText,
  STYLE_ATTR_UNSAFE_HASHES,
} from "../../src/csp/hash";

describe("hash helpers", () => {
  it("hashes text and formats CSP values", async () => {
    const hash = await sha256Base64FromText("display:none");
    expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(formatSha256HashForCsp(hash)).toBe(`'sha256-${hash}'`);
  });

  it("builds escaped inline style attribute snippets", () => {
    expect(buildInlineStyleAttributeSnippet('color: red; content: "<"')).toBe(
      '<div style="color: red; content: &quot;&lt;&quot;">...</div>',
    );
    expect(STYLE_ATTR_UNSAFE_HASHES).toBe("'unsafe-hashes'");
  });
});
