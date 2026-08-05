import type { ApiErrorCode, ApiErrorResponse } from "@/types/api";

export type OrchestraErrorCode =
  | "configuration_error"
  | "authentication_error"
  | "timeout"
  | "unavailable"
  | "unexpected_response";

export class OrchestraTriggerError extends Error {
  readonly code: OrchestraErrorCode;

  constructor(code: OrchestraErrorCode, message: string) {
    super(message);
    this.name = "OrchestraTriggerError";
    this.code = code;
  }
}

const clientMessages: Record<ApiErrorCode, string> = {
  invalid_request: "Check the submitted details and try again.",
  not_found: "This workflow run could not be found.",
  configuration_error:
    "The workflow could not be started because the server is not configured.",
  authentication_error: "Orchestra rejected the request.",
  timeout: "Orchestra took too long to respond.",
  unavailable: "Orchestra is temporarily unavailable. Please try again.",
  unexpected_error: "The workflow could not be started. Please try again.",
};

const statusByCode: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  not_found: 404,
  configuration_error: 503,
  authentication_error: 502,
  timeout: 504,
  unavailable: 503,
  unexpected_error: 502,
};

const orchestraCodeToApiCode: Record<OrchestraErrorCode, ApiErrorCode> = {
  configuration_error: "configuration_error",
  authentication_error: "authentication_error",
  timeout: "timeout",
  unavailable: "unavailable",
  unexpected_response: "unexpected_error",
};

export type ApiErrorResult = {
  status: number;
  body: ApiErrorResponse;
};

export function apiError(code: ApiErrorCode): ApiErrorResult {
  return {
    status: statusByCode[code],
    body: { error: { code, message: clientMessages[code] } },
  };
}

export function mapOrchestraFailure(error: unknown): ApiErrorResult {
  const code =
    error instanceof OrchestraTriggerError
      ? orchestraCodeToApiCode[error.code]
      : "unexpected_error";
  return apiError(code);
}
