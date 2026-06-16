import { describe, expect, it } from "vitest";
import { KEYWORD_OPTIONS } from "../../src/csp/keywords";

describe("keywords", () => {
  it("exports keyword options with labels", () => {
    expect(KEYWORD_OPTIONS.length).toBeGreaterThan(0);
    expect(KEYWORD_OPTIONS[0]).toMatchObject({
      value: expect.any(String),
      label: expect.any(String),
      quoted: expect.any(Boolean),
    });
    expect(KEYWORD_OPTIONS.some((option) => option.value === "'self'")).toBe(
      true,
    );
  });
});
