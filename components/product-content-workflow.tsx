"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Loader2, TriangleAlert, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProductDescriptionForm } from "./product-description-form";
import { WorkflowStatus } from "./workflow-status";
import { EmptyWorkflowState } from "./empty-workflow-state";
import { RequestErrorAlert } from "./request-error-alert";
import { ProductSubmissionSummary } from "./product-submission-summary";
import { GeneratedDraft } from "./generated-draft";
import { ApprovalActions } from "./approval-actions";
import {
  GENERATE_ENDPOINT,
  runStatusEndpoint,
  runWaitEndpoint,
  workflowMessages,
} from "@/lib/messages";
import {
  getWorkflowStepsForState,
  type WorkflowPhase,
} from "@/lib/workflow/status";
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

function toWorkflowPhase(state: SubmissionState): WorkflowPhase {
  if (state.status === "idle") return "idle";
  if (state.status === "submitting") return "submitting";
  if (state.status === "submit_error") return "submit_error";
  switch (state.run.phase) {
    case "generating":
      return "generating";
    case "awaiting_approval":
      return "awaiting_approval";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "failed":
      return "run_failed";
  }
}

function mergeRunView(previous: RunView, next: RunView): RunView {
  return {
    ...next,
    product:
      next.product.productName.length > 0 ? next.product : previous.product,
  };
}

export function ProductContentWorkflow() {
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
  });

  const trackingRunId =
    submission.status === "tracking" ? submission.runId : null;
  const trackingPhase =
    submission.status === "tracking" ? submission.run.phase : null;
  const awaitingApproval = trackingPhase === "awaiting_approval";

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

  // One long request while Orchestra generates — no client polling loop.
  useEffect(() => {
    if (!trackingRunId || trackingPhase !== "generating") return;

    let cancelled = false;

    async function waitForDraft() {
      try {
        const response = await fetch(runWaitEndpoint(trackingRunId!), {
          cache: "no-store",
        });
        const body: RunStatusResponseBody = await response.json();
        if (cancelled) return;

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
      } catch {
        if (cancelled) return;
        setSubmission((prev) =>
          prev.status === "tracking" && prev.runId === trackingRunId
            ? { ...prev, statusError: workflowMessages.statusError }
            : prev,
        );
      }
    }

    void waitForDraft();
    return () => {
      cancelled = true;
    };
  }, [trackingRunId, trackingPhase]);

  // When the user comes back from Orchestra, refresh once — not on a timer.
  useEffect(() => {
    if (!trackingRunId || !awaitingApproval) return;

    function onVisible() {
      if (document.visibilityState === "visible") {
        void applyStatus(trackingRunId!);
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [trackingRunId, awaitingApproval]);

  async function handleSubmit(values: ProductDescriptionInput) {
    if (submission.status === "submitting") return;
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

  const steps = getWorkflowStepsForState(toWorkflowPhase(submission));
  const run = submission.status === "tracking" ? submission.run : null;

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

      <section aria-labelledby="workflow-heading" className="space-y-4">
        <h2 id="workflow-heading" className="text-sm font-semibold">
          Workflow status
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
                <AlertTitle>Generating in Orchestra</AlertTitle>
                <AlertDescription>{workflowMessages.generating}</AlertDescription>
              </Alert>
              {run.draft ? (
                <GeneratedDraft draft={run.draft} review={run.review} />
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

          {run?.phase === "awaiting_approval" ? (
            <>
              <Alert>
                <CircleCheck />
                <AlertTitle>Draft ready — approve in Orchestra</AlertTitle>
                <AlertDescription>
                  {workflowMessages.awaitingApproval}
                </AlertDescription>
              </Alert>
              {run.draft ? (
                <GeneratedDraft draft={run.draft} review={run.review} />
              ) : null}
              {run.approvalUrl ? (
                <ApprovalActions approvalUrl={run.approvalUrl} />
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
                {submission.status === "tracking" && submission.refreshing
                  ? "Checking..."
                  : "I decided in Orchestra — refresh"}
              </Button>
            </>
          ) : null}

          {run?.phase === "approved" ? (
            <>
              <Alert>
                <CircleCheck />
                <AlertTitle>Approved</AlertTitle>
                <AlertDescription>{workflowMessages.approved}</AlertDescription>
              </Alert>
              {run.draft ? (
                <GeneratedDraft draft={run.draft} review={run.review} />
              ) : null}
            </>
          ) : null}

          {run?.phase === "rejected" ? (
            <>
              <Alert variant="destructive">
                <XCircle />
                <AlertTitle>Rejected</AlertTitle>
                <AlertDescription>{workflowMessages.rejected}</AlertDescription>
              </Alert>
              {run.draft ? (
                <GeneratedDraft draft={run.draft} review={run.review} />
              ) : null}
            </>
          ) : null}

          {run?.phase === "failed" ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Workflow failed</AlertTitle>
              <AlertDescription>{workflowMessages.runFailed}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <WorkflowStatus steps={steps} />

        {submission.status === "idle" ? <EmptyWorkflowState /> : null}

        {run ? <ProductSubmissionSummary product={run.product} /> : null}
      </section>
    </div>
  );
}
