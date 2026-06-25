/**
 * Accessible modal dialog host for focused UI flows.
 *
 * @remarks
 * Uses the native `<dialog>` element with `showModal()` for focus trapping and
 * top-layer presentation. Focus moves to the first focusable control in the
 * dialog body (or the close button), and returns to the trigger on close.
 *
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | ARIA dialog pattern}
 */

export interface OpenModalOptions {
  /** Accessible name for the dialog (`aria-labelledby`). */
  title: string;
  /** Dialog body content; replaced on each open call. */
  content: HTMLElement;
  /** Called after the modal closes for any reason. */
  onClose?: () => void;
}

export interface ModalHandle {
  /** Shows the modal with new content. */
  open: (options: OpenModalOptions) => void;
  /** Hides the modal and runs the optional close callback. */
  close: () => void;
  /** Root dialog element (closed until opened). */
  element: HTMLDialogElement;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let modalIdCounter = 0;

/**
 * Returns focusable descendants within a container in document order.
 *
 * @param container - Root element to search.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ].filter((element) => !element.hidden && element.tabIndex !== -1);
}

/**
 * Moves focus to the first sensible element inside an open dialog.
 *
 * @param dialog - Open dialog element.
 * @param body - Dialog body containing primary actions.
 * @param closeBtn - Dialog dismiss control used as a fallback target.
 */
function focusInitialElement(
  dialog: HTMLDialogElement,
  body: HTMLElement,
  closeBtn: HTMLButtonElement,
): void {
  const focusable = getFocusableElements(body);
  if (focusable.length > 0) {
    focusable[0].focus({ preventScroll: true });
    return;
  }

  closeBtn.focus({ preventScroll: true });
  dialog.focus({ preventScroll: true });
}

/**
 * Creates a modal host appended to `document.body`.
 *
 * @returns Handle with `open`, `close`, and the dialog element.
 */
export function createModal(): ModalHandle {
  let previousFocus: HTMLElement | null = null;
  let onCloseCallback: (() => void) | undefined;
  let inertTarget: HTMLElement | null = null;

  const dialog = document.createElement("dialog");
  dialog.className = "modal-dialog";
  dialog.setAttribute("aria-modal", "true");

  const header = document.createElement("header");
  header.className = "modal-header";

  const titleEl = document.createElement("h2");
  titleEl.className = "modal-title";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn btn-icon modal-close-btn";
  closeBtn.setAttribute("aria-label", "Close dialog");
  closeBtn.textContent = "×";

  const body = document.createElement("div");
  body.className = "modal-body";

  header.append(titleEl, closeBtn);
  dialog.append(header, body);
  document.body.appendChild(dialog);

  function releaseInert(): void {
    if (inertTarget) {
      inertTarget.inert = false;
      inertTarget.removeAttribute("aria-hidden");
      inertTarget = null;
    }
  }

  function close(): void {
    if (!dialog.open) return;

    dialog.close();
    body.innerHTML = "";
    releaseInert();
    document.body.classList.remove("modal-open");

    const callback = onCloseCallback;
    onCloseCallback = undefined;
    callback?.();

    if (previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  }

  function trapFocus(event: KeyboardEvent): void {
    if (event.key !== "Tab" || !dialog.open) return;

    const focusable = getFocusableElements(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function open(options: OpenModalOptions): void {
    onCloseCallback = options.onClose;
    const titleId = `modal-title-${++modalIdCounter}`;
    titleEl.id = titleId;
    titleEl.textContent = options.title;
    dialog.setAttribute("aria-labelledby", titleId);
    body.innerHTML = "";
    body.appendChild(options.content);

    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const appRoot = document.getElementById("app");
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
      inertTarget = appRoot;
    }

    document.body.classList.add("modal-open");
    dialog.showModal();
    focusInitialElement(dialog, body, closeBtn);
  }

  closeBtn.addEventListener("click", close);

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      close();
    }
  });

  dialog.addEventListener("keydown", trapFocus);

  return { open, close, element: dialog };
}
