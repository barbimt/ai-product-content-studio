"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Loader2, TriangleAlert, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProductDescriptionForm } from "./product-description-form";
import { EmptyWorkflowState } from "./empty-workflow-state";
import { RequestErrorAlert } from "./request-error-alert";
import { ProductSubmissionSummary } from "./product-submission-summary";
import { GeneratedDraft } from "./generated-draft";
import { DraftExportActions } from "./draft-export-actions";
import { DraftVersionCompare } from "./draft-version-compare";
import { DescriptionHistory } from "./description-history";
import {
  GENERATE_ENDPOINT,
  HISTORY_ENDPOINT,
  runStatusEndpoint,
  runWaitEndpoint,
  workflowMessages,
} from "@/lib/messages";
import type { ProductDescriptionInput } from "@/lib/validation/product-description";
import type {
  GenerateResponseBody,
  HistoryItem,
  HistoryResponse,
  RunStatusResponseBody,
  RunView,
} from "@/types/api";

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "submit_error"; message: string }
  | {
      status: "tracking";
      runId: string;
      run: RunView;
      statusError: string | null;
      refreshing: boolean;
    };

const phaseRank: Record<RunView["phase"], number> = {
  generating: 0,
  awaiting_approval: 1,
  approved: 2,
  rejected: 2,
  failed: 2,
};

function mergeRunView(previous: RunView, next: RunView): RunView {
  const phase =
    phaseRank[next.phase] >= phaseRank[previous.phase]
      ? next.phase
      : previous.phase;

  return {
    ...next,
    phase,
    draft: next.draft ?? previous.draft,
    review: next.review ?? previous.review,
    approvalUrl:
      next.approvalUrl ??
      (phase === "awaiting_approval" ? previous.approvalUrl : null),
    product:
      next.product.productName.length > 0 ? next.product : previous.product,
  };
}

function isReadyPhase(phase: RunView["phase"]): boolean {
  return phase === "awaiting_approval" || phase === "approved";
}

