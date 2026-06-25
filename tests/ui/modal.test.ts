import { afterEach, describe, expect, it, vi } from "vitest";
import { createModal } from "../../src/ui/modal";

describe("createModal", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.body.classList.remove("modal-open");
  });

  it("opens a labelled dialog and closes via the close button", () => {
    const onClose = vi.fn();
    const modal = createModal();
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.append(trigger);
    trigger.focus();

    const content = document.createElement("p");
    content.textContent = "Preset options";

    modal.open({ title: "CSP presets", content, onClose });

    expect(modal.element.open).toBe(true);
    expect(modal.element.getAttribute("aria-labelledby")).toMatch(
      /^modal-title-/,
    );
    expect(modal.element.querySelector(".modal-title")?.textContent).toBe(
      "CSP presets",
    );
    expect(modal.element.querySelector(".modal-body")?.textContent).toBe(
      "Preset options",
    );
    expect(document.getElementById("app")?.inert).toBeUndefined();

    modal.element
      .querySelector(".modal-close-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(modal.element.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.classList.contains("modal-open")).toBe(false);
  });

  it("marks the app root inert while open and restores focus on close", () => {
    const app = document.createElement("div");
    app.id = "app";
    document.body.append(app);

    const trigger = document.createElement("button");
    trigger.id = "preset-trigger";
    app.append(trigger);
    trigger.focus();

    const modal = createModal();
    modal.open({
      title: "Choose a preset",
      content: document.createElement("div"),
    });

    expect(app.inert).toBe(true);
    expect(app.getAttribute("aria-hidden")).toBe("true");

    modal.close();

    expect(app.inert).toBe(false);
    expect(app.hasAttribute("aria-hidden")).toBe(false);
    expect(HTMLElement.prototype.focus).toHaveBeenCalled();
  });

  it("closes on backdrop click and Escape", () => {
    const modal = createModal();
    const onClose = vi.fn();

    modal.open({
      title: "Replace current policy?",
      content: document.createElement("div"),
      onClose,
    });

    modal.element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);

    modal.open({
      title: "Replace current policy?",
      content: document.createElement("div"),
      onClose,
    });

    modal.element.dispatchEvent(
      new Event("cancel", { bubbles: true, cancelable: true }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("traps Tab focus within the dialog", () => {
    const modal = createModal();
    const content = document.createElement("div");
    const first = document.createElement("button");
    first.textContent = "First";
    const second = document.createElement("button");
    second.textContent = "Second";
    content.append(first, second);

    modal.open({ title: "CSP presets", content });

    const closeBtn = modal.element.querySelector(
      ".modal-close-btn",
    ) as HTMLButtonElement;

    Object.defineProperty(document, "activeElement", {
      configurable: true,
      get: () => closeBtn,
    });

    const shiftTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    modal.element.dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);

    Object.defineProperty(document, "activeElement", {
      configurable: true,
      get: () => second,
    });

    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    modal.element.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
  });

  it("keeps focus on the dialog when no controls are tabbable", () => {
    const modal = createModal();
    modal.open({
      title: "Empty dialog",
      content: document.createElement("div"),
    });

    const closeBtn = modal.element.querySelector(
      ".modal-close-btn",
    ) as HTMLButtonElement;
    closeBtn.disabled = true;

    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    modal.element.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
  });

  it("ignores redundant close calls", () => {
    const modal = createModal();
    const onClose = vi.fn();
    modal.open({
      title: "CSP presets",
      content: document.createElement("div"),
      onClose,
    });
    modal.close();
    modal.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
