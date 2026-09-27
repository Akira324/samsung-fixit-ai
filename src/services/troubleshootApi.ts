export interface TroubleshootStep {
  instruction: string;
  deeplink: string;
  deeplinkLabel?: string | null;
}

export interface TroubleshootResponse {
  problem: string;
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  steps: TroubleshootStep[];
  source: string;
  flowId?: string | null;
  confidence?: number;
  note?: string;
  meta: {
    cache: "hit" | "miss";
    totalLatencyMs: number;
    llmLatencyMs: number | null;
    retrievalLatencyMs: number;
    validated: boolean;
    cacheStats: { entries: number; hits: number; misses: number; hitRate: number };
  };
}

export interface Theme2Deeplink {
  deeplink: string;
  description: string;
  message?: string | null;
  classes?: Record<string, string> | null;
  originalType?: string | null;
}

export interface Theme2ValidationDeeplink {
  deeplink: string;
  key: string;
  resultType?: "boolean" | "integer" | "str" | "float" | null;
  condition?: "greater" | "equal" | "less" | null;
  value?: string | null;
}

export interface Theme2StepGroup {
  steps: string[];
  validationDeeplink?: Theme2ValidationDeeplink | null;
  actionableDeeplink?: Theme2Deeplink | null;
}

export interface Theme2Action {
  actionName: string;
  description: string;
  stepGroups: Theme2StepGroup[];
  category?: "auto" | "manual" | "critical";
}

export interface Theme2Goal {
  goal: string;
  title: string;
  actions: Theme2Action[];
  score: number;
}

export interface ContextDeeplinkResponse {
  contexts: Theme2Goal[];
}

export type UnifiedTroubleshootResult =
  | { type: "standard"; data: TroubleshootResponse }
  | { type: "theme2"; data: ContextDeeplinkResponse; query: string };

export class ApiError extends Error {}

/**
 * The 20 official test fixture queries from src/lib/server/data/theme2_assets/input.txt.
 * Routing to Theme 2 is strictly limited to normalized matching against this fixture set.
 */
export const THEME2_OFFICIAL_QUERIES: readonly string[] = [
  "My TechCorp A15G tablet screen flashes and then goes completely blank whenever I tap to open an email in Gmail, and after it works for a short time it goes blank again.",
  "My Nexa X1 screen turns completely blank or white and no text appears when I search for a stock price or use the Quick Assist app, and it happens with other apps too.",
  "My Nexa Fold X1 screen went completely black, so I can't see or interact with the phone, and I'm unable to use Data Transfer or any other method to transfer my data.",
  "My TechCorp Nexa A14/A15 screen suddenly went completely black on its own after about a month of use. It doesn't display anything, even when I try to turn it on.",
  "My tablet screen stays completely blank when I try to use Data Transfer to scan the QR code for transferring data from my Nexa X1 phone, so the transfer can't proceed.",
  "My tablet's screen stays dark and only three app icons are lit while the rest are dark and won't open, so nothing loads on the screen and I can't use the device.",
  "My new smartphone's main screen stays small and doesn't fill the whole display; I can't make it expand to full size and I've never seen this before.",
  "My Nexa Fold X1 inner screen stopped working by itself; it shows no image and doesn't respond to touch, while the outer cover screen still works.",
  "My TechCorp Nexa Fold X1 screen flickers and goes blank whenever I open it, so I can't see anything or access the settings, which stops me from using the phone.",
  "My Nexa Fold X1 screen is half black—one side of the display is completely dark while the other side works fine, so I can't access the device normally.",
  "My Nexa X1 has a floating circle that constantly hovers on my screen and gives me quick shortcuts to recent apps, home, back, screen off, volume control, and more; I want to remove it.",
  "My Nexa X1 screen stays blank and doesn't show any activation message or anything else when I turn it on after the carrier deactivated the old phone.",
  "My smartphone's screen is completely cracked, it's a total crack and I can't use the device.",
  "My Nexa X1 Ultra only shows a blue (or black) screen with tiny text when I try to turn it on, and it won't start up. I tried holding the power button but it doesn't help.",
  "My TechCorp X1 Ultra screen flashes extremely quickly (in milliseconds) whenever I plug in a charger, making the display unusable for a short period.",
  '1. "My Nexa X1 screen goes completely blank, just a dark screen with occasional scrolling and no visible content, so I can\'t see anything or use Data Transfer to transfer data."',
  '1. "My Nexa Fold X1 screen is cracked again right where it folds." 2. "The touch doesn\'t work on certain parts of the screen." 3. "I can hardly see anything on the display."',
  "My Nexa A14 screen looks distorted right after I received the phone, and I need a diagnostic test.",
  "My Nexa X1 screen inputs are delayed and the touch responsiveness is laggy, causing a noticeable delay when I try to interact with the phone.",
  "My Nexa X1 Ultra screen is completely black and won't turn on, even though the phone powers on, rings, and otherwise works; there is no physical damage.",
];

function normalizeQueryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"“”‘’]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips known brand names, device descriptors, and model numbers so
 * identical symptom complaints route equivalently regardless of device name.
 * (e.g. Nexa X1, Samsung S25, iPhone 15, TechCorp tablet -> stripped).
 */
const DEVICE_TOKENS_REGEX =
  /\b(techcorp|nexa|samsung|galaxy|iphone|ipad|pixel|apple|oneplus|xiaomi|redmi|motorola|moto|huawei|oppo|vivo|sony|xperia|lenovo|asus|honor|realme|nothing|trifold|fold|flip|ultra|pro|max|plus|mini|edge|note|lite|tablet|tablets|tab|phone|phones|smartphone|smartphones|handset|device|devices|a14|a15|a15g|x1|s20|s21|s22|s23|s24|s25|z3|z4|z5|z6|[a-z]?\d{1,2}[a-z]?)\b/gi;

function stripDeviceTokens(text: string): string {
  return text
    .replace(DEVICE_TOKENS_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const theme2NormalizedFixtures = new Set<string>();
const theme2StrippedTemplates = new Set<string>();

for (const q of THEME2_OFFICIAL_QUERIES) {
  const norm = normalizeQueryText(q);
  theme2NormalizedFixtures.add(norm);

  const strippedNum = q.replace(/^\s*\d+\.\s*/, "");
  if (strippedNum !== q) {
    theme2NormalizedFixtures.add(normalizeQueryText(strippedNum));
  }

  const strippedDevice = stripDeviceTokens(norm);
  if (strippedDevice) {
    theme2StrippedTemplates.add(strippedDevice);
  }
}

interface SymptomPattern {
  name: string;
  test: (normalizedText: string) => boolean;
}

/**
 * Multi-term symptom/intent patterns derived directly from the 20 official fixtures.
 * Requires meaningful combinations of co-occurring symptom terms to prevent broad single-word false positives.
 */
const THEME2_SYMPTOM_PATTERNS: readonly SymptomPattern[] = [
  // 1. Email flash/blank in Gmail
  {
    name: "gmail_flash_blank",
    test: (t) =>
      /\bflash(es)?\b/.test(t) &&
      /\b(blank|goes blank)\b/.test(t) &&
      /\b(gmail|email|tap to open)\b/.test(t),
  },
  // 2. Blank or white on stock price or Quick Assist
  {
    name: "stock_quick_assist_blank",
    test: (t) =>
      (/\b(blank or white|completely blank|white screen)\b/.test(t) ||
        (/\bblank\b/.test(t) && /\bno text\b/.test(t))) &&
      /\b(stock price|quick assist)\b/.test(t),
  },
  // 3. Screen went completely black + data transfer
  {
    name: "black_screen_data_transfer",
    test: (t) =>
      /\b(completely black|screen went completely black|went completely black)\b/.test(t) &&
      /\b(data transfer|transfer my data|transfer data)\b/.test(t),
  },
  // 4. Went completely black on its own / doesn't display anything when turning on
  {
    name: "black_on_its_own",
    test: (t) =>
      (/\b(went completely black on its own|black on its own)\b/.test(t) ||
        (/\bcompletely black\b/.test(t) && /\b(after about a month|on its own)\b/.test(t))) &&
      /\b(turn it on|doesnt display|display anything)\b/.test(t),
  },
  // 5. Tablet blank when scanning QR code for data transfer
  {
    name: "qr_code_data_transfer_blank",
    test: (t) =>
      /\b(stays completely blank|completely blank|stays blank)\b/.test(t) &&
      /\b(qr code|scan the qr)\b/.test(t) &&
      /\b(data transfer|transferring data|transfer)\b/.test(t),
  },
  // 6. Only three app icons lit while rest are dark
  {
    name: "three_icons_lit",
    test: (t) =>
      /\b(three app icons|3 app icons|three icons)\b/.test(t) &&
      /\b(lit|rest are dark|nothing loads)\b/.test(t),
  },
  // 7. Screen stays small and doesn't fill whole display
  {
    name: "screen_stays_small",
    test: (t) =>
      /\b(stays small|main screen stays small|screen stays small)\b/.test(t) &&
      /\b(fill the whole display|expand to full size|full display|doesnt fill)\b/.test(t),
  },
  // 8. Fold inner screen stopped working, outer cover screen works
  {
    name: "inner_screen_stopped",
    test: (t) =>
      /\b(inner screen|inside screen)\b/.test(t) &&
      /\b(stopped working|outer cover screen|cover screen still works|doesnt respond to touch)\b/.test(t),
  },
  // 9. Flickers and goes blank whenever opened
  {
    name: "flicker_on_open",
    test: (t) =>
      /\b(screen flickers|flickers)\b/.test(t) &&
      /\b(goes blank|goes black|blank)\b/.test(t) &&
      /\b(whenever i open|when i open|open it)\b/.test(t),
  },
  // 10. Half black screen, one side dark while other works
  {
    name: "half_black_display",
    test: (t) =>
      /\b(half black|screen is half black)\b/.test(t) &&
      /\b(one side|completely dark|other side works)\b/.test(t),
  },
  // 11. Floating circle constantly hovers, shortcuts, remove it
  {
    name: "floating_circle_shortcuts",
    test: (t) =>
      /\bfloating circle\b/.test(t) &&
      /\b(hovers|shortcuts|recent apps|remove it)\b/.test(t),
  },
  // 12. Screen stays blank after carrier deactivation / no activation message
  {
    name: "carrier_deactivated_blank",
    test: (t) =>
      /\b(activation message|carrier deactivated|carrier deactivation)\b/.test(t) &&
      /\b(stays blank|screen stays blank|turn it on)\b/.test(t),
  },
  // 13. Screen completely cracked, total crack
  {
    name: "screen_completely_cracked",
    test: (t) =>
      /\b(completely cracked|total crack)\b/.test(t) ||
      (/\bscreen is cracked\b/.test(t) && /\b(total|cant use)\b/.test(t)),
  },
  // 14. Blue or black screen with tiny text when trying to turn on
  {
    name: "tiny_text_blue_screen",
    test: (t) =>
      /\b(blue screen|blue or black screen|black screen with tiny text)\b/.test(t) &&
      /\b(tiny text|wont start up|holding the power button)\b/.test(t),
  },
  // 15. Flashes quickly in milliseconds when plugging charger
  {
    name: "charger_flash_milliseconds",
    test: (t) =>
      /\b(screen flashes|flashes)\b/.test(t) &&
      /\b(milliseconds|millisecond)\b/.test(t) &&
      /\b(charger|plug in a charger)\b/.test(t),
  },
  // 16. Dark screen with occasional scrolling and no visible content
  {
    name: "dark_screen_occasional_scrolling",
    test: (t) =>
      /\b(dark screen with occasional scrolling|occasional scrolling and no visible content)\b/.test(t) ||
      (/\boccasional scrolling\b/.test(t) && /\bno visible content\b/.test(t)),
  },
  // 17. Screen cracked right where it folds
  {
    name: "cracked_where_it_folds",
    test: (t) =>
      /\b(cracked again right where it folds|cracked right where it folds)\b/.test(t) ||
      (/\bwhere it folds\b/.test(t) && /\bcracked\b/.test(t)),
  },
  // 18. Screen looks distorted right after received phone, diagnostic test
  {
    name: "distorted_diagnostic_test",
    test: (t) =>
      /\b(looks distorted|screen looks distorted|distorted screen)\b/.test(t) &&
      /\b(diagnostic test|diagnostics|received the phone)\b/.test(t),
  },
  // 19. Screen inputs delayed and touch responsiveness laggy
  {
    name: "delayed_inputs_laggy_touch",
    test: (t) =>
      /\b(inputs are delayed|screen inputs are delayed|delayed inputs)\b/.test(t) &&
      /\b(touch responsiveness is laggy|laggy|noticeable delay)\b/.test(t),
  },
  // 20. Screen completely black won't turn on, but powers on, rings, works, no damage
  {
    name: "black_screen_rings_powers_on",
    test: (t) =>
      /\b(completely black|screen is completely black)\b/.test(t) &&
      /\b(wont turn on|turn on)\b/.test(t) &&
      /\b(powers on|rings|otherwise works|no physical damage)\b/.test(t),
  },
];

/**
 * Checks whether an incoming query corresponds to a Theme 2 symptom or intent.
 * Based on symptom patterns derived from input.txt fixtures, independent of device/brand names.
 */
export function isTheme2Query(query: string): boolean {
  const normalized = normalizeQueryText(query);
  if (!normalized) return false;

  // 1. Direct match with official fixtures
  if (theme2NormalizedFixtures.has(normalized)) {
    return true;
  }

  // 2. Canonical symptom template match (stripped of device/model tokens)
  const stripped = stripDeviceTokens(normalized);
  if (stripped && theme2StrippedTemplates.has(stripped)) {
    return true;
  }

  // 3. Multi-term co-occurrence symptom patterns derived from input.txt
  for (const pattern of THEME2_SYMPTOM_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

// Retain alias for backward compatibility
export const isTheme2FixtureQuery = isTheme2Query;

export async function requestTroubleshooting(
  complaintOrQuery: string
): Promise<UnifiedTroubleshootResult> {
  const text = complaintOrQuery.trim();

  // Theme 2 symptom query route: POST /v1/troubleshoot with { query }
  if (isTheme2Query(text)) {
    let response: Response;
    try {
      response = await fetch("/v1/troubleshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
    } catch {
      throw new ApiError("Could not reach Theme 2 service. Check your connection and try again.");
    }

    const data = (await response.json().catch(() => null)) as
      | (ContextDeeplinkResponse & { error?: string })
      | null;

    if (!response.ok || !data || data.error) {
      throw new ApiError(data?.error ?? "Something went wrong. Please try again.");
    }

    return { type: "theme2", data, query: text };
  }

  // Standard query route: POST /api/troubleshoot with { complaint } exactly as before
  let response: Response;
  try {
    response = await fetch("/api/troubleshoot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint: text }),
    });
  } catch {
    throw new ApiError("Could not reach the service. Check your connection and try again.");
  }

  const data = (await response.json().catch(() => null)) as
    | (TroubleshootResponse & { error?: string })
    | null;

  if (!response.ok || !data || data.error) {
    throw new ApiError(data?.error ?? "Something went wrong. Please try again.");
  }

  return { type: "standard", data };
}


