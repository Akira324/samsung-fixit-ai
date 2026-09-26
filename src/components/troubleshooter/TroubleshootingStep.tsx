import { useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Info } from "lucide-react";
import type { TroubleshootStep } from "@/services/troubleshootApi";
import { getSettingsNavPath, isApprovedSettingsDeeplink } from "./settingsPaths";

export function TroubleshootingStep({ step, index }: { step: TroubleshootStep; index: number }) {
  const isApproved = isApprovedSettingsDeeplink(step.deeplink);
  const navPath = getSettingsNavPath(step.deeplink);
  const [copied, setCopied] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Standard Android Intent URI: only generated for approved, verified actions
  const intentUrl = isApproved
    ? `intent:#Intent;action=${step.deeplink};category=android.intent.category.DEFAULT;end`
    : null;

  const handleCopyPath = async () => {
    if (!navPath) return;
    try {
      await navigator.clipboard.writeText(navPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write failure handled gracefully */
    }
  };

  const handleLaunchClick = () => {
    setAttempted(true);
  };

  return (
    <li
      className="group flex flex-col gap-4 rounded-[calc(var(--radius)+4px)] border border-border bg-card p-5 backdrop-blur-xl transition-colors hover:border-primary/45"
      style={{ animation: `fade-rise 0.45s ease-out ${index * 0.06}s both` }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="font-mono text-sm font-semibold text-primary/80 tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="space-y-1.5">
            <p className="text-[0.95rem] font-medium leading-snug">{step.instruction}</p>

            {isApproved ? (
              <div className="space-y-2 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.7rem] text-muted-foreground">
                    Action: {step.deeplink}
                  </span>
                </div>

                {navPath && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/85">Navigation path:</span>
                    <span className="rounded bg-muted/80 px-2 py-0.5 font-mono text-[0.75rem] text-foreground">
                      {navPath}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyPath()}
                      className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[0.7rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Copy navigation path"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy path</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                <Info className="size-3" />
                Manual step — no verified Settings shortcut
              </p>
            )}
          </div>
        </div>

        {/* Intent launch button: only rendered for approved deeplinks */}
        {intentUrl && (
          <div className="shrink-0 self-start sm:self-center">
            <a
              href={intentUrl}
              onClick={handleLaunchClick}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/20"
            >
              <ExternalLink className="size-3.5" />
              {step.deeplinkLabel ?? "Open Settings"}
            </a>
          </div>
        )}
      </div>

      {/* Fallback feedback banner when launch is attempted */}
      {attempted && navPath && (
        <div className="mt-1 flex items-start gap-2.5 rounded-[calc(var(--radius))] border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="font-medium text-amber-300">
              Shortcut launch attempted
            </p>
            <p className="text-[0.75rem] text-muted-foreground">
              If your Android browser sandbox blocks direct Settings access, please open your phone&apos;s Settings and follow:
            </p>
            <p className="font-mono font-semibold text-foreground">
              {navPath}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}
