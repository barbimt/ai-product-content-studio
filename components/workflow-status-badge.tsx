import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import {
  workflowStatusLabels,
  type WorkflowStepStatus,
} from "@/lib/workflow/status";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      status: {
        idle: "bg-muted text-muted-foreground",
        pending: "bg-status-pending/10 text-status-pending",
        running: "bg-status-running/10 text-status-running",
        succeeded: "bg-status-success/10 text-status-success",
        failed: "bg-destructive/10 text-destructive",
        waiting_for_approval: "bg-status-warning/10 text-status-warning",
      } satisfies Record<WorkflowStepStatus, string>,
    },
  },
);

const dotVariants = cva("size-1.5 rounded-full", {
  variants: {
    status: {
      idle: "bg-muted-foreground/50",
      pending: "bg-status-pending",
      running: "bg-status-running animate-pulse",
      succeeded: "bg-status-success",
      failed: "bg-destructive",
      waiting_for_approval: "bg-status-warning",
    } satisfies Record<WorkflowStepStatus, string>,
  },
});

export function WorkflowStatusBadge({ status }: { status: WorkflowStepStatus }) {
  return (
    <span className={cn(badgeVariants({ status }))}>
      <span aria-hidden className={cn(dotVariants({ status }))} />
      <span className="sr-only">Status: </span>
      {workflowStatusLabels[status]}
    </span>
  );
}
