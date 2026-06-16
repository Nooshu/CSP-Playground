import { describe, expect, it, vi } from "vitest";
import { extractMetaCsp } from "../src/csp/parsePolicy";
import { scorePolicy } from "../src/csp/scorePolicy";
import { normalizeLookupUrl } from "../server/fetchCsp";
import { handleCspLookupRequest } from "../server/handleCspLookup";
import { createDirectiveSection } from "../src/ui/DirectiveSection";
import { DIRECTIVES } from "../src/csp/directives";
import { createSourceListEditor } from "../src/ui/SourceListEditor";
import { createPolicyOutput } from "../src/ui/PolicyOutput";
import { createSecurityScorePanel } from "../src/ui/SecurityScore";
import { createUrlImporter } from "../src/ui/UrlImporter";
import * as scorePolicyModule from "../src/csp/scorePolicy";
import * as hashModule from "../src/csp/hash";
import { scrollToRecommendationTarget } from "../src/ui/scrollToTarget";
import { createFlagInfoIcon } from "../src/ui/FlagInfoIcon";
import { createNonceHelper } from "../src/ui/NonceHelper";
import { createApp } from "../src/ui/App";
import { createStyleAttrHashHelper } from "../src/ui/StyleAttrHashHelper";
import * as lookupApi from "../src/api/lookupCsp";

