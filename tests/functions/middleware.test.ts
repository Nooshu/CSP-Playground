import { describe, expect, it, vi } from "vitest";

vi.mock("../../server/serveBrotliStatic", () => ({
  tryServeBrotliAsset: vi.fn(),
}));

import { onRequest } from "../../functions/_middleware";
import { tryServeBrotliAsset } from "../../server/serveBrotliStatic";

describe("functions/_middleware", () => {
  it("returns brotli responses when available", async () => {
    const brotliResponse = new Response("compressed", {
      headers: { "Content-Encoding": "br" },
    });
    vi.mocked(tryServeBrotliAsset).mockResolvedValueOnce(brotliResponse);

    const next = vi.fn();
    const response = await onRequest({
      request: new Request("https://example.com/"),
      env: { ASSETS: {} as Fetcher },
      next,
    } as never);

    expect(response).toBe(brotliResponse);
    expect(next).not.toHaveBeenCalled();
  });

  it("falls through when no brotli asset is available", async () => {
    vi.mocked(tryServeBrotliAsset).mockResolvedValueOnce(null);
    const nextResponse = new Response("plain");
    const next = vi.fn().mockResolvedValue(nextResponse);

    const response = await onRequest({
      request: new Request("https://example.com/assets/main.js"),
      env: { ASSETS: {} as Fetcher },
      next,
    } as never);

    expect(next).toHaveBeenCalled();
    expect(response).toBe(nextResponse);
  });
});
