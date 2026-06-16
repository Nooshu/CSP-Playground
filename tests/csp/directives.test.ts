import { describe, expect, it } from "vitest";
import {
  CATEGORY_LABELS,
  DIRECTIVES,
  DIRECTIVES_BY_CATEGORY,
  getMdnDirectiveUrl,
  SANDBOX_FLAGS,
  TRUSTED_TYPES_FOR_OPTIONS,
} from "../../src/csp/directives";

describe("directives metadata", () => {
  it("groups directives by category", () => {
    expect(Object.keys(CATEGORY_LABELS).length).toBeGreaterThan(0);
    expect(DIRECTIVES.length).toBeGreaterThan(0);
    expect(DIRECTIVES_BY_CATEGORY.fetch?.length).toBeGreaterThan(0);
    for (const directive of DIRECTIVES) {
      expect(DIRECTIVES_BY_CATEGORY[directive.category]).toContain(directive);
    }
  });

  it("exposes sandbox flags and trusted types options", () => {
    expect(SANDBOX_FLAGS.length).toBeGreaterThan(0);
    expect(TRUSTED_TYPES_FOR_OPTIONS).toEqual(["'script'"]);
  });

  it("builds MDN directive URLs", () => {
    expect(getMdnDirectiveUrl("script-src")).toContain("script-src");
  });
});
