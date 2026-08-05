"use client";

import type { HistoryItem } from "@/lib/history/browser-history";
import { workflowMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

function formatSavedAt(savedAt: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(savedAt));
  } catch {
    return new Date(savedAt).toLocaleString();
  }
}

export function DescriptionHistory({
  items,
  selectedRunId,
  onSelect,
}: {
  items: HistoryItem[];
  selectedRunId: string | null;
  onSelect: (item: HistoryItem) => void;
}) {
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
                {item.draft}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatSavedAt(item.savedAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
