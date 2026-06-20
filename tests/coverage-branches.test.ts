import { afterEach, describe, expect, it, vi } from "vitest";
import { DIRECTIVES } from "../src/csp/directives";
import { createDirectiveSection } from "../src/ui/DirectiveSection";
import { createFlagInfoIcon } from "../src/ui/FlagInfoIcon";
import { createNonceHelper } from "../src/ui/NonceHelper";
import { createPolicyOutput } from "../src/ui/PolicyOutput";
import { createSecurityScorePanel } from "../src/ui/SecurityScore";
import {
  scrollToGeneratedPolicy,
  scrollToRecommendationTarget,
} from "../src/ui/scrollToTarget";
import { createStyleAttrHashHelper } from "../src/ui/StyleAttrHashHelper";
import { createUrlImporter } from "../src/ui/UrlImporter";
import * as scorePolicyModule from "../src/csp/scorePolicy";

describe("branch coverage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("covers importer, score, scroll, and flag edge branches", async () => {
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
    textarea.value = "HTTP/1.1 200 OK\nContent-Type: text/html";
    importer.querySelector("form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(importer.querySelector(".url-importer-learn-link")).not.toBeNull(),
    );

    textarea.value = "default-src 'self'";
    importer
      .querySelector(".url-importer-validate")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    await vi.waitFor(() =>
      expect(importer.querySelector("#url-importer-status")?.dataset.tone).toBe(
        "success",
      ),
    );

    const scorePanel = createSecurityScorePanel({
      getState: () => ({
        "script-src": { enabled: true, values: ["'unsafe-inline'"] },
      }),
      getReportOnly: () => false,
    });
    document.body.appendChild(scorePanel);
    scorePanel.update();
    scorePanel
      .querySelector(".security-score-recommendations-list")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const child = document.createElement("input");
    child.className = "source-input";
    const section = document.createElement("article");
    section.className = "directive-section";
    section.dataset.directive = "img-src";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "enable-checkbox";
    checkbox.checked = true;
    section.append(checkbox, child);
    document.body.appendChild(section);
    scrollToRecommendationTarget("img-src");

    const policyPanel = document.createElement("aside");
    policyPanel.id = "generated-policy";
    policyPanel.innerHTML = "<h2 tabindex=\"-1\">Policy</h2>";
    document.body.appendChild(policyPanel);
    scrollToGeneratedPolicy();

    vi.spyOn(scorePolicyModule, "scorePolicy").mockReturnValue({
      score: 0,
      grade: "Poor",
      summary: "Test",
      factors: [],
      recommendations: [
        {
          id: "remove-unsafe-inline",
          label: "Remove unsafe-inline",
          targetId: "script-src",
        },
      ],
      potentialScore: 50,
    });
    scorePanel.update();
    scorePanel
      .querySelector(".security-score-recommendation-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  it("covers nonce mode toggles, copy paths, and source editor branches", async () => {
    const onChange = vi.fn();
    const nonceHelper = createNonceHelper({
      idPrefix: "branch-nonce",
      helpId: "branch-nonce-help",
      variant: "script",
      addValue: vi.fn(),
      getValues: () => ["'nonce-existing'"],
      onChange,
    });
    document.body.appendChild(nonceHelper);

    const externalRadio = nonceHelper.querySelector(
      'input[value="external"]',
    ) as HTMLInputElement;
    externalRadio.checked = true;
    externalRadio.dispatchEvent(new Event("change", { bubbles: true }));

    const inlineRadio = nonceHelper.querySelector(
      'input[value="inline"]',
    ) as HTMLInputElement;
    inlineRadio.checked = true;
    inlineRadio.dispatchEvent(new Event("change", { bubbles: true }));

    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(() => {
      throw "not an Error";
    });
    (nonceHelper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();
    expect(nonceHelper.querySelector(".nonce-helper-status")?.textContent).toBe(
      "Could not generate a nonce.",
    );

    const hashHelper = createStyleAttrHashHelper({
      idPrefix: "branch-style-attr",
      helpId: "branch-style-attr-help",
      addValue: vi.fn(),
      getValues: () => [],
      onChange,
    });
    document.body.appendChild(hashHelper);
    (hashHelper.querySelector("input") as HTMLInputElement).value = "color: blue";
    (hashHelper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(hashHelper.querySelector(".nonce-result")?.hidden).toBe(false),
    );

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
      idPrefix: "branch-flag",
    });
    document.body.appendChild(icon);
    icon.querySelector("button")?.dispatchEvent(
      new MouseEvent("mouseenter", { bubbles: true }),
    );
    resolveFetch({
      ok: true,
      json: async () => ({
        sandbox: { "allow-scripts": "Allows scripts." },
      }),
    });
    await vi.waitFor(() =>
      expect(icon.querySelector(".flag-info-tooltip")?.textContent).toBeTruthy(),
    );
  });

  it("covers policy output copy failures and empty exports", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const panel = createPolicyOutput({
      getState: () => ({
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    });
    document.body.appendChild(panel);
    panel.update();

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );

    serverSelect.value = "invalid-server";
    (
      panel.querySelectorAll(".output-actions .btn.btn-secondary")[1] as HTMLButtonElement
    ).click();
  });
});
