import { Info } from "lucide-react";
import type { TroubleshootResponse } from "@/services/troubleshootApi";
import { ResultSummary } from "./ResultSummary";
import { TroubleshootingStep } from "./TroubleshootingStep";

export function ResultsPanel({ result }: { result: TroubleshootResponse }) {
  const hasDeeplinks = result.steps.some((s) => s.deeplink && s.deeplink !== "unresolved");

  return (
    <div className="space-y-6">
      <ResultSummary result={result} />

      <section>
        <div className="flex items-center justify-between">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Recommended Steps
          </h3>
        </div>

        <ol className="mt-4 space-y-3">
          {result.steps.map((step, index) => (
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
