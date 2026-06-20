import { describe, expect, it } from "vitest";
import { SITE_NAME } from "../../src/siteMeta";
import { createApp, mountSecurityScorePanel } from "../../src/ui/App";
import { renderIndexAppHtml } from "../../src/ssg/renderIndexApp";

describe("createApp", () => {
  it("renders the full builder UI", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    root.innerHTML = renderIndexAppHtml();
    createApp(root);

    expect(root.querySelector(".app-header h1")?.textContent).toBe(SITE_NAME);
    expect(root.querySelectorAll(".directive-section").length).toBeGreaterThan(0);
    expect(document.body.querySelector(".security-score-panel")).not.toBeNull();
    expect(root.querySelector(".policy-output")).not.toBeNull();
    expect(root.querySelector("#generated-policy")).not.toBeNull();
    expect(root.querySelector(".url-importer")).not.toBeNull();
  });

  it("enhances SSG markup even without the url importer id", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    root.innerHTML = renderIndexAppHtml();
    const importer = root.querySelector("#url-importer-root");
    importer?.removeAttribute("id");

    createApp(root);
    expect(root.querySelector(".url-importer")).not.toBeNull();
  });

  it("enhances SSG markup when optional containers are missing", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    root.innerHTML = renderIndexAppHtml();

    // Remove optional nodes to exercise fallbacks.
    root.querySelector(".directive-form")?.remove();
    root.querySelector("#generated-policy")?.remove();

    createApp(root);
    expect(root.querySelector(".app-header")).not.toBeNull();
  });

  it("enhances SSG markup when only the output container is absent", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    root.innerHTML = renderIndexAppHtml();
    root.querySelector("#generated-policy")?.remove();

    createApp(root);
    expect(root.querySelector(".policy-output")).not.toBeNull();
    expect(root.querySelector(".url-importer")).not.toBeNull();
  });

  it("handles missing pre-rendered directive containers during SSG enhancement", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    root.innerHTML = renderIndexAppHtml();
    root.querySelector('[data-directive="default-src"]')?.remove();

    createApp(root);
    expect(root.querySelector(".policy-output")).not.toBeNull();
    expect(document.body.querySelector(".security-score-panel")).not.toBeNull();
  });

  it("falls back to full client render when no SSG shell exists", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    createApp(root);

    expect(root.querySelector(".app-header")).not.toBeNull();
    expect(root.querySelector(".policy-output")).not.toBeNull();
    expect(root.querySelector(".url-importer")).not.toBeNull();
  });

  it("appends the score panel when no layout landmark exists", () => {
    const root = document.createElement("div");
    const panel = document.createElement("aside");
    panel.className = "security-score-panel";

    mountSecurityScorePanel(panel, root);

    expect(root.lastElementChild).toBe(panel);
  });

  it("prevents native form submission in the directive editor", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    createApp(root);

    const form = root.querySelector(".directive-form") as HTMLFormElement;
    const prevented = form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    expect(prevented).toBe(false);
  });

  it("prevents native form submission on pre-rendered markup", () => {
    const root = document.createElement("div");
    root.innerHTML = renderIndexAppHtml();
    document.body.appendChild(root);
    createApp(root);

    const form = root.querySelector(".directive-form") as HTMLFormElement;
    expect(
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    ).toBe(false);
  });
});
