import { buildRunView } from "@/lib/orchestra/run-view";
import { apiError, mapOrchestraFailure } from "@/lib/orchestra/errors";
import { hasCallbackResult, waitForCallback } from "@/lib/runs/store";
import type { RunView } from "@/types/api";

export const maxDuration = 120;

const TICK_MS = 2_500;
const MAX_WAIT_MS = 110_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId } = await context.params;

  if (!runId.trim()) {
    const { status, body } = apiError("invalid_request");
    return Response.json(body, { status });
  }

  const startedAt = Date.now();

  try {
    // Wake early if Orchestra Notify posts the callback (same instance).
    void waitForCallback(runId, MAX_WAIT_MS);

    let latest: RunView = await buildRunView(runId);

    while (
      latest.phase === "generating" &&
      !hasCallbackResult(runId) &&
      Date.now() - startedAt < MAX_WAIT_MS
    ) {
      await sleep(TICK_MS);
      latest = await buildRunView(runId);
    }

    if (hasCallbackResult(runId)) {
      latest = await buildRunView(runId);
    }

    return Response.json(latest, {
      status: latest.phase === "generating" ? 202 : 200,
    });
  } catch (error) {
    const { status, body } = mapOrchestraFailure(error);
    return Response.json(body, { status });
  }
}
