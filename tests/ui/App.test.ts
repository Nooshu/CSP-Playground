import { describe, expect, it } from "vitest";
import { createApp } from "../../src/ui/App";

describe("createApp", () => {
  it("renders the full builder UI", () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    createApp(root);

    expect(root.querySelector(".app-header h1")?.textContent).toBe("CSP Builder");
    expect(root.querySelectorAll(".directive-section").length).toBeGreaterThan(0);
    expect(document.body.querySelector(".security-score-panel")).not.toBeNull();
    expect(root.querySelector(".policy-output")).not.toBeNull();
    expect(root.querySelector("#generated-policy")).not.toBeNull();
    expect(root.querySelector(".url-importer")).not.toBeNull();
  });
});
