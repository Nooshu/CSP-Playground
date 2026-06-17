import { describe, expect, it } from "vitest";
import { createApp } from "../../src/ui/App";
import { renderIndexAppHtml } from "../../src/ssg/renderIndexApp";

describe("createApp", () => {
  it("renders the full builder UI", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    root.innerHTML = renderIndexAppHtml();
    createApp(root);

    expect(root.querySelector(".app-header h1")?.textContent).toBe("CSP Builder");
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

  it("falls back to full client render when no SSG shell exists", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    createApp(root);

    expect(root.querySelector(".app-header")).not.toBeNull();
    expect(root.querySelector(".policy-output")).not.toBeNull();
    expect(root.querySelector(".url-importer")).not.toBeNull();
  });
});
