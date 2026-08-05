// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { triggerProductDescriptionPipeline } from "@/lib/orchestra/client";
import { OrchestraTriggerError } from "@/lib/orchestra/errors";
import type { ProductDescriptionInput } from "@/lib/validation/product-description";

const WEBHOOK_URL = "https://orchestra.example.com/webhook";
const API_TOKEN = "secret-token-value";

const input: ProductDescriptionInput = {
  productName: "TrailFlex Running Shoes",
  category: "Sports footwear",
  features: "Lightweight mesh upper, cushioned sole and rubber grip",
  tone: "Friendly",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastFetchInit() {
  const fetchMock = vi.mocked(globalThis.fetch);
  return fetchMock.mock.calls[0]?.[1];
}

beforeEach(() => {
  process.env.ORCHESTRA_WEBHOOK_URL = WEBHOOK_URL;
  delete process.env.ORCHESTRA_API_TOKEN;
  process.env.ORCHESTRA_REQUEST_TIMEOUT_MS = "5000";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("triggerProductDescriptionPipeline", () => {
  it("sends the mapped payload and JSON content type", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({ run_id: "run-123" }),
    );

    await triggerProductDescriptionPipeline(input);

    const init = lastFetchInit();
    expect(vi.mocked(globalThis.fetch).mock.calls[0]?.[0]).toBe(WEBHOOK_URL);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual({
      runInputs: {
        product_name: input.productName,
        category: input.category,
        features: input.features,
        tone: input.tone,
      },
    });
  });

  it("omits the Authorization header when no token is configured", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}));

    await triggerProductDescriptionPipeline(input);

    const headers = lastFetchInit()?.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("adds the Authorization header when a token is configured", async () => {
    process.env.ORCHESTRA_API_TOKEN = API_TOKEN;
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}));

    await triggerProductDescriptionPipeline(input);

    const headers = lastFetchInit()?.headers as Headers;
    expect(headers.get("Authorization")).toBe(`Bearer ${API_TOKEN}`);
  });

  it("returns the pipeline run id from a successful response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({ pipelineRunId: "run-abc" }),
    );

    const result = await triggerProductDescriptionPipeline(input);
    expect(result.pipelineRunId).toBe("run-abc");
  });

  it("returns a null run id when none is present", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}));

    const result = await triggerProductDescriptionPipeline(input);
    expect(result.pipelineRunId).toBeNull();
  });

  it("maps 401 responses to an authentication error", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}, 401));

    await expect(triggerProductDescriptionPipeline(input)).rejects.toMatchObject(
      { code: "authentication_error" },
    );
  });

  it("maps 5xx responses to an unavailable error", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}, 503));

    await expect(triggerProductDescriptionPipeline(input)).rejects.toMatchObject(
      { code: "unavailable" },
    );
  });

  it("maps other non-2xx responses to an unexpected response error", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}, 418));

    await expect(triggerProductDescriptionPipeline(input)).rejects.toMatchObject(
      { code: "unexpected_response" },
    );
  });

  it("maps aborted requests to a timeout error", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );

    await expect(triggerProductDescriptionPipeline(input)).rejects.toMatchObject(
      { code: "timeout" },
    );
  });

  it("does not leak the token in thrown errors", async () => {
    process.env.ORCHESTRA_API_TOKEN = API_TOKEN;
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}, 401));

    try {
      await triggerProductDescriptionPipeline(input);
      expect.unreachable("expected an error");
    } catch (error) {
      expect(error).toBeInstanceOf(OrchestraTriggerError);
      expect(JSON.stringify(error)).not.toContain(API_TOKEN);
      expect((error as OrchestraTriggerError).message).not.toContain(API_TOKEN);
    }
  });
});
