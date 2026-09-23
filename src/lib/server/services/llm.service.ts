/**
 * Two-stage LLM engine (server-only). The API key is read from the environment
 * inside the call and never leaves the server.
 *
 * Stage 1 — query enrichment: vague complaint -> { problem, category, severity, keywords }
 * Stage 2 — troubleshooting reasoning: enriched query + retrieved flows -> ordered steps
 *
 * Provider is any OpenAI-compatible chat completions endpoint.
 *
 * FREE-MODEL ENFORCEMENT: only models ending with :free or the "openrouter/free"
 * router are accepted. If the configured model is not free, the LLM path is
 * disabled and the system continues with deterministic KB/cache functionality.
 */
import type { EnrichedQuery, Severity } from "../types";
import { APPROVED_DEEPLINKS, UNRESOLVED } from "./deeplink.service";
import { listCategories } from "./retrieval.service";

export class LlmUnavailableError extends Error { }
export class LlmFailureError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const LLM_TIMEOUT_MS = 25_000; // 25 seconds max per LLM call

// ---------------------------------------------------------------------------
// FREE-MODEL GUARD
// ---------------------------------------------------------------------------

/**
 * Returns true if the given model identifier is explicitly free.
 * Accepts:
 *   - any model ending with `:free` (e.g. `google/gemma-4-26b-a4b-it:free`)
 *   - `openrouter/free` (the OpenRouter free router)
 */
export function isFreeModel(model?: string): boolean {
  const m = (model ?? process.env["LLM_MODEL"] ?? "").trim().toLowerCase();
  if (!m) return false;
  return m.endsWith(":free") || m === "openrouter/free";
}

