import { describe, expect, it, vi } from "vitest";
import { createNonceHelper } from "../../src/ui/NonceHelper";

describe("createNonceHelper", () => {
  it("shows production guidance for example nonces", () => {
    const helper = createNonceHelper({
      idPrefix: "script-src",
      helpId: "script-src-help",
      variant: "script",
      addValue: vi.fn(),
      getValues: () => [],
      onChange: vi.fn(),
    });
    document.body.appendChild(helper);

    expect(helper.querySelector(".nonce-helper-notice")?.textContent).toContain(
      "Example only",
    );
    expect(helper.querySelector(".nonce-helper-notice")?.textContent).toContain(
      "every HTTP response",
    );
  });

  it("generates script nonces for external URLs", async () => {
    const values: string[] = [];
    const onChange = vi.fn();
    const helper = createNonceHelper({
      idPrefix: "script-src",
      helpId: "script-src-help",
      variant: "script",
      addValue: (value) => values.push(value),
      getValues: () => values,
      onChange,
    });
    document.body.appendChild(helper);

    const externalInput = helper.querySelector(
      "#script-src-nonce-external-url",
    ) as HTMLInputElement;
    externalInput.value = "https://cdn.example.com/app.js";
    (helper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();

    await vi.waitFor(() =>
      expect(helper.querySelector(".nonce-result")?.hidden).toBe(false),
    );
    expect(values.some((value) => value.startsWith("'nonce-"))).toBe(true);
    expect(values).toContain("https://cdn.example.com");

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    (helper.querySelector(".btn.btn-primary") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    (helper.querySelector(".nonce-result-actions .btn.btn-secondary") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
  });

  it("generates inline style nonces and handles validation errors", async () => {
    const values: string[] = [];
    const helper = createNonceHelper({
      idPrefix: "style-src",
      helpId: "style-src-help",
      variant: "style",
      addValue: (value) => values.push(value),
      getValues: () => values,
      onChange: vi.fn(),
    });
    document.body.appendChild(helper);

    (helper.querySelector('input[value="inline"]') as HTMLInputElement).click();
    (helper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();
    expect(helper.querySelector(".nonce-helper-status")?.textContent).toContain(
      "Paste the inline CSS",
    );

    const inlineInput = helper.querySelector(
      "#style-src-nonce-inline-content",
    ) as HTMLTextAreaElement;
    inlineInput.value = "body { color: red; }";
    (helper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(helper.querySelector(".nonce-result")?.hidden).toBe(false),
    );
  });

  it("handles copy failures and missing nonce state", async () => {
    const helper = createNonceHelper({
      idPrefix: "style-src-copy",
      helpId: "style-src-copy-help",
      variant: "style",
      addValue: vi.fn(),
      getValues: () => [],
      onChange: vi.fn(),
    });
    document.body.appendChild(helper);

    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    (helper.querySelector(".btn.btn-primary") as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(helper.querySelector(".nonce-helper-status")?.textContent).toContain(
        "Copy failed",
      ),
    );

    (helper.querySelector(".nonce-result-actions .btn.btn-secondary") as HTMLButtonElement).click();
    expect(helper.querySelector(".nonce-helper-status")?.textContent).toContain(
      "Generate a nonce first.",
    );
  });

  it("rejects invalid external URLs", () => {
    const helper = createNonceHelper({
      idPrefix: "script-src-elem",
      helpId: "script-src-elem-help",
      variant: "script",
      addValue: vi.fn(),
      getValues: () => [],
      onChange: vi.fn(),
    });
    document.body.appendChild(helper);

    (helper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();
    expect(helper.querySelector(".nonce-helper-status")?.textContent).toContain(
      "Enter the URL of the script.",
    );
  });
});
