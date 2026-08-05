import "server-only";

import { getOrchestraRunSnapshot } from "@/lib/orchestra/client";
import { productFromGeneratePrompt } from "@/lib/orchestra/product-from-prompt";
import {
  deriveRunPhase,
  extractDraft,
  extractReview,
  GENERATE_TASK_NAME,
} from "@/lib/orchestra/status";
import { getRememberedRun } from "@/lib/runs/store";
import type { HistoryItem } from "@/types/api";
import type { ProductDescriptionInput } from "@/lib/validation/product-description";

const emptyProduct: ProductDescriptionInput = {
  productName: "Unknown product",
  category: "",
  features: "",
  tone: "Professional",
};

function findGeneratePrompt(
  tasks: { taskName: string; prompt: string | null }[],
): string | null {
  return tasks.find((task) => task.taskName === GENERATE_TASK_NAME)?.prompt ?? null;
}

export async function buildHistoryItems(
  runIds: string[],
): Promise<HistoryItem[]> {
  const settled = await Promise.allSettled(
    runIds.map(async (runId) => {
      const snapshot = await getOrchestraRunSnapshot(runId);
      const remembered = getRememberedRun(runId);
      const fromPrompt = productFromGeneratePrompt(
        findGeneratePrompt(snapshot.tasks),
      );

      return {
        runId,
        product: remembered?.product ?? fromPrompt ?? emptyProduct,
        draft: extractDraft(snapshot.tasks),
        review: extractReview(snapshot.tasks),
        phase: deriveRunPhase(snapshot),
        createdAt:
          snapshot.createdAt ??
          (remembered ? new Date(remembered.createdAt).toISOString() : null),
      } satisfies HistoryItem;
    }),
  );

  return settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
}
