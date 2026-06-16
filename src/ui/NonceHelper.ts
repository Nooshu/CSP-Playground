/**
 * Collapsible helpers for generating script and style nonces in source lists.
 *
 * @remarks
 * Produces cryptographically random nonces via {@link generateNonce}, formats them
 * for CSP source lists, and optionally adds host sources for external resources.
 * Used inside {@link createSourceListEditor} for `script-src*` and `style-src*`
 * directives.
 *
 * @see {@link generateNonce}
 * @see {@link formatNonceForCsp}
 */

import {
  buildExternalScriptSnippet,
  buildExternalStylesheetSnippet,
  buildInlineScriptSnippet,
  buildInlineStyleSnippet,
  formatNonceForCsp,
  generateNonce,
  hostSourceFromUrl,
  parseScriptUrl,
  parseStylesheetUrl,
} from "../csp/nonce";

/** Whether the helper targets script or stylesheet/style inline nonces. */
export type NonceHelperVariant = "script" | "style";

interface NonceVariantConfig {
  summary: string;
  intro: string;
  modeLegend: string;
  externalLabel: string;
  inlineLabel: string;
  externalFieldLabel: string;
  inlineFieldLabel: string;
  externalPlaceholder: string;
  inlinePlaceholder: string;
  parseExternalUrl: (input: string) => string;
  buildExternalSnippet: (nonce: string, url: string) => string;
  buildInlineSnippet: (nonce: string, content: string) => string;
  emptyInlineError: string;
}

const NONCE_VARIANTS: Record<NonceHelperVariant, NonceVariantConfig> = {
  script: {
    summary: "Generate a script nonce",
    intro:
      "Create a cryptographically random nonce, add it to this directive, and copy the HTML snippet for your page.",
    modeLegend: "Script type",
    externalLabel: " External script URL",
    inlineLabel: " Inline script",
    externalFieldLabel: "Script URL",
    inlineFieldLabel: "Inline script",
    externalPlaceholder: "https://cdn.example.com/app.js",
    inlinePlaceholder: "console.log('Hello from an inline script');",
    parseExternalUrl: parseScriptUrl,
    buildExternalSnippet: buildExternalScriptSnippet,
    buildInlineSnippet: buildInlineScriptSnippet,
    emptyInlineError: "Paste the inline script you want to allow.",
  },
  style: {
    summary: "Generate a style nonce",
    intro:
      "Create a nonce for an external stylesheet or inline <style> block, add it to this directive, and copy the HTML snippet.",
    modeLegend: "Style type",
    externalLabel: " External stylesheet URL",
    inlineLabel: " Inline <style> block",
    externalFieldLabel: "Stylesheet URL",
    inlineFieldLabel: "Inline CSS",
    externalPlaceholder: "https://cdn.example.com/styles/main.css",
    inlinePlaceholder: ".hero { color: rebeccapurple; }",
    parseExternalUrl: parseStylesheetUrl,
    buildExternalSnippet: buildExternalStylesheetSnippet,
    buildInlineSnippet: buildInlineStyleSnippet,
    emptyInlineError: "Paste the inline CSS you want to allow inside a <style> element.",
  },
};

/** Options for mounting a nonce helper inside a source list editor. */
export interface NonceHelperOptions {
  /** Prefix for element IDs scoped to the parent directive section. */
  idPrefix: string;
  /** ID of the directive help text referenced by `aria-describedby`. */
  helpId: string;
  /** Script vs style variant; controls labels and snippet builders. */
  variant: NonceHelperVariant;
  /** Adds a confirmed CSP source value to the parent source list. */
  addValue: (value: string) => void;
  /** Returns current confirmed values so duplicates are skipped. */
  getValues: () => string[];
  /** Called when a new nonce (or host source) is added to the list. */
  onChange: () => void;
}

/**
 * Creates a `<details>` panel for generating nonces and HTML snippets.
 *
 * @param options - IDs, variant, and callbacks wired to the parent source list.
 * @returns The mounted helper element.
 *
 * @remarks
 * External mode adds both `'nonce-…'` and a host source derived from the URL.
 * Inline mode requires non-empty pasted content before generation.
 */
