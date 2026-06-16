import { describe, expect, it } from "vitest";
import { createMdnInfoLink } from "../../src/ui/mdnLink";

describe("createMdnInfoLink", () => {
  it("creates an accessible MDN link", () => {
    const link = createMdnInfoLink("script-src");
    expect(link.href).toContain("script-src");
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
    expect(link.getAttribute("aria-label")).toContain("script-src");
    expect(link.querySelector("svg")).not.toBeNull();
  });
});
