// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  HISTORY_STORAGE_KEY,
  readHistory,
  saveHistoryItem,
} from "@/lib/history/browser-history";

const sampleItem = {
  runId: "run-1",
  product: {
    productName: "TrailFlex Running Shoes",
    category: "Sports footwear",
    features: "Lightweight mesh upper, cushioned sole and rubber grip",
    tone: "Friendly" as const,
  },
  draft: "A clear product description.",
  review: { status: "passed" as const, reason: "Looks good." },
  savedAt: 1_700_000_000_000,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("browser history", () => {
  it("saves and reads history items", () => {
    saveHistoryItem(sampleItem);
    expect(readHistory()).toEqual([sampleItem]);
    expect(window.localStorage.getItem(HISTORY_STORAGE_KEY)).toContain("run-1");
  });

  it("keeps the newest item first and dedupes by runId", () => {
    saveHistoryItem(sampleItem);
    saveHistoryItem({
      ...sampleItem,
      draft: "Updated draft.",
      savedAt: 1_700_000_000_100,
    });

    const history = readHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.draft).toBe("Updated draft.");
  });
});
