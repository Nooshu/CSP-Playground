import { describe, expect, it } from "vitest";
import {
  buildHeaderLine,
  buildPolicyString,
  createInitialPolicyState,
} from "../../src/csp/buildPolicy";

describe("buildPolicy", () => {
  it("creates an empty initial state", () => {
    expect(createInitialPolicyState()).toEqual({});
  });

  it("skips disabled directives", () => {
    expect(
      buildPolicyString({
        "script-src": { enabled: false, values: ["'self'"] },
      }),
    ).toBe("");
  });

  it("builds upgrade-insecure-requests without values", () => {
    expect(
      buildPolicyString({
        "upgrade-insecure-requests": { enabled: true, values: [] },
      }),
    ).toBe("upgrade-insecure-requests");
  });

  it("builds sandbox with and without flags", () => {
    expect(
      buildPolicyString({
        sandbox: { enabled: true, values: [" allow-scripts ", ""] },
      }),
    ).toBe("sandbox allow-scripts");

    expect(
      buildPolicyString({
        sandbox: { enabled: true, values: ["  ", ""] },
      }),
    ).toBe("sandbox");
  });

  it("collapses 'none' and skips empty source lists", () => {
    expect(
      buildPolicyString({
        "default-src": { enabled: true, values: ["'self'", "'none'"] },
        "img-src": { enabled: true, values: ["  "] },
      }),
    ).toBe("default-src 'none'");
  });

  it("joins multiple directives", () => {
    expect(
      buildPolicyString({
        "default-src": { enabled: true, values: ["'self'"] },
        "script-src": { enabled: true, values: ["'self'"] },
      }),
    ).toBe("default-src 'self'; script-src 'self'");
  });

  it("builds header lines", () => {
    expect(buildHeaderLine("", false)).toBe("");
    expect(buildHeaderLine("default-src 'self'", false)).toBe(
      "Content-Security-Policy: default-src 'self'",
    );
    expect(buildHeaderLine("default-src 'self'", true)).toBe(
      "Content-Security-Policy-Report-Only: default-src 'self'",
    );
  });
});
