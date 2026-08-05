import type { ProductDescriptionInput } from "@/lib/validation/product-description";
import type { ReviewOutcome } from "@/types/api";

export const HISTORY_STORAGE_KEY = "pcs.description-history.v1";
export const MAX_HISTORY_ITEMS = 20;

export type HistoryItem = {
  runId: string;
  product: ProductDescriptionInput;
  draft: string;
  review: ReviewOutcome | null;
  savedAt: number;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readHistory(): HistoryItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryItem);
  } catch {
    return [];
  }
}

export function saveHistoryItem(item: HistoryItem): HistoryItem[] {
  const next = [
    item,
    ...readHistory().filter((entry) => entry.runId !== item.runId),
  ].slice(0, MAX_HISTORY_ITEMS);

  if (canUseStorage()) {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const product = record.product;
  if (typeof record.runId !== "string" || typeof record.draft !== "string") {
    return false;
  }
  if (typeof record.savedAt !== "number") return false;
  if (typeof product !== "object" || product === null) return false;
  const productRecord = product as Record<string, unknown>;
  return (
    typeof productRecord.productName === "string" &&
    typeof productRecord.category === "string" &&
    typeof productRecord.features === "string" &&
    typeof productRecord.tone === "string"
  );
}
