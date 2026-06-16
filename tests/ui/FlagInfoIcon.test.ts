import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFlagInfoIcon } from "../../src/ui/FlagInfoIcon";

describe("createFlagInfoIcon", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sandbox: { "allow-scripts": "Allows scripts." },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads descriptions on hover and focus", async () => {
    const icon = createFlagInfoIcon({
      group: "sandbox",
      flagKey: "allow-scripts",
      idPrefix: "test",
    });
    document.body.appendChild(icon);

    const button = icon.querySelector("button")!;
    const tooltip = icon.querySelector(".flag-info-tooltip")!;
    vi.spyOn(button, "matches").mockReturnValue(true);

    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await vi.waitFor(() =>
      expect(tooltip.textContent).toBe("Allows scripts."),
    );
    expect(button.getAttribute("aria-describedby")).toBeTruthy();

    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(tooltip.hidden).toBe(false);

    button.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await vi.waitFor(() => expect(tooltip.hidden).toBe(true));

    button.dispatchEvent(new FocusEvent("focus"));
    await vi.waitFor(() => expect(tooltip.textContent).toBe("Allows scripts."));
    button.dispatchEvent(new FocusEvent("blur"));
    await vi.waitFor(() => expect(tooltip.hidden).toBe(true));
  });

  it("keeps the tooltip open while hovering it", async () => {
    vi.useFakeTimers();

    const icon = createFlagInfoIcon({
      group: "sandbox",
      flagKey: "allow-scripts",
      idPrefix: "test-hover",
    });
    document.body.appendChild(icon);

    const button = icon.querySelector("button")!;
    const tooltip = icon.querySelector(".flag-info-tooltip")!;
    vi.spyOn(button, "matches").mockReturnValue(true);

    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await vi.waitFor(() => expect(tooltip.hidden).toBe(false));

    tooltip.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    button.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(50);
    expect(tooltip.hidden).toBe(false);

    tooltip.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(120);
    expect(tooltip.hidden).toBe(true);

    vi.useRealTimers();
  });

  it("shows fallback text and ignores clicks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sandbox: {} }),
      }),
    );

    const icon = createFlagInfoIcon({
      group: "sandbox",
      flagKey: "allow-forms",
      idPrefix: "test-fallback",
    });
    document.body.appendChild(icon);

    const button = icon.querySelector("button")!;
    const tooltip = icon.querySelector(".flag-info-tooltip")!;
    vi.spyOn(button, "matches").mockReturnValue(true);

    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await vi.waitFor(() =>
      expect(tooltip.textContent).toBe(
        "Description is not available for this flag.",
      ),
    );

    const clickEvent = new MouseEvent("click", { bubbles: true });
    vi.spyOn(clickEvent, "preventDefault");
    vi.spyOn(clickEvent, "stopPropagation");
    button.dispatchEvent(clickEvent);
    expect(clickEvent.preventDefault).toHaveBeenCalled();
    expect(clickEvent.stopPropagation).toHaveBeenCalled();
  });

  it("ignores a second hover while descriptions are loading", async () => {
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
      idPrefix: "loading-duplicate",
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
      expect(icon.querySelector(".flag-info-tooltip")?.textContent).toBe(
        "Allows scripts.",
      ),
    );
  });

  it("hides the tooltip if focus is lost before loading completes", async () => {
    let resolveJson: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveJson = (value) =>
            resolve({
              ok: true,
              json: async () => value,
            });
        }),
      ),
    );

    const icon = createFlagInfoIcon({
      group: "sandbox",
      flagKey: "allow-scripts",
      idPrefix: "test-loading",
    });
    document.body.appendChild(icon);

    const button = icon.querySelector("button")!;
    const tooltip = icon.querySelector(".flag-info-tooltip")!;
    vi.spyOn(button, "matches").mockReturnValue(false);

    button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(tooltip.textContent).toBe("Loading…");
    resolveJson({ sandbox: { "allow-scripts": "Allows scripts." } });
    await vi.waitFor(() => expect(tooltip.hidden).toBe(true));
  });
});
