/**
 * Form for importing an existing CSP from a live site URL or pasted headers.
 *
 * @remarks
 * URL mode fetches policy text via {@link lookupCspFromUrl}. Paste mode extracts
 * CSP from response headers or a raw policy string via {@link extractCspFromText}.
 * Both paths parse with {@link parsePolicyString} and apply values through
 * {@link applyParsedPolicy}.
 *
 * @see {@link lookupCspFromUrl}
 * @see {@link extractCspFromText}
 * @see {@link applyParsedPolicy}
 */

import { lookupCspFromUrl, type CspLookupFailure } from "../api/lookupCsp";
import {
  ExtractCspError,
  extractCspFromText,
  type ExtractCspSource,
} from "../csp/extractCspFromText";
import { parsePolicyString } from "../csp/parsePolicy";
import {
  validatePolicyString,
  type PolicyValidationResult,
} from "../csp/validatePolicy";
import { applyParsedPolicy } from "./applyPolicy";
import type { DirectiveSectionHandle } from "./DirectiveSection";
import type { PolicyOutputPanel } from "./PolicyOutput";
import { showToast } from "./toast";

/** Import method shown in the section UI. */
type ImportMode = "url" | "paste";

/** Options for the URL policy importer section. */
export interface UrlImporterOptions {
  /** All directive sections to reset and pre-fill from the imported policy. */
  sections: DirectiveSectionHandle[];
  /** Output panel whose report-only mode reflects the imported header. */
  outputPanel: PolicyOutputPanel;
  /** Called after a successful import so previews and score refresh. */
  onApplied: () => void;
  /**
   * Optional existing container to progressively enhance.
   *
   * @remarks
   * When provided, the container is cleared and reused rather than creating a
   * new `<section>`. This enables build-time rendered HTML with client-side wiring.
   */
  container?: HTMLElement;
}

/** Normalized policy payload used by import and validate flows. */
interface ResolvedImport {
  policy: string;
  reportOnly: boolean;
  source: string;
  appliedCount: number;
  originLabel: string;
}

const URL_DESCRIPTION =
  "Enter a site URL to fetch its Content-Security-Policy from HTTP headers or HTML meta tags and pre-fill the form below.";
const PASTE_DESCRIPTION =
  "Paste full HTTP response headers or only the Content-Security-Policy header line. The CSP is extracted automatically and used to pre-fill the form below.";
const PASTE_PLACEHOLDER = [
  "Simply paste all headers:",
  "Access-Control-Allow-Origin: https://example.com",
  "Cache-Control: public, max-age=31536000",
  "Content-Security-Policy: default-src 'self'; script-src 'self'",
  "X-Frame-Options: DENY",
  "",
  "Or paste only the CSP header line:",
  "Content-Security-Policy: default-src 'self'; script-src 'self'",
].join("\n");

/**
 * Creates the "Import existing policy" section with URL lookup and paste forms.
 *
 * @param options - Directive handles, output panel, and post-import callback.
 * @returns The mounted `<section>` element.
 *
 * @remarks
 * URL lookup runs asynchronously on submit; controls are disabled while fetching.
 * A missing CSP shows an inline link to `/why-csp.html` rather than an error tone.
 */
