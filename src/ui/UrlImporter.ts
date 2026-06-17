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
  input.setAttribute("aria-describedby", "url-importer-status");

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn btn-primary url-importer-submit";
  submitBtn.textContent = "Import CSP";

  const status = document.createElement("div");
  status.id = "url-importer-status";
  status.className = "url-importer-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  inputRow.append(input, submitBtn);
  form.append(label, inputRow, status);
  section.append(heading, description, form);

  function setStatus(
    message: string,
    tone: "neutral" | "success" | "error" = "neutral",
  ): void {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function setLoading(loading: boolean): void {
    submitBtn.disabled = loading;
    input.disabled = loading;
    submitBtn.textContent = loading ? "Looking up…" : "Import CSP";
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
      setLoading(true);
      setStatus("Fetching policy from the site…", "neutral");

      try {
        const result = await lookupCspFromUrl(url);
        const parsed = parsePolicyString(result.policy);
        parsed.reportOnly = result.reportOnly;

        const appliedCount = applyParsedPolicy(sections, parsed);
        outputPanel.setReportOnly(result.reportOnly);
        onApplied();

        const sourceLabel =
          result.source.startsWith("meta") ? "HTML meta tag" : "HTTP response header";

        setStatus(
          `Imported ${appliedCount} directive${appliedCount === 1 ? "" : "s"} from ${result.url} (${sourceLabel}).`,
          "success",
        );
      } catch (error) {
        const failure = error as CspLookupFailure;
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
      } finally {
        setLoading(false);
      }
    })();
  });

  return section;
}
