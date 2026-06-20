import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showToast } from "../../src/ui/toast";

describe("showToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renders a success toast with enter and exit classes", async () => {
    vi.useRealTimers();
    showToast("Policy copied to clipboard", "success");

    const toast = document.querySelector(".toast.toast--success");
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toBe("Policy copied to clipboard");
    expect(document.getElementById("toast-container")).not.toBeNull();

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    expect(toast?.classList.contains("is-visible")).toBe(true);

    await new Promise<void>((resolve) => setTimeout(resolve, 2900));
    expect(document.querySelector(".toast")).toBeNull();
  });

  it("replaces an active toast when called again", () => {
    showToast("First message", "success");
    showToast("Second message", "error");

    const toasts = document.querySelectorAll(".toast");
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.textContent).toBe("Second message");
    expect(toasts[0]?.classList.contains("toast--error")).toBe(true);
  });

  it("uses the success variant by default and removes the toast after exit", () => {
    showToast("Saved");
    const toast = document.querySelector(".toast.toast--success");
    expect(toast).not.toBeNull();

    vi.advanceTimersByTime(2800);
    expect(document.querySelector(".toast")).toBeNull();
  });
});
