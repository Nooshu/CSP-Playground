import { describe, expect, it, vi } from "vitest";
import { DIRECTIVES } from "../../src/csp/directives";
import { createSourceListEditor } from "../../src/ui/SourceListEditor";

describe("createSourceListEditor", () => {
  it("adds keywords, custom sources, and removes values", () => {
    const onChange = vi.fn();
    const directive = DIRECTIVES.find((item) => item.name === "img-src")!;
    const container = document.createElement("div");
    const editor = createSourceListEditor(container, { directive, onChange });

    const keywordSelect = container.querySelector(
      ".keyword-select",
    ) as HTMLSelectElement;
    container
      .querySelector(".source-list-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(editor.getValues()).toEqual([]);

    keywordSelect.value = "'self'";
    container
      .querySelector(".source-list-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(editor.getValues()).toEqual(["'self'"]);

    container
      .querySelector(".add-source-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const input = container.querySelector(".custom-source-row input") as HTMLInputElement;
    input.value = "https://cdn.example.com";
    container
      .querySelector(".confirm-source-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(editor.getValues()).toContain("https://cdn.example.com");

    container
      .querySelector(".add-source-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const duplicateInput = container.querySelector(
      ".custom-source-row input",
    ) as HTMLInputElement;
    duplicateInput.value = "https://cdn.example.com";
    container
      .querySelector(".confirm-source-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(editor.getValues()).toEqual(["'self'", "https://cdn.example.com"]);

    container
      .querySelector(".remove-value-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(editor.getValues()).toEqual(["https://cdn.example.com"]);

    const removeInputBtn = container.querySelector(
      ".custom-source-row .remove-source-btn",
    );
    expect(removeInputBtn).toBeNull();

    editor.setValues(["'none'"]);
    expect(editor.getValues()).toEqual(["'none'"]);
    editor.setEnabled(false);
    expect((container.querySelector("select") as HTMLSelectElement).disabled).toBe(
      true,
    );
    editor.setEnabled(true);
  });

  it("ignores duplicate values and empty confirmations", () => {
    const onChange = vi.fn();
    const directive = DIRECTIVES.find((item) => item.name === "font-src")!;
    const container = document.createElement("div");
    const editor = createSourceListEditor(container, { directive, onChange });

    editor.setValues(["'self'"]);
    const keywordSelect = container.querySelector(
      ".keyword-select",
    ) as HTMLSelectElement;
    keywordSelect.value = "'self'";
    container
      .querySelector(".source-list-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(editor.getValues()).toEqual(["'self'"]);

    container
      .querySelector(".add-source-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const input = container.querySelector(".custom-source-row input") as HTMLInputElement;
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(editor.getValues()).toEqual(["'self'"]);

    input.value = "https://fonts.example.com";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(editor.getValues()).toContain("https://fonts.example.com");

    container
      .querySelector(".add-source-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const pendingInput = container.querySelector(
      ".custom-source-row input",
    ) as HTMLInputElement;
    const removeInputBtn = container.querySelector(
      ".custom-source-row .remove-source-btn",
    ) as HTMLButtonElement;
    removeInputBtn.click();
    expect(onChange).toHaveBeenCalled();
    expect(pendingInput.isConnected).toBe(false);
  });

  it("renders deprecated badges and skips duplicate confirmed values", async () => {
    const onChange = vi.fn();
    const directive = {
      ...DIRECTIVES.find((item) => item.name === "img-src")!,
      deprecated: true,
    };
    const container = document.createElement("div");
    createSourceListEditor(container, { directive, onChange });
    expect(container.querySelector(".deprecated-badge")?.textContent).toBe(
      "Deprecated",
    );

    const styleContainer = document.createElement("div");
    const styleDirective = DIRECTIVES.find((item) => item.name === "style-src-attr")!;
    createSourceListEditor(styleContainer, {
      directive: styleDirective,
      onChange,
    });
    const styleInput = styleContainer.querySelector(
      ".style-hash-helper input.source-input",
    ) as HTMLInputElement;
    styleInput.value = "display:none";
    const generateBtn = styleContainer.querySelector(
      ".nonce-generate-btn",
    ) as HTMLButtonElement;
    generateBtn.click();
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    onChange.mockClear();
    generateBtn.click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders nonce and style hash helpers for relevant directives", () => {
    const onChange = vi.fn();
    const scriptContainer = document.createElement("div");
    createSourceListEditor(scriptContainer, {
      directive: DIRECTIVES.find((item) => item.name === "script-src")!,
      onChange,
    });
    expect(scriptContainer.querySelector(".nonce-helper")).not.toBeNull();

    const styleContainer = document.createElement("div");
    createSourceListEditor(styleContainer, {
      directive: DIRECTIVES.find((item) => item.name === "style-src-attr")!,
      onChange,
    });
    expect(styleContainer.querySelector(".style-hash-helper")).not.toBeNull();

    const styleElemContainer = document.createElement("div");
    createSourceListEditor(styleElemContainer, {
      directive: DIRECTIVES.find((item) => item.name === "style-src-elem")!,
      onChange,
    });
    expect(styleElemContainer.querySelector(".nonce-helper")).not.toBeNull();
    const styleElemInput = styleElemContainer.querySelector(
      "input[type='url']",
    ) as HTMLInputElement;
    styleElemInput.value = "https://cdn.example.com/styles.css";
    (styleElemContainer.querySelector(".nonce-generate-btn") as HTMLButtonElement).click();
  });
});
