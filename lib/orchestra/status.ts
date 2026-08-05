import type { OrchestraRunSnapshot, OrchestraTaskRun } from "./types";
import type { RunPhase, ReviewOutcome } from "@/types/api";

export const GENERATE_TASK_NAME = "Generate product description";
export const REVIEW_TASK_NAME = "Review product description";
export const FINAL_APPROVAL_TASK_NAME = "Final content approval";
export const REQUEST_DETAILS_TASK_NAME = "Request additional product details";

function findTask(
  tasks: OrchestraTaskRun[],
  name: string,
): OrchestraTaskRun | undefined {
  return tasks.find((task) => task.taskName === name);
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractDraft(tasks: OrchestraTaskRun[]): string | null {
  const generate = findTask(tasks, GENERATE_TASK_NAME);
  const payload = parseJsonObject(generate?.externalMessage ?? null);
  const description = payload?.description;
  return typeof description === "string" && description.trim().length > 0
    ? description.trim()
    : null;
}

export function extractReview(tasks: OrchestraTaskRun[]): ReviewOutcome | null {
  const review = findTask(tasks, REVIEW_TASK_NAME);
  const payload = parseJsonObject(review?.externalMessage ?? null);
  if (!payload) return null;

  const statusRaw = payload.status;
  const reasonRaw = payload.reason;
  if (typeof statusRaw !== "string" || typeof reasonRaw !== "string") {
    return null;
  }

  if (statusRaw === "APPROVE") {
    return { status: "passed", reason: reasonRaw.trim() };
  }
  if (statusRaw === "REVIEW") {
    return { status: "flagged", reason: reasonRaw.trim() };
  }
  return null;
}

export function deriveRunPhase(snapshot: OrchestraRunSnapshot): RunPhase {
  const { tasks, runStatus } = snapshot;
  const generate = findTask(tasks, GENERATE_TASK_NAME);
  const review = findTask(tasks, REVIEW_TASK_NAME);
  const finalApproval = findTask(tasks, FINAL_APPROVAL_TASK_NAME);
  const requestDetails = findTask(tasks, REQUEST_DETAILS_TASK_NAME);

  if (finalApproval?.status === "SUCCEEDED") return "approved";
  if (finalApproval?.status === "FAILED" || finalApproval?.status === "CANCELLED") {
    return "rejected";
  }
  if (
    requestDetails?.status === "SUCCEEDED" ||
    requestDetails?.status === "FAILED" ||
    requestDetails?.status === "CANCELLED"
  ) {
    return "rejected";
  }

  // Approval tasks are created as CREATED immediately; only QUEUED/RUNNING means the pause is live.
  if (
    finalApproval?.status === "RUNNING" ||
    finalApproval?.status === "QUEUED" ||
    requestDetails?.status === "RUNNING" ||
    requestDetails?.status === "QUEUED"
  ) {
    return "awaiting_approval";
  }

  if (
    runStatus === "FAILED" ||
    runStatus === "CANCELLED" ||
    generate?.status === "FAILED" ||
    review?.status === "FAILED"
  ) {
    return "failed";
  }

  if (runStatus === "SUCCEEDED" || runStatus === "WARNING") {
    return "approved";
  }

  return "generating";
}
