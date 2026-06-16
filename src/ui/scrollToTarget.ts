const HIGHLIGHT_CLASS = "recommendation-highlight";

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
