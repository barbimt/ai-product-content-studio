export const GENERATE_ENDPOINT = "/api/orchestra/generate";

export function runStatusEndpoint(runId: string): string {
  return `/api/orchestra/runs/${encodeURIComponent(runId)}`;
}

export function runWaitEndpoint(runId: string): string {
  return `/api/orchestra/runs/${encodeURIComponent(runId)}/wait`;
}

export const workflowMessages = {
  submitting: "Starting generation...",
  triggered: "Generation has started.",
  generating: "Generating and reviewing the description...",
  descriptionReady:
    "Copy or download this draft. Submit the form again if you want a new version.",
  rejected:
    "The review asked for changes. Submit the form again to try a new version.",
  runFailed: "Generation failed. Please try again.",
  genericError: "The description could not be started. Please try again.",
  statusError: "Could not refresh the generation status.",
  copyDraft: "Copy",
  copied: "Copied",
  downloadDraft: "Download .txt",
  historyTitle: "History",
  historyEmpty: "Generated descriptions will appear here on this browser.",
  historySelected: "Showing a saved description from history.",
} as const;
