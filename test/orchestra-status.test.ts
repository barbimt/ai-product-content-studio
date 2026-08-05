import { describe, expect, it } from "vitest";

import {
  deriveRunPhase,
  extractDraft,
  extractReview,
} from "@/lib/orchestra/status";
import type { OrchestraRunSnapshot, OrchestraTaskRun } from "@/lib/orchestra/types";

function task(
  taskName: string,
  status: OrchestraTaskRun["status"],
  externalMessage: string | null = null,
): OrchestraTaskRun {
  return { taskName, status, externalMessage, message: null };
}

function snapshot(
  runStatus: OrchestraRunSnapshot["runStatus"],
  tasks: OrchestraTaskRun[],
): OrchestraRunSnapshot {
  return { pipelineRunId: "run-1", runStatus, tasks };
}

describe("orchestra status mapping", () => {
  it("extracts the generated description and review outcome", () => {
    const tasks = [
      task(
        "Generate product description",
        "SUCCEEDED",
        JSON.stringify({ description: "A solid product description." }),
      ),
      task(
        "Review product description",
        "SUCCEEDED",
        JSON.stringify({ status: "APPROVE", reason: "Clear and factual." }),
      ),
    ];

    expect(extractDraft(tasks)).toBe("A solid product description.");
    expect(extractReview(tasks)).toEqual({
      status: "passed",
      reason: "Clear and factual.",
    });
  });

  it("maps a running approval task to awaiting_approval", () => {
    const phase = deriveRunPhase(
      snapshot("RUNNING", [
        task("Generate product description", "SUCCEEDED"),
        task("Review product description", "SUCCEEDED"),
        task("Final content approval", "RUNNING"),
        task("Request additional product details", "SKIPPED"),
      ]),
    );
    expect(phase).toBe("awaiting_approval");
  });

  it("keeps CREATED approval tasks in the generating phase", () => {
    const phase = deriveRunPhase(
      snapshot("RUNNING", [
        task("Generate product description", "QUEUED"),
        task("Review product description", "CREATED"),
        task("Final content approval", "CREATED"),
        task("Request additional product details", "CREATED"),
      ]),
    );
    expect(phase).toBe("generating");
  });

  it("maps a succeeded final approval to approved", () => {
    const phase = deriveRunPhase(
      snapshot("SUCCEEDED", [
        task("Generate product description", "SUCCEEDED"),
        task("Review product description", "SUCCEEDED"),
        task("Final content approval", "SUCCEEDED"),
        task("Request additional product details", "SKIPPED"),
      ]),
    );
    expect(phase).toBe("approved");
  });

  it("maps a failed final approval to rejected", () => {
    const phase = deriveRunPhase(
      snapshot("FAILED", [
        task("Generate product description", "SUCCEEDED"),
        task("Review product description", "SUCCEEDED"),
        task("Final content approval", "FAILED"),
      ]),
    );
    expect(phase).toBe("rejected");
  });
});
