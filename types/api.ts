import type { ProductDescriptionInput } from "@/lib/validation/product-description";

export type ReviewOutcome = {
  status: "passed" | "flagged";
  reason: string;
};

export type RunPhase =
  | "generating"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "failed";

export type RunView = {
  runId: string;
  phase: RunPhase;
  product: ProductDescriptionInput;
  draft: string | null;
  review: ReviewOutcome | null;
  approvalUrl: string | null;
};

export type GeneratePipelineResponse = {
  runId: string;
  status: "triggered";
  message: string;
};

export type HistoryItem = {
  runId: string;
  product: ProductDescriptionInput;
  draft: string | null;
  review: ReviewOutcome | null;
  phase: RunPhase;
  createdAt: string | null;
};

export type HistoryResponse = {
  items: HistoryItem[];
};

export type ApiErrorCode =
  | "invalid_request"
  | "not_found"
  | "configuration_error"
  | "authentication_error"
  | "timeout"
  | "unavailable"
  | "unexpected_error";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export type GenerateResponseBody = GeneratePipelineResponse | ApiErrorResponse;
export type RunStatusResponseBody = RunView | ApiErrorResponse;
