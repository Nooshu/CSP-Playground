import { afterEach, describe, expect, it, vi } from "vitest";
import { CSP_PRESETS } from "../../src/csp/presets";
import { createPresetPicker } from "../../src/ui/PresetPicker";
import type { DirectiveSectionHandle } from "../../src/ui/DirectiveSection";

function createMockSection(directiveName: string): DirectiveSectionHandle {
  let state = { enabled: false, values: [] as string[] };
  const element = document.createElement("article");
  element.dataset.directive = directiveName;

  return {
    element,
    reset: () => {
      state = { enabled: false, values: [] };
    },
    getState: () => state,
    setState: (next) => {
      state = next;
    },
  };
}

function cleanupUi(): void {
  document.body.innerHTML = "";
}

describe("createPresetPicker", () => {
  afterEach(() => {
    cleanupUi();
  });

  it("renders a trigger button", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const picker = createPresetPicker({
      sections: [],
      getState: () => ({}),
      onApplied: () => {},
      container: root,
    });

    expect(
      picker.querySelector(".preset-picker-trigger")?.textContent,
    ).toContain("Start with a preset");
  });

  it("applies a preset immediately when the builder is empty", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const defaultSection = createMockSection("default-src");
    const onApplied = vi.fn();

    createPresetPicker({
      sections: [defaultSection],
      getState: () => ({ "default-src": { enabled: false, values: [] } }),
      onApplied,
      container: root,
    });

    root
      .querySelector(".preset-picker-trigger")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const beginner = CSP_PRESETS[0];
    document
      .querySelector(".preset-card-apply")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(defaultSection.getState()).toEqual(
      beginner.state["default-src"],
    );
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".toast")?.textContent).toContain(
      "Beginner preset",
    );
  });

  it("requires confirmation before replacing an in-progress policy", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const defaultSection = createMockSection("default-src");
    defaultSection.setState({
      enabled: true,
      values: ["https://example.com"],
    });
    const onApplied = vi.fn();

    createPresetPicker({
      sections: [defaultSection],
      getState: () => ({
        "default-src": { enabled: true, values: ["https://example.com"] },
      }),
      onApplied,
      container: root,
    });

    root
      .querySelector(".preset-picker-trigger")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    document
      .querySelector(".preset-card-apply")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.querySelector(".preset-picker-warning")).not.toBeNull();
    expect(onApplied).not.toHaveBeenCalled();
    expect(defaultSection.getState().values).toEqual(["https://example.com"]);

    document
      .querySelector(".preset-picker-actions .btn-primary")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(defaultSection.getState()).toEqual(
      CSP_PRESETS[0].state["default-src"],
    );
  });

  it("keeps current settings when the user cancels confirmation", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const defaultSection = createMockSection("default-src");
    defaultSection.setState({
      enabled: true,
      values: ["https://example.com"],
    });
    const onApplied = vi.fn();

    createPresetPicker({
      sections: [defaultSection],
      getState: () => ({
        "default-src": { enabled: true, values: ["https://example.com"] },
      }),
      onApplied,
      container: root,
    });

    root
      .querySelector(".preset-picker-trigger")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document
      .querySelector(".preset-card-apply")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const keepBtn = [
      ...document.querySelectorAll(".preset-picker-actions button"),
    ].find((button) => button.textContent === "Keep my settings");
    keepBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onApplied).not.toHaveBeenCalled();
    expect(defaultSection.getState().values).toEqual(["https://example.com"]);
  });
});
