/**
 * Editable CSP source list for fetch directives (`script-src`, `style-src`, etc.).
 *
 * @remarks
 * Manages confirmed keyword/source chips, custom URL inputs, and optional helper
 * panels (nonce generation, style-attribute hashing) depending on directive name.
 *
 * @see {@link createNonceHelper}
 * @see {@link createStyleAttrHashHelper}
 */

import type { DirectiveDefinition } from "../csp/directives";
import { KEYWORD_OPTIONS } from "../csp/keywords";

const SCRIPT_NONCE_DIRECTIVES = new Set(["script-src", "script-src-elem"]);
const STYLE_NONCE_DIRECTIVES = new Set(["style-src", "style-src-elem"]);
const STYLE_HASH_DIRECTIVES = new Set(["style-src-attr"]);

/** Options for mounting a source list editor inside a directive section. */
export interface SourceListEditorOptions {
  /** Directive whose sources are being edited; drives helpers and labels. */
  directive: DirectiveDefinition;
  /** Called when the confirmed source list changes. */
  onChange: () => void;
}

/**
 * Builds a source list editor inside an existing container element.
 *
 * @param container - Parent element whose contents are replaced with the editor UI.
 * @param options - Directive metadata and change callback.
 * @returns Accessors to read, replace, and enable/disable the source list.
 *
 * @remarks
 * Duplicate values are ignored on add. Pending custom inputs are cleared when
 * {@link setValues} runs (for example during policy import).
 */
