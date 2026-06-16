import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("flagDescriptions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and caches flag descriptions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sandbox: { "allow-scripts": "Allows scripts." },
        }),
      }),
    );

    const first = await import("../../src/ui/flagDescriptions");
    await expect(
      first.getFlagDescription("sandbox", "allow-scripts"),
    ).resolves.toBe("Allows scripts.");
    await expect(
      first.getFlagDescription("sandbox", "missing"),
    ).resolves.toBeNull();

    const second = await import("../../src/ui/flagDescriptions");
    await second.loadFlagDescriptions();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when loading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const module = await import("../../src/ui/flagDescriptions");
    await expect(
      module.getFlagDescription("sandbox", "allow-scripts"),
    ).resolves.toBeNull();
  });
});
