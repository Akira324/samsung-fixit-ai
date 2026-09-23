/**
 * Orchestrator for the full pipeline:
 * normalize -> cache -> enrichment -> retrieval -> LLM -> validation -> deeplinks -> cache save
 */
import { cacheLookup, cacheSave, cacheStats } from "./cache.service";
import { bestFlow, retrieveFlows } from "./retrieval.service";
import { enrichQuery, generateSteps, isLlmConfigured, LlmFailureError, LlmUnavailableError } from "./llm.service";
import { validateResult } from "./validation.service";
import { UNRESOLVED } from "./deeplink.service";
import type { EnrichedQuery, TroubleshootResponse, TroubleshootResult } from "../types";

export class UserFacingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const UNKNOWN_NOTE =
  "We could not confidently match this to a known issue. These are safe general checks — try describing the symptom, when it happens, and which app or feature is affected.";

const GENERIC_STEPS = [
  { instruction: "Restart the device and see whether the problem returns", deeplink: UNRESOLVED },
  { instruction: "Install any pending software update", deeplink: UNRESOLVED },
  { instruction: "Check storage — a nearly full device causes many odd symptoms", deeplink: "android.settings.INTERNAL_STORAGE_SETTINGS" },
  { instruction: "Review battery usage for an app behaving unusually", deeplink: "android.settings.BATTERY_SAVER_SETTINGS" },
];

function fromFlow(
  match: NonNullable<ReturnType<typeof bestFlow>>,
  problemOverride?: string,
  categoryOverride?: string,
): TroubleshootResult {
  return {
    problem: problemOverride ?? match.flow.problem,
    category:
      categoryOverride && categoryOverride !== "Unknown"
        ? categoryOverride
        : match.category,
    severity: match.flow.severity,
    steps: match.flow.steps,
    source: "knowledge_base",
    flowId: match.flow.id,
    confidence: Number(Math.min(1, match.score / 2).toFixed(2)),
  };
}

export async function troubleshoot(rawComplaint: unknown): Promise<TroubleshootResponse> {
  const started = performance.now();

  if (typeof rawComplaint !== "string" || rawComplaint.trim().length === 0) {
    throw new UserFacingError("Please describe the problem you are seeing.");
  }
  const complaint = rawComplaint.trim().slice(0, 1000);
  if (complaint.length < 3) {
    throw new UserFacingError("Please add a little more detail about the problem.");
  }

  // ---- FAST PATH -----------------------------------------------------------
  const cached = cacheLookup(complaint);
  if (cached) {
    return {
      ...cached,
      source: "cache",
      meta: {
        cache: "hit",
        totalLatencyMs: Number((performance.now() - started).toFixed(1)),
        llmLatencyMs: null,
        retrievalLatencyMs: 0,
        validated: true,
        cacheStats: cacheStats(),
      },
    };
  }

  // ---- ENRICHMENT ----------------------------------------------------------
  let llmLatencyMs: number | null = null;
  let enriched: EnrichedQuery | null = null;
  let llmError: string | null = null;

  if (isLlmConfigured()) {
    const llmStart = performance.now();
    try {
      enriched = await enrichQuery(complaint);
      console.log("[STAGE 1 ENRICHED]", enriched);
    } catch (error) {
      llmError =
        error instanceof LlmFailureError || error instanceof LlmUnavailableError
          ? error.message
          : "The troubleshooting engine is temporarily unavailable.";
    }
    llmLatencyMs = Number((performance.now() - llmStart).toFixed(1));
  }

  // ---- RETRIEVAL -----------------------------------------------------------
  const retrievalStart = performance.now();
  const searchText = enriched ? `${complaint} ${enriched.problem} ${enriched.keywords.join(" ")}` : complaint;
  const match = bestFlow(searchText);
  const context = retrieveFlows(searchText, 3).map((m) => ({
    category: m.category,
    problem: m.flow.problem,
    steps: m.flow.steps,
  }));
  const retrievalLatencyMs = Number((performance.now() - retrievalStart).toFixed(1));

  // ---- REASONING -----------------------------------------------------------
  let candidate: Partial<TroubleshootResult> | null = null;

  if (enriched) {
    const llmStart = performance.now();
    try {
      const generated = await generateSteps(enriched, context);
      llmLatencyMs = Number(((llmLatencyMs ?? 0) + (performance.now() - llmStart)).toFixed(1));
      if (generated.resolved && generated.steps.length > 0) {
        candidate = {
          problem: enriched.problem,
          category:
            enriched.category && enriched.category !== "Unknown"
              ? enriched.category
              : (match?.category ?? "Unknown"),
          severity: enriched.severity,
          steps: generated.steps,
          source: match ? "llm+knowledge_base" : "llm",
          flowId: match?.flow.id ?? null,
          confidence: match ? Number(Math.min(1, match.score / 2).toFixed(2)) : 0.5,
        };
      }
    } catch (error) {
      if (error instanceof LlmFailureError) {
        console.warn(`[STAGE 2 LLM FAILED] status=${error.status ?? "unknown"} message="${error.message}"`);
        llmError = error.message;
      } else {
        const errName = error instanceof Error ? error.name : "UnknownError";
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[STAGE 2 LLM FAILED] error=${errName} message="${errMsg}"`);
        llmError = "The troubleshooting engine is temporarily unavailable.";
      }
    }
  }

  // Knowledge-base fallback when the LLM is unavailable or unusable.
  if (!candidate && match) {
    candidate = fromFlow(match, enriched?.problem, enriched?.category);
  }

  // ---- VALIDATION ----------------------------------------------------------
  let validated = candidate ? validateResult(candidate) : { ok: false, errors: ["no candidate"] as string[] };

  if (!validated.ok && match) {
    validated = validateResult(fromFlow(match, enriched?.problem, enriched?.category));
  }

  if (!validated.ok) {
    // Graceful unknown-problem response — never invented steps.
    validated = validateResult({
      problem: enriched?.problem ?? complaint,
      category: "Unknown",
      severity: "Low",
      steps: GENERIC_STEPS,
      source: "fallback",
      confidence: 0,
      note: llmError ? `${llmError} ${UNKNOWN_NOTE}` : UNKNOWN_NOTE,
    });
  }

  const result = validated.result as TroubleshootResult;

  // ---- CACHE SAVE (validated results only, never the unknown fallback) -----
  if (result.source !== "fallback") {
    cacheSave(complaint, result);
  }

  return {
    ...result,
    meta: {
      cache: "miss",
      totalLatencyMs: Number((performance.now() - started).toFixed(1)),
      llmLatencyMs,
      retrievalLatencyMs,
      validated: true,
      cacheStats: cacheStats(),
    },
  };
}
