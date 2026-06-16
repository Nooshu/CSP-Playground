import { describe, expect, it, vi } from "vitest";
import { createPolicyOutput } from "../../src/ui/PolicyOutput";
import type { PolicyState } from "../../src/csp/buildPolicy";

function createState(): PolicyState {
  return {
    "default-src": { enabled: true, values: ["'self'"] },
  };
}

describe("createPolicyOutput", () => {
  it("updates previews and server export formats", () => {
    const onModeChange = vi.fn();
    const panel = createPolicyOutput({
      getState: createState,
      onModeChange,
    });
    document.body.appendChild(panel);

    panel.update();
    expect(panel.querySelector("#policy-preview")?.textContent).toContain(
      "default-src 'self'",
    );
    expect(panel.querySelector("#header-preview")?.textContent).toContain(
      "Content-Security-Policy:",
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

    const serverSelect = panel.querySelector(
      "#server-export-select",
    ) as HTMLSelectElement;
    serverSelect.value = "nginx";
    serverSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(panel.querySelector("#server-export-preview")?.textContent).toContain(
      "add_header",
    );
  });

  it("copies policy, header, and server config text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const panel = createPolicyOutput({ getState: createState });
    document.body.appendChild(panel);
    panel.update();

    const buttons = panel.querySelectorAll("button");
    (buttons[0] as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

    writeText.mockClear();
    (buttons[1] as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

    writeText.mockClear();
    (buttons[2] as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
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
      expect(panel.querySelector("[aria-live='polite']")?.textContent).toContain(
        "Copy failed",
      ),
    );

    const emptyPanel = createPolicyOutput({ getState: () => ({}) });
    document.body.appendChild(emptyPanel);
    emptyPanel.update();
    expect(
      emptyPanel.querySelector(".policy-preview")?.textContent,
    ).toContain("(no directives configured)");

    (
      emptyPanel.querySelectorAll(".btn.btn-secondary")[0] as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(
        emptyPanel.querySelector("[aria-live='polite']")?.textContent,
      ).toContain("Nothing to copy"),
    );
  });
});
