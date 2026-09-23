import { Gauge, Layers, Zap } from "lucide-react";
import type { TroubleshootResponse } from "@/services/troubleshootApi";

const SEVERITY_STYLES: Record<string, string> = {
  Low: "border-accent/40 text-accent",
  Medium: "border-primary/50 text-primary",
  High: "border-[oklch(0.75_0.15_75)]/50 text-[oklch(0.8_0.15_75)]",
  Critical: "border-destructive/50 text-destructive",
};

export function ResultSummary({ result }: { result: TroubleshootResponse }) {
  const cacheHit = result.meta.cache === "hit";
  return (
    <section className="rounded-[calc(var(--radius)+8px)] border border-border bg-[image:var(--gradient-surface)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-xl sm:p-8">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        Problem
      </p>
      <h2 className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">{result.problem}</h2>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium">
          <Layers className="size-3.5 text-muted-foreground" />
          {result.category}
        </span>
        <span
          className={`inline-flex items-center gap-2 rounded-full border bg-secondary/30 px-3 py-1.5 text-xs font-semibold ${
            SEVERITY_STYLES[result.severity] ?? SEVERITY_STYLES["Medium"]
          }`}
        >
          <Gauge className="size-3.5" />
          {result.severity} severity
        </span>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
            cacheHit ? "border-accent/50 text-accent" : "border-border text-muted-foreground"
          }`}
        >
          <Zap className="size-3.5" />
          {cacheHit ? "Cache hit" : "Cache miss"} · {result.meta.totalLatencyMs} ms
        </span>
      </div>

      {result.note && (
        <p className="mt-5 rounded-[var(--radius)] border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          {result.note}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:grid-cols-4">
        <div>
          <dt className="uppercase tracking-[0.16em]">Total</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">{result.meta.totalLatencyMs} ms</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.16em]">AI stage</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {result.meta.llmLatencyMs === null ? "bypassed" : `${result.meta.llmLatencyMs} ms`}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.16em]">Retrieval</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">{result.meta.retrievalLatencyMs} ms</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.16em]">Source</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">{result.source}</dd>
        </div>
      </dl>
    </section>
  );
}
