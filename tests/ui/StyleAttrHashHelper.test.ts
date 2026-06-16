import { describe, expect, it, vi } from "vitest";
import { createStyleAttrHashHelper } from "../../src/ui/StyleAttrHashHelper";

describe("createStyleAttrHashHelper", () => {
  it("generates hashes and copies values", async () => {
    const values: string[] = [];
    const onChange = vi.fn();
    const helper = createStyleAttrHashHelper({
      idPrefix: "style-src-attr",
      helpId: "style-src-attr-help",
      addValue: (value) => values.push(value),
      getValues: () => values,
      onChange,
    });
    document.body.appendChild(helper);

    (helper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();
    expect(helper.querySelector(".nonce-helper-status")?.textContent).toContain(
      "Enter the style attribute value",
    );

    const input = helper.querySelector(
      "#style-src-attr-style-attr-value",
    ) as HTMLInputElement;
    input.value = "display:none";
    (helper.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();

    await vi.waitFor(() =>
      expect(helper.querySelector(".nonce-result")?.hidden).toBe(false),
    );
    expect(values.some((value) => value.startsWith("'sha256-"))).toBe(true);
    expect(values).toContain("'unsafe-hashes'");

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    (helper.querySelector(".btn.btn-primary") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

    (helper.querySelector(".nonce-result-actions .btn.btn-secondary") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
  });

  it("handles copy failures and missing hash state", async () => {
    const helper = createStyleAttrHashHelper({
      idPrefix: "style-src-attr-copy",
      helpId: "style-src-attr-copy-help",
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
      "Generate a hash first.",
    );
  });
});
