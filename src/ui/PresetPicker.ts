/**
 * Starter preset picker with overwrite protection for in-progress policies.
 *
 * @remarks
 * Opens a modal with three built-in presets. When the builder already has enabled
 * directives, selecting a preset requires explicit confirmation before values are
 * replaced.
 *
 * @see {@link CSP_PRESETS}
 * @see {@link applyPolicyState}
 */

import type { PolicyState } from "../csp/buildPolicy";
import { CSP_PRESETS, type CspPreset } from "../csp/presets";
import { isPolicyStateEmpty } from "../csp/policyState";
import { applyPolicyState } from "./applyPolicy";
import type { DirectiveSectionHandle } from "./DirectiveSection";
import { createModal } from "./modal";
import { showToast } from "./toast";

/** Options for the preset picker trigger and modal. */
export interface PresetPickerOptions {
  /** All directive sections updated when a preset is applied. */
  sections: DirectiveSectionHandle[];
  /** Returns the current builder state for overwrite checks. */
  getState: () => PolicyState;
  /** Called after a preset is applied so previews and score refresh. */
  onApplied: () => void;
  /**
   * Optional existing container for the trigger button.
   *
   * @remarks
   * When provided, the container is cleared and reused for progressive enhancement.
   */
  container?: HTMLElement;
}

/**
 * Creates the preset picker trigger button and modal flow.
 *
 * @param options - Section handles, state getter, and apply callback.
 * @returns The mounted trigger wrapper element.
 */
export function createPresetPicker(options: PresetPickerOptions): HTMLElement {
  const { sections, getState, onApplied, container } = options;
  const modal = createModal();

  const wrapper = container ?? document.createElement("div");
  wrapper.innerHTML = "";
  wrapper.className = "preset-picker";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "btn btn-secondary preset-picker-trigger";
  trigger.textContent = "Start with a preset";
  trigger.setAttribute("aria-haspopup", "dialog");
  wrapper.appendChild(trigger);

  function applyPreset(preset: CspPreset): void {
    const appliedCount = applyPolicyState(sections, preset.state);
    onApplied();
    modal.close();
    showToast(
      `Applied the ${preset.title} preset (${appliedCount} directive${appliedCount === 1 ? "" : "s"}).`,
    );
  }

  function openPresetList(): void {
    const content = document.createElement("div");
    content.className = "preset-picker-content";

    const intro = document.createElement("p");
    intro.className = "preset-picker-intro";
    intro.textContent =
      "Choose a starting point. You can adjust any directive after applying a preset.";
    content.appendChild(intro);

    const list = document.createElement("div");
    list.className = "preset-picker-list";
    list.setAttribute("role", "list");

    for (const preset of CSP_PRESETS) {
      list.appendChild(
        createPresetCard(preset, () => handlePresetSelect(preset)),
      );
    }

    content.appendChild(list);

    modal.open({
      title: "CSP presets",
      content,
    });
  }

  function openConfirmStep(preset: CspPreset): void {
    const content = document.createElement("div");
    content.className = "preset-picker-confirm";

    const warning = document.createElement("p");
    warning.className = "preset-picker-warning";
    warning.textContent =
      "You already have directive settings in the builder. Applying a preset will replace your current configuration.";
    content.appendChild(warning);

    const summary = document.createElement("p");
    summary.className = "preset-picker-confirm-summary";
    summary.textContent = `Replace everything with the ${preset.title} preset?`;
    content.appendChild(summary);

    const detail = document.createElement("p");
    detail.className = "preset-picker-confirm-detail";
    detail.textContent = preset.description;
    content.appendChild(detail);

    const actions = document.createElement("div");
    actions.className = "preset-picker-actions";

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "btn btn-secondary";
    backBtn.textContent = "Back to presets";
    backBtn.addEventListener("click", openPresetList);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.textContent = "Keep my settings";
    cancelBtn.addEventListener("click", () => modal.close());

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "btn btn-primary";
    confirmBtn.textContent = `Apply ${preset.title} preset`;
    confirmBtn.addEventListener("click", () => applyPreset(preset));

    actions.append(backBtn, cancelBtn, confirmBtn);
    content.appendChild(actions);

    modal.open({
      title: "Replace current policy?",
      content,
    });
  }

  function handlePresetSelect(preset: CspPreset): void {
    if (isPolicyStateEmpty(getState())) {
      applyPreset(preset);
      return;
    }

    openConfirmStep(preset);
  }

  trigger.addEventListener("click", openPresetList);

  return wrapper;
}

function createPresetCard(
  preset: CspPreset,
  onSelect: () => void,
): HTMLElement {
  const card = document.createElement("article");
  card.className = "preset-card";
  card.setAttribute("role", "listitem");

  const heading = document.createElement("h3");
  heading.className = "preset-card-title";
  heading.textContent = preset.title;

  const summary = document.createElement("p");
  summary.className = "preset-card-summary";
  summary.textContent = preset.summary;

  const description = document.createElement("p");
  description.className = "preset-card-description";
  description.textContent = preset.description;

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.className = "btn btn-primary preset-card-apply";
  applyBtn.textContent = `Use ${preset.title}`;
  applyBtn.addEventListener("click", onSelect);

  card.append(heading, summary, description, applyBtn);
  return card;
}
