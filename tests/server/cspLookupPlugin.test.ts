import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const handleCspLookupRequest = vi.fn();
const cspLookupJsonResponse = vi.fn(
  (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
);

vi.mock("../../server/handleCspLookup", () => ({
  handleCspLookupRequest,
  cspLookupJsonResponse,
}));

function createMockReqRes(
  method: string,
  url: string,
): {
  req: EventEmitter & {
    method: string;
    url: string;
    destroy: ReturnType<typeof vi.fn>;
  };
  res: {
    statusCode: number;
    headers: Record<string, string>;
    setHeader: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };
  next: ReturnType<typeof vi.fn>;
} {
  const req = new EventEmitter() as EventEmitter & {
    method: string;
    url: string;
    destroy: ReturnType<typeof vi.fn>;
  };
  req.method = method;
  req.url = url;
  req.destroy = vi.fn();

  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader: vi.fn((key: string, value: string) => {
      res.headers[key] = value;
    }),
    end: vi.fn(),
  };

  return { req, res, next: vi.fn() };
}

describe("cspLookupPlugin", () => {
  beforeEach(() => {
    handleCspLookupRequest.mockReset();
    handleCspLookupRequest.mockResolvedValue({
      status: 200,
      body: { policy: "default-src 'self'" },
    });
    cspLookupJsonResponse.mockClear();
  });

  it("registers middleware on dev and preview servers", async () => {
    const { cspLookupPlugin } = await import("../../server/cspLookupPlugin");
    const plugin = cspLookupPlugin();
    const use = vi.fn();
    plugin.configureServer?.({ middlewares: { use } } as never);
    plugin.configurePreviewServer?.({ middlewares: { use } } as never);
    expect(use).toHaveBeenCalledTimes(2);
  });

  it("passes through non-POST requests", async () => {
    const { cspLookupPlugin } = await import("../../server/cspLookupPlugin");
    const plugin = cspLookupPlugin();
    const use = vi.fn();
    plugin.configureServer?.({ middlewares: { use } } as never);
    const handler = use.mock.calls[0]?.[0] as (
      req: EventEmitter & { method: string; url: string },
      res: unknown,
      next: () => void,
    ) => void;

    const { req, res, next } = createMockReqRes("GET", "/api/csp-lookup");
    handler(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("handles POST /api/csp-lookup", async () => {
    const { cspLookupPlugin } = await import("../../server/cspLookupPlugin");
    const plugin = cspLookupPlugin();
    const use = vi.fn();
    plugin.configureServer?.({ middlewares: { use } } as never);
    const handler = use.mock.calls[0]?.[0] as (
      req: EventEmitter & {
        method: string;
        url: string;
        destroy: ReturnType<typeof vi.fn>;
      },
      res: {
        statusCode: number;
        setHeader: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      },
      next: () => void,
    ) => void;

    const { req, res, next } = createMockReqRes("POST", "/api/csp-lookup");
    handler(req, res, next);
    req.emit("data", JSON.stringify({ url: "https://example.com" }));
    req.emit("end");
    await vi.waitFor(() => expect(res.end).toHaveBeenCalled());
    expect(next).not.toHaveBeenCalled();
    expect(handleCspLookupRequest).toHaveBeenCalled();
  });

  it("rejects oversized request bodies while streaming", async () => {
    const { cspLookupPlugin } = await import("../../server/cspLookupPlugin");
    const plugin = cspLookupPlugin();
    const use = vi.fn();
    plugin.configureServer?.({ middlewares: { use } } as never);
    const handler = use.mock.calls[0]?.[0] as (
      req: EventEmitter & {
        method: string;
        url: string;
        destroy: ReturnType<typeof vi.fn>;
      },
      res: {
        statusCode: number;
        setHeader: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      },
      next: () => void,
    ) => void;

    const { req, res } = createMockReqRes("POST", "/api/csp-lookup");
    handler(req, res, vi.fn());
    req.emit("data", "x".repeat(5000));
    expect(res.statusCode).toBe(413);
    expect(req.destroy).toHaveBeenCalled();
  });
});
