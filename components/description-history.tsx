"use client";

import { GeneratedDraft } from "@/components/generated-draft";
import { ProductSubmissionSummary } from "@/components/product-submission-summary";
import type { HistoryItem } from "@/types/api";
import { workflowMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

function formatCreatedAt(createdAt: string | null): string {
  if (!createdAt) return "Unknown time";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(createdAt));
  } catch {
    return createdAt;
  }
}

export function DescriptionHistory({
  items,
  selectedRunId,
  selectedItem,
  loading,
  error,
  onSelect,
}: {
  items: HistoryItem[];
  selectedRunId: string | null;
  selectedItem: HistoryItem | null;
  loading: boolean;
  error: string | null;
  onSelect: (item: HistoryItem) => void;
}) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        {workflowMessages.historyLoading}
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {workflowMessages.historyEmpty}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border border-y border-border">
        {items.map((item) => {
          const selected = item.runId === selectedRunId;
          return (
            <li key={item.runId}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full min-w-0 flex-col gap-0.5 px-1 py-3 text-left transition-colors hover:bg-muted/50",
                  selected && "bg-muted/60",
                )}
              >
                <span className="truncate text-sm font-medium">
                  {item.product.productName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCreatedAt(item.createdAt)}
                  {item.draft ? "" : " · Draft pending"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selectedItem ? (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {workflowMessages.historySelected}
          </p>
          {selectedItem.draft ? (
            <GeneratedDraft
              title={selectedItem.product.productName}
              draft={selectedItem.draft}
              review={selectedItem.review}
              productName={selectedItem.product.productName}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Draft not ready yet for this run.
            </p>
          )}
          <ProductSubmissionSummary product={selectedItem.product} />
        </div>
      ) : null}
    </div>
  );
}
