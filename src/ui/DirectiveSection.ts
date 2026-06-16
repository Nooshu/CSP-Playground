import type { DirectiveDefinition } from "../csp/directives";
import {
  SANDBOX_FLAGS,
  TRUSTED_TYPES_FOR_OPTIONS,
} from "../csp/directives";
import { createSourceListEditor } from "./SourceListEditor";
import { createFlagInfoIcon } from "./FlagInfoIcon";
import { createMdnInfoLink } from "./mdnLink";

export interface DirectiveSectionOptions {
  directive: DirectiveDefinition;
  onChange: () => void;
}

export interface DirectiveSectionHandle {
  element: HTMLElement;
  getState: () => { enabled: boolean; values: string[] };
  setState: (state: { enabled: boolean; values: string[] }) => void;
  reset: () => void;
}

export function createDirectiveSection(
  options: DirectiveSectionOptions,
): DirectiveSectionHandle {
  const { directive, onChange } = options;
  const idPrefix = `directive-${directive.name.replace(/[^a-z0-9-]/gi, "-")}`;
  const helpId = `${idPrefix}-help`;

  const article = document.createElement("article");
  article.className = "directive-section";
  article.id = `directive-section-${directive.name}`;
  article.dataset.directive = directive.name;

  const header = document.createElement("div");
  header.className = "directive-header";

  const enableLabel = document.createElement("label");
  enableLabel.className = "enable-label";

  const enableCheckbox = document.createElement("input");
  enableCheckbox.type = "checkbox";
  enableCheckbox.id = `${idPrefix}-enable`;
  enableCheckbox.className = "enable-checkbox";

  const title = document.createElement("span");
  title.className = "directive-name";
  title.textContent = directive.name;

  enableLabel.append(enableCheckbox, title);
  header.append(enableLabel, createMdnInfoLink(directive.name));
  article.appendChild(header);

  const controls = document.createElement("div");
  controls.className = "directive-controls";
  controls.hidden = true;
  article.appendChild(controls);

  let sourceEditor: ReturnType<typeof createSourceListEditor> | null = null;
  let sandboxCheckboxes: HTMLInputElement[] = [];
  let singleInput: HTMLInputElement | null = null;
  let trustedTypesInputs: HTMLInputElement[] = [];
  let trustedTypesForSelect: HTMLSelectElement | null = null;
  let setTrustedTypePolicyNames: ((names: string[]) => void) | null = null;

  switch (directive.type) {
    case "source-list": {
      sourceEditor = createSourceListEditor(controls, { directive, onChange });
      break;
    }
    case "source-single": {
      const help = document.createElement("p");
      help.id = helpId;
      help.className = "directive-help";
      help.textContent = directive.description;
      if (directive.deprecated) {
        const badge = document.createElement("span");
        badge.className = "deprecated-badge";
        badge.textContent = "Deprecated";
        help.prepend(badge, " ");
      }

      const label = document.createElement("label");
      label.htmlFor = `${idPrefix}-value`;
      label.textContent =
        directive.name === "report-to" ? "Endpoint group name" : "Report URL";

      singleInput = document.createElement("input");
      singleInput.type = "text";
      singleInput.id = `${idPrefix}-value`;
      singleInput.className = "source-input";
      singleInput.placeholder =
        directive.name === "report-to"
          ? "e.g. csp-endpoint"
          : "e.g. https://example.com/csp-report";
      singleInput.setAttribute("aria-describedby", helpId);
      singleInput.addEventListener("input", onChange);

      controls.append(help, label, singleInput);
      break;
    }
    case "sandbox": {
      const help = document.createElement("p");
      help.id = helpId;
      help.className = "directive-help";
      help.textContent = directive.description;
      controls.appendChild(help);

      const fieldset = document.createElement("fieldset");
      fieldset.className = "sandbox-fieldset";

      const legend = document.createElement("legend");
      legend.textContent = "Sandbox flags";
      fieldset.appendChild(legend);

      const grid = document.createElement("div");
      grid.className = "sandbox-grid";

      for (const flag of SANDBOX_FLAGS) {
        const flagLabel = document.createElement("label");
        flagLabel.className = "sandbox-flag-label";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = flag;
        checkbox.addEventListener("change", onChange);

        const flagName = document.createElement("span");
        flagName.className = "sandbox-flag-name";
        flagName.textContent = flag;

        flagLabel.append(
          checkbox,
          flagName,
          createFlagInfoIcon({
            group: "sandbox",
            flagKey: flag,
            idPrefix,
          }),
        );
        grid.appendChild(flagLabel);
        sandboxCheckboxes.push(checkbox);
      }

      fieldset.appendChild(grid);
      controls.appendChild(fieldset);
      break;
    }
    case "trusted-types": {
      const help = document.createElement("p");
      help.id = helpId;
      help.className = "directive-help";
      help.textContent = directive.description;
      controls.appendChild(help);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-secondary";
      addBtn.textContent = "Add policy name";

      const inputsContainer = document.createElement("div");
      inputsContainer.className = "trusted-types-inputs";

      function addPolicyInput(): void {
        const row = document.createElement("div");
        row.className = "custom-source-row";

        const label = document.createElement("label");
        label.className = "visually-hidden";
        const inputId = `${idPrefix}-policy-${trustedTypesInputs.length}`;
        label.htmlFor = inputId;
        label.textContent = "Trusted Types policy name";

        const input = document.createElement("input");
        input.type = "text";
        input.id = inputId;
        input.className = "source-input";
        input.placeholder = "e.g. default or *";
        input.setAttribute("aria-describedby", helpId);
        input.addEventListener("input", onChange);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn btn-icon remove-source-btn";
        removeBtn.setAttribute("aria-label", "Remove policy name");
        removeBtn.textContent = "×";

        removeBtn.addEventListener("click", () => {
          const idx = trustedTypesInputs.indexOf(input);
          if (idx >= 0) trustedTypesInputs.splice(idx, 1);
          row.remove();
          onChange();
        });

        trustedTypesInputs.push(input);
        row.append(label, input, removeBtn);
        inputsContainer.appendChild(row);
        input.focus();
      }

      addBtn.addEventListener("click", () => {
        addPolicyInput();
        onChange();
      });

      addPolicyInput();
      controls.append(inputsContainer, addBtn);

      setTrustedTypePolicyNames = (names: string[]) => {
        inputsContainer.innerHTML = "";
        trustedTypesInputs = [];
        if (names.length === 0) {
          addPolicyInput();
          return;
        }
        for (const name of names) {
          addPolicyInput();
          trustedTypesInputs.at(-1)!.value = name;
        }
      };
      break;
    }
    case "require-trusted-types-for": {
      const help = document.createElement("p");
      help.id = helpId;
      help.className = "directive-help";
      help.textContent = directive.description;

      const label = document.createElement("label");
      label.htmlFor = `${idPrefix}-for`;
      label.textContent = "Sink type";

      trustedTypesForSelect = document.createElement("select");
      trustedTypesForSelect.id = `${idPrefix}-for`;
      trustedTypesForSelect.setAttribute("aria-describedby", helpId);

      for (const opt of TRUSTED_TYPES_FOR_OPTIONS) {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        trustedTypesForSelect.appendChild(option);
      }

      trustedTypesForSelect.addEventListener("change", onChange);
      controls.append(help, label, trustedTypesForSelect);
      break;
    }
    case "boolean": {
      const help = document.createElement("p");
      help.id = helpId;
      help.className = "directive-help";
      help.textContent = directive.description;
      controls.appendChild(help);
      break;
    }
  }

  function setControlsEnabled(enabled: boolean): void {
    if (sourceEditor) sourceEditor.setEnabled(enabled);
    controls
      .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(
        "input, select, button",
      )
      .forEach((el) => {
        el.disabled = !enabled;
      });
  }

  function applyEnabled(enabled: boolean): void {
    enableCheckbox.checked = enabled;
    controls.hidden = !enabled;
    setControlsEnabled(enabled);
  }

  enableCheckbox.addEventListener("change", () => {
    applyEnabled(enableCheckbox.checked);
    onChange();
  });

  setControlsEnabled(false);

  function setState(state: { enabled: boolean; values: string[] }): void {
    applyEnabled(state.enabled);

    if (!state.enabled) return;

    switch (directive.type) {
      case "source-list":
        sourceEditor?.setValues(state.values);
        break;
      case "source-single":
        if (singleInput) {
          singleInput.value = state.values[0] ?? "";
        }
        break;
      case "sandbox":
        for (const checkbox of sandboxCheckboxes) {
          checkbox.checked = state.values.includes(checkbox.value);
        }
        break;
      case "trusted-types":
        setTrustedTypePolicyNames?.(state.values);
        break;
      case "require-trusted-types-for":
        if (trustedTypesForSelect && state.values[0]) {
          trustedTypesForSelect.value = state.values[0];
        }
        break;
      case "boolean":
        break;
    }
  }

  function reset(): void {
    setState({ enabled: false, values: [] });
    switch (directive.type) {
      case "source-list":
        sourceEditor?.setValues([]);
        break;
      case "source-single":
        if (singleInput) singleInput.value = "";
        break;
      case "sandbox":
        for (const checkbox of sandboxCheckboxes) {
          checkbox.checked = false;
        }
        break;
      case "trusted-types":
        setTrustedTypePolicyNames?.([]);
        break;
      case "require-trusted-types-for":
        if (trustedTypesForSelect) {
          trustedTypesForSelect.selectedIndex = 0;
        }
        break;
      default:
        break;
    }
  }

  function getState(): { enabled: boolean; values: string[] } {
    const enabled = enableCheckbox.checked;

    if (!enabled) return { enabled: false, values: [] };

    switch (directive.type) {
      case "source-list":
        return { enabled: true, values: sourceEditor?.getValues() ?? [] };
      case "source-single":
        return {
          enabled: true,
          values: singleInput?.value.trim() ? [singleInput.value.trim()] : [],
        };
      case "sandbox":
        return {
          enabled: true,
          values: sandboxCheckboxes
            .filter((cb) => cb.checked)
            .map((cb) => cb.value),
        };
      case "trusted-types":
        return {
          enabled: true,
          values: trustedTypesInputs
            .map((input) => input.value.trim())
            .filter((v) => v.length > 0),
        };
      case "require-trusted-types-for":
        return {
          enabled: true,
          values: trustedTypesForSelect?.value ? [trustedTypesForSelect.value] : [],
        };
      case "boolean":
        return { enabled: true, values: [] };
      default:
        return { enabled: false, values: [] };
    }
  }

  return { element: article, getState, setState, reset };
}
