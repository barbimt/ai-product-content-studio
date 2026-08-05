import { getServerConfig } from "@/lib/config/server";
import { OrchestraTriggerError } from "./errors";
import type {
  OrchestraRunSnapshot,
  OrchestraRunStatus,
  OrchestraTaskRun,
  OrchestraTriggerPayload,
  OrchestraTriggerResult,
} from "./types";
import type { ProductDescriptionInput } from "@/lib/validation/product-description";

const runIdKeys = ["pipelineRunId", "runId", "run_id"] as const;
const knownStatuses = new Set<OrchestraRunStatus>([
  "CREATED",
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "WARNING",
  "FAILED",
  "SKIPPED",
  "CANCELLING",
  "CANCELLED",
]);

function extractRunId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  for (const key of runIdKeys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function authHeaders(token: string | undefined, json = false): Headers {
  const headers = new Headers();
  if (json) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function orchestraFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const config = getServerConfig();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.orchestraRequestTimeoutMs,
  );

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new OrchestraTriggerError("timeout", "Orchestra request timed out.");
    }
    throw new OrchestraTriggerError(
      "unavailable",
      "Orchestra could not be reached.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function assertOk(response: Response): void {
  if (response.status === 401 || response.status === 403) {
    throw new OrchestraTriggerError(
      "authentication_error",
      "Orchestra rejected the credentials.",
    );
  }
  if (response.status === 404) {
    throw new OrchestraTriggerError(
      "unexpected_response",
      "Orchestra run was not found.",
    );
  }
  if (response.status >= 500) {
    throw new OrchestraTriggerError("unavailable", "Orchestra is unavailable.");
  }
  if (!response.ok) {
    throw new OrchestraTriggerError(
      "unexpected_response",
      `Unexpected Orchestra status ${response.status}.`,
    );
  }
}

function parseRunStatus(data: unknown): OrchestraRunStatus {
  if (typeof data !== "object" || data === null) {
    throw new OrchestraTriggerError(
      "unexpected_response",
      "Orchestra status response was invalid.",
    );
  }
  const runStatus = (data as Record<string, unknown>).runStatus;
  if (typeof runStatus !== "string" || !knownStatuses.has(runStatus as OrchestraRunStatus)) {
    throw new OrchestraTriggerError(
      "unexpected_response",
      "Orchestra status response was invalid.",
    );
  }
  return runStatus as OrchestraRunStatus;
}

function parseTaskRuns(data: unknown): OrchestraTaskRun[] {
  if (typeof data !== "object" || data === null) return [];
  const results = (data as Record<string, unknown>).results;
  if (!Array.isArray(results)) return [];

  const tasks: OrchestraTaskRun[] = [];
  for (const item of results) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const taskName = record.taskName;
    const status = record.status;
    if (typeof taskName !== "string" || typeof status !== "string") continue;
    if (!knownStatuses.has(status as OrchestraRunStatus)) continue;
    tasks.push({
      taskName,
      status: status as OrchestraRunStatus,
      externalMessage:
        typeof record.externalMessage === "string"
          ? record.externalMessage
          : null,
      message: typeof record.message === "string" ? record.message : null,
    });
  }
  return tasks;
}

export async function triggerProductDescriptionPipeline(
  input: ProductDescriptionInput,
): Promise<OrchestraTriggerResult> {
  const config = getServerConfig();
  const payload: OrchestraTriggerPayload = {
    runInputs: {
      product_name: input.productName,
      category: input.category,
      features: input.features,
      tone: input.tone,
    },
  };

  const response = await orchestraFetch(config.orchestraWebhookUrl, {
    method: "POST",
    headers: authHeaders(config.orchestraApiToken, true),
    body: JSON.stringify(payload),
  });
  assertOk(response);

  return { pipelineRunId: extractRunId(await readJson(response)) };
}

export async function getOrchestraRunSnapshot(
  pipelineRunId: string,
): Promise<OrchestraRunSnapshot> {
  const config = getServerConfig();
  if (!config.orchestraApiToken) {
    throw new OrchestraTriggerError(
      "configuration_error",
      "ORCHESTRA_API_TOKEN is required to read run status.",
    );
  }

  const base = config.orchestraApiBaseUrl.replace(/\/$/, "");
  const headers = authHeaders(config.orchestraApiToken);

  const [statusResponse, tasksResponse] = await Promise.all([
    orchestraFetch(`${base}/pipeline_runs/${pipelineRunId}/status`, {
      method: "GET",
      headers,
    }),
    orchestraFetch(
      `${base}/pipeline_runs/${pipelineRunId}/task_runs?page_size=50`,
      { method: "GET", headers },
    ),
  ]);

  assertOk(statusResponse);
  assertOk(tasksResponse);

  return {
    pipelineRunId,
    runStatus: parseRunStatus(await readJson(statusResponse)),
    tasks: parseTaskRuns(await readJson(tasksResponse)),
  };
}
