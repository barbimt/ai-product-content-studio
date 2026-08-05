"use client";

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
  loading,
  error,
  onSelect,
}: {
  items: HistoryItem[];
  selectedRunId: string | null;
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
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item) => {
        const selected = item.runId === selectedRunId;
        return (
          <li key={item.runId}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                "flex w-full flex-col gap-1 px-1 py-3 text-left transition-colors hover:bg-muted/50",
                selected && "bg-muted/60",
              )}
            >
              <span className="text-sm font-medium">
                {item.product.productName}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {item.draft ?? "Draft not ready yet"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatCreatedAt(item.createdAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
