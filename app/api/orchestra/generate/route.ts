import { productDescriptionSchema } from "@/lib/validation/product-description";
import { triggerProductDescriptionPipeline } from "@/lib/orchestra/client";
import {
  apiError,
  mapOrchestraFailure,
  OrchestraTriggerError,
} from "@/lib/orchestra/errors";
import { rememberRun } from "@/lib/runs/store";
import { workflowMessages } from "@/lib/messages";
import type { GeneratePipelineResponse } from "@/types/api";

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const { status, body } = apiError("invalid_request");
    return Response.json(body, { status });
  }

  const parsed = productDescriptionSchema.safeParse(payload);
  if (!parsed.success) {
    const { status, body } = apiError("invalid_request");
    return Response.json(body, { status });
  }

  try {
    const result = await triggerProductDescriptionPipeline(parsed.data);
    if (!result.pipelineRunId) {
      throw new OrchestraTriggerError(
        "unexpected_response",
        "Orchestra did not return a pipeline run id.",
      );
    }

    rememberRun(result.pipelineRunId, parsed.data);

    const body: GeneratePipelineResponse = {
      runId: result.pipelineRunId,
      status: "triggered",
      message: workflowMessages.triggered,
    };
    return Response.json(body, { status: 202 });
  } catch (error) {
    const { status, body } = mapOrchestraFailure(error);
    return Response.json(body, { status });
  }
}
