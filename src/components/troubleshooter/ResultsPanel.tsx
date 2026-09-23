import type { TroubleshootResponse } from "@/services/troubleshootApi";
import { ResultSummary } from "./ResultSummary";
import { TroubleshootingStep } from "./TroubleshootingStep";

export function ResultsPanel({ result }: { result: TroubleshootResponse }) {
  return (
    <div className="space-y-6">
      <ResultSummary result={result} />
      <section>
        <h3 className="px-1 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Recommended Steps
        </h3>
        <ol className="mt-4 space-y-3">
          {result.steps.map((step, index) => (
            <TroubleshootingStep key={`${step.instruction}-${index}`} step={step} index={index} />
          ))}
        </ol>
      </section>
    </div>
  );
}
