"use client";

import { Loader2 } from "lucide-react";

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
  loadingRunId = null,
  loading,
  error,
  onSelect,
}: {
  items: HistoryItem[];
  selectedRunId: string | null;
  loadingRunId?: string | null;
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
        const rowLoading = item.runId === loadingRunId;
        return (
          <li key={item.runId}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              disabled={Boolean(loadingRunId) && !rowLoading}
              aria-busy={rowLoading || undefined}
              className={cn(
                "flex w-full min-w-0 cursor-pointer! flex-col gap-1 px-1 py-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-wait! disabled:opacity-60",
                selected && "bg-muted/60",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {item.product.productName}
                </span>
                {rowLoading ? (
                  <Loader2
                    className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                ) : null}
              </span>
              {item.draft ? (
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {item.draft}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatCreatedAt(item.createdAt)}
                {rowLoading
                  ? " · Loading..."
                  : item.draft
                    ? ""
                    : " · Draft pending"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
