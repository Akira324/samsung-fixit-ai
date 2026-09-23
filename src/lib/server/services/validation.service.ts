/**
 * Validation layer between the engine and the final response.
 * Nothing reaches the user unless it passes here.
 */
import { deeplinkLabel, isApproved, resolveDeeplink, UNRESOLVED } from "./deeplink.service";
import type { Severity, TroubleshootResult, TroubleshootStep } from "../types";

const SEVERITIES: Severity[] = ["Low", "Medium", "High", "Critical"];
const MAX_STEPS = 12;
const MAX_INSTRUCTION_LENGTH = 300;

/**
 * Patterns that indicate a destructive / dangerous instruction.
 * These steps are ALWAYS rejected — regardless of severity or position.
 */
const DESTRUCTIVE_PATTERNS = [
  /\bfactory\s+reset\b/i,
  /\bwipe\s+(all\s+)?data\b/i,
  /\bhard\s+reset\b/i,
  /\berase\s+(all\s+)?data\b/i,
  /\bmaster\s+reset\b/i,
  /\bfull\s+reset\b/i,
  /\breset\s+to\s+factory\b/i,
  /\brestore\s+factory\s+(defaults?|settings?)\b/i,
  /\bdelete\s+all\s+(data|files|content)\b/i,
  /\bformat\s+(the\s+)?(phone|device|storage)\b/i,
];

function isDestructive(instruction: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((p) => p.test(instruction));
}

export interface ValidationOutcome {
  ok: boolean;
  result?: TroubleshootResult;
  errors: string[];
}

export function validateResult(candidate: Partial<TroubleshootResult>): ValidationOutcome {
  const errors: string[] = [];

  const problem = typeof candidate.problem === "string" ? candidate.problem.trim() : "";
  if (!problem) errors.push("missing problem");

  const category =
    typeof candidate.category === "string" && candidate.category.trim()
      ? candidate.category.trim()
      : "Unknown";

  const severity: Severity = SEVERITIES.includes(candidate.severity as Severity)
    ? (candidate.severity as Severity)
    : "Medium";

  const rawSteps = Array.isArray(candidate.steps) ? candidate.steps : [];
  const steps: TroubleshootStep[] = [];

  for (const step of rawSteps.slice(0, MAX_STEPS)) {
    let instruction = typeof step?.instruction === "string" ? step.instruction.trim() : "";
    if (!instruction) continue; // every step must carry an instruction

    // Truncate overly long instructions
    if (instruction.length > MAX_INSTRUCTION_LENGTH) {
      instruction = instruction.slice(0, MAX_INSTRUCTION_LENGTH).trim();
    }

    // Reject destructive instructions entirely — never allow factory resets etc.
    if (isDestructive(instruction)) {
      console.warn(`[validation] rejected destructive step: "${instruction.slice(0, 80)}…"`);
      continue;
    }

    // Reject fabricated deeplinks: anything not in the approved map degrades to unresolved.
    const deeplink = isApproved(step?.deeplink) ? step.deeplink : resolveDeeplink(step?.deeplink);
    steps.push({
      instruction,
      deeplink,
      deeplinkLabel: deeplink === UNRESOLVED ? null : deeplinkLabel(deeplink),
    });
  }

  if (steps.length === 0) errors.push("no valid steps");

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors,
    result: {
      problem,
      category,
      severity,
      steps,
      source: candidate.source ?? "llm",
      flowId: candidate.flowId ?? null,
      confidence: candidate.confidence,
      note: candidate.note,
    },
  };
}
