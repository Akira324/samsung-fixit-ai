import { useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Info, ShieldAlert, Sparkles, Workflow } from "lucide-react";
import type { UnifiedTroubleshootResult, Theme2Goal } from "@/services/troubleshootApi";
import { ResultSummary } from "./ResultSummary";
import { TroubleshootingStep } from "./TroubleshootingStep";

export function ResultsPanel({ result }: { result: UnifiedTroubleshootResult }) {
  if (result.type === "standard") {
    const hasDeeplinks = result.data.steps.some((s) => s.deeplink && s.deeplink !== "unresolved");

    return (
      <div className="space-y-6">
        <ResultSummary result={result.data} />

        <section>
          <div className="flex items-center justify-between">
            <h3 className="px-1 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Recommended Steps
            </h3>
          </div>

          <ol className="mt-4 space-y-3">
            {result.data.steps.map((step, index) => (
              <TroubleshootingStep key={`${step.instruction}-${index}`} step={step} index={index} />
            ))}
          </ol>

          {hasDeeplinks && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[calc(var(--radius))] border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-primary/70" />
              <p className="leading-relaxed">
                <strong className="text-foreground/90">Note on Settings Shortcuts:</strong> Direct
                native launching depends on your Android browser and device environment. While
                supported browsers may launch the Settings activity directly, many mobile browsers
                enforce security sandboxes that restrict web pages from accessing system menus.
                Use the provided step-by-step navigation path to access the setting manually if needed.
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  // Theme 2 Flow
  const contexts = result.data.contexts;
  const isGated = !contexts || contexts.length === 0;

  if (isGated) {
    return (
      <div className="space-y-6">
        <section className="rounded-[calc(var(--radius)+8px)] border border-amber-500/40 bg-amber-500/10 p-6 shadow-[var(--shadow-elevated)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
              <ShieldAlert className="size-3.5" />
              Conservative Gating Active
            </span>
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Samsung PRISM Theme 2 Guardrail
            </span>
          </div>

          <h2 className="mt-4 text-xl font-semibold leading-snug sm:text-2xl text-foreground">
            No Automated Actions Available
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            In accordance with Theme 2 conservative safety guardrails, no automated deep links
            or on-device settings modifications were triggered for this query. The reported symptoms
            indicate a hardware fault, physical damage, or an ambiguous state where automated
            execution would be unsafe.
          </p>

          <div className="mt-6 rounded-[var(--radius)] border border-border/80 bg-card/60 p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Recommended Course of Action:</p>
            <p>
              Please visit an authorized customer service center or initiate an official hardware
              inspection to safely service the display.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {contexts.map((context, ctxIdx) => (
        <Theme2ContextCard key={`${context.title}-${ctxIdx}`} context={context} />
      ))}

      <div className="mt-4 flex items-start gap-2.5 rounded-[calc(var(--radius))] border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary/70" />
        <p className="leading-relaxed">
          <strong className="text-foreground/90">Samsung PRISM Theme 2:</strong> Actions and deep links
          are generated in accordance with official Schema specifications. Deep links may be launched
          directly on compatible Android host environments or verified manually.
        </p>
      </div>
    </div>
  );
}

// Raw SIIS category names that appear as metadata prefixes in article content
const SIIS_CATEGORY_NAMES =
  "Smartphone|Others Mobile|Tablet|Mobile Accessories|Notebook|Digital Photo Frame|" +
  "Audio Mini Component|Others TV|Projector|Mobile|QLED|HD\\/FHD\\/UHD\\/SUHD|OLED|" +
  "Lifestyle TVs|Wearable|Netbook";

/**
 * Strips the raw SIIS metadata prefix block from text.
 *
 * Handles three forms:
 *   1. Full parenthesized prefix at start:
 *      "( Smartphone,Others Mobile,Tablet,Mobile Accessories): text"
 *   2. Full metadata header (category list + article title + parenthesized categories + colon):
 *      "Smartphone,Others Mobile,Tablet,Mobile Accessories Blank or black display… ( Smartphone,…): text"
 *   3. Truncated metadata header (description cut at 120 chars — closing ")" missing):
 *      "Mobile Accessories,Smartphone,… Transfer Secure folder with Data Transfer ( Mobile Access…"
 */
function cleanSiisText(text?: string | null): string {
  if (!text) return "";
  let s = text.trim();

  // Case 1 & 2: Leading category metadata with an opening paren (closing paren may be truncated)
  // Match: optional leading category list + any article title text + opening paren + category names
  // The match stops at the first colon after the closing paren (if present), or at end of string
  s = s.replace(
    new RegExp(
      `^(?:[\\s,;]*(?:${SIIS_CATEGORY_NAMES})[\\s,;]*)*` +   // leading category list (optional)
      `[^(]*` +                                               // article title (any chars up to first open-paren)
      `\\(\\s*(?:${SIIS_CATEGORY_NAMES})` +                  // open-paren + first category
      `(?:\\s*[,;/]\\s*(?:${SIIS_CATEGORY_NAMES}))*` +       // additional categories in paren
      `(?:\\s*\\)\\s*:?\\s*|[^)]*$)`,                        // close-paren + colon, OR rest-of-string if truncated
      "i"
    ),
    ""
  ).trim();

  // Case 3 fallback: if text still starts with a raw leading category list (no paren found), strip it
  s = s.replace(
    new RegExp(
      `^(?:[\\s,;]*(?:${SIIS_CATEGORY_NAMES})[\\s,;]*)+`,
      "i"
    ),
    ""
  ).trim();

  // Remove any residual standalone parenthesized category block e.g. "( Smartphone,Others Mobile... ):"
  s = s.replace(
    new RegExp(
      `\\(\\s*(?:${SIIS_CATEGORY_NAMES})(?:\\s*[,;/]\\s*(?:${SIIS_CATEGORY_NAMES}))*\\s*\\)\\s*:?\\s*`,
      "gi"
    ),
    ""
  ).trim();

  // Remove leading Markdown header artifacts: ## or #
  s = s.replace(/^#+\s*/, "");
  s = s.replace(/:\s*#+\s*/, ": ");

  // Strip leading colon/dash/separator artifacts left over from prefix removal
  s = s.replace(/^[\s:\-\u2013\u2014|]+/, "").trim();

  return s;
}


/**
 * Extracts a clean, human-readable action title from SIIS content when actionName is generic.
 * Falls back safely to actionName if a clean title cannot be safely identified.
 */
function extractCleanActionTitle(
  actionName: string,
  description?: string,
  step0?: string
): string {
  const isGeneric = !actionName || actionName === "Troubleshooting Step" || actionName === "Action";

  if (!isGeneric) {
    return cleanSiisText(actionName) || actionName;
  }

  const candidates = [step0 || "", description || ""];

  // 1. Check for a markdown header in step0 or description e.g. "## Troubleshooting Steps for Device Not Turning On"
  for (const c of candidates) {
    const headerMatch =
      c.match(/#+\s*([^\n\r#]+?)$/) ||
      c.match(/:\s*#+\s*([^\n\r#]+?)(?=\s+[A-Z][a-z]+|\s*$)/);
    if (headerMatch && headerMatch[1]) {
      const cleaned = cleanSiisText(headerMatch[1]);
      if (cleaned.length > 3) return cleaned;
    }
  }

  // 2. Check for article title between leading category list and parenthesized category block
  for (const c of candidates) {
    const articleMatch = c.match(
      new RegExp(
        `^(?:[\\s,;]*(?:${SIIS_CATEGORY_NAMES})[\\s,;]*)+\\s*(.*?)\\s*\\(\\s*(?:(?:${SIIS_CATEGORY_NAMES})[\\s,;]*)+\\s*\\)\\s*:`,
        "i"
      )
    );
    if (articleMatch && articleMatch[1]) {
      const cleaned = cleanSiisText(articleMatch[1]);
      if (cleaned.length > 3) return cleaned;
    }
  }

  // Safe fallback
  return cleanSiisText(actionName) || actionName;
}

/**
 * Cleans the action description, removing redundant SIIS header blocks.
 * Shows the first human-readable intro sentence from the SIIS content.
 */
function cleanActionDescription(description: string, extractedTitle?: string): string {
  if (!description) return "";

  // Strip the full SIIS metadata prefix first, which may include the article title
  const stripped = cleanSiisText(description);

  // If after stripping the leading prefix the result starts with the extracted title
  // (e.g. "Troubleshooting Steps for Device Not Turning On I understand..."),
  // advance past it to show only the intro sentence
  if (extractedTitle && stripped.startsWith(extractedTitle)) {
    const remainder = stripped.slice(extractedTitle.length).trim();
    const cleanedRemainder = cleanSiisText(remainder);
    if (cleanedRemainder.length > 5) return cleanedRemainder;
  }

  return stripped;
}

function Theme2ContextCard({ context }: { context: Theme2Goal }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[calc(var(--radius)+8px)] border border-border bg-[image:var(--gradient-surface)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Samsung PRISM Theme 2
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Confidence: {Math.round((context.score ?? 1) * 100)}%
          </span>
        </div>

        <h2 className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">
          {cleanSiisText(context.title)}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{cleanSiisText(context.goal)}</p>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Troubleshooting Actions ({context.actions.length})
          </h3>
        </div>

        <div className="mt-4 space-y-4">
          {context.actions.map((action, actionIdx) => {
            const step0 = action.stepGroups[0]?.steps[0];
            const cleanTitle = extractCleanActionTitle(
              action.actionName,
              action.description,
              step0
            );
            const cleanDesc = cleanActionDescription(action.description, cleanTitle);

            return (
              <div
                key={`${action.actionName}-${actionIdx}`}
                className="rounded-[calc(var(--radius)+4px)] border border-border bg-card p-5 backdrop-blur-xl transition-colors hover:border-primary/45"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Workflow className="size-4 text-primary" />
                    <h4 className="text-[0.95rem] font-semibold text-foreground">
                      {cleanTitle}
                    </h4>
                  </div>
                  {action.category && (
                    <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      {action.category}
                    </span>
                  )}
                </div>

                {cleanDesc && (
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {cleanDesc}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  {action.stepGroups.map((group, groupIdx) => (
                    <Theme2StepGroupView key={groupIdx} group={group} index={groupIdx} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Theme2StepGroupView({
  group,
  index,
}: {
  group: Theme2Goal["actions"][number]["stepGroups"][number];
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write failure handled gracefully */
    }
  };

  return (
    <div className="rounded-[calc(var(--radius))] border border-border/70 bg-muted/20 p-4 space-y-3">
      <ul className="space-y-2">
        {group.steps.map((stepText, stepIdx) => (
          <li key={stepIdx} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[0.7rem] font-semibold text-primary">
              {stepIdx + 1}
            </span>
            <span className="leading-relaxed text-foreground/90">{cleanSiisText(stepText)}</span>
          </li>
        ))}
      </ul>

      {group.actionableDeeplink && (
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/50">
          <div className="space-y-0.5 max-w-md">
            <span className="text-xs font-medium text-foreground">
              {cleanSiisText(group.actionableDeeplink.description) || "Actionable Deeplink"}
            </span>
            <p className="font-mono text-[0.7rem] text-muted-foreground break-all">
              {group.actionableDeeplink.deeplink}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyLink(group.actionableDeeplink!.deeplink)}
              className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-1.5 text-[0.7rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Copy deeplink URI"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <a
              href={group.actionableDeeplink.deeplink}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/20 shrink-0"
            >
              <ExternalLink className="size-3.5" />
              Launch
            </a>
          </div>
        </div>
      )}

      {group.validationDeeplink && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-border/80 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Validation Deeplink:</span>
          <span className="font-mono text-[0.7rem]">
            {group.validationDeeplink.key}{" "}
            {group.validationDeeplink.condition ?? "=="}{" "}
            {group.validationDeeplink.value ?? ""}
          </span>
          <span className="font-mono text-[0.65rem] text-muted-foreground break-all">
            ({group.validationDeeplink.deeplink})
          </span>
        </div>
      )}
    </div>
  );
}


