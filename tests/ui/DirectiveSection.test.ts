import { describe, expect, it, vi } from "vitest";
import { DIRECTIVES } from "../../src/csp/directives";
import { createDirectiveSection } from "../../src/ui/DirectiveSection";

describe("createDirectiveSection", () => {
  it("creates sections for every directive type", () => {
    const onChange = vi.fn();
    const sections = DIRECTIVES.map((directive) =>
      createDirectiveSection({ directive, onChange }),
    );

    expect(sections.length).toBe(DIRECTIVES.length);

    for (const section of sections) {
      expect(section.getState()).toEqual({ enabled: false, values: [] });
      section.setState({ enabled: true, values: ["'self'"] });
      expect(section.getState().enabled).toBe(true);
      section.reset();
      expect(section.getState()).toEqual({ enabled: false, values: [] });
    }
  });

  it("handles sandbox flags and trusted types interactions", () => {
    const onChange = vi.fn();
    const sandbox = DIRECTIVES.find((directive) => directive.name === "sandbox")!;
    const section = createDirectiveSection({ directive: sandbox, onChange });

    section.setState({
      enabled: true,
      values: ["allow-scripts", "allow-forms"],
    });
    expect(section.getState().values).toEqual(
      expect.arrayContaining(["allow-scripts", "allow-forms"]),
    );

    const trustedTypes = DIRECTIVES.find(
      (directive) => directive.name === "trusted-types",
    )!;
    const trustedSection = createDirectiveSection({
      directive: trustedTypes,
      onChange,
    });
    trustedSection.setState({ enabled: true, values: [] });
    expect(trustedSection.getState().values).toEqual([]);

    const addBtn = trustedSection.element.querySelector(
      ".btn.btn-secondary",
    ) as HTMLButtonElement;
    addBtn.click();
    const input = trustedSection.element.querySelector(
      ".trusted-types-inputs input",
    ) as HTMLInputElement;
    input.value = "default";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(trustedSection.getState().values).toEqual(["default"]);

    const removeBtn = trustedSection.element.querySelector(
      ".remove-source-btn",
    ) as HTMLButtonElement;
    removeBtn.click();
    expect(onChange).toHaveBeenCalled();
  });

  it("enables and disables controls with the checkbox", () => {
    const onChange = vi.fn();
    const script = DIRECTIVES.find((directive) => directive.name === "script-src")!;
    const section = createDirectiveSection({ directive: script, onChange });
    const checkbox = section.element.querySelector(
      ".enable-checkbox",
    ) as HTMLInputElement;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    const controls = section.element.querySelector(
      ".source-list-editor",
    ) as HTMLElement;
    expect(controls.hidden).toBe(false);

    const keywordSelect = section.element.querySelector(
      ".keyword-select",
    ) as HTMLSelectElement;
    keywordSelect.value = "'self'";
    section.element
      .querySelector(".source-list-btn")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(section.getState().values).toContain("'self'");
  });

  it("supports report-to and require-trusted-types-for directives", () => {
    const onChange = vi.fn();
    const reportTo = DIRECTIVES.find((directive) => directive.name === "report-to")!;
    const reportSection = createDirectiveSection({
      directive: reportTo,
      onChange,
    });
    reportSection.setState({ enabled: true, values: ["csp-endpoint"] });
    expect(reportSection.getState().values).toEqual(["csp-endpoint"]);

    const requireTrusted = DIRECTIVES.find(
      (directive) => directive.name === "require-trusted-types-for",
    )!;
    const requireSection = createDirectiveSection({
      directive: requireTrusted,
      onChange,
    });
    requireSection.setState({ enabled: true, values: ["'script'"] });
    expect(requireSection.getState().values).toEqual(["'script'"]);
  });

  it("shows deprecated badges on deprecated directives", () => {
    const onChange = vi.fn();
    const reportUri = DIRECTIVES.find((directive) => directive.name === "report-uri")!;
    const section = createDirectiveSection({ directive: reportUri, onChange });
    section.setState({ enabled: true, values: ["https://example.com/report"] });
    expect(
      section.element.querySelector(".deprecated-badge")?.textContent,
    ).toBe("Deprecated");
  });
});
