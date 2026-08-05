import { CircleCheck, TriangleAlert } from "lucide-react";

import { DraftExportActions } from "@/components/draft-export-actions";
import { cn } from "@/lib/utils";
import type { ReviewOutcome } from "@/types/api";

function ReviewBadge({ status }: { status: ReviewOutcome["status"] }) {
  const passed = status === "passed";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        passed
          ? "bg-status-success/10 text-status-success"
          : "bg-status-warning/10 text-status-warning",
      )}
    >
      {passed ? (
        <CircleCheck className="size-3.5" aria-hidden />
      ) : (
        <TriangleAlert className="size-3.5" aria-hidden />
      )}
      {passed ? "Review passed" : "Review flagged"}
    </span>
  );
}

export function GeneratedDraft({
  draft,
  review,
  productName = "product",
  showExport = true,
  title = "Generated draft",
}: {
  draft: string;
  review: ReviewOutcome | null;
  productName?: string;
  showExport?: boolean;
  title?: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {review ? <ReviewBadge status={review.status} /> : null}
      </div>

      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {draft}
      </p>

      {review ? (
        <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Review: </span>
          {review.reason}
        </div>
      ) : null}

      {showExport ? (
        <DraftExportActions draft={draft} productName={productName} />
      ) : null}
    </div>
  );
}
