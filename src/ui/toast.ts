/**
 * Short-lived toast notifications fixed to the top of the viewport.
 */

/** Visual style for a toast message. */
export type ToastVariant = "success" | "error";

const TOAST_CONTAINER_ID = "toast-container";
const VISIBLE_MS = 2500;
const EXIT_MS = 300;

let dismissTimer: number | undefined;
let hideTimer: number | undefined;
let activeToast: HTMLElement | null = null;

function clearTimers(): void {
  if (dismissTimer !== undefined) {
    window.clearTimeout(dismissTimer);
    dismissTimer = undefined;
  }
  if (hideTimer !== undefined) {
    window.clearTimeout(hideTimer);
    hideTimer = undefined;
  }
}

function getToastContainer(): HTMLElement {
  const existing = document.getElementById(TOAST_CONTAINER_ID);
  if (existing) return existing;

  const container = document.createElement("div");
  container.id = TOAST_CONTAINER_ID;
  container.className = "toast-container";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", "Notifications");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-atomic", "true");
  document.body.appendChild(container);
  return container;
}

/**
 * Shows a toast at the top of the screen with enter and exit animations.
 *
 * @param message - Text shown in the toast.
 * @param variant - Success or error styling.
 *
 * @remarks
 * Replaces any toast currently visible. Multiple rapid calls reset the timer.
 */
export function showToast(
  message: string,
  variant: ToastVariant = "success",
): void {
  const container = getToastContainer();

  clearTimers();

  if (activeToast) {
    activeToast.remove();
    activeToast = null;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast--${variant}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  container.appendChild(toast);
  activeToast = toast;

  // Double rAF ensures the enter animation runs after the element is in the DOM.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });
  });

  dismissTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.classList.add("is-hiding");

    hideTimer = window.setTimeout(() => {
      toast.remove();
      if (activeToast === toast) {
        activeToast = null;
      }
    }, EXIT_MS);
  }, VISIBLE_MS);
}
