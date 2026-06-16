/**
 * Scrolls to a security-score recommendation target and highlights it.
 *
 * @remarks
 * Used by {@link createSecurityScorePanel} when the user selects a recommendation.
 * Targets may be element IDs or `data-directive` values on directive sections.
 */

/** CSS class applied briefly to draw attention after scrolling. */
const HIGHLIGHT_CLASS = "recommendation-highlight";

/**
 * Scrolls to a builder control referenced by a score recommendation.
 *
 * @param targetId - Element `id` or directive name (`data-directive` value).
 *
 * @remarks
 * Enables the parent directive section if it was disabled, scrolls it into view,
 * applies a short highlight animation, and moves keyboard focus to a sensible control.
 */
export function scrollToRecommendationTarget(targetId: string): void {
  const target =
    document.getElementById(targetId) ??
    document.querySelector<HTMLElement>(`[data-directive="${targetId}"]`);

  if (!target) return;

  const directiveSection = target.classList.contains("directive-section")
    ? target
    : target.closest<HTMLElement>(".directive-section");

  if (directiveSection) {
    const enableCheckbox = directiveSection.querySelector<HTMLInputElement>(
      ".enable-checkbox",
    );
    if (enableCheckbox && !enableCheckbox.checked) {
      enableCheckbox.checked = true;
      // Synthetic change so DirectiveSection shows controls and syncs disabled state.
      enableCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });

  const highlightTarget = directiveSection ?? target;
  highlightTarget.classList.remove(HIGHLIGHT_CLASS);
  // Force reflow so re-adding the class retriggers the CSS highlight animation.
  void highlightTarget.offsetWidth;
  highlightTarget.classList.add(HIGHLIGHT_CLASS);

  window.setTimeout(() => {
    highlightTarget.classList.remove(HIGHLIGHT_CLASS);
  }, 1600);

  const focusTarget =
    directiveSection?.querySelector<HTMLElement>(
      ".enable-checkbox, .keyword-select, .source-input, input, select, button",
    ) ?? target;

  focusTarget.focus({ preventScroll: true });
}
