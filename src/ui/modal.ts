/**
 * Accessible modal dialog host for focused UI flows.
 *
 * @remarks
 * Renders a single shared backdrop and dialog element. Only one modal can be open
 * at a time. Focus is restored to the previously focused element on close.
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
  /** Root backdrop element (hidden until opened). */
  element: HTMLElement;
}

/**
 * Creates a modal host appended to `document.body`.
 *
 * @returns Handle with `open`, `close`, and the backdrop element.
 */
export function createModal(): ModalHandle {
  let previousFocus: HTMLElement | null = null;
  let onCloseCallback: (() => void) | undefined;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.hidden = true;

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.tabIndex = -1;

  const header = document.createElement("header");
  header.className = "modal-header";

  const titleEl = document.createElement("h2");
  titleEl.className = "modal-title";
  titleEl.id = "modal-title";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn btn-icon modal-close-btn";
  closeBtn.setAttribute("aria-label", "Close dialog");
  closeBtn.textContent = "×";

  const body = document.createElement("div");
  body.className = "modal-body";

  header.append(titleEl, closeBtn);
  dialog.append(header, body);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  function close(): void {
    if (backdrop.hidden) return;

    backdrop.hidden = true;
    body.innerHTML = "";
    document.body.classList.remove("modal-open");

    const callback = onCloseCallback;
    onCloseCallback = undefined;
    callback?.();

    if (previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  }

  function open(options: OpenModalOptions): void {
    onCloseCallback = options.onClose;
    titleEl.textContent = options.title;
    dialog.setAttribute("aria-labelledby", titleEl.id);
    body.innerHTML = "";
    body.appendChild(options.content);

    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    backdrop.hidden = false;
    document.body.classList.add("modal-open");
    closeBtn.focus({ preventScroll: true });
  }

  closeBtn.addEventListener("click", close);

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !backdrop.hidden) {
      event.preventDefault();
      close();
    }
  });

  return { open, close, element: backdrop };
}