export function createSourceListEditor(
  container: HTMLElement,
  options: SourceListEditorOptions,
): {
  getValues: () => string[];
  setValues: (nextValues: string[]) => void;
  setEnabled: (enabled: boolean) => void;
} {
  const { directive, onChange } = options;
  const idPrefix = `directive-${directive.name.replace(/[^a-z0-9-]/gi, "-")}`;
  const helpId = `${idPrefix}-help`;

  const values: string[] = [];
  const customInputs: HTMLInputElement[] = [];

  container.innerHTML = "";
  container.className = "source-list-editor";

  const contentArea = document.createElement("div");
  contentArea.className = "source-list-content";

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
  contentArea.appendChild(help);

  const valuesList = document.createElement("ul");
  valuesList.className = "values-list";
  valuesList.setAttribute("role", "list");
  contentArea.appendChild(valuesList);

  function addConfirmedValue(value: string): void {
    if (!values.includes(value)) {
      values.push(value);
      renderValuesList();
      onChange();
    }
  }

  if (SCRIPT_NONCE_DIRECTIVES.has(directive.name)) {
    void import("./NonceHelper").then(({ createNonceHelper }) => {
      contentArea.appendChild(
        createNonceHelper({
          idPrefix,
          helpId,
          variant: "script",
          addValue: addConfirmedValue,
          getValues: () => values,
          onChange,
        }),
      );
    });
  }

  if (STYLE_NONCE_DIRECTIVES.has(directive.name)) {
    void import("./NonceHelper").then(({ createNonceHelper }) => {
      contentArea.appendChild(
        createNonceHelper({
          idPrefix,
          helpId,
          variant: "style",
          addValue: addConfirmedValue,
          getValues: () => values,
          onChange,
        }),
      );
    });
  }

  if (STYLE_HASH_DIRECTIVES.has(directive.name)) {
    void import("./StyleAttrHashHelper").then(({ createStyleAttrHashHelper }) => {
      contentArea.appendChild(
        createStyleAttrHashHelper({
          idPrefix,
          helpId,
          addValue: addConfirmedValue,
          getValues: () => values,
          onChange,
        }),
      );
    });
  }

  container.appendChild(contentArea);

  const actionsFooter = document.createElement("div");
  actionsFooter.className = "source-list-actions";

  const keywordLabel = document.createElement("label");
  keywordLabel.htmlFor = `${idPrefix}-keyword`;
  keywordLabel.textContent = "Add keyword or scheme";

  const actionsRow = document.createElement("div");
  actionsRow.className = "source-list-actions-row";

  const keywordSelect = document.createElement("select");
  keywordSelect.id = `${idPrefix}-keyword`;
  keywordSelect.className = "keyword-select";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a value…";
  placeholder.disabled = true;
  placeholder.selected = true;
  keywordSelect.appendChild(placeholder);

  for (const keyword of KEYWORD_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = keyword.value;
    opt.textContent = keyword.label;
    keywordSelect.appendChild(opt);
  }

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "source-list-buttons";

  const addKeywordBtn = document.createElement("button");
  addKeywordBtn.type = "button";
  addKeywordBtn.className = "btn btn-secondary source-list-btn";
  addKeywordBtn.textContent = "Add keyword";

  const addSourceBtn = document.createElement("button");
  addSourceBtn.type = "button";
  addSourceBtn.className = "btn btn-secondary source-list-btn add-source-btn";
  addSourceBtn.textContent = "Add source";

  buttonGroup.append(addKeywordBtn, addSourceBtn);
  actionsRow.append(keywordSelect, buttonGroup);
  actionsFooter.append(keywordLabel, actionsRow);
  container.appendChild(actionsFooter);

  function renderValuesList(): void {
    valuesList.innerHTML = "";

    values.forEach((value, index) => {
      const li = document.createElement("li");
      li.className = "value-item";

      const span = document.createElement("span");
      span.className = "value-chip";
      span.textContent = value;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-icon remove-value-btn";
      removeBtn.setAttribute(
        "aria-label",
        `Remove value "${value}" from ${directive.name}`,
      );
      removeBtn.textContent = "×";

      removeBtn.addEventListener("click", () => {
        values.splice(index, 1);
        renderValuesList();
        onChange();
      });

      li.append(span, removeBtn);
      valuesList.appendChild(li);
    });
  }

  function confirmCustomInput(
    input: HTMLInputElement,
    row: HTMLElement,
  ): void {
    const value = input.value.trim();
    if (!value) return;

    if (!values.includes(value)) {
      values.push(value);
      renderValuesList();
    }

    const idx = customInputs.indexOf(input);
    if (idx >= 0) customInputs.splice(idx, 1);
    row.remove();
    onChange();
  }

  function addCustomInput(initialValue = ""): void {
    const row = document.createElement("div");
    row.className = "custom-source-row";

    const label = document.createElement("label");
    label.className = "visually-hidden";
    label.htmlFor = `${idPrefix}-source-${customInputs.length}`;
    label.textContent = `Custom source for ${directive.name}`;

    const input = document.createElement("input");
    input.type = "text";
    input.id = `${idPrefix}-source-${customInputs.length}`;
    input.className = "source-input";
    input.placeholder = "e.g. https://cdn.example.com";
    input.value = initialValue;
    input.setAttribute("aria-describedby", helpId);

    const actions = document.createElement("div");
    actions.className = "custom-source-actions";

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "btn btn-icon btn-confirm confirm-source-btn";
    confirmBtn.setAttribute(
      "aria-label",
      `Confirm custom source for ${directive.name}`,
    );
    confirmBtn.textContent = "+";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-icon remove-source-btn";
    removeBtn.setAttribute(
      "aria-label",
      `Remove custom source input for ${directive.name}`,
    );
    removeBtn.textContent = "×";

    confirmBtn.addEventListener("click", () => confirmCustomInput(input, row));

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        // Confirm on Enter without submitting the outer directive form.
        confirmCustomInput(input, row);
      }
    });

    removeBtn.addEventListener("click", () => {
      const idx = customInputs.indexOf(input);
      if (idx >= 0) customInputs.splice(idx, 1);
      row.remove();
      onChange();
    });

    customInputs.push(input);
    actions.append(confirmBtn, removeBtn);
    row.append(label, input, actions);
    contentArea.appendChild(row);
    input.focus();
  }

  addKeywordBtn.addEventListener("click", () => {
    const selected = keywordSelect.value;
    if (!selected) return;
    if (!values.includes(selected)) {
      values.push(selected);
      renderValuesList();
      onChange();
    }
    keywordSelect.selectedIndex = 0;
  });

  addSourceBtn.addEventListener("click", () => addCustomInput());

  function clearPendingInputs(): void {
    for (const input of [...customInputs]) {
      input.closest(".custom-source-row")?.remove();
    }
    customInputs.length = 0;
  }

  function setValues(nextValues: string[]): void {
    clearPendingInputs();
    values.length = 0;
    values.push(...nextValues);
    renderValuesList();
  }

  function getValues(): string[] {
    return [...values];
  }

  function setEnabled(enabled: boolean): void {
    const controls = container.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement
    >("input, select, button");
    controls.forEach((el) => {
      el.disabled = !enabled;
    });
  }

  return { getValues, setValues, setEnabled };
}
