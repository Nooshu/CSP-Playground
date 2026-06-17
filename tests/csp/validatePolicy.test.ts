import { describe, expect, it } from "vitest";
import { validatePolicyString } from "../../src/csp/validatePolicy";

describe("validatePolicyString", () => {
  it("reports no issues for a well-formed policy", () => {
    const result = validatePolicyString("default-src 'self'; script-src 'self'");
    expect(result.hasErrors).toBe(false);
    expect(result.issues).toHaveLength(0);
    expect(result.correctedPolicy).toBe(
      "default-src 'self'; script-src 'self'",
    );
  });

  it("merges duplicate directives in corrected output", () => {
    const result = validatePolicyString(
      "script-src 'self'; default-src 'none'; script-src https://cdn.example.com",
    );
    expect(result.hasErrors).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes("script-src appears 2 times"))).toBe(
      true,
    );
    expect(result.correctedPolicy).toBe(
      "default-src 'none'; script-src 'self' https://cdn.example.com",
    );
  });

  it("flags and deduplicates repeated values", () => {
    const result = validatePolicyString("default-src 'self' 'self'");
    expect(result.hasErrors).toBe(true);
    expect(
      result.issues.some(
        (issue) =>
          issue.directive === "default-src" &&
          issue.message.includes("'self' is repeated"),
      ),
    ).toBe(true);
    expect(result.correctedPolicy).toBe("default-src 'self'");
  });

  it("flags none combined with other sources and corrects", () => {
    const result = validatePolicyString(
      "img-src 'none' https://example.com",
    );
    expect(result.hasErrors).toBe(true);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("'none' in img-src must not be combined"),
      ),
    ).toBe(true);
    expect(result.correctedPolicy).toBe("img-src 'none'");
  });

  it("flags unquoted keywords and quotes them in corrected output", () => {
    const result = validatePolicyString("default-src self");
    expect(result.hasErrors).toBe(true);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("Keyword self in default-src should be quoted"),
      ),
    ).toBe(true);
    expect(result.correctedPolicy).toBe("default-src 'self'");
  });

  it("flags unknown directives", () => {
    const result = validatePolicyString("foo-src 'self'");
    expect(result.hasErrors).toBe(true);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("foo-src is not a recognized CSP directive"),
      ),
    ).toBe(true);
    expect(result.correctedPolicy).toBe("");
  });

  it("flags boolean directives with values and corrects", () => {
    const result = validatePolicyString("upgrade-insecure-requests extra");
    expect(result.hasErrors).toBe(true);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("upgrade-insecure-requests must not have a value list"),
      ),
    ).toBe(true);
    expect(result.correctedPolicy).toBe("upgrade-insecure-requests");
  });

  it("warns for deprecated report-uri", () => {
    const result = validatePolicyString(
      "default-src 'self'; report-uri https://example.com/report",
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.severity === "warning" &&
          issue.directive === "report-uri" &&
          issue.message.includes("deprecated"),
      ),
    ).toBe(true);
    expect(result.correctedPolicy).toContain("report-uri https://example.com/report");
  });

  it("warns for block-all-mixed-content not in builder", () => {
    const result = validatePolicyString(
      "default-src 'self'; block-all-mixed-content",
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.severity === "warning" &&
          issue.directive === "block-all-mixed-content",
      ),
    ).toBe(true);
    expect(result.correctedPolicy).toContain("block-all-mixed-content");
  });

  it("flags empty source lists", () => {
    const result = validatePolicyString("script-src");
    expect(result.hasErrors).toBe(true);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("script-src has no source values"),
      ),
    ).toBe(true);
  });

  it("flags invalid sandbox flags", () => {
    const result = validatePolicyString("sandbox allow-invalid");
    expect(result.hasErrors).toBe(true);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("allow-invalid is not a valid sandbox flag"),
      ),
    ).toBe(true);
    expect(result.correctedPolicy).toBe("sandbox");
  });
});
