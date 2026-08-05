import "server-only";

import type { ProductDescriptionInput } from "@/lib/validation/product-description";
import type { ReviewOutcome } from "@/types/api";

export type StoredRun = {
  pipelineRunId: string;
  product: ProductDescriptionInput;
  createdAt: number;
  draft?: string | null;
  review?: ReviewOutcome | null;
  callbackReceivedAt?: number;
};

const emptyProduct: ProductDescriptionInput = {
  productName: "",
  category: "",
  features: "",
  tone: "Professional",
};

const store: Map<string, StoredRun> = (() => {
  const globalRef = globalThis as typeof globalThis & {
    __apcsRunStore?: Map<string, StoredRun>;
  };
  globalRef.__apcsRunStore ??= new Map<string, StoredRun>();
  return globalRef.__apcsRunStore;
})();

const waiters: Map<string, Set<() => void>> = (() => {
  const globalRef = globalThis as typeof globalThis & {
    __apcsRunWaiters?: Map<string, Set<() => void>>;
  };
  globalRef.__apcsRunWaiters ??= new Map<string, Set<() => void>>();
  return globalRef.__apcsRunWaiters;
})();

function notifyWaiters(pipelineRunId: string): void {
  const pending = waiters.get(pipelineRunId);
  if (!pending) return;
  for (const wake of pending) wake();
  waiters.delete(pipelineRunId);
}

export function rememberRun(
  pipelineRunId: string,
  product: ProductDescriptionInput,
): StoredRun {
  const existing = store.get(pipelineRunId);
  const record: StoredRun = {
    pipelineRunId,
    product,
    createdAt: existing?.createdAt ?? Date.now(),
    draft: existing?.draft,
    review: existing?.review,
    callbackReceivedAt: existing?.callbackReceivedAt,
  };
  store.set(pipelineRunId, record);
  return record;
}

export function storeCallbackResult(
  pipelineRunId: string,
  draft: string,
  review: ReviewOutcome,
): StoredRun {
  const existing = store.get(pipelineRunId);
  const record: StoredRun = {
    pipelineRunId,
    product: existing?.product ?? emptyProduct,
    createdAt: existing?.createdAt ?? Date.now(),
    draft,
    review,
    callbackReceivedAt: Date.now(),
  };
  store.set(pipelineRunId, record);
  notifyWaiters(pipelineRunId);
  return record;
}

export function getRememberedRun(
  pipelineRunId: string,
): StoredRun | undefined {
  return store.get(pipelineRunId);
}

export function hasCallbackResult(pipelineRunId: string): boolean {
  return Boolean(store.get(pipelineRunId)?.callbackReceivedAt);
}

export function waitForCallback(
  pipelineRunId: string,
  timeoutMs: number,
): Promise<StoredRun | undefined> {
  const existing = store.get(pipelineRunId);
  if (existing?.callbackReceivedAt) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const pending = waiters.get(pipelineRunId);
      if (pending) {
        pending.delete(onReady);
        if (pending.size === 0) waiters.delete(pipelineRunId);
      }
      resolve(store.get(pipelineRunId));
    };

    const onReady = () => finish();
    const timer = setTimeout(finish, timeoutMs);

    let pending = waiters.get(pipelineRunId);
    if (!pending) {
      pending = new Set();
      waiters.set(pipelineRunId, pending);
    }
    pending.add(onReady);

    // Callback may have landed between the initial check and waiter registration.
    if (store.get(pipelineRunId)?.callbackReceivedAt) {
      finish();
    }
  });
}