export function createUrlImporter(options: UrlImporterOptions): HTMLElement {
  const { sections, outputPanel, onApplied, container } = options;

  let importMode: ImportMode = "url";

  const section = container ?? document.createElement("section");
  section.innerHTML = "";
  section.className = "url-importer";
  section.setAttribute("aria-labelledby", "url-importer-heading");

  const heading = document.createElement("h2");
  heading.id = "url-importer-heading";
  heading.textContent = "Import existing policy";

  const description = document.createElement("p");
  description.className = "url-importer-description";
  description.textContent = URL_DESCRIPTION;

  const form = document.createElement("form");
  form.className = "url-importer-form";
  form.noValidate = true;

  const modeFieldset = document.createElement("fieldset");
  modeFieldset.className = "url-importer-mode mode-fieldset";

  const modeLegend = document.createElement("legend");
  modeLegend.textContent = "Import method";

  const urlModeLabel = document.createElement("label");
  urlModeLabel.className = "mode-label";

  const urlModeRadio = document.createElement("input");
  urlModeRadio.type = "radio";
  urlModeRadio.name = "import-mode";
  urlModeRadio.value = "url";
  urlModeRadio.checked = true;

  const urlModeText = document.createElement("span");
  urlModeText.textContent = "Import from URL";

  const pasteModeLabel = document.createElement("label");
  pasteModeLabel.className = "mode-label";

  const pasteModeRadio = document.createElement("input");
  pasteModeRadio.type = "radio";
  pasteModeRadio.name = "import-mode";
  pasteModeRadio.value = "paste";

  const pasteModeText = document.createElement("span");
  pasteModeText.textContent = "Paste headers or policy";

  urlModeLabel.append(urlModeRadio, urlModeText);
  pasteModeLabel.append(pasteModeRadio, pasteModeText);
  modeFieldset.append(modeLegend, urlModeLabel, pasteModeLabel);

  const urlPanel = document.createElement("div");
  urlPanel.className = "url-importer-url-panel";

  const urlLabel = document.createElement("label");
  urlLabel.htmlFor = "site-url";
  urlLabel.textContent = "Site URL";

  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.id = "site-url";
  urlInput.name = "site-url";
  urlInput.className = "url-importer-input";
  urlInput.placeholder = "https://example.com";
  urlInput.setAttribute("autocomplete", "url");
  urlInput.inputMode = "url";
  urlInput.setAttribute(
    "aria-describedby",
    "url-importer-status url-importer-validation",
  );

  urlPanel.append(urlLabel, urlInput);

  const pastePanel = document.createElement("div");
  pastePanel.className = "url-importer-paste-panel";
  pastePanel.hidden = true;

  const pasteLabel = document.createElement("label");
  pasteLabel.htmlFor = "csp-paste";
  pasteLabel.textContent = "Headers or CSP policy";

  const pasteInput = document.createElement("textarea");
  pasteInput.id = "csp-paste";
  pasteInput.name = "csp-paste";
  pasteInput.className = "url-importer-textarea";
  pasteInput.rows = 8;
  pasteInput.placeholder = PASTE_PLACEHOLDER;
  pasteInput.setAttribute(
    "aria-describedby",
    "url-importer-status url-importer-validation",
  );

  pastePanel.append(pasteLabel, pasteInput);

  const actions = document.createElement("div");
  actions.className = "url-importer-actions";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn btn-primary url-importer-submit";
  submitBtn.textContent = "Import CSP";

  const validateBtn = document.createElement("button");
  validateBtn.type = "button";
  validateBtn.className = "btn btn-secondary url-importer-validate";
  validateBtn.textContent = "Validate CSP";

  const status = document.createElement("div");
  status.id = "url-importer-status";
  status.className = "url-importer-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const validationPanel = document.createElement("section");
  validationPanel.id = "url-importer-validation";
  validationPanel.className = "url-importer-validation";
  validationPanel.hidden = true;
  validationPanel.setAttribute(
    "aria-labelledby",
    "url-importer-validation-heading",
  );

  const validationHeading = document.createElement("h3");
  validationHeading.id = "url-importer-validation-heading";
  validationHeading.className = "url-importer-validation-heading";
  validationHeading.textContent = "Validation results";

  const validationSummary = document.createElement("p");
  validationSummary.className = "url-importer-validation-summary";

  const validationIssues = document.createElement("ul");
  validationIssues.className = "url-importer-validation-issues";

  const correctedLabel = document.createElement("p");
  correctedLabel.className = "url-importer-corrected-label";
  correctedLabel.textContent = "Corrected policy";

  const correctedPreview = document.createElement("pre");
  correctedPreview.className = "policy-preview url-importer-corrected";

  const copyCorrectedBtn = document.createElement("button");
  copyCorrectedBtn.type = "button";
  copyCorrectedBtn.className = "btn btn-secondary url-importer-copy-corrected";
  copyCorrectedBtn.textContent = "Copy corrected policy";

  const validationLiveRegion = document.createElement("div");
  validationLiveRegion.className = "visually-hidden";
  validationLiveRegion.setAttribute("aria-live", "polite");
  validationLiveRegion.setAttribute("aria-atomic", "true");

  validationPanel.append(
    validationHeading,
    validationSummary,
    validationIssues,
    correctedLabel,
    correctedPreview,
    copyCorrectedBtn,
    validationLiveRegion,
  );

  actions.append(submitBtn, validateBtn);
  form.append(
    modeFieldset,
    urlPanel,
    pastePanel,
    actions,
    status,
    validationPanel,
  );
  section.append(heading, description, form);

  /** Switches between URL fetch and paste modes, updating labels and focus targets. */
  function setImportMode(mode: ImportMode): void {
    importMode = mode;
    const isUrl = mode === "url";
    urlPanel.hidden = !isUrl;
    pastePanel.hidden = isUrl;
    urlInput.disabled = !isUrl;
    pasteInput.disabled = isUrl;
    description.textContent = isUrl ? URL_DESCRIPTION : PASTE_DESCRIPTION;
    clearValidationPanel();
    setStatus("", "neutral");
  }

  /** Writes status copy and tone to the live region used by assistive tech. */
  function setStatus(
    message: string,
    tone: "neutral" | "success" | "error" = "neutral",
  ): void {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  /** Toggles disabled/loading state on import and validate controls. */
  function setLoading(loading: boolean, mode: "import" | "validate" = "import"): void {
    submitBtn.disabled = loading;
    validateBtn.disabled = loading;
    urlInput.disabled = loading || importMode !== "url";
    pasteInput.disabled = loading || importMode !== "paste";
    urlModeRadio.disabled = loading;
    pasteModeRadio.disabled = loading;
    submitBtn.textContent =
      loading && mode === "import" ? "Importing…" : "Import CSP";
    validateBtn.textContent =
      loading && mode === "validate" ? "Validating…" : "Validate CSP";
  }

  /** Resets the validation panel before a new import or validate attempt. */
  function clearValidationPanel(): void {
    validationPanel.hidden = true;
    validationSummary.textContent = "";
    validationIssues.replaceChildren();
    correctedPreview.textContent = "";
  }

  function announceValidation(message: string): void {
    validationLiveRegion.textContent = "";
    requestAnimationFrame(() => {
      validationLiveRegion.textContent = message;
    });
  }

  function renderValidationResults(result: PolicyValidationResult): void {
    validationPanel.hidden = false;
    validationIssues.replaceChildren();

    const errorCount = result.issues.filter(
      (issue) => issue.severity === "error",
    ).length;
    const warningCount = result.issues.filter(
      (issue) => issue.severity === "warning",
    ).length;

    if (result.issues.length === 0) {
      validationSummary.textContent =
        "No issues found — corrected policy matches best-practice formatting.";
    } else {
      const parts: string[] = [];
      if (errorCount > 0) {
        parts.push(`${errorCount} error${errorCount === 1 ? "" : "s"}`);
      }
      if (warningCount > 0) {
        parts.push(`${warningCount} warning${warningCount === 1 ? "" : "s"}`);
      }
      validationSummary.textContent = parts.join(", ");
    }

    for (const issue of result.issues) {
      const item = document.createElement("li");
      item.dataset.severity = issue.severity;

      const message = document.createElement("span");
      message.className = "url-importer-validation-message";
      message.textContent = issue.message;

      item.appendChild(message);

      if (issue.suggestion) {
        const suggestion = document.createElement("span");
        suggestion.className = "url-importer-validation-suggestion";
        suggestion.textContent = issue.suggestion;
        item.appendChild(suggestion);
      }

      validationIssues.appendChild(item);
    }

    correctedPreview.textContent = result.correctedPolicy;
    copyCorrectedBtn.disabled = !result.correctedPolicy;
  }

  /** Applies parsed directives to the builder and syncs report-only mode. */
  function applyPolicy(
    policy: string,
    reportOnly: boolean,
  ): number {
    const parsed = parsePolicyString(policy);
    parsed.reportOnly = reportOnly;

    const appliedCount = applyParsedPolicy(sections, parsed);
    outputPanel.setReportOnly(reportOnly);
    onApplied();
    return appliedCount;
  }

  async function resolveUrlImport(url: string): Promise<ResolvedImport> {
    const result = await lookupCspFromUrl(url);
    const appliedCount = applyPolicy(result.policy, result.reportOnly);

    return {
      policy: result.policy,
      reportOnly: result.reportOnly,
      source: result.source,
      appliedCount,
      originLabel: result.url,
    };
  }

  function resolvePasteImport(text: string): ResolvedImport {
    const extracted = extractCspFromText(text);
    const appliedCount = applyPolicy(extracted.policy, extracted.reportOnly);

    return {
      policy: extracted.policy,
      reportOnly: extracted.reportOnly,
      source: extracted.source,
      appliedCount,
      originLabel: pasteOriginLabel(extracted.source),
    };
  }

  function pasteOriginLabel(source: ExtractCspSource): string {
    switch (source) {
      case "header-enforce":
        return "pasted headers";
      case "header-report-only":
        return "pasted report-only headers";
      case "raw":
        return "pasted policy";
    }
  }

  /** Maps lookup/paste source codes to user-facing labels in success messages. */
  function sourceLabel(source: string): string {
    if (source.startsWith("meta")) {
      return "HTML meta tag";
    }
    if (source === "header-enforce" || source === "header-report-only") {
      return "HTTP response header";
    }
    if (source === "raw") {
      return "pasted policy";
    }
    return source;
  }

  function successMessage(result: ResolvedImport): string {
    const countLabel = `${result.appliedCount} directive${result.appliedCount === 1 ? "" : "s"}`;

    if (importMode === "url") {
      return `Imported ${countLabel} from ${result.originLabel} (${sourceLabel(result.source)}).`;
    }

    return `Imported ${countLabel} from ${result.originLabel}.`;
  }

  function handleNoCspFound(message: string): void {
    setStatus("", "neutral");
    status.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.className = "url-importer-no-csp";
    paragraph.textContent = message;

    const link = document.createElement("a");
    link.href = "/why-csp.html";
    link.textContent = "Learn why your site should use a CSP";
    link.className = "url-importer-learn-link";

    status.append(paragraph, link);
  }

  /** Routes lookup and extraction failures to inline status or no-CSP guidance. */
  function handleImportFailure(error: unknown): void {
    clearValidationPanel();

    if (importMode === "url") {
      const failure = error as CspLookupFailure;
      if (failure?.error === "no_csp") {
        handleNoCspFound(
          "No Content-Security-Policy was found for that URL.",
        );
        return;
      }

      setStatus(
        failure?.message ?? "Could not import a policy from that URL.",
        "error",
      );
      return;
    }

    if (error instanceof ExtractCspError) {
      if (error.code === "no_csp") {
        handleNoCspFound(
          "No Content-Security-Policy was found in the pasted text.",
        );
        return;
      }

      setStatus(error.message, "error");
      return;
    }

    setStatus("Could not import a policy from the pasted text.", "error");
  }

  function validateActiveInput(): string | null {
    if (importMode === "url") {
      const url = urlInput.value.trim();
      if (!url) {
        setStatus("Enter a URL to import a policy.", "error");
        urlInput.focus();
        return null;
      }
      return url;
    }

    const text = pasteInput.value.trim();
    if (!text) {
      setStatus("Paste headers or a CSP policy to import.", "error");
      pasteInput.focus();
      return null;
    }
    return text;
  }

  async function resolveImport(value: string): Promise<ResolvedImport> {
    if (importMode === "url") {
      return resolveUrlImport(value);
    }
    return resolvePasteImport(value);
  }

  function loadingMessage(): string {
    return importMode === "url"
      ? "Fetching policy from the site…"
      : "Extracting policy from pasted text…";
  }

  urlModeRadio.addEventListener("change", () => {
    if (urlModeRadio.checked) {
      setImportMode("url");
    }
  });

  pasteModeRadio.addEventListener("change", () => {
    if (pasteModeRadio.checked) {
      setImportMode("paste");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const value = validateActiveInput();
    if (!value) return;

    void (async () => {
      setLoading(true, "import");
      setStatus(loadingMessage(), "neutral");
      clearValidationPanel();

      try {
        const result = await resolveImport(value);
        setStatus(successMessage(result), "success");
      } catch (error) {
        handleImportFailure(error);
      } finally {
        setLoading(false);
      }
    })();
  });

  validateBtn.addEventListener("click", () => {
    const value = validateActiveInput();
    if (!value) return;

    void (async () => {
      setLoading(true, "validate");
      setStatus(loadingMessage(), "neutral");
      clearValidationPanel();

      try {
        const result = await resolveImport(value);
        const validation = validatePolicyString(result.policy);

        setStatus(successMessage(result), "success");
        renderValidationResults(validation);
      } catch (error) {
        handleImportFailure(error);
      } finally {
        setLoading(false);
      }
    })();
  });

  copyCorrectedBtn.addEventListener("click", () => {
    const text = correctedPreview.textContent ?? "";
    if (!text) {
      const message = "Nothing to copy";
      announceValidation(message);
      showToast(message, "error");
      return;
    }

    void navigator.clipboard
      .writeText(text)
      .then(() => {
        const message = "Corrected policy copied to clipboard";
        announceValidation(message);
        showToast(message, "success");
      })
      .catch(() => {
        const message = "Copy failed";
        announceValidation(message);
        showToast(message, "error");
      });
  });

  return section;
}
