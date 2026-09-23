import { ExternalLink, Info } from "lucide-react";
import type { TroubleshootStep } from "@/services/troubleshootApi";

export function TroubleshootingStep({ step, index }: { step: TroubleshootStep; index: number }) {
  const resolved = step.deeplink !== "unresolved";
  const intentUrl = resolved ? `intent:#Intent;action=${step.deeplink};end` : null;

  return (
    <li
      className="group flex flex-col gap-4 rounded-[calc(var(--radius)+4px)] border border-border bg-card p-5 backdrop-blur-xl transition-colors hover:border-primary/45 sm:flex-row sm:items-center sm:justify-between"
      style={{ animation: `fade-rise 0.45s ease-out ${index * 0.06}s both` }}
    >
      <div className="flex items-start gap-4">
        <span className="font-mono text-sm font-semibold text-primary/80 tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <p className="text-[0.95rem] font-medium leading-snug">{step.instruction}</p>
          {resolved ? (
            <p className="mt-1 font-mono text-[0.7rem] text-muted-foreground">{step.deeplink}</p>
          ) : (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
              <Info className="size-3" />
              Manual step — no verified Settings shortcut
            </p>
          )}
        </div>
      </div>

      {intentUrl && (
        <a
          href={intentUrl}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius)] border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/20"
        >
          <ExternalLink className="size-3.5" />
          {step.deeplinkLabel ?? "Open Settings"}
        </a>
      )}
    </li>
  );
}
