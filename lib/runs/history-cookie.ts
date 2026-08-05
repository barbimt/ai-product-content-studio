import "server-only";

export const HISTORY_COOKIE_NAME = "pcs_orchestra_run_ids";
export const MAX_HISTORY_RUN_IDS = 20;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function readHistoryRunIds(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${HISTORY_COOKIE_NAME}=`));

  if (!match) return [];

  const raw = decodeURIComponent(match.slice(HISTORY_COOKIE_NAME.length + 1));
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === "string" && isUuid(value))
      .slice(0, MAX_HISTORY_RUN_IDS);
  } catch {
    return [];
  }
}

export function appendHistoryRunId(runIds: string[], runId: string): string[] {
  return [runId, ...runIds.filter((id) => id !== runId)].slice(
    0,
    MAX_HISTORY_RUN_IDS,
  );
}

export function historyCookieValue(runIds: string[]): string {
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${HISTORY_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(runIds))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}