export function createNonceHelper(options: NonceHelperOptions): HTMLElement {
  const { idPrefix, helpId, variant, addValue, getValues, onChange } = options;
  const config = NONCE_VARIANTS[variant];

  const details = document.createElement("details");
  details.className = "nonce-helper";

  const summary = document.createElement("summary");
  summary.textContent = config.summary;

  const intro = document.createElement("p");
  intro.className = "nonce-helper-intro";
  intro.textContent = config.intro;

  const modeFieldset = document.createElement("fieldset");
  modeFieldset.className = "nonce-mode-fieldset";

  const modeLegend = document.createElement("legend");
  modeLegend.textContent = config.modeLegend;

  const externalLabel = document.createElement("label");
  externalLabel.className = "nonce-mode-label";

  const externalRadio = document.createElement("input");
  externalRadio.type = "radio";
  externalRadio.name = `${idPrefix}-nonce-mode`;
  externalRadio.value = "external";
  externalRadio.checked = true;

  const inlineLabel = document.createElement("label");
  inlineLabel.className = "nonce-mode-label";

  const inlineRadio = document.createElement("input");
  inlineRadio.type = "radio";
  inlineRadio.name = `${idPrefix}-nonce-mode`;
  inlineRadio.value = "inline";

  externalLabel.append(externalRadio, document.createTextNode(config.externalLabel));
  inlineLabel.append(inlineRadio, document.createTextNode(config.inlineLabel));
  modeFieldset.append(modeLegend, externalLabel, inlineLabel);

  const externalPanel = document.createElement("div");
  externalPanel.className = "nonce-mode-panel";

  const externalFieldLabel = document.createElement("label");
  externalFieldLabel.htmlFor = `${idPrefix}-nonce-external-url`;
  externalFieldLabel.textContent = config.externalFieldLabel;

  const externalInput = document.createElement("input");
  externalInput.type = "url";
  externalInput.id = `${idPrefix}-nonce-external-url`;
  externalInput.className = "source-input";
  externalInput.placeholder = config.externalPlaceholder;
  externalInput.setAttribute("aria-describedby", helpId);

  externalPanel.append(externalFieldLabel, externalInput);

  const inlinePanel = document.createElement("div");
  inlinePanel.className = "nonce-mode-panel";
  inlinePanel.hidden = true;

  const inlineFieldLabel = document.createElement("label");
  inlineFieldLabel.htmlFor = `${idPrefix}-nonce-inline-content`;
  inlineFieldLabel.textContent = config.inlineFieldLabel;

  const inlineTextarea = document.createElement("textarea");
  inlineTextarea.id = `${idPrefix}-nonce-inline-content`;
  inlineTextarea.className = "nonce-inline-input";
  inlineTextarea.rows = 6;
  inlineTextarea.placeholder = config.inlinePlaceholder;
  inlineTextarea.setAttribute("aria-describedby", helpId);

  inlinePanel.append(inlineFieldLabel, inlineTextarea);

  const generateBtn = document.createElement("button");
  generateBtn.type = "button";
  generateBtn.className = "btn btn-secondary nonce-generate-btn";
  generateBtn.textContent = "Generate nonce";

  const status = document.createElement("p");
  status.className = "nonce-helper-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const result = document.createElement("div");
  result.className = "nonce-result";
  result.hidden = true;

  const snippetLabel = document.createElement("label");
  snippetLabel.htmlFor = `${idPrefix}-nonce-snippet`;
  snippetLabel.textContent = "HTML snippet";

  const snippet = document.createElement("pre");
  snippet.id = `${idPrefix}-nonce-snippet`;
  snippet.className = "nonce-snippet policy-preview";

  const resultActions = document.createElement("div");
  resultActions.className = "nonce-result-actions";

  const copySnippetBtn = document.createElement("button");
  copySnippetBtn.type = "button";
  copySnippetBtn.className = "btn btn-primary";
  copySnippetBtn.textContent = "Copy HTML";

  const copyNonceBtn = document.createElement("button");
  copyNonceBtn.type = "button";
  copyNonceBtn.className = "btn btn-secondary";
  copyNonceBtn.textContent = "Copy nonce value";

  resultActions.append(copySnippetBtn, copyNonceBtn);
  result.append(snippetLabel, snippet, resultActions);

  details.append(
    summary,
    intro,
    modeFieldset,
    externalPanel,
    inlinePanel,
    generateBtn,
    status,
    result,
  );

  let lastNonce = "";

  function setMode(mode: "external" | "inline"): void {
    const isExternal = mode === "external";
    externalPanel.hidden = !isExternal;
    inlinePanel.hidden = isExternal;
  }

  externalRadio.addEventListener("change", () => {
    if (externalRadio.checked) setMode("external");
  });

  inlineRadio.addEventListener("change", () => {
    if (inlineRadio.checked) setMode("inline");
  });

  async function copyText(text: string, successMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = successMessage;
    } catch {
      status.textContent = "Copy failed. Select the text and copy manually.";
    }
  }

  function ensureValue(value: string): void {
    if (!getValues().includes(value)) {
      addValue(value);
      onChange();
    }
  }

  generateBtn.addEventListener("click", () => {
    status.textContent = "";
    result.hidden = true;

    try {
      const nonce = generateNonce();
      const cspNonce = formatNonceForCsp(nonce);
      let htmlSnippet = "";

      if (externalRadio.checked) {
        const resourceUrl = config.parseExternalUrl(externalInput.value);
        const hostSource = hostSourceFromUrl(resourceUrl);
        htmlSnippet = config.buildExternalSnippet(nonce, resourceUrl);
        ensureValue(cspNonce);
        ensureValue(hostSource);
      } else {
        const inlineContent = inlineTextarea.value.trim();
        if (!inlineContent) {
          throw new Error(config.emptyInlineError);
        }
        htmlSnippet = config.buildInlineSnippet(nonce, inlineContent);
        ensureValue(cspNonce);
      }

      lastNonce = nonce;
      snippet.textContent = htmlSnippet;
      result.hidden = false;
      status.textContent =
        "Nonce generated and added to this directive. Copy the HTML snippet into your page.";
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Could not generate a nonce.";
    }
  });

  copySnippetBtn.addEventListener("click", () => {
    void copyText(snippet.textContent ?? "", "HTML snippet copied to clipboard.");
  });

  copyNonceBtn.addEventListener("click", () => {
    if (!lastNonce) {
      status.textContent = "Generate a nonce first.";
      return;
    }
    void copyText(lastNonce, "Nonce value copied to clipboard.");
  });

  return details;
}
