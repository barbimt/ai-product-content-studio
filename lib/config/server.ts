import "server-only";

import { OrchestraTriggerError } from "@/lib/orchestra/errors";

const DEFAULT_ORCHESTRA_TIMEOUT_MS = 15_000;
const DEFAULT_ORCHESTRA_API_BASE_URL =
  "https://app.getorchestra.io/api/engine/public";
const DEFAULT_ORCHESTRA_UI_BASE_URL = "https://app.getorchestra.io";

export type ServerConfig = {
  orchestraWebhookUrl: string;
  orchestraApiToken?: string;
  orchestraApiBaseUrl: string;
  orchestraUiBaseUrl: string;
  orchestraRequestTimeoutMs: number;
  orchestraCallbackSecret?: string;
};

function readTimeoutMs(raw: string | undefined): number {
  if (!raw) return DEFAULT_ORCHESTRA_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_ORCHESTRA_TIMEOUT_MS;
}

function trimOrUndefined(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

export function getServerConfig(): ServerConfig {
  const orchestraWebhookUrl = trimOrUndefined(process.env.ORCHESTRA_WEBHOOK_URL);
  if (!orchestraWebhookUrl) {
    throw new OrchestraTriggerError(
      "configuration_error",
      "ORCHESTRA_WEBHOOK_URL is not set.",
    );
  }

  return {
    orchestraWebhookUrl,
    orchestraApiToken: trimOrUndefined(process.env.ORCHESTRA_API_TOKEN),
    orchestraApiBaseUrl:
      trimOrUndefined(process.env.ORCHESTRA_API_BASE_URL) ??
      DEFAULT_ORCHESTRA_API_BASE_URL,
    orchestraUiBaseUrl:
      trimOrUndefined(process.env.ORCHESTRA_UI_BASE_URL) ??
      DEFAULT_ORCHESTRA_UI_BASE_URL,
    orchestraRequestTimeoutMs: readTimeoutMs(
      process.env.ORCHESTRA_REQUEST_TIMEOUT_MS,
    ),
    orchestraCallbackSecret: trimOrUndefined(
      process.env.ORCHESTRA_CALLBACK_SECRET,
    ),
  };
}

export function requireOrchestraCallbackSecret(): string {
  const secret = trimOrUndefined(process.env.ORCHESTRA_CALLBACK_SECRET);
  if (!secret) {
    throw new OrchestraTriggerError(
      "configuration_error",
      "ORCHESTRA_CALLBACK_SECRET is not set.",
    );
  }
  return secret;
}

export function pipelineRunApprovalUrl(pipelineRunId: string): string {
  const { orchestraUiBaseUrl } = getServerConfig();
  return `${orchestraUiBaseUrl.replace(/\/$/, "")}/pipeline-runs/${pipelineRunId}/lineage`;
}
