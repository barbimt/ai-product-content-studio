import { ExternalLink } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { workflowMessages } from "@/lib/messages";

export function ApprovalActions({ approvalUrl }: { approvalUrl: string }) {
  return (
    <div className="space-y-2">
      <a
        href={approvalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
      >
        <ExternalLink aria-hidden />
        {workflowMessages.openInOrchestra}
      </a>
      <p className="text-xs text-muted-foreground">
        Optional: record Approve or Reject in Orchestra. Or generate another
        version below if you want a different draft.
      </p>
    </div>
  );
}
