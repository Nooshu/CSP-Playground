/**
 * Collapsible helper for SHA-256 hashes of inline `style=""` attribute values.
 *
 * @remarks
 * Inline style attributes cannot use nonces; this helper hashes the exact attribute
 * value and adds both the `'sha256-…'` source and `'unsafe-hashes'` when needed.
 * Used for the `style-src-attr` directive inside {@link createSourceListEditor}.
 *
 * @see {@link sha256Base64FromText}
 * @see {@link formatSha256HashForCsp}
 */

import {
  buildInlineStyleAttributeSnippet,
  formatSha256HashForCsp,
  sha256Base64FromText,
  STYLE_ATTR_UNSAFE_HASHES,
} from "../csp/hash";

/** Options for the style-attribute hash helper in a source list editor. */
export interface StyleAttrHashHelperOptions {
  /** Prefix for element IDs scoped to the parent directive section. */
  idPrefix: string;
  /** ID of the directive help text referenced by `aria-describedby`. */
  helpId: string;
  /** Adds a confirmed CSP source value to the parent source list. */
  addValue: (value: string) => void;
  /** Returns current confirmed values so duplicates are skipped. */
  getValues: () => string[];
  /** Called when a new hash or keyword is added to the list. */
  onChange: () => void;
}

/**
 * Creates a `<details>` panel for hashing inline style attribute values.
 *
 * @param options - IDs and callbacks wired to the parent source list.
 * @returns The mounted helper element.
 *
 * @remarks
 * Hashing is async (Web Crypto). The input must match the exact characters inside
 * `style="…"` on the page, including spacing and casing.
 */
export function createStyleAttrHashHelper(
  options: StyleAttrHashHelperOptions,
): HTMLElement {
  const { idPrefix, helpId, addValue, getValues, onChange } = options;

  const details = document.createElement("details");
  details.className = "nonce-helper style-hash-helper";

  const summary = document.createElement("summary");
  summary.textContent = "Generate a hash for inline style attributes";

  const intro = document.createElement("p");
  intro.className = "nonce-helper-intro";
  intro.textContent =
    "Inline style=\"\" attributes cannot use nonces. Paste the exact attribute value, generate a SHA-256 hash, and add it to style-src-attr.";

  const fieldLabel = document.createElement("label");
  fieldLabel.htmlFor = `${idPrefix}-style-attr-value`;
  fieldLabel.textContent = "Style attribute value";

  const input = document.createElement("input");
  input.type = "text";
  input.id = `${idPrefix}-style-attr-value`;
  input.className = "source-input";
  input.placeholder = "display:none";
  input.setAttribute("aria-describedby", `${helpId} ${idPrefix}-style-attr-hint`);

  const hint = document.createElement("p");
  hint.id = `${idPrefix}-style-attr-hint`;
  hint.className = "nonce-helper-intro";
  hint.textContent =
    "Use the exact characters inside style=\"…\", including spacing and casing. 'unsafe-hashes' will also be added if needed.";

  const generateBtn = document.createElement("button");
  generateBtn.type = "button";
  generateBtn.className = "btn btn-secondary nonce-generate-btn";
  generateBtn.textContent = "Generate hash";

  const status = document.createElement("p");
  status.className = "nonce-helper-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const result = document.createElement("div");
  result.className = "nonce-result";
  result.hidden = true;

  const snippetLabel = document.createElement("label");
  snippetLabel.htmlFor = `${idPrefix}-style-attr-snippet`;
  snippetLabel.textContent = "Example HTML";

  const snippet = document.createElement("pre");
  snippet.id = `${idPrefix}-style-attr-snippet`;
  snippet.className = "nonce-snippet policy-preview";

  const hashLabel = document.createElement("label");
  hashLabel.htmlFor = `${idPrefix}-style-attr-hash`;
  hashLabel.textContent = "CSP hash value";

  const hashPreview = document.createElement("pre");
  hashPreview.id = `${idPrefix}-style-attr-hash`;
  hashPreview.className = "nonce-snippet policy-preview";

  const resultActions = document.createElement("div");
  resultActions.className = "nonce-result-actions";

  const copySnippetBtn = document.createElement("button");
  copySnippetBtn.type = "button";
  copySnippetBtn.className = "btn btn-primary";
  copySnippetBtn.textContent = "Copy HTML";

  const copyHashBtn = document.createElement("button");
  copyHashBtn.type = "button";
  copyHashBtn.className = "btn btn-secondary";
  copyHashBtn.textContent = "Copy hash value";

  resultActions.append(copySnippetBtn, copyHashBtn);
  result.append(snippetLabel, snippet, hashLabel, hashPreview, resultActions);

  details.append(
    summary,
    intro,
    fieldLabel,
    input,
    hint,
    generateBtn,
    status,
    result,
  );

  let lastHash = "";

  function ensureValue(value: string): void {
    if (!getValues().includes(value)) {
      addValue(value);
      onChange();
    }
  }

  async function copyText(text: string, successMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = successMessage;
    } catch {
      status.textContent = "Copy failed. Select the text and copy manually.";
    }
  }

  generateBtn.addEventListener("click", () => {
    status.textContent = "";
    result.hidden = true;

    void (async () => {
      try {
        const styleValue = input.value;
        if (!styleValue) {
          throw new Error("Enter the style attribute value to hash.");
        }

        const base64Hash = await sha256Base64FromText(styleValue);
        const cspHash = formatSha256HashForCsp(base64Hash);
        const htmlSnippet = buildInlineStyleAttributeSnippet(styleValue);

        ensureValue(cspHash);
        ensureValue(STYLE_ATTR_UNSAFE_HASHES);

        lastHash = cspHash;
        snippet.textContent = htmlSnippet;
        hashPreview.textContent = cspHash;
        result.hidden = false;
        status.textContent =
          "Hash generated and added to this directive. Use the example HTML with the exact same style value.";
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : "Could not generate a hash.";
      }
    })();
  });

  copySnippetBtn.addEventListener("click", () => {
    void copyText(snippet.textContent ?? "", "HTML example copied to clipboard.");
  });

  copyHashBtn.addEventListener("click", () => {
    if (!lastHash) {
      status.textContent = "Generate a hash first.";
      return;
    }
    void copyText(lastHash, "Hash value copied to clipboard.");
  });

  return details;
}
