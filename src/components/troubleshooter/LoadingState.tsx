const STAGES = [
  "Checking fast-path cache",
  "Enriching your query",
  "Searching the knowledge base",
  "Validating troubleshooting steps",
];

export function LoadingState() {
  return (
    <section className="rounded-[calc(var(--radius)+8px)] border border-border bg-[image:var(--gradient-surface)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-xl sm:p-8">
      <div className="flex items-center gap-3">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
          <span className="relative inline-flex size-3 rounded-full bg-primary" />
        </span>
        <p className="text-base font-semibold">Analyzing your problem...</p>
      </div>
      <ul className="mt-6 space-y-3">
        {STAGES.map((stage, index) => (
          <li
            key={stage}
            className="flex items-center gap-3 text-sm text-muted-foreground"
            style={{ animation: `fade-rise 0.5s ease-out ${index * 0.12}s both` }}
          >
            <span className="h-px w-8 bg-border" />
            {stage}
          </li>
        ))}
      </ul>
      <div className="mt-6 h-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 rounded-full bg-[image:var(--gradient-hero)] [animation:slide-track_1.4s_ease-in-out_infinite]" />
      </div>
    </section>
  );
}
