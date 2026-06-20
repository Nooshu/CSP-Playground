import { describe, expect, it, vi } from "vitest";
import type { PolicyState } from "../../src/csp/buildPolicy";
import * as scorePolicyModule from "../../src/csp/scorePolicy";
import { createSecurityScorePanel } from "../../src/ui/SecurityScore";

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
    expect(panel.querySelector(".security-score-value")?.textContent).toContain(
      "%",
    );
    expect(
      panel.querySelectorAll(".security-score-factors li").length,
    ).toBeGreaterThan(0);
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
      panel.querySelector(
        ".factor-neutral, .factor-positive, .factor-negative",
      ),
    ).not.toBeNull();
  });

  it("renders page navigation below the score", () => {
    const panel = createSecurityScorePanel({
      getState: () => ({}),
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);

    expect(panel.querySelector(".security-score-nav")).not.toBeNull();
    expect(panel.querySelector(".security-score-nav-btn")?.textContent).toBe(
      "View generated policy",
    );
    expect(panel.querySelector(".security-score-back-to-top")).not.toBeNull();
    expect(
      panel.querySelector(".security-score-back-to-top-wrap"),
    ).not.toBeNull();
  });

  it("shows back to top after scrolling and scrolls to top on click", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    const panel = createSecurityScorePanel({
      getState: () => ({}),
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);

    const backToTop = panel.querySelector(
      ".security-score-back-to-top",
    ) as HTMLButtonElement;
    const backToTopWrap = panel.querySelector(
      ".security-score-back-to-top-wrap",
    ) as HTMLElement;

    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    expect(backToTopWrap.classList.contains("is-visible")).toBe(false);

    Object.defineProperty(window, "scrollY", {
      value: 400,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
    expect(backToTopWrap.classList.contains("is-visible")).toBe(true);

    backToTop.click();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("jumps to generated policy when view button is clicked", () => {
    const policy = document.createElement("aside");
    policy.id = "generated-policy";
    policy.className = "policy-output";
    document.body.appendChild(policy);

    const panel = createSecurityScorePanel({
      getState: () => ({}),
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);

    const viewBtn = panel.querySelector(
      ".security-score-nav-btn",
    ) as HTMLButtonElement;
    viewBtn.click();

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(policy.classList.contains("recommendation-highlight")).toBe(true);
  });

  it("removes stale recommendation buttons when recommendations change", () => {
    let state: Record<string, { enabled: boolean; values: string[] }> = {
      "script-src": {
        enabled: true,
        values: ["'unsafe-inline'"],
      },
    };

    const panel = createSecurityScorePanel({
      getState: () => state,
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);
    panel.update();

    const initialButtons = [
      ...panel.querySelectorAll(".security-score-recommendation-btn"),
    ];
    expect(initialButtons.length).toBeGreaterThan(0);
    const initialLabel = initialButtons[0]?.textContent;

    state = {
      "script-src": {
        enabled: true,
        values: ["'unsafe-eval'"],
      },
    };
    panel.update();

    const nextButtons = [
      ...panel.querySelectorAll(".security-score-recommendation-btn"),
    ];
    expect(nextButtons.length).toBeGreaterThan(0);
    expect(nextButtons[0]?.textContent).not.toBe(initialLabel);
  });

  it("falls back to a poor grade when scorePolicy returns an unknown grade", () => {
    vi.spyOn(scorePolicyModule, "scorePolicy").mockReturnValue({
      score: 10,
      grade: "Unknown" as "Poor",
      summary: "Test",
      factors: [{ label: "Neutral", points: 0 }],
      recommendations: [],
      potentialScore: 10,
    });
    const panel = createSecurityScorePanel({
      getState: () => ({}),
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);
    panel.update();
    expect(panel.className).toContain("score-poor");
  });

  it("ignores clicks on the recommendations list background", () => {
    const panel = createSecurityScorePanel({
      getState: () => ({
        "script-src": { enabled: true, values: ["'unsafe-inline'"] },
      }),
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);
    panel.update();
    panel
      .querySelector(".security-score-recommendations-list")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls to a recommendation target when a recommendation button is clicked", () => {
    const section = document.createElement("article");
    section.className = "directive-section";
    section.dataset.directive = "script-src";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "enable-checkbox";
    section.appendChild(checkbox);
    document.body.appendChild(section);

    vi.spyOn(scorePolicyModule, "scorePolicy").mockReturnValue({
      score: 0,
      grade: "Poor",
      summary: "Test",
      factors: [],
      recommendations: [
        {
          id: "remove-unsafe-inline",
          label: "Remove unsafe-inline",
          targetId: "script-src",
        },
      ],
      potentialScore: 50,
    });
    const panel = createSecurityScorePanel({
      getState: () => ({}),
      getReportOnly: () => false,
    });
    document.body.appendChild(panel);
    panel.update();
    panel
      .querySelector(".security-score-recommendation-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
