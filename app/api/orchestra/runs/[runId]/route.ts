import { buildRunView } from "@/lib/orchestra/run-view";
import { apiError, mapOrchestraFailure } from "@/lib/orchestra/errors";
import type { RunView } from "@/types/api";

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
    const body: RunView = await buildRunView(runId);
    return Response.json(body, { status: 200 });
  } catch (error) {
    const { status, body } = mapOrchestraFailure(error);
    return Response.json(body, { status });
  }
}
