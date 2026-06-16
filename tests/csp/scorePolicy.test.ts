import { describe, expect, it } from "vitest";
import { scorePolicy, type PolicyState } from "../../src/csp/scorePolicy";

function state(
  entries: Record<string, { enabled: boolean; values: string[] }>,
): PolicyState {
  return entries;
}

describe("scorePolicy", () => {
  it("scores an empty policy as poor with recommendations", () => {
    const result = scorePolicy({});
    expect(result.score).toBe(0);
    expect(result.grade).toBe("Poor");
    expect(result.summary).toBe("No policy configured yet.");
    expect(result.recommendations[0]?.id).toBe("enable-default-src");
  });

  it("covers grade and summary bands", () => {
    const weak = scorePolicy(
      state({
        "script-src": { enabled: true, values: ["'unsafe-inline'"] },
        "object-src": { enabled: true, values: ["'none'"] },
      }),
    );
    expect(weak.grade).toBe("Poor");
    expect(weak.summary).toContain("Weak policy");

    const fair = scorePolicy(
      state({
        "default-src": { enabled: true, values: ["'self'"] },
        "script-src": { enabled: true, values: ["'self'"] },
        "object-src": { enabled: true, values: ["'none'"] },
      }),
    );
    expect(["Fair", "Good"]).toContain(fair.grade);

    const strong = scorePolicy(
      state({
        "default-src": { enabled: true, values: ["'self'"] },
        "script-src": {
          enabled: true,
          values: ["'nonce-abc'", "'strict-dynamic'"],
        },
        "object-src": { enabled: true, values: ["'none'"] },
        "frame-ancestors": { enabled: true, values: ["'self'"] },
        "base-uri": { enabled: true, values: ["'self'"] },
        "form-action": { enabled: true, values: ["'self'"] },
        "upgrade-insecure-requests": { enabled: true, values: [] },
      }),
    );
    expect(["Strong", "Excellent", "Good"]).toContain(strong.grade);
    expect(strong.summary.length).toBeGreaterThan(0);
  });

  it("uses default-src as script fallback and scores wildcard frame ancestors", () => {
    const result = scorePolicy(
      state({
        "default-src": { enabled: true, values: ["'nonce-abc'"] },
        "object-src": { enabled: true, values: ["'none'"] },
        "frame-ancestors": { enabled: true, values: ["*"] },
        "base-uri": { enabled: true, values: ["https://evil.example"] },
      }),
      { reportOnly: true },
    );

    expect(
      result.factors.some((factor) => factor.label.includes("overly permissive")),
    ).toBe(true);
    expect(
      result.recommendations.some((item) => item.id === "enforce-policy"),
    ).toBe(true);
    expect(
      result.recommendations.some((item) => item.id === "tighten-frame-ancestors"),
    ).toBe(true);
    expect(
      result.recommendations.some((item) => item.id === "restrict-base-uri"),
    ).toBe(true);
  });

  it("recommends script, object, default, trusted types, and nonce improvements", () => {
    const result = scorePolicy(
      state({
        "script-src": {
          enabled: true,
          values: ["'unsafe-inline'", "'unsafe-eval'", "data:", "*.example.com"],
        },
      }),
    );

    const ids = result.recommendations.map((item) => item.id);
    expect(ids).toContain("remove-unsafe-inline");
    expect(ids).toContain("remove-unsafe-eval");
    expect(ids).toContain("add-nonce-hash");
    expect(ids).toContain("remove-data-scripts");
    expect(ids).toContain("tighten-script-sources");
    expect(ids).toContain("object-src-none");
    expect(ids).toContain("add-default-src");
    expect(ids).toContain("add-frame-ancestors");
    expect(ids).toContain("add-base-uri");
    expect(ids).toContain("add-form-action");
    expect(ids).toContain("upgrade-insecure-requests");
    expect(ids).toContain("require-trusted-types");
    expect(ids).toContain("trusted-types");
  });

  it("recommends strict-dynamic when nonce exists without it", () => {
    const result = scorePolicy(
      state({
        "script-src": { enabled: true, values: ["'nonce-abc'"] },
        "object-src": { enabled: true, values: ["'none'"] },
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    );
    expect(
      result.recommendations.some((item) => item.id === "add-strict-dynamic"),
    ).toBe(true);
  });

  it("recommends tightening default-src and handles script via default-src", () => {
    const result = scorePolicy(
      state({
        "default-src": { enabled: true, values: ["https:", "'self'"] },
        "object-src": { enabled: true, values: ["'none'"] },
      }),
    );
    expect(
      result.recommendations.some((item) => item.id === "remove-default-wildcards"),
    ).toBe(true);
    expect(
      result.recommendations.some((item) => item.id === "restrict-default-src"),
    ).toBe(true);
  });

  it("detects hash sources and missing script coverage", () => {
    const hashOnly = scorePolicy(
      state({
        "script-src": { enabled: true, values: ["'sha256-abc'"] },
        "object-src": { enabled: true, values: ["'none'"] },
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    );
    expect(
      hashOnly.factors.some((factor) => factor.label.includes("nonce or hash")),
    ).toBe(true);

    const noScript = scorePolicy(
      state({
        "img-src": { enabled: true, values: ["'self'"] },
        "object-src": { enabled: true, values: ["'none'"] },
      }),
    );
    expect(
      noScript.recommendations.some((item) => item.id === "add-script-coverage"),
    ).toBe(true);
  });

  it("covers additional summary thresholds", () => {
    const excellent = scorePolicy(
      state({
        "default-src": { enabled: true, values: ["'self'"] },
        "script-src": {
          enabled: true,
          values: ["'nonce-abc'", "'strict-dynamic'"],
        },
        "object-src": { enabled: true, values: ["'none'"] },
        "frame-ancestors": { enabled: true, values: ["'self'"] },
        "base-uri": { enabled: true, values: ["'self'"] },
        "form-action": { enabled: true, values: ["'self'"] },
        "upgrade-insecure-requests": { enabled: true, values: [] },
        "require-trusted-types-for": { enabled: true, values: ["'script'"] },
        "trusted-types": { enabled: true, values: ["default"] },
      }),
    );
    expect(["Excellent", "Strong"]).toContain(excellent.grade);
    expect(excellent.summary.length).toBeGreaterThan(10);
  });

  it("caps potential score at 100", () => {
    const result = scorePolicy({});
    expect(result.potentialScore).toBeLessThanOrEqual(100);
  });
});
