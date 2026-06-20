import { beforeEach, describe, expect, it, vi } from "vitest";
import { DIRECTIVES } from "../../src/csp/directives";
import { createDirectiveSection } from "../../src/ui/DirectiveSection";
import { createPolicyOutput } from "../../src/ui/PolicyOutput";
import { createUrlImporter } from "../../src/ui/UrlImporter";
import * as lookupApi from "../../src/api/lookupCsp";
import * as extractCspModule from "../../src/csp/extractCspFromText";
import { ExtractCspError } from "../../src/csp/extractCspFromText";

const { showToast } = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock("../../src/ui/toast", () => ({
  showToast,
}));

describe("createUrlImporter", () => {
  beforeEach(() => {
    showToast.mockClear();
  });
  it("imports policies from successful lookups", async () => {
    const sections = DIRECTIVES.slice(0, 3).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const onApplied = vi.fn();

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockResolvedValue({
      url: "https://example.com",
      policy: "default-src 'self'",
      reportOnly: false,
      source: "header-enforce",
    });

    const importer = createUrlImporter({ sections, outputPanel, onApplied });
    document.body.appendChild(importer);

    const input = importer.querySelector("#site-url") as HTMLInputElement;
    input.value = "https://example.com";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toContain(
        "Imported",
      ),
    );
    expect(onApplied).toHaveBeenCalled();
  });

  it("imports policies from pasted headers", async () => {
    const sections = DIRECTIVES.slice(0, 3).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const onApplied = vi.fn();

    const importer = createUrlImporter({ sections, outputPanel, onApplied });
    document.body.appendChild(importer);

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="paste"]',
    )?.click();

    const textarea = importer.querySelector("#csp-paste") as HTMLTextAreaElement;
    textarea.value = [
      "HTTP/1.1 200 OK",
      "Content-Security-Policy: default-src 'self'",
    ].join("\n");

    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toContain(
        "Imported",
      ),
    );
    expect(onApplied).toHaveBeenCalled();
    expect(sections[0]?.getState()).toEqual({
      enabled: true,
      values: ["'self'"],
    });
  });

  it("validates pasted raw policy text", async () => {
    const sections = DIRECTIVES.slice(0, 3).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const onApplied = vi.fn();

    const importer = createUrlImporter({ sections, outputPanel, onApplied });
    document.body.appendChild(importer);

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="paste"]',
    )?.click();

    const textarea = importer.querySelector("#csp-paste") as HTMLTextAreaElement;
    textarea.value = "default-src self; script-src 'self' 'self'";

    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));

    await vi.waitFor(() =>
      expect(
        importer.querySelector("#url-importer-validation")?.hidden,
      ).toBe(false),
    );

    expect(onApplied).toHaveBeenCalled();
    expect(
      importer.querySelector(".url-importer-validation-issues")?.children.length,
    ).toBeGreaterThan(0);
  });

  it("shows validation, no-csp, and error states", async () => {
    const sections = DIRECTIVES.slice(0, 1).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const importer = createUrlImporter({
      sections,
      outputPanel,
      onApplied: vi.fn(),
    });
    document.body.appendChild(importer);

    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    expect(importer.querySelector("#url-importer-status")?.dataset.tone).toBe(
      "error",
    );

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="paste"]',
    )?.click();
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    expect(importer.querySelector("#url-importer-status")?.dataset.tone).toBe(
      "error",
    );

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="url"]',
    )?.click();

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockRejectedValue({
      error: "no_csp",
      message: "No policy found.",
    });
    const input = importer.querySelector("#site-url") as HTMLInputElement;
    input.value = "https://example.com";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector(".url-importer-learn-link")).not.toBeNull(),
    );

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockRejectedValue({
      error: "fetch_failed",
      message: "Network error.",
    });
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.dataset.tone).toBe(
        "error",
      ),
    );
  });

  it("can progressively enhance an existing container element", () => {
    const sections = DIRECTIVES.slice(0, 1).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });

    const container = document.createElement("section");
    container.className = "url-importer";
    container.innerHTML = "<p>placeholder</p>";

    const mounted = createUrlImporter({
      sections,
      outputPanel,
      onApplied: vi.fn(),
      container,
    });

    expect(mounted).toBe(container);
    expect(container.querySelector("p")?.textContent).not.toBe("placeholder");
    expect(container.querySelector("form")).not.toBeNull();
  });

  it("validates after importing from a URL", async () => {
    const sections = DIRECTIVES.slice(0, 3).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const onApplied = vi.fn();

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockResolvedValue({
      url: "https://example.com",
      policy: "default-src self; script-src 'self' 'self'",
      reportOnly: false,
      source: "header-enforce",
    });

    const importer = createUrlImporter({ sections, outputPanel, onApplied });
    document.body.appendChild(importer);

    const input = importer.querySelector("#site-url") as HTMLInputElement;
    input.value = "https://example.com";
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));

    await vi.waitFor(() =>
      expect(
        importer.querySelector("#url-importer-validation")?.hidden,
      ).toBe(false),
    );

    expect(onApplied).toHaveBeenCalled();
    expect(
      importer.querySelector(".url-importer-validation-issues")?.children.length,
    ).toBeGreaterThan(0);
    expect(
      importer.querySelector(".url-importer-corrected")?.textContent,
    ).toContain("'self'");
    expect(
      importer.querySelector(".url-importer-copy-corrected"),
    ).not.toBeNull();
  });

  it("shows error for empty URL on validate and disables both buttons while loading", async () => {
    const sections = DIRECTIVES.slice(0, 1).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const importer = createUrlImporter({
      sections,
      outputPanel,
      onApplied: vi.fn(),
    });
    document.body.appendChild(importer);

    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    expect(importer.querySelector("#url-importer-status")?.dataset.tone).toBe(
      "error",
    );

    let resolveLookup: (value: lookupApi.CspLookupSuccess) => void = () => {};
    vi.spyOn(lookupApi, "lookupCspFromUrl").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
    );

    const input = importer.querySelector("#site-url") as HTMLInputElement;
    input.value = "https://example.com";
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));

    await vi.waitFor(() =>
      expect(
        (importer.querySelector(".url-importer-submit") as HTMLButtonElement)
          .disabled,
      ).toBe(true),
    );
    expect(
      (importer.querySelector(".url-importer-validate") as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    resolveLookup({
      url: "https://example.com",
      policy: "default-src 'self'",
      reportOnly: false,
      source: "header-enforce",
    });

    await vi.waitFor(() =>
      expect(
        (importer.querySelector(".url-importer-validate") as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
  });

  it("shows a toast when copying the corrected policy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const sections = DIRECTIVES.slice(0, 3).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const importer = createUrlImporter({
      sections,
      outputPanel,
      onApplied: vi.fn(),
    });
    document.body.appendChild(importer);

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockResolvedValue({
      url: "https://example.com",
      policy: "default-src self",
      reportOnly: false,
      source: "header-enforce",
    });

    const input = importer.querySelector("#site-url") as HTMLInputElement;
    input.value = "https://example.com";
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));

    await vi.waitFor(() =>
      expect(
        importer.querySelector(".url-importer-corrected")?.textContent,
      ).toContain("'self'"),
    );

    (
      importer.querySelector(".url-importer-copy-corrected") as HTMLButtonElement
    ).click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(
      "Corrected policy copied to clipboard",
      "success",
    );
  });

  it("handles paste import failures and validation edge cases", async () => {
    const sections = DIRECTIVES.slice(0, 2).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const importer = createUrlImporter({
      sections,
      outputPanel,
      onApplied: vi.fn(),
    });
    document.body.appendChild(importer);

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="paste"]',
    )?.click();

    const textarea = importer.querySelector("#csp-paste") as HTMLTextAreaElement;
    textarea.value = "Content-Type: text/html";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector(".url-importer-learn-link")).not.toBeNull(),
    );

    textarea.value =
      "default-src 'self'; block-all-mixed-content; script-src self 'self'";
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    await vi.waitFor(() =>
      expect(
        importer.querySelector("#url-importer-validation")?.hidden,
      ).toBe(false),
    );

    textarea.value = "default-src 'self'; block-all-mixed-content";
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    await vi.waitFor(() =>
      expect(
        importer.querySelector(".url-importer-validation-summary")?.textContent,
      ).toMatch(/warning/),
    );

    textarea.value = "default-src 'self'";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toContain(
        "pasted policy",
      ),
    );

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockResolvedValue({
      url: "https://example.com",
      policy: "default-src 'self'",
      reportOnly: true,
      source: "header-report-only",
    });
    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="url"]',
    )?.click();
    const urlInput = importer.querySelector("#site-url") as HTMLInputElement;
    urlInput.value = "https://example.com";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toContain(
        "HTTP response header",
      ),
    );
  });

  it("handles corrected-policy copy failures in paste validation", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    const sections = DIRECTIVES.slice(0, 2).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const importer = createUrlImporter({
      sections,
      outputPanel,
      onApplied: vi.fn(),
    });
    document.body.appendChild(importer);

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="paste"]',
    )?.click();
    const textarea = importer.querySelector("#csp-paste") as HTMLTextAreaElement;
    textarea.value = "default-src self; script-src 'self' 'self'";
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));

    await vi.waitFor(() =>
      expect(
        importer.querySelector(".url-importer-copy-corrected"),
      ).not.toBeNull(),
    );

    (
      importer.querySelector(".url-importer-copy-corrected") as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Copy failed", "error"),
    );

    (
      importer.querySelector(".url-importer-corrected") as HTMLElement
    ).textContent = "";
    (
      importer.querySelector(".url-importer-copy-corrected") as HTMLButtonElement
    ).click();
    expect(showToast).toHaveBeenCalledWith("Nothing to copy", "error");
  });

  it("handles paste import errors and unknown URL source labels", async () => {
    const sections = DIRECTIVES.slice(0, 1).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const importer = createUrlImporter({
      sections,
      outputPanel,
      onApplied: vi.fn(),
    });
    document.body.appendChild(importer);

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="paste"]',
    )?.click();
    const textarea = importer.querySelector("#csp-paste") as HTMLTextAreaElement;

    textarea.value = "";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.dataset.tone).toBe(
        "error",
      ),
    );

    textarea.value = "Content-Type: text/html";
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    await vi.waitFor(() =>
      expect(importer.querySelector(".url-importer-learn-link")).not.toBeNull(),
    );

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockResolvedValue({
      url: "https://example.com",
      policy: "default-src 'self'",
      reportOnly: false,
      source: "custom-source" as "header-enforce",
    });
    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="url"]',
    )?.click();
    (importer.querySelector("#site-url") as HTMLInputElement).value =
      "https://example.com";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toContain(
        "custom-source",
      ),
    );
  });

  it("covers paste report-only labels and remaining failure handlers", async () => {
    const sections = DIRECTIVES.slice(0, 1).map((directive) =>
      createDirectiveSection({ directive, onChange: vi.fn() }),
    );
    const outputPanel = createPolicyOutput({ getState: () => ({}) });
    const importer = createUrlImporter({
      sections,
      outputPanel,
      onApplied: vi.fn(),
    });
    document.body.appendChild(importer);

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="paste"]',
    )?.click();
    const textarea = importer.querySelector("#csp-paste") as HTMLTextAreaElement;

    textarea.value =
      "Content-Security-Policy-Report-Only: default-src 'none'";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toContain(
        "pasted report-only headers",
      ),
    );

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockResolvedValue({
      url: "https://example.com",
      policy: "default-src 'self'",
      reportOnly: false,
      source: "raw" as "header-enforce",
    });
    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="url"]',
    )?.click();
    (importer.querySelector("#site-url") as HTMLInputElement).value =
      "https://example.com";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toContain(
        "pasted policy",
      ),
    );

    importer.querySelector<HTMLInputElement>(
      'input[name="import-mode"][value="paste"]',
    )?.click();
    textarea.value = "default-src 'self'";
    vi.spyOn(extractCspModule, "extractCspFromText").mockImplementation(() => {
      throw new ExtractCspError("empty", "Paste is empty.");
    });
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toBe(
        "Paste is empty.",
      ),
    );

    vi.spyOn(extractCspModule, "extractCspFromText").mockImplementation(() => {
      throw new Error("paste failed");
    });
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.textContent).toBe(
        "Could not import a policy from the pasted text.",
      ),
    );
  });
});
