import { buildRunView } from "@/lib/orchestra/run-view";
import { apiError, mapOrchestraFailure } from "@/lib/orchestra/errors";
import { waitForCallback } from "@/lib/runs/store";
import type { RunView } from "@/types/api";

export const maxDuration = 120;

const MAX_WAIT_MS = 110_000;

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId } = await context.params;

  if (!runId.trim()) {
    const { status, body } = apiError("invalid_request");
    return Response.json(body, { status });
  }

  try {
    await waitForCallback(runId, MAX_WAIT_MS);
    const latest: RunView = await buildRunView(runId);

    return Response.json(latest, {
      status: latest.phase === "generating" ? 202 : 200,
    });
  } catch (error) {
    const { status, body } = mapOrchestraFailure(error);
    return Response.json(body, { status });
  }
}
