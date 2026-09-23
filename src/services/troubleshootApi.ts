export interface TroubleshootStep {
  instruction: string;
  deeplink: string;
  deeplinkLabel?: string | null;
}

export interface TroubleshootResponse {
  problem: string;
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  steps: TroubleshootStep[];
  source: string;
  flowId?: string | null;
  confidence?: number;
  note?: string;
  meta: {
    cache: "hit" | "miss";
    totalLatencyMs: number;
    llmLatencyMs: number | null;
    retrievalLatencyMs: number;
    validated: boolean;
    cacheStats: { entries: number; hits: number; misses: number; hitRate: number };
  };
}

export class ApiError extends Error {}

export async function requestTroubleshooting(complaint: string): Promise<TroubleshootResponse> {
  let response: Response;
  try {
    response = await fetch("/api/troubleshoot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint }),
    });
  } catch {
    throw new ApiError("Could not reach the service. Check your connection and try again.");
  }

  const data = (await response.json().catch(() => null)) as
    | (TroubleshootResponse & { error?: string })
    | null;

  if (!response.ok || !data || data.error) {
    throw new ApiError(data?.error ?? "Something went wrong. Please try again.");
  }
  return data;
}
