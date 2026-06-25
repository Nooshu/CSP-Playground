import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PolicyState } from "../../src/csp/buildPolicy";
import { createPolicyOutput } from "../../src/ui/PolicyOutput";

const { showToast } = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock("../../src/ui/toast", () => ({
  showToast,
}));

function createState(): PolicyState {
  return {
    "default-src": { enabled: true, values: ["'self'"] },
  };
}

describe("createPolicyOutput", () => {
  beforeEach(() => {
    showToast.mockClear();
  });

  it("updates previews and server export formats", async () => {
    const onModeChange = vi.fn();
    const panel = createPolicyOutput({
      getState: createState,
      onModeChange,
    });
    document.body.appendChild(panel);

    panel.update();
    expect(
      panel.querySelectorAll("#policy-header-mode .flag-info-btn").length,
    ).toBe(2);
    expect(panel.querySelector("#policy-preview")?.textContent).toContain(
      "default-src 'self'",
    );
    expect(panel.querySelector("#header-preview")?.textContent).toContain(
      "Content-Security-Policy:",
    );

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );
    expect(
      panel.querySelector(".server-export-warning")?.textContent,
    ).toContain("Double-check the syntax before deploying.");
    expect(
      panel.querySelector(".server-export-warning a")?.getAttribute("href"),
    ).toBe("https://github.com/Nooshu/CSP-Playground/issues");
    expect(panel.querySelector(".server-export-warning a")?.textContent).toBe(
      "log an issue",
    );

    const reportOnlyRadio = panel.querySelector(
      'input[value="report-only"]',
    ) as HTMLInputElement;
    reportOnlyRadio.checked = true;
    reportOnlyRadio.dispatchEvent(new Event("change", { bubbles: true }));
    expect(panel.getReportOnly()).toBe(true);
    expect(onModeChange).toHaveBeenCalled();

    panel.setReportOnly(false);
    expect(panel.getReportOnly()).toBe(false);

    serverSelect.value = "nginx";
    serverSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() =>
      expect(panel.querySelector("#server-export-help")?.textContent).toBe(
        "add_header in server or location block",
      ),
    );
    await vi.waitFor(() =>
      expect(
        panel.querySelector("#server-export-preview")?.textContent,
      ).toContain("add_header"),
    );
  });

  it("copies policy, header, and server config text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const panel = createPolicyOutput({ getState: createState });
    document.body.appendChild(panel);
    panel.update();

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );

    const copyPolicyBtn = panel.querySelector(
      ".output-actions .btn.btn-secondary",
    ) as HTMLButtonElement;
    copyPolicyBtn.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

    writeText.mockClear();
    (
      panel.querySelector(
        ".output-actions .btn.btn-primary",
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

    writeText.mockClear();
    (
      panel.querySelectorAll(
        ".output-actions .btn.btn-secondary",
      )[1] as HTMLButtonElement
    ).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(
      "Server config copied to clipboard",
      "success",
    );
  });

  it("shows a toast when server config copy has no output", async () => {
    const panel = createPolicyOutput({ getState: () => ({}) });
    document.body.appendChild(panel);
    panel.update();

    (
      panel.querySelectorAll(
        ".output-actions .btn.btn-secondary",
      )[1] as HTMLButtonElement
    ).click();

    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Nothing to copy", "error"),
    );
  });

  it("updates server help text when the selected export changes", async () => {
    const panel = createPolicyOutput({ getState: () => ({}) });
    document.body.appendChild(panel);
    panel.update();

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );

    expect(panel.querySelector("#server-export-help")?.textContent).toBe(
      "Header directive in .htaccess or VirtualHost config",
    );

    serverSelect.value = "firebase";
    serverSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(panel.querySelector("#server-export-help")?.textContent).toBe(
      "hosting.headers array in firebase.json (glob source patterns)",
    );
    expect(
      panel.querySelector("#server-export-preview")?.textContent,
    ).toContain("(no server config to display)");
  });

  it("shows Cloudflare setup guidance as soon as Cloudflare Pages is selected", async () => {
    const panel = createPolicyOutput({ getState: createState });
    document.body.appendChild(panel);
    panel.update();

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );

    serverSelect.value = "cloudflare";
    serverSelect.dispatchEvent(new Event("change", { bubbles: true }));

    const note = panel.querySelector("#server-export-note");
    expect(
      note?.querySelector(".server-export-note-heading")?.textContent,
    ).toBe("Cloudflare Pages setup");
    expect(note?.textContent).toContain("functions/_middleware.ts");
    expect(note?.textContent).toContain("_headers");
  });

  it("shows Cloudflare HTML-only deployment guidance when middleware export is selected", async () => {
    const panel = createPolicyOutput({ getState: createState });
    document.body.appendChild(panel);
    panel.update();

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );

    serverSelect.value = "cloudflare";
    serverSelect.dispatchEvent(new Event("change", { bubbles: true }));

    const htmlOnlyCheckbox = panel.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    htmlOnlyCheckbox.checked = true;
    htmlOnlyCheckbox.dispatchEvent(new Event("change", { bubbles: true }));

    const note = panel.querySelector("#server-export-note");
    expect(note?.textContent).toContain("Deploy the middleware export below");
    expect(note?.textContent).toContain("public/_headers");
    expect(
      panel.querySelector("#server-export-preview")?.textContent,
    ).toContain("requires Pages Functions");
  });

  it("disables html-only export for servers without scoped HTML support", async () => {
    const panel = createPolicyOutput({ getState: createState });
    document.body.appendChild(panel);
    panel.update();

    const htmlOnlyCheckbox = panel.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    htmlOnlyCheckbox.checked = true;
    htmlOnlyCheckbox.dispatchEvent(new Event("change", { bubbles: true }));

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );

    const netlifyOption = [...serverSelect.options].find(
      (option) => option.value === "netlify",
    );
    expect(netlifyOption?.textContent).toContain("(no HTML-only)");
    expect(netlifyOption?.title).toContain("splats");

    serverSelect.value = "netlify";
    serverSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(htmlOnlyCheckbox.disabled).toBe(true);
    expect(htmlOnlyCheckbox.checked).toBe(false);
    expect(htmlOnlyCheckbox.title).toContain("splats");
    expect(panel.querySelector(".html-only-label--unsupported")).not.toBeNull();
    expect(serverSelect.classList.contains("server-select--no-html-only")).toBe(
      true,
    );
  });

  it("can progressively enhance an existing container element", () => {
    const container = document.createElement("aside");
    container.id = "generated-policy";
    container.className = "policy-output";
    container.innerHTML = "<p>placeholder</p>";
    document.body.appendChild(container);

    const panel = createPolicyOutput({ getState: createState, container });
    expect(panel).toBe(container);
    expect(container.querySelector("p")?.textContent).not.toBe("placeholder");
  });

  it("announces copy failures and empty output", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    const panel = createPolicyOutput({
      getState: () => ({
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    });
    document.body.appendChild(panel);
    panel.update();

    (panel.querySelector(".btn.btn-secondary") as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(
        panel.querySelector("[aria-live='polite']")?.textContent,
      ).toContain("Copy failed"),
    );

    const emptyPanel = createPolicyOutput({ getState: () => ({}) });
    document.body.appendChild(emptyPanel);
    emptyPanel.update();
    expect(emptyPanel.querySelector(".policy-preview")?.textContent).toContain(
      "(no directives configured)",
    );

    (
      emptyPanel.querySelectorAll(".btn.btn-secondary")[0] as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(
        emptyPanel.querySelector("[aria-live='polite']")?.textContent,
      ).toContain("Nothing to copy"),
    );
  });

  it("switches back to enforce mode via the header mode radio", () => {
    const panel = createPolicyOutput({
      getState: () => ({
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    });
    document.body.appendChild(panel);
    panel.setReportOnly(true);
    const enforceRadio = panel.querySelector(
      'input[value="enforce"]',
    ) as HTMLInputElement;
    enforceRadio.dispatchEvent(new Event("change", { bubbles: true }));
    expect(panel.getReportOnly()).toBe(false);
  });

  it("clears server export help when the selected server id is unknown", async () => {
    const panel = createPolicyOutput({
      getState: () => ({
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    });
    document.body.appendChild(panel);
    panel.update();

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );

    serverSelect.value = "not-a-real-server";
    serverSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(panel.querySelector("#server-export-help")?.textContent).toBe("");
    expect(panel.querySelector("#server-export-note")?.hidden).toBe(true);
  });

  it("handles server export copy when the selected server id is invalid", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const panel = createPolicyOutput({
      getState: () => ({
        "default-src": { enabled: true, values: ["'self'"] },
      }),
    });
    document.body.appendChild(panel);
    panel.update();

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    await vi.waitFor(() =>
      expect(serverSelect.options.length).toBeGreaterThan(1),
    );

    serverSelect.value = "invalid-server";
    (
      panel.querySelectorAll(
        ".output-actions .btn.btn-secondary",
      )[1] as HTMLButtonElement
    ).click();
  });
});
