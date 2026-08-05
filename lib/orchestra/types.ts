import type { ProductDescriptionInput } from "@/lib/validation/product-description";

export type OrchestraRunInputs = {
  product_name: string;
  category: string;
  features: string;
  tone: ProductDescriptionInput["tone"];
};

export type OrchestraTriggerPayload = {
  runInputs: OrchestraRunInputs;
};

export type OrchestraTriggerResult = {
  pipelineRunId: string | null;
};

export type OrchestraRunStatus =
  | "CREATED"
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "WARNING"
  | "FAILED"
  | "SKIPPED"
  | "CANCELLING"
  | "CANCELLED";

export type OrchestraTaskRun = {
  taskName: string;
  status: OrchestraRunStatus;
  externalMessage: string | null;
  message: string | null;
};

export type OrchestraRunSnapshot = {
  pipelineRunId: string;
  runStatus: OrchestraRunStatus;
  tasks: OrchestraTaskRun[];
};
