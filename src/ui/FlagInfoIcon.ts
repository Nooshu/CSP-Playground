import { getFlagDescription } from "./flagDescriptions";

const HELP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`;

export interface FlagInfoIconOptions {
  group: string;
  flagKey: string;
  idPrefix: string;
}

export function createFlagInfoIcon(options: FlagInfoIconOptions): HTMLElement {
  const { group, flagKey, idPrefix } = options;
  const tooltipId = `${idPrefix}-flag-info-${flagKey}`;

  const wrapper = document.createElement("span");
  wrapper.className = "flag-info-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "flag-info-btn";
  button.setAttribute(
    "aria-label",
    `More information about ${flagKey}`,
  );
  button.innerHTML = HELP_ICON_SVG;

  const tooltip = document.createElement("span");
  tooltip.id = tooltipId;
  tooltip.className = "flag-info-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;

  wrapper.append(button, tooltip);

  let hideTimeout: number | undefined;
  let isLoading = false;

  function clearHideTimeout(): void {
    if (hideTimeout !== undefined) {
      window.clearTimeout(hideTimeout);
      hideTimeout = undefined;
    }
  }

  function hideTooltip(): void {
    clearHideTimeout();
    tooltip.hidden = true;
    tooltip.textContent = "";
    button.removeAttribute("aria-describedby");
  }

  function scheduleHide(): void {
    clearHideTimeout();
    hideTimeout = window.setTimeout(() => {
      hideTooltip();
    }, 120);
  }

  async function showTooltip(): Promise<void> {
    clearHideTimeout();

    if (tooltip.textContent) {
      tooltip.hidden = false;
      button.setAttribute("aria-describedby", tooltipId);
      return;
    }

    if (isLoading) return;

    isLoading = true;
    tooltip.hidden = false;
    tooltip.textContent = "Loading…";
    button.setAttribute("aria-describedby", tooltipId);

    const description = await getFlagDescription(group, flagKey);
    isLoading = false;

    if (!button.matches(":hover, :focus-visible") && !tooltip.matches(":hover")) {
      hideTooltip();
      return;
    }

    tooltip.textContent =
      description ?? "Description is not available for this flag.";
  }

  button.addEventListener("mouseenter", () => {
    void showTooltip();
  });

  button.addEventListener("focus", () => {
    void showTooltip();
  });

  button.addEventListener("mouseleave", scheduleHide);
  button.addEventListener("blur", scheduleHide);

  tooltip.addEventListener("mouseenter", clearHideTimeout);
  tooltip.addEventListener("mouseleave", scheduleHide);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  return wrapper;
}
