const EXAMPLES = [
  "My WiFi keeps disconnecting",
  "My hotspot isn't working",
  "My Bluetooth earbuds won't connect",
  "My battery drains too quickly",
];

export function ExampleProblems({
  onSelect,
  disabled,
}: {
  onSelect: (example: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {EXAMPLES.map((example) => (
        <button
          key={example}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(example)}
          className="rounded-full border border-border bg-secondary/40 px-4 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/60 hover:text-foreground hover:shadow-[var(--shadow-glow)] disabled:opacity-50 sm:text-sm"
        >
          {example}
        </button>
      ))}
    </div>
  );
}
