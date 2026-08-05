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
    "Copy or download this draft, or generate another version if you want a different one.",
  rejected: "The review asked for changes. Generate another version to try again.",
  runFailed: "Generation failed. Please try again.",
  genericError: "The description could not be started. Please try again.",
  statusError: "Could not refresh the generation status.",
  generateAnother: "Generate another",
  copyDraft: "Copy",
  copied: "Copied",
  downloadDraft: "Download .txt",
} as const;
