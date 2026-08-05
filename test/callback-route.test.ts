// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/orchestra/callback/route";
import { getRememberedRun, rememberRun } from "@/lib/runs/store";
import type { ApiErrorResponse } from "@/types/api";

const SECRET = "pcs_cb_test_secret";

function callbackRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/orchestra/callback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = {
  runId: "run-callback-1",
  description: "A clear ecommerce product description.",
  review: {
    status: "APPROVE" as const,
    reason: "Clear and accurate.",
  },
};

beforeEach(() => {
  process.env.ORCHESTRA_CALLBACK_SECRET = SECRET;
  process.env.ORCHESTRA_WEBHOOK_URL = "https://orchestra.example.com/webhook";
});

afterEach(() => {
  delete process.env.ORCHESTRA_CALLBACK_SECRET;
});

describe("POST /api/orchestra/callback", () => {
  it("stores draft and review when the secret matches", async () => {
    rememberRun("run-callback-1", {
      productName: "TrailFlex Running Shoes",
      category: "Sports footwear",
      features: "Lightweight mesh upper, cushioned sole and rubber grip",
      tone: "Friendly",
    });

    const response = await POST(
      callbackRequest(validBody, {
        "X-Orchestra-Callback-Secret": SECRET,
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; runId: string };
    expect(body).toEqual({ ok: true, runId: "run-callback-1" });

    const stored = getRememberedRun("run-callback-1");
    expect(stored?.draft).toBe(validBody.description);
    expect(stored?.review).toEqual({
      status: "passed",
      reason: "Clear and accurate.",
    });
    expect(stored?.callbackReceivedAt).toBeTypeOf("number");
  });

  it("rejects a missing or invalid secret", async () => {
    const response = await POST(
      callbackRequest(validBody, {
        "X-Orchestra-Callback-Secret": "wrong",
      }),
    );
    expect(response.status).toBe(401);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("authentication_error");
  });

  it("rejects invalid payload shapes", async () => {
    const response = await POST(
      callbackRequest(
        { runId: "run-1" },
        { "X-Orchestra-Callback-Secret": SECRET },
      ),
    );
    expect(response.status).toBe(400);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("invalid_request");
  });

  it("reports configuration error when the secret env is missing", async () => {
    delete process.env.ORCHESTRA_CALLBACK_SECRET;

    const response = await POST(
      callbackRequest(validBody, {
        "X-Orchestra-Callback-Secret": SECRET,
      }),
    );
    expect(response.status).toBe(503);

    const body = (await response.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("configuration_error");
  });
});
