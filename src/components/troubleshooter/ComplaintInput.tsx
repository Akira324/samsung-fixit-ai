import { ArrowRight, Loader2, Search } from "lucide-react";

export function ComplaintInput({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="group relative rounded-[calc(var(--radius)+8px)] border border-border bg-[image:var(--gradient-surface)] p-2 shadow-[var(--shadow-elevated)] backdrop-blur-xl transition-colors focus-within:border-primary/60"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 px-4 py-3">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Describe your device problem..."
            aria-label="Describe your device problem"
            autoComplete="off"
            className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-lg"
          />
        </div>
        <button
          type="submit"
          disabled={loading || value.trim().length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[image:var(--gradient-hero)] px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          Troubleshoot
        </button>
      </div>
    </form>
  );
}
