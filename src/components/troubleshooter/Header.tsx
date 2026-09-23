import { ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-10">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-[image:var(--gradient-hero)] shadow-[var(--shadow-glow)]">
          <ShieldCheck className="size-5 text-primary-foreground" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Samsung
          </p>
          <p className="text-sm font-semibold">AI Troubleshooter</p>
        </div>
      </div>
      <span className="hidden rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline">
        PRISM GenAI 2026–27 · Theme 2
      </span>
    </header>
  );
}
