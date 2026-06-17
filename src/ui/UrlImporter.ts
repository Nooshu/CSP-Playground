/**
 * Form for importing an existing CSP from a live site URL.
 *
 * @remarks
 * Fetches policy text via {@link lookupCspFromUrl}, parses it with
 * {@link parsePolicyString}, and applies values through {@link applyParsedPolicy}.
 * Also syncs report-only mode on the output panel when the source used
 * `Content-Security-Policy-Report-Only`.
 *
 * @see {@link lookupCspFromUrl}
 * @see {@link applyParsedPolicy}
 */

import { lookupCspFromUrl, type CspLookupFailure } from "../api/lookupCsp";
import { parsePolicyString } from "../csp/parsePolicy";
import {
  validatePolicyString,
  type PolicyValidationResult,
} from "../csp/validatePolicy";
import { applyParsedPolicy } from "./applyPolicy";
import type { DirectiveSectionHandle } from "./DirectiveSection";
import type { PolicyOutputPanel } from "./PolicyOutput";

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

/** Result of fetching and applying a policy from a URL. */
interface ImportResult {
  policy: string;
  reportOnly: boolean;
  url: string;
  source: string;
  appliedCount: number;
}

/**
 * Creates the "Import existing policy" section with URL lookup form.
 *
 * @param options - Directive handles, output panel, and post-import callback.
 * @returns The mounted `<section>` element.
 *
 * @remarks
 * Lookup runs asynchronously on submit; controls are disabled while fetching.
 * A missing CSP shows an inline link to `/why-csp.html` rather than an error tone.
 */
export function createUrlImporter(options: UrlImporterOptions): HTMLElement {
  const { sections, outputPanel, onApplied, container } = options;

  const section = container ?? document.createElement("section");
  section.innerHTML = "";
  section.className = "url-importer";
  section.setAttribute("aria-labelledby", "url-importer-heading");

  const heading = document.createElement("h2");
  heading.id = "url-importer-heading";
  heading.textContent = "Import existing policy";

  const description = document.createElement("p");
  description.className = "url-importer-description";
  description.textContent =
    "Enter a site URL to fetch its Content-Security-Policy from HTTP headers or HTML meta tags and pre-fill the form below.";

  const form = document.createElement("form");
  form.className = "url-importer-form";
  form.noValidate = true;

  const label = document.createElement("label");
  label.htmlFor = "site-url";
  label.textContent = "Site URL";

  const inputRow = document.createElement("div");
  inputRow.className = "url-importer-row";

  const input = document.createElement("input");
  input.type = "url";
  input.id = "site-url";
  input.name = "site-url";
  input.className = "url-importer-input";
  input.placeholder = "https://example.com";
  input.setAttribute("autocomplete", "url");
  input.inputMode = "url";
  input.setAttribute(
    "aria-describedby",
    "url-importer-status url-importer-validation",
  );

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

  const validationPanel = document.createElement("div");
  validationPanel.id = "url-importer-validation";
  validationPanel.className = "url-importer-validation";
  validationPanel.hidden = true;

  const validationHeading = document.createElement("h3");
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
  inputRow.append(input, actions);
  form.append(label, inputRow, status, validationPanel);
  section.append(heading, description, form);

  function setStatus(
    message: string,
    tone: "neutral" | "success" | "error" = "neutral",
  ): void {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function setLoading(loading: boolean, mode: "import" | "validate" = "import"): void {
    submitBtn.disabled = loading;
    validateBtn.disabled = loading;
    input.disabled = loading;
    submitBtn.textContent =
      loading && mode === "import" ? "Looking up…" : "Import CSP";
    validateBtn.textContent =
      loading && mode === "validate" ? "Validating…" : "Validate CSP";
  }

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

  async function importFromUrl(url: string): Promise<ImportResult> {
    const result = await lookupCspFromUrl(url);
    const parsed = parsePolicyString(result.policy);
    parsed.reportOnly = result.reportOnly;

    const appliedCount = applyParsedPolicy(sections, parsed);
    outputPanel.setReportOnly(result.reportOnly);
    onApplied();

    return {
      policy: result.policy,
      reportOnly: result.reportOnly,
      url: result.url,
      source: result.source,
      appliedCount,
    };
  }

  function sourceLabel(source: string): string {
    return source.startsWith("meta") ? "HTML meta tag" : "HTTP response header";
  }

  function handleLookupFailure(error: unknown): void {
    const failure = error as CspLookupFailure;
    clearValidationPanel();

    if (failure?.error === "no_csp") {
      setStatus("", "neutral");
      status.innerHTML = "";
      const message = document.createElement("p");
      message.className = "url-importer-no-csp";
      message.textContent =
        "No Content-Security-Policy was found for that URL.";

      const link = document.createElement("a");
      link.href = "/why-csp.html";
      link.textContent = "Learn why your site should use a CSP";
      link.className = "url-importer-learn-link";

      status.append(message, link);
      return;
    }

    setStatus(
      failure?.message ?? "Could not import a policy from that URL.",
      "error",
    );
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const url = input.value.trim();
    if (!url) {
      setStatus("Enter a URL to import a policy.", "error");
      input.focus();
      return;
    }

    void (async () => {
      setLoading(true, "import");
      setStatus("Fetching policy from the site…", "neutral");
      clearValidationPanel();

      try {
        const result = await importFromUrl(url);

        setStatus(
          `Imported ${result.appliedCount} directive${result.appliedCount === 1 ? "" : "s"} from ${result.url} (${sourceLabel(result.source)}).`,
          "success",
        );
      } catch (error) {
        handleLookupFailure(error);
      } finally {
        setLoading(false);
      }
    })();
  });

  validateBtn.addEventListener("click", () => {
    const url = input.value.trim();
    if (!url) {
      setStatus("Enter a URL to import a policy.", "error");
      input.focus();
      return;
    }

    void (async () => {
      setLoading(true, "validate");
      setStatus("Fetching policy from the site…", "neutral");
      clearValidationPanel();

      try {
        const result = await importFromUrl(url);
        const validation = validatePolicyString(result.policy);

        setStatus(
          `Imported ${result.appliedCount} directive${result.appliedCount === 1 ? "" : "s"} from ${result.url} (${sourceLabel(result.source)}).`,
          "success",
        );
        renderValidationResults(validation);
      } catch (error) {
        handleLookupFailure(error);
      } finally {
        setLoading(false);
      }
    })();
  });

  copyCorrectedBtn.addEventListener("click", () => {
    const text = correctedPreview.textContent ?? "";
    if (!text) {
      announceValidation("Nothing to copy");
      return;
    }

    void navigator.clipboard
      .writeText(text)
      .then(() => announceValidation("Corrected policy copied"))
      .catch(() => announceValidation("Copy failed"));
  });

  return section;
}
