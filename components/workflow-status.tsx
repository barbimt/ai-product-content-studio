import { WorkflowStep } from "./workflow-step";
import type { WorkflowStep as WorkflowStepData } from "@/lib/workflow/status";

export function WorkflowStatus({ steps }: { steps: WorkflowStepData[] }) {
  return (
    <ol className="divide-y divide-border border-y border-border">
      {steps.map((step) => (
        <WorkflowStep key={step.id} step={step} />
      ))}
    </ol>
  );
}
