import {
  workflowStepDefinitions,
  type WorkflowStepDefinition,
  type WorkflowStepId,
} from "./definitions";

export type WorkflowStepStatus =
  | "idle"
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "waiting_for_approval";

export type WorkflowPhase =
  | "idle"
  | "submitting"
  | "generating"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "submit_error"
  | "run_failed";

export type WorkflowStep = WorkflowStepDefinition & {
  status: WorkflowStepStatus;
};

export const workflowStatusLabels: Record<WorkflowStepStatus, string> = {
  idle: "Not started",
  pending: "Pending",
  running: "In progress",
  succeeded: "Completed",
  failed: "Failed",
  waiting_for_approval: "Waiting for approval",
};

const stepStatusByPhase: Record<
  WorkflowPhase,
  Record<WorkflowStepId, WorkflowStepStatus>
> = {
  idle: {
    submission: "idle",
    generation: "idle",
    review: "idle",
    approval: "idle",
  },
  submitting: {
    submission: "running",
    generation: "pending",
    review: "pending",
    approval: "pending",
  },
  generating: {
    submission: "succeeded",
    generation: "running",
    review: "pending",
    approval: "pending",
  },
  awaiting_approval: {
    submission: "succeeded",
    generation: "succeeded",
    review: "succeeded",
    approval: "waiting_for_approval",
  },
  approved: {
    submission: "succeeded",
    generation: "succeeded",
    review: "succeeded",
    approval: "succeeded",
  },
  rejected: {
    submission: "succeeded",
    generation: "succeeded",
    review: "succeeded",
    approval: "failed",
  },
  submit_error: {
    submission: "failed",
    generation: "idle",
    review: "idle",
    approval: "idle",
  },
  run_failed: {
    submission: "succeeded",
    generation: "failed",
    review: "idle",
    approval: "idle",
  },
};

export function getWorkflowStepsForState(phase: WorkflowPhase): WorkflowStep[] {
  const statuses = stepStatusByPhase[phase];
  return workflowStepDefinitions.map((step) => ({
    ...step,
    status: statuses[step.id],
  }));
}
