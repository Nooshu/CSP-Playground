import { describe, expect, it } from "vitest";
import type { PolicyState } from "../../src/csp/buildPolicy";
import { applyParsedPolicy, applyPolicyState } from "../../src/ui/applyPolicy";
import type { DirectiveSectionHandle } from "../../src/ui/DirectiveSection";

function createMockSection(directiveName: string): {
  section: DirectiveSectionHandle;
  resetCalls: number;
  lastState: { enabled: boolean; values: string[] } | null;
} {
  let resetCalls = 0;
  let lastState: { enabled: boolean; values: string[] } | null = null;
  const element = document.createElement("article");
  element.dataset.directive = directiveName;

  const section: DirectiveSectionHandle = {
    element,
    reset: () => {
      resetCalls += 1;
      lastState = null;
    },
    getState: () => lastState ?? { enabled: false, values: [] },
    setState: (state) => {
      lastState = state;
    },
  };

  return {
    section,
    get resetCalls() {
      return resetCalls;
    },
    get lastState() {
      return lastState;
    },
  };
}

describe("applyParsedPolicy", () => {
  it("resets sections and applies matching directives", () => {
    const defaultSection = createMockSection("default-src");
    const scriptSection = createMockSection("script-src");

    const applied = applyParsedPolicy(
      [defaultSection.section, scriptSection.section],
      {
        reportOnly: false,
        directives: {
          "default-src": ["'self'"],
        },
      },
    );

    expect(applied).toBe(1);
    expect(defaultSection.resetCalls).toBe(1);
    expect(defaultSection.lastState).toEqual({
      enabled: true,
      values: ["'self'"],
    });
    expect(scriptSection.lastState).toBeNull();
  });

  it("skips sections without directive names", () => {
    const section = createMockSection("default-src");
    delete section.section.element.dataset.directive;

    expect(
      applyParsedPolicy([section.section], {
        reportOnly: false,
        directives: { "default-src": ["'self'"] },
      }),
    ).toBe(0);
  });
});

describe("applyPolicyState", () => {
  it("resets sections and applies matching directive state", () => {
    const defaultSection = createMockSection("default-src");
    const scriptSection = createMockSection("script-src");

    const state: PolicyState = {
      "default-src": { enabled: true, values: ["'self'"] },
      "script-src": { enabled: true, values: ["'self'", "'unsafe-inline'"] },
    };

    const applied = applyPolicyState(
      [defaultSection.section, scriptSection.section],
      state,
    );

    expect(applied).toBe(2);
    expect(defaultSection.lastState).toEqual({
      enabled: true,
      values: ["'self'"],
    });
    expect(scriptSection.lastState).toEqual({
      enabled: true,
      values: ["'self'", "'unsafe-inline'"],
    });
  });

  it("skips sections without directive names when applying state", () => {
    const section = createMockSection("default-src");
    delete section.section.element.dataset.directive;

    expect(
      applyPolicyState([section.section], {
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    ).toBe(0);
  });

  it("skips disabled directives when applying state", () => {
    const section = createMockSection("default-src");

    expect(
      applyPolicyState([section.section], {
        "default-src": { enabled: false, values: ["'self'"] },
      }),
    ).toBe(0);
  });
});
