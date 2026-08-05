// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  HISTORY_COOKIE_NAME,
  appendHistoryRunId,
  historyCookieValue,
  readHistoryRunIds,
} from "@/lib/runs/history-cookie";

const runA = "11111111-1111-4111-8111-111111111111";
const runB = "22222222-2222-4222-8222-222222222222";

describe("history cookie helpers", () => {
  it("reads and appends run ids", () => {
    const header = `${HISTORY_COOKIE_NAME}=${encodeURIComponent(JSON.stringify([runA]))}`;
    expect(readHistoryRunIds(header)).toEqual([runA]);
    expect(appendHistoryRunId([runA], runB)).toEqual([runB, runA]);
  });

  it("builds a Set-Cookie value", () => {
    const value = historyCookieValue([runA]);
    expect(value).toContain(`${HISTORY_COOKIE_NAME}=`);
    expect(value).toContain("HttpOnly");
    expect(value).toContain(encodeURIComponent(JSON.stringify([runA])));
  });
});
