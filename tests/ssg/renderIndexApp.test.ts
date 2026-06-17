import { describe, expect, it } from "vitest";
import { renderIndexAppHtml } from "../../src/ssg/renderIndexApp";

describe("renderIndexAppHtml", () => {
  it("includes the generated policy panel and directive sections", () => {
    const html = renderIndexAppHtml();
    expect(html).toContain('id="generated-policy"');
    expect(html).toContain('data-directive="default-src"');
    expect(html).toContain('data-directive="sandbox"');
    expect(html).toContain("Fetch directives");
  });

  it("escapes legend text and skips empty categories", () => {
    const html = renderIndexAppHtml({
      categoryOrder: ["fetch", "document"],
      categoryLabels: { fetch: "Fetch 'directives'" },
      directivesByCategory: {
        fetch: [{ name: "weird'src", category: "fetch", type: "source-list", description: "x" }],
        document: [],
      },
    });

    expect(html).toContain("Fetch &#39;directives&#39;");
    expect(html).toContain('data-directive="weird&#39;src"');
    expect(html).not.toContain("document directives");
  });

  it("falls back to the category key when no label is provided", () => {
    const html = renderIndexAppHtml({
      categoryOrder: ["fetch"],
      categoryLabels: {},
      directivesByCategory: {
        fetch: [{ name: "default-src", category: "fetch", type: "source-list", description: "x" }],
      },
    });

    expect(html).toContain("<legend>fetch</legend>");
  });
});

