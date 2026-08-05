// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/orchestra/generate/route";
import type { ApiErrorResponse, GeneratePipelineResponse } from "@/types/api";

const WEBHOOK_URL = "https://orchestra.example.com/webhook";

const validBody = {
  productName: "TrailFlex Running Shoes",
  category: "Sports footwear",
  features: "Lightweight mesh upper, cushioned sole and rubber grip",
  tone: "Friendly",
};

function postRequest(body: string) {
  return new Request("http://localhost/api/orchestra/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function orchestraResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env.ORCHESTRA_WEBHOOK_URL = WEBHOOK_URL;
  delete process.env.ORCHESTRA_API_TOKEN;
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/orchestra/generate", () => {
  it("returns a normalized triggered response for a valid submission", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      orchestraResponse({ pipelineRunId: "run-777" }),
    );

    const response = await POST(postRequest(JSON.stringify(validBody)));
    expect(response.status).toBe(202);

    const body = (await response.json()) as GeneratePipelineResponse;
    expect(body.status).toBe("triggered");
    expect(body.runId).toBe("run-777");
    expect(body.message.length).toBeGreaterThan(0);
  });

  it("rejects when Orchestra omits a run id", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(orchestraResponse({}));

    const response = await POST(postRequest(JSON.stringify(validBody)));
    expect(response.status).toBe(502);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("unexpected_error");
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(postRequest("not-json"));
    expect(response.status).toBe(400);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("invalid_request");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects invalid fields", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ ...validBody, tone: "Nope" })),
    );
    expect(response.status).toBe(400);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("invalid_request");
  });

  it("reports a configuration error when the webhook is missing", async () => {
    delete process.env.ORCHESTRA_WEBHOOK_URL;

    const response = await POST(postRequest(JSON.stringify(validBody)));
    expect(response.status).toBe(503);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("configuration_error");
  });

  it("maps Orchestra authentication failures", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(orchestraResponse({}, 403));

    const response = await POST(postRequest(JSON.stringify(validBody)));
    expect(response.status).toBe(502);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("authentication_error");
  });

  it("maps Orchestra unavailability", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(orchestraResponse({}, 500));

    const response = await POST(postRequest(JSON.stringify(validBody)));
    expect(response.status).toBe(503);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("unavailable");
  });

  it("maps Orchestra timeouts", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    );

    const response = await POST(postRequest(JSON.stringify(validBody)));
    expect(response.status).toBe(504);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("timeout");
  });

  it("does not echo the raw Orchestra response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      orchestraResponse({ internalSecret: "do-not-leak", pipelineRunId: "run-9" }),
    );

    const response = await POST(postRequest(JSON.stringify(validBody)));
    const text = await response.text();
    expect(text).not.toContain("internalSecret");
    expect(text).not.toContain("do-not-leak");
  });
});
