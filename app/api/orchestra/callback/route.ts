import { timingSafeEqual } from "node:crypto";

import { requireOrchestraCallbackSecret } from "@/lib/config/server";
import {
  apiError,
  mapOrchestraFailure,
  OrchestraTriggerError,
} from "@/lib/orchestra/errors";
import { storeCallbackResult } from "@/lib/runs/store";
import { orchestraCallbackSchema } from "@/lib/validation/callback";
import type { ReviewOutcome } from "@/types/api";

const CALLBACK_SECRET_HEADER = "x-orchestra-callback-secret";

function secretsMatch(expected: string, provided: string | null): boolean {
  if (!provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function toReviewOutcome(
  status: "APPROVE" | "REVIEW",
  reason: string,
): ReviewOutcome {
  return {
    status: status === "APPROVE" ? "passed" : "flagged",
    reason,
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const expectedSecret = requireOrchestraCallbackSecret();
    const providedSecret = request.headers.get(CALLBACK_SECRET_HEADER);

    if (!secretsMatch(expectedSecret, providedSecret)) {
      return Response.json(
        {
          error: {
            code: "authentication_error",
            message: "Invalid callback secret.",
          },
        },
        { status: 401 },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      const { status, body } = apiError("invalid_request");
      return Response.json(body, { status });
    }

    const parsed = orchestraCallbackSchema.safeParse(payload);
    if (!parsed.success) {
      const { status, body } = apiError("invalid_request");
      return Response.json(body, { status });
    }

    const review = toReviewOutcome(
      parsed.data.review.status,
      parsed.data.review.reason,
    );
    storeCallbackResult(parsed.data.runId, parsed.data.description, review);

    return Response.json(
      { ok: true, runId: parsed.data.runId },
      { status: 200 },
    );
  } catch (error) {
    if (
      error instanceof OrchestraTriggerError &&
      error.code === "configuration_error"
    ) {
      const { status, body } = apiError("configuration_error");
      return Response.json(body, { status });
    }
    const { status, body } = mapOrchestraFailure(error);
    return Response.json(body, { status });
  }
}
