import { describe, expect, it, vi } from "vitest";
import { scrollToRecommendationTarget } from "../../src/ui/scrollToTarget";

describe("scrollToRecommendationTarget", () => {
  it("enables hidden directive sections and highlights them", () => {
    vi.useFakeTimers();

    const section = document.createElement("article");
    section.className = "directive-section";
    section.id = "directive-section-default-src";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "enable-checkbox";
    section.appendChild(checkbox);
    document.body.appendChild(section);

    scrollToRecommendationTarget("directive-section-default-src");

    expect(checkbox.checked).toBe(true);
    expect(section.classList.contains("recommendation-highlight")).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    vi.advanceTimersByTime(1600);
    expect(section.classList.contains("recommendation-highlight")).toBe(false);
    vi.useRealTimers();
  });

  it("returns early when the target is missing", () => {
    scrollToRecommendationTarget("missing-target");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls to data-directive targets", () => {
    const section = document.createElement("article");
    section.className = "directive-section";
    section.dataset.directive = "script-src";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "enable-checkbox";
    checkbox.checked = true;
    section.appendChild(checkbox);
    document.body.appendChild(section);

    scrollToRecommendationTarget("script-src");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
