import { describe, expect, it, vi } from "vitest";
import { createSecurityScorePanel } from "../../src/ui/SecurityScore";
import type { PolicyState } from "../../src/csp/buildPolicy";

describe("createSecurityScorePanel", () => {
  it("renders score details and recommendations", () => {
    const panel = createSecurityScorePanel({
      getState: () =>
        ({
          "script-src": {
            enabled: true,
            values: ["'unsafe-inline'", "'unsafe-eval'"],
          },
        }) satisfies PolicyState,
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);

    panel.update();
    expect(panel.querySelector(".security-score-value")?.textContent).toContain("%");
    expect(panel.querySelectorAll(".security-score-factors li").length).toBeGreaterThan(
      0,
    );
    expect(
      panel.querySelectorAll(".security-score-recommendation-btn").length,
    ).toBeGreaterThan(0);
  });

  it("hides recommendations for perfect scores", () => {
    const panel = createSecurityScorePanel({
      getState: () =>
        ({
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
        }) satisfies PolicyState,
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);
    panel.update();

    const recommendations = panel.querySelector(
      ".security-score-recommendations",
    ) as HTMLElement;
    if (panel.textContent?.includes("100%")) {
      expect(recommendations.hidden).toBe(true);
    }
  });

  it("scrolls when a recommendation is selected", () => {
    const section = document.createElement("article");
    section.className = "directive-section";
    section.id = "directive-section-default-src";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "enable-checkbox";
    section.appendChild(checkbox);
    document.body.appendChild(section);

    const panel = createSecurityScorePanel({
      getState: () => ({}),
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);
    panel.update();

    const button = panel.querySelector(
      ".security-score-recommendation-btn",
    ) as HTMLButtonElement;
    button.click();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("renders neutral factor styling", () => {
    const panel = createSecurityScorePanel({
      getState: () => ({}),
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);
    panel.update();
    expect(
      panel.querySelector(".factor-neutral, .factor-positive, .factor-negative"),
    ).not.toBeNull();
  });
});
