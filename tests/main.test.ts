import { describe, expect, it, vi } from "vitest";

describe("main entry", () => {
  it("mounts the app when #app exists", async () => {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);

    await import("../src/main");
    expect(root.querySelector(".app-header")).not.toBeNull();
  });

  it("does nothing when #app is missing", async () => {
    document.body.innerHTML = "";
    vi.resetModules();
    await import("../src/main");
    expect(document.querySelector(".app-header")).toBeNull();
  });
});
