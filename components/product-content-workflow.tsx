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
import {
  GENERATE_ENDPOINT,
  runStatusEndpoint,
  runWaitEndpoint,
  workflowMessages,
} from "@/lib/messages";
import type { ProductDescriptionInput } from "@/lib/validation/product-description";
import type {
  GenerateResponseBody,
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
  // A late /wait timeout must not overwrite a newer Check status result.
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

  async function handleSubmit(
    values: ProductDescriptionInput,
    options?: { preservePreviousDraft?: boolean },
  ) {
    if (submission.status === "submitting") return;

    if (!options?.preservePreviousDraft) {
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

  function handleGenerateAnother() {
    if (submission.status !== "tracking") return;
    const product = submission.run.product;
    if (!product.productName.trim()) return;
    if (submission.run.draft) {
      setPreviousDraft(submission.run.draft);
    }
    void handleSubmit(product, { preservePreviousDraft: true });
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
      <section aria-labelledby="form-heading" className="space-y-4">
        <h2 id="form-heading" className="text-sm font-semibold">
          Product details
        </h2>
        <ProductDescriptionForm
          onSubmit={handleSubmit}
          isSubmitting={submission.status === "submitting"}
        />
      </section>

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
              {previousDraft ? (
                <GeneratedDraft
                  title="Previous draft"
                  draft={previousDraft}
                  review={null}
                  productName={run.product.productName}
                  showExport={false}
                />
              ) : null}
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
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateAnother}
                disabled={submission.status === "submitting"}
              >
                {workflowMessages.generateAnother}
              </Button>
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
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateAnother}
                disabled={submission.status === "submitting"}
              >
                {workflowMessages.generateAnother}
              </Button>
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

        {submission.status === "idle" ? <EmptyWorkflowState /> : null}

        {run ? <ProductSubmissionSummary product={run.product} /> : null}
      </section>
    </div>
  );
}