export function ProductContentWorkflow() {
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
  });
  const [previousDraft, setPreviousDraft] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(
    null,
  );
  const [formDefaults, setFormDefaults] = useState<
    ProductDescriptionInput | undefined
  >(undefined);
  const [formKey, setFormKey] = useState(0);

  const trackingRunId =
    submission.status === "tracking" ? submission.runId : null;
  const trackingPhase =
    submission.status === "tracking" ? submission.run.phase : null;
  const currentDraft =
    submission.status === "tracking" ? submission.run.draft : null;
  const showVersionCompare = Boolean(
    previousDraft &&
      currentDraft &&
      previousDraft !== currentDraft &&
      trackingPhase &&
      isReadyPhase(trackingPhase),
  );

  async function loadHistory() {
    setHistoryError(null);
    try {
      const response = await fetch(HISTORY_ENDPOINT, { cache: "no-store" });
      const body = (await response.json()) as
        | HistoryResponse
        | { error: { message: string } };
      if (!response.ok || "error" in body) {
        setHistoryError(
          "error" in body ? body.error.message : workflowMessages.historyError,
        );
        setHistory([]);
        return;
      }
      setHistory(body.items);
    } catch {
      setHistoryError(workflowMessages.historyError);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(HISTORY_ENDPOINT, { cache: "no-store" });
        const body = (await response.json()) as
          | HistoryResponse
          | { error: { message: string } };
        if (cancelled) return;
        if (!response.ok || "error" in body) {
          setHistoryError(
            "error" in body
              ? body.error.message
              : workflowMessages.historyError,
          );
          setHistory([]);
          return;
        }
        setHistory(body.items);
        setHistoryError(null);
      } catch {
        if (cancelled) return;
        setHistoryError(workflowMessages.historyError);
        setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyStatus(runId: string): Promise<void> {
    const response = await fetch(runStatusEndpoint(runId), {
      cache: "no-store",
    });
    const body: RunStatusResponseBody = await response.json();

    if (!response.ok || "error" in body) {
      const message =
        "error" in body ? body.error.message : workflowMessages.statusError;
      setSubmission((prev) =>
        prev.status === "tracking" && prev.runId === runId
          ? { ...prev, statusError: message, refreshing: false }
          : prev,
      );
      return;
    }

    setSubmission((prev) => {
      if (prev.status !== "tracking" || prev.runId !== body.runId) return prev;
      return {
        ...prev,
        statusError: null,
        refreshing: false,
        run: mergeRunView(prev.run, body),
      };
    });
  }

  useEffect(() => {
    if (!trackingRunId || trackingPhase !== "generating") return;

    const controller = new AbortController();

    async function waitForDraft() {
      try {
        const response = await fetch(runWaitEndpoint(trackingRunId!), {
          cache: "no-store",
          signal: controller.signal,
        });
        const body: RunStatusResponseBody = await response.json();
        if (controller.signal.aborted) return;

        if ("error" in body) {
          setSubmission((prev) =>
            prev.status === "tracking" && prev.runId === trackingRunId
              ? { ...prev, statusError: body.error.message }
              : prev,
          );
          return;
        }

        setSubmission((prev) => {
          if (prev.status !== "tracking" || prev.runId !== body.runId) {
            return prev;
          }
          return {
            ...prev,
            statusError: null,
            run: mergeRunView(prev.run, body),
          };
        });

        if (body.phase === "generating") {
          await applyStatus(trackingRunId!);
        } else {
          void loadHistory();
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setSubmission((prev) =>
          prev.status === "tracking" && prev.runId === trackingRunId
            ? { ...prev, statusError: workflowMessages.statusError }
            : prev,
        );
      }
    }

    void waitForDraft();
    return () => {
      controller.abort();
    };
  }, [trackingRunId, trackingPhase]);

  async function handleSubmit(values: ProductDescriptionInput) {
    if (submission.status === "submitting") return;

    setSelectedHistory(null);

    if (submission.status === "tracking" && submission.run.draft) {
      setPreviousDraft(submission.run.draft);
    } else {
      setPreviousDraft(null);
    }

    setSubmission({ status: "submitting" });

    try {
      const response = await fetch(GENERATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body: GenerateResponseBody = await response.json();

      if (!response.ok || "error" in body) {
        const message =
          "error" in body ? body.error.message : workflowMessages.genericError;
        setSubmission({ status: "submit_error", message });
        return;
      }

      setSubmission({
        status: "tracking",
        runId: body.runId,
        statusError: null,
        refreshing: false,
        run: {
          runId: body.runId,
          phase: "generating",
          product: values,
          draft: null,
          review: null,
          approvalUrl: null,
        },
      });
      void loadHistory();
    } catch {
      setSubmission({
        status: "submit_error",
        message: workflowMessages.genericError,
      });
    }
  }

  async function handleRefresh() {
    if (submission.status !== "tracking" || submission.refreshing) return;
    setSubmission({ ...submission, refreshing: true, statusError: null });
    try {
      await applyStatus(submission.runId);
      void loadHistory();
    } catch {
      setSubmission((prev) =>
        prev.status === "tracking"
          ? {
              ...prev,
              refreshing: false,
              statusError: workflowMessages.statusError,
            }
          : prev,
      );
    }
  }

  function handleSelectHistory(item: HistoryItem) {
    setSelectedHistory(item);
    setFormDefaults(item.product);
    setFormKey((value) => value + 1);
  }

  const run = submission.status === "tracking" ? submission.run : null;

  function readyDraftSection(draft: string, review: RunView["review"]) {
    if (showVersionCompare && previousDraft) {
      return (
        <>
          <DraftVersionCompare
            previousDraft={previousDraft}
            currentDraft={draft}
          />
          {review ? (
            <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Review: </span>
              {review.reason}
            </div>
          ) : null}
          <DraftExportActions
            draft={draft}
            productName={run?.product.productName ?? "product"}
          />
        </>
      );
    }

    return (
      <GeneratedDraft
        draft={draft}
        review={review}
        productName={run?.product.productName ?? "product"}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <div className="space-y-8">
        <section aria-labelledby="form-heading" className="space-y-4">
          <h2 id="form-heading" className="text-sm font-semibold">
            Product details
          </h2>
          <ProductDescriptionForm
            key={formKey}
            onSubmit={handleSubmit}
            isSubmitting={submission.status === "submitting"}
            defaultValues={formDefaults}
          />
        </section>

        <section aria-labelledby="history-heading" className="space-y-3">
          <h2 id="history-heading" className="text-sm font-semibold">
            {workflowMessages.historyTitle}
          </h2>
          <DescriptionHistory
            items={history}
            selectedRunId={selectedHistory?.runId ?? null}
            selectedItem={selectedHistory}
            loading={historyLoading}
            error={historyError}
            onSelect={handleSelectHistory}
          />
        </section>
      </div>

      <section aria-labelledby="result-heading" className="space-y-4">
        <h2 id="result-heading" className="text-sm font-semibold">
          Generated description
        </h2>

        {submission.status === "submit_error" ? (
          <RequestErrorAlert message={submission.message} />
        ) : null}

        {submission.status === "tracking" && submission.statusError ? (
          <RequestErrorAlert
            title="Could not refresh status"
            message={submission.statusError}
          />
        ) : null}

        <div aria-live="polite" className="space-y-4">
          {run?.phase === "generating" ? (
            <>
              <Alert>
                <Loader2 className="animate-spin" />
                <AlertTitle>Generating</AlertTitle>
                <AlertDescription>{workflowMessages.generating}</AlertDescription>
              </Alert>
              {run.draft ? (
                <GeneratedDraft
                  draft={run.draft}
                  review={run.review}
                  productName={run.product.productName}
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={
                  submission.status === "tracking" && submission.refreshing
                }
              >
                Check status
              </Button>
            </>
          ) : null}

          {run && isReadyPhase(run.phase) ? (
            <>
              <Alert>
                <CircleCheck />
                <AlertTitle>Description ready</AlertTitle>
                <AlertDescription>
                  {workflowMessages.descriptionReady}
                </AlertDescription>
              </Alert>
              {run.draft ? readyDraftSection(run.draft, run.review) : null}
            </>
          ) : null}

          {run?.phase === "rejected" ? (
            <>
              <Alert variant="destructive">
                <XCircle />
                <AlertTitle>Needs another pass</AlertTitle>
                <AlertDescription>{workflowMessages.rejected}</AlertDescription>
              </Alert>
              {run.draft ? readyDraftSection(run.draft, run.review) : null}
            </>
          ) : null}

          {run?.phase === "failed" ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Generation failed</AlertTitle>
              <AlertDescription>{workflowMessages.runFailed}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        {submission.status === "idle" && !run ? <EmptyWorkflowState /> : null}

        {run ? <ProductSubmissionSummary product={run.product} /> : null}
      </section>
    </div>
  );
}
