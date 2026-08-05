export const GENERATE_ENDPOINT = "/api/orchestra/generate";

export function runStatusEndpoint(runId: string): string {
  return `/api/orchestra/runs/${encodeURIComponent(runId)}`;
}

export function runWaitEndpoint(runId: string): string {
  return `/api/orchestra/runs/${encodeURIComponent(runId)}/wait`;
}

export const workflowMessages = {
  submitting: "Starting workflow...",
  triggered: "The product content workflow has started.",
  generating: "Generating and reviewing the description in Orchestra...",
  awaitingApproval:
    "Your description is ready. Use it as-is, open Orchestra to Approve/Reject, or generate another version.",
  approved: "Approved in Orchestra.",
  rejected: "Rejected or returned for more detail in Orchestra.",
  runFailed: "The workflow run reported a failure.",
  genericError: "The workflow could not be started. Please try again.",
  statusError: "Could not refresh the workflow status.",
  openInOrchestra: "Approve in Orchestra",
  generateAnother: "Generate another",
} as const;
