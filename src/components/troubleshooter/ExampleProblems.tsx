interface ExampleItem {
  label: string;
  query: string;
  tag?: string;
}

const EXAMPLES: ExampleItem[] = [
  { label: "WiFi keeps disconnecting", query: "My WiFi keeps disconnecting" },
  { label: "Hotspot isn't working", query: "My hotspot isn't working" },
  { label: "Bluetooth earbuds won't connect", query: "My Bluetooth earbuds won't connect" },
  { label: "Battery drains too quickly", query: "My battery drains too quickly" },
  {
    label: "Nexa X1 blank display",
    query:
      "My Nexa X1 screen turns completely blank or white and no text appears when I search for a stock price or use the Quick Assist app, and it happens with other apps too.",
    tag: "Theme 2",
  },
  {
    label: "Cracked display (Gating)",
    query:
      "My smartphone's screen is completely cracked, it's a total crack and I can't use the device.",
    tag: "Theme 2",
  },
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
      {EXAMPLES.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item.query)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/60 hover:text-foreground hover:shadow-[var(--shadow-glow)] disabled:opacity-50 sm:text-sm"
        >
          {item.tag && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary">
              {item.tag}
            </span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

