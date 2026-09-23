import { AlertTriangle } from "lucide-react";

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-destructive/40 bg-destructive/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <p className="text-sm text-foreground">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-[var(--radius)] border border-border bg-secondary/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary sm:self-auto"
        >
          Try again
        </button>
      )}
    </div>
  );
}