describe("coverage gaps", () => {
  it("treats public IPv4 addresses as allowed", () => {
    expect(normalizeLookupUrl("https://8.8.8.8/path").hostname).toBe("8.8.8.8");
  });

  it("reads report-only meta tags in reversed attribute order", () => {
    const html = `
      <meta content="default-src none" http-equiv="Content-Security-Policy-Report-Only">
    `;
    expect(extractMetaCsp(html)).toEqual({
      policy: "default-src none",
      reportOnly: true,
    });
  });

  it("returns strong and excellent summaries", () => {
    const strong = scorePolicy({
      "default-src": { enabled: true, values: ["'self'"] },
      "script-src": { enabled: true, values: ["'nonce-abc'"] },
      "object-src": { enabled: true, values: ["'none'"] },
      "base-uri": { enabled: true, values: ["'self'"] },
    });
    expect(strong.score).toBeGreaterThanOrEqual(70);
    expect(strong.score).toBeLessThan(85);
    expect(strong.summary).toContain("Strong policy");

    const excellent = scorePolicy({
      "default-src": { enabled: true, values: ["'self'"] },
      "script-src": {
        enabled: true,
        values: ["'nonce-abc'", "'strict-dynamic'"],
      },
      "object-src": { enabled: true, values: ["'none'"] },
      "frame-ancestors": { enabled: true, values: ["'self'"] },
      "base-uri": { enabled: true, values: ["'self'"] },
      "form-action": { enabled: true, values: ["'self'"] },
      "upgrade-insecure-requests": { enabled: true, values: [] },
      "require-trusted-types-for": { enabled: true, values: ["'script'"] },
      "trusted-types": { enabled: true, values: ["default"] },
    });
    expect(excellent.summary).toContain("Excellent protection");
  });

  it("handles lookup requests without a url field", async () => {
    const response = await handleCspLookupRequest(JSON.stringify({}));
    expect(response.status).toBe(400);
  });

  it("covers directive section and source editor edge cases", () => {
    const onChange = vi.fn();
    const directive = {
      ...DIRECTIVES[0]!,
      type: "unknown-type" as "source-list",
    };
    const section = createDirectiveSection({ directive, onChange });
    section.setState({ enabled: true, values: [] });
    expect(section.getState()).toEqual({ enabled: false, values: [] });

    const imgDirective = DIRECTIVES.find((item) => item.name === "img-src")!;
    const container = document.createElement("div");
    const editor = createSourceListEditor(container, {
      directive: imgDirective,
      onChange,
    });

    container
      .querySelector(".add-source-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const input = container.querySelector(".custom-source-row input") as HTMLInputElement;
    input.value = "https://pending.example";
    editor.setValues(["'self'"]);
    expect(container.querySelector(".custom-source-row")).toBeNull();

    const scriptContainer = document.createElement("div");
    const scriptDirective = DIRECTIVES.find((item) => item.name === "script-src")!;
    createSourceListEditor(scriptContainer, {
      directive: scriptDirective,
      onChange,
    });
    const externalInput = scriptContainer.querySelector(
      "input[type='url']",
    ) as HTMLInputElement;
    externalInput.value = "https://cdn.example.com/app.js";
    const generateBtn = scriptContainer.querySelector(
      ".nonce-generate-btn",
    ) as HTMLButtonElement;
    generateBtn.click();
    generateBtn.click();
    expect(onChange).toHaveBeenCalled();
  });

  it("covers policy output enforce mode and security score fallback", () => {
    const panel = createPolicyOutput({
      getState: () => ({
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    });
    document.body.appendChild(panel);
    panel.setReportOnly(true);
    const enforceRadio = panel.querySelector(
      'input[value="enforce"]',
    ) as HTMLInputElement;
    enforceRadio.dispatchEvent(new Event("change", { bubbles: true }));
    expect(panel.getReportOnly()).toBe(false);

    vi.spyOn(scorePolicyModule, "scorePolicy").mockReturnValue({
      score: 10,
      grade: "Unknown" as "Poor",
      summary: "Test",
      factors: [{ label: "Neutral", points: 0 }],
      recommendations: [],
      potentialScore: 10,
    });
    const scorePanel = createSecurityScorePanel({
      getState: () => ({}),
      getReportOnly: () => false,
    });
    document.body.appendChild(scorePanel);
    scorePanel.update();
    expect(scorePanel.className).toContain("score-poor");
  });

  it("covers scroll, flag info, nonce, app, style hash, and importer branches", async () => {
    const child = document.createElement("span");
    child.dataset.directive = "default-src";
    const section = document.createElement("article");
    section.className = "directive-section";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "enable-checkbox";
    section.append(checkbox, child);
    document.body.appendChild(section);
    scrollToRecommendationTarget("default-src");

    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const icon = createFlagInfoIcon({
      group: "sandbox",
      flagKey: "allow-scripts",
      idPrefix: "loading-dup",
    });
    document.body.appendChild(icon);
    const button = icon.querySelector("button")!;
    vi.spyOn(button, "matches").mockReturnValue(true);
    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    resolveFetch({
      ok: true,
      json: async () => ({
        sandbox: { "allow-scripts": "Allows scripts." },
      }),
    });
    await vi.waitFor(() =>
      expect(icon.querySelector(".flag-info-tooltip")?.textContent).toBeTruthy(),
    );

    const nonceHelper = createNonceHelper({
      idPrefix: "nonce-external",
      helpId: "nonce-external-help",
      variant: "script",
      addValue: vi.fn(),
      getValues: () => [],
      onChange: vi.fn(),
    });
    document.body.appendChild(nonceHelper);
    const externalRadio = nonceHelper.querySelector(
      'input[value="external"]',
    ) as HTMLInputElement;
    externalRadio.checked = false;
    externalRadio.dispatchEvent(new Event("change", { bubbles: true }));

    const root = document.createElement("div");
    root.id = "app-coverage";
    document.body.appendChild(root);
    createApp(root);
    const firstSection = root.querySelector(".directive-section") as HTMLElement;
    delete firstSection.dataset.directive;
    const enableCheckbox = firstSection.querySelector(
      ".enable-checkbox",
    ) as HTMLInputElement;
    enableCheckbox.checked = true;
    enableCheckbox.dispatchEvent(new Event("change", { bubbles: true }));

    vi.spyOn(hashModule, "sha256Base64FromText").mockRejectedValue("hash failed");
    const hashHelper = createStyleAttrHashHelper({
      idPrefix: "style-attr-error",
      helpId: "style-attr-error-help",
      addValue: vi.fn(),
      getValues: () => [],
      onChange: vi.fn(),
    });
    document.body.appendChild(hashHelper);
    (hashHelper.querySelector("input") as HTMLInputElement).value = "color:red";
    (hashHelper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(hashHelper.querySelector(".nonce-helper-status")?.textContent).toBe(
        "Could not generate a hash.",
      ),
    );

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
    vi.spyOn(lookupApi, "lookupCspFromUrl").mockResolvedValue({
      url: "https://example.com",
      policy: "default-src 'self'",
      reportOnly: false,
      source: "meta-enforce",
    });
    const importerInput = importer.querySelector(
      ".url-importer-input",
    ) as HTMLInputElement;
    importerInput.value = "https://example.com";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector(".url-importer-status")?.textContent).toContain(
        "HTML meta tag",
      ),
    );

    vi.spyOn(lookupApi, "lookupCspFromUrl").mockRejectedValue({});
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector(".url-importer-status")?.textContent).toContain(
        "Could not import",
      ),
    );
  });
});
