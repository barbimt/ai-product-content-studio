import { buildHistoryItems } from "@/lib/orchestra/history";
import { mapOrchestraFailure } from "@/lib/orchestra/errors";
import { readHistoryRunIds } from "@/lib/runs/history-cookie";
import type { HistoryResponse } from "@/types/api";

export async function GET(request: Request): Promise<Response> {
  try {
    const runIds = readHistoryRunIds(request.headers.get("cookie"));
    const items = await buildHistoryItems(runIds);
    const body: HistoryResponse = { items };
    return Response.json(body, { status: 200 });
  } catch (error) {
    const { status, body } = mapOrchestraFailure(error);
    return Response.json(body, { status });
  }
}
