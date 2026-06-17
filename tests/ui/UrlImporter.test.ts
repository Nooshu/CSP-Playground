import { beforeEach, describe, expect, it, vi } from "vitest";
import { DIRECTIVES } from "../../src/csp/directives";
import { createDirectiveSection } from "../../src/ui/DirectiveSection";
import { createPolicyOutput } from "../../src/ui/PolicyOutput";
import { createUrlImporter } from "../../src/ui/UrlImporter";
import * as lookupApi from "../../src/api/lookupCsp";

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
});