function readConfig(): LlmConfig {
  const apiKey = process.env["LLM_API_KEY"] ?? process.env["OPENAI_API_KEY"] ?? "";
  if (!apiKey) throw new LlmUnavailableError("No LLM API key configured");

  const model = process.env["LLM_MODEL"] ?? "";
  if (!isFreeModel(model)) {
    throw new LlmUnavailableError(
      `Model "${model || "(empty)"}" is not a free model. Only models ending with :free or "openrouter/free" are accepted. The LLM path is disabled.`,
    );
  }

  return {
    apiKey,
    baseUrl: (process.env["LLM_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    model: model.trim(),
  };
}

/**
 * Whether the LLM path is enabled: key must be present AND model must be free.
 */
export function isLlmConfigured(): boolean {
  const hasKey = Boolean(process.env["LLM_API_KEY"] ?? process.env["OPENAI_API_KEY"]);
  if (!hasKey) return false;
  return isFreeModel();
}

// ---------------------------------------------------------------------------
// Defensive JSON extraction
// ---------------------------------------------------------------------------

/**
 * Extracts a JSON object from LLM output that may be:
 * - raw JSON
 * - wrapped in markdown fences (```json ... ```)
 * - preceded by conversational text ("Here is your JSON:\n{...}")
 */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();

  // 1. Direct parse
  try {
    return JSON.parse(trimmed);
  } catch { /* continue */ }

  // 2. Markdown fence: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* continue */ }
  }

  // 3. Find first { ... } or [ ... ] block
  const braceStart = trimmed.indexOf("{");
  const bracketStart = trimmed.indexOf("[");
  const start = braceStart >= 0 && (bracketStart < 0 || braceStart < bracketStart)
    ? braceStart
    : bracketStart;
  if (start >= 0) {
    const closer = trimmed[start] === "{" ? "}" : "]";
    const end = trimmed.lastIndexOf(closer);
    if (end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch { /* continue */ }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Core chat helper
// ---------------------------------------------------------------------------

async function chatJson(system: string, user: string): Promise<unknown> {
  const config = readConfig();
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new LlmFailureError("The troubleshooting engine timed out. Please try again.");
    }
    throw new LlmFailureError("The troubleshooting engine is unreachable right now.");
  }

  if (!response.ok) {
    const status = response.status;
    const message =
      status === 401
        ? "The troubleshooting engine key was rejected."
        : status === 429
          ? "The troubleshooting engine is rate limited. Please retry in a moment."
          : "The troubleshooting engine is temporarily unavailable.";
    throw new LlmFailureError(message, status);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new LlmFailureError("The troubleshooting engine returned an empty answer.");

  const parsed = extractJson(content);
  if (parsed === null) {
    throw new LlmFailureError("The troubleshooting engine returned malformed data.");
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Stage 1 — Query Enrichment
// ---------------------------------------------------------------------------

const SEVERITIES: Severity[] = ["Low", "Medium", "High", "Critical"];

export async function enrichQuery(complaint: string): Promise<EnrichedQuery> {
  const system = [
    "You convert vague Samsung/Android device complaints into structured technical problems.",
    `Reply with JSON only: {"problem": string, "category": string, "severity": "Low"|"Medium"|"High"|"Critical", "keywords": string[]}.`,
    `Pick category from this list when possible: ${listCategories().join(", ")}. Use "Unknown" if the complaint is too vague to classify.`,
    "",
    "CRITICAL RULES:",
    "1. problem must be a precise one-sentence technical restatement that preserves ALL specific details from the complaint.",
    "2. NEVER replace a specific symptom with a broader generic problem. If the user mentions a specific technology, feature, behavior, or error, it MUST appear in the problem.",
    "3. Preserve these when mentioned: network generations (5G, 4G, LTE, 3G), technologies (Wi-Fi, Bluetooth, NFC, GPS, VoLTE, eSIM, USB), Galaxy features, app names, error messages, frequency/timing, triggers, and affected components.",
    '4. Example: "My mobile network keeps switching between 5G and 4G randomly" MUST become something like "Mobile network intermittently switches between 5G and 4G without user action" — NOT "Mobile data is not working".',
    "5. keywords must contain 3–8 lowercase technical search terms that capture the specific symptom and important context. Include the technology names and specific behaviors.",
    "6. Do not invent device details, model numbers, or technical facts not present in or clearly implied by the complaint.",
  ].join("\n");

  const raw = (await chatJson(system, complaint)) as Partial<EnrichedQuery>;
  const severity = SEVERITIES.includes(raw.severity as Severity)
    ? (raw.severity as Severity)
    : "Medium";
  return {
    problem: typeof raw.problem === "string" && raw.problem.trim() ? raw.problem.trim() : complaint,
    category: typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : "Unknown",
    severity,
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.filter((k): k is string => typeof k === "string" && k.trim().length > 0).slice(0, 8)
      : [],
  };
}

// ---------------------------------------------------------------------------
// Stage 2 — Troubleshooting Reasoning
// ---------------------------------------------------------------------------

export interface LlmSteps {
  steps: { instruction: string; deeplink: string }[];
  resolved: boolean;
}

export async function generateSteps(
  enriched: EnrichedQuery,
  context: { category: string; problem: string; steps: { instruction: string; deeplink: string }[] }[],
): Promise<LlmSteps> {
  const allowedDeeplinks = Object.keys(APPROVED_DEEPLINKS);
  const system = [
    "You are a Samsung device support engineer. Produce ordered troubleshooting steps.",
    `Reply with JSON only: {"resolved": boolean, "steps": [{"instruction": string, "deeplink": string}]}.`,
    `deeplink MUST be exactly one of these values — never invent one: ${allowedDeeplinks.join(", ")}, ${UNRESOLVED}.`,
    `Use "${UNRESOLVED}" when no Settings screen applies (hardware checks, restarts, router actions).`,
    "",
    "RULES:",
    "1. Order steps from safest/simplest to most disruptive. 1–7 steps. Each instruction is one short imperative sentence.",
    "2. NEVER include factory reset, wipe data, hard reset, erase all data, or any destructive operation.",
    "3. Do not invent Samsung settings pages or Android intent actions that are not in the provided list.",
    "4. Ground your steps in the provided knowledge base context. Do not freely invent troubleshooting steps.",
    "5. Every step must be safe, reversible, and non-destructive.",
    '6. Set "resolved": false and return an empty steps array if the complaint is too vague to troubleshoot safely.',
  ].join("\n");

  const user = JSON.stringify({
    problem: enriched.problem,
    category: enriched.category,
    severity: enriched.severity,
    knowledge_base_context: context,
  });

  const raw = (await chatJson(system, user)) as { resolved?: boolean; steps?: unknown };
  const steps = Array.isArray(raw.steps)
    ? (raw.steps as { instruction?: unknown; deeplink?: unknown }[])
      .map((s) => ({
        instruction: typeof s.instruction === "string" ? s.instruction.trim() : "",
        deeplink: typeof s.deeplink === "string" ? s.deeplink : UNRESOLVED,
      }))
      .filter((s) => s.instruction.length > 0)
    : [];
  return { steps, resolved: raw.resolved !== false && steps.length > 0 };
}
