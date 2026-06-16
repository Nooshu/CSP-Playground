import { describe, expect, it, vi } from "vitest";
import { DIRECTIVES } from "../../src/csp/directives";
import { createDirectiveSection } from "../../src/ui/DirectiveSection";
import { createPolicyOutput } from "../../src/ui/PolicyOutput";
import { createUrlImporter } from "../../src/ui/UrlImporter";
import * as lookupApi from "../../src/api/lookupCsp";

describe("createUrlImporter", () => {
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
});
