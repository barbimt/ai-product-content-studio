import { WorkflowStatusBadge } from "./workflow-status-badge";
import type { WorkflowStep as WorkflowStepData } from "@/lib/workflow/status";

export function WorkflowStep({ step }: { step: WorkflowStepData }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{step.label}</p>
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </div>
      <WorkflowStatusBadge status={step.status} />
    </li>
  );
}
