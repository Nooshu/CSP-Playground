import { describe, expect, it } from "vitest";
import { buildPolicyString } from "../../src/csp/buildPolicy";
import { isPolicyStateEmpty } from "../../src/csp/policyState";
import { CSP_PRESETS, getCspPreset } from "../../src/csp/presets";

describe("CSP_PRESETS", () => {
  it("defines three presets from beginner to advanced", () => {
    expect(CSP_PRESETS.map((preset) => preset.id)).toEqual([
      "beginner",
      "intermediate",
      "advanced",
    ]);
  });

  it("builds non-empty policy strings", () => {
    for (const preset of CSP_PRESETS) {
      const policy = buildPolicyString(preset.state);
      expect(policy.length).toBeGreaterThan(0);
      expect(isPolicyStateEmpty(preset.state)).toBe(false);
    }
  });

  it("tightens script-src from beginner to advanced", () => {
    const beginner = CSP_PRESETS.find((preset) => preset.id === "beginner");
    const advanced = CSP_PRESETS.find((preset) => preset.id === "advanced");

    expect(beginner?.state["script-src"]?.values).toContain("'unsafe-inline'");
    expect(advanced?.state["script-src"]?.values).not.toContain(
      "'unsafe-inline'",
    );
  });
});

describe("getCspPreset", () => {
  it("returns a preset by id", () => {
    expect(getCspPreset("intermediate")?.title).toBe("Intermediate");
    expect(getCspPreset("missing" as "beginner")).toBeUndefined();
  });
});

describe("isPolicyStateEmpty", () => {
  it("returns true when no directives are enabled", () => {
    expect(isPolicyStateEmpty({})).toBe(true);
    expect(
      isPolicyStateEmpty({
        "default-src": { enabled: false, values: [] },
      }),
    ).toBe(true);
  });

  it("returns false when any directive is enabled", () => {
    expect(
      isPolicyStateEmpty({
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    ).toBe(false);
  });
});
