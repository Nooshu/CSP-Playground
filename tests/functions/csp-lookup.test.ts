import { describe, expect, it, vi } from "vitest";

vi.mock("../../server/handleCspLookup", () => ({
  handleCspLookupRequest: vi.fn().mockResolvedValue({
    status: 200,
    body: { policy: "default-src 'self'" },
  }),
  cspLookupJsonResponse: vi.fn(
    (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status }),
  ),
}));

import { onRequestPost } from "../../functions/api/csp-lookup";
import { handleCspLookupRequest } from "../../server/handleCspLookup";

describe("functions/api/csp-lookup", () => {
  it("delegates POST requests to the shared handler", async () => {
    const request = new Request("https://example.com/api/csp-lookup", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });

    const response = await onRequestPost({ request } as never);
    expect(handleCspLookupRequest).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("default-src 'self'");
  });
});
