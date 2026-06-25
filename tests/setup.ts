import { afterEach, vi } from "vitest";

vi.mock("../src/style.css", () => ({}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  (
    Element.prototype.scrollIntoView as unknown as { mockClear?: () => void }
  ).mockClear?.();
  (
    HTMLElement.prototype.focus as unknown as { mockClear?: () => void }
  ).mockClear?.();
  document.body.innerHTML = "";
});

Element.prototype.scrollIntoView = vi.fn();
HTMLElement.prototype.focus = vi.fn();

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  };
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

if (!Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "open")) {
  Object.defineProperty(HTMLDialogElement.prototype, "open", {
    get(this: HTMLDialogElement) {
      return this.hasAttribute("open");
    },
    configurable: true,
  });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
