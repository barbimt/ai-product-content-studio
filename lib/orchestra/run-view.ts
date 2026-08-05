import { getOrchestraRunSnapshot } from "@/lib/orchestra/client";
import {
  deriveRunPhase,
  extractDraft,
  extractReview,
} from "@/lib/orchestra/status";
import { getRememberedRun } from "@/lib/runs/store";
import type { ReviewOutcome, RunPhase, RunView } from "@/types/api";

export async function buildRunView(runId: string): Promise<RunView> {
  const remembered = getRememberedRun(runId);
  const storedDraft = remembered?.draft ?? null;
  const storedReview = remembered?.review ?? null;

  let phase: RunPhase = remembered?.callbackReceivedAt
    ? "awaiting_approval"
    : "generating";
  let orchestraDraft: string | null = null;
  let orchestraReview: ReviewOutcome | null = null;

  try {
    const snapshot = await getOrchestraRunSnapshot(runId);
    phase = deriveRunPhase(snapshot);
    orchestraDraft = extractDraft(snapshot.tasks);
    orchestraReview = extractReview(snapshot.tasks);

    // Callback can arrive before approval tasks are QUEUED; prefer showing the draft.
    if (phase === "generating" && (storedDraft || orchestraDraft)) {
      phase = "awaiting_approval";
    }
  } catch (error) {
    if (!remembered?.callbackReceivedAt) {
      throw error;
    }
  }

  const draft = storedDraft ?? orchestraDraft;
  const review = storedReview ?? orchestraReview;

  return {
    runId,
    phase,
    product: remembered?.product ?? {
      productName: "",
      category: "",
      features: "",
      tone: "Professional",
    },
    draft,
    review,
  };
}
