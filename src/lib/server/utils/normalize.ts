/**
 * Query normalization used for cache keys and lexical retrieval.
 * Designed so a semantic (embedding) layer can be added alongside it later.
 */

/**
 * Hyphenated or multi-word technical terms that must survive normalization.
 * Applied before punctuation is stripped so the hyphen doesn't break them.
 */
const COMPOUND_TERMS: [RegExp, string][] = [
  [/\bwi[\s-]?fi\b/gi, "wifi"],
  [/\be[\s-]?sim\b/gi, "esim"],
  [/\bvo[\s-]?lte\b/gi, "volte"],
  [/\bhotspot\b/gi, "hotspot"],
];

const SYNONYMS: Record<string, string> = {
  "wi-fi": "wifi",
  wlan: "wifi",
  wireless: "wifi",
  net: "internet",
  cell: "mobile",
  cellular: "mobile",
  data: "data",
  bt: "bluetooth",
  earphones: "earbuds",
  headphone: "earbuds",
  headphones: "earbuds",
  buds: "earbuds",
  batery: "battery",
  charging: "charge",
  charger: "charge",
  disconnecting: "disconnect",
  disconnects: "disconnect",
  disconnected: "disconnect",
  dropping: "disconnect",
  drops: "disconnect",
  draining: "drain",
  drains: "drain",
  slowly: "slow",
  quickly: "fast",
  photos: "photo",
  pictures: "photo",
  notifications: "notification",
  apps: "app",
  crashes: "crash",
  crashing: "crash",
  freezes: "freeze",
  freezing: "freeze",
  // additional verb-form synonyms
  switching: "switch",
  switches: "switch",
  switched: "switch",
  randomly: "random",
  rebooting: "restart",
  reboots: "restart",
  restarting: "restart",
  restarts: "restart",
  overheats: "overheat",
  overheating: "overheat",
  pairing: "pair",
  paired: "pair",
  connecting: "connect",
  connected: "connect",
  syncing: "sync",
  syncs: "sync",
  updating: "update",
  updates: "update",
};

const STOPWORDS = new Set([
  "a", "an", "the", "my", "is", "it", "its", "of", "to", "for", "on", "in", "and",
  "i", "me", "am", "are", "was", "were", "be", "been", "this", "that", "keeps",
  "keep", "every", "few", "very", "really", "too", "with", "when", "phone",
  "device", "samsung", "galaxy", "please", "help", "having", "issue", "issues",
  "problem", "problems", "cant", "cannot", "wont", "doesnt", "dont", "not",
]);

/**
 * Important: technical tokens that must NEVER be treated as stopwords.
 * Verified against STOPWORDS at module load to catch accidental additions.
 */
const PROTECTED_TOKENS = new Set([
  "5g", "4g", "3g", "lte", "volte", "esim", "sim", "nfc", "gps", "usb",
  "wifi", "bluetooth", "hotspot", "vpn", "apn", "adb", "oled", "lcd",
]);

// Sanity check: none of the protected tokens should be in stopwords
for (const token of PROTECTED_TOKENS) {
  if (STOPWORDS.has(token)) {
    throw new Error(`BUG: protected technical token "${token}" is in STOPWORDS`);
  }
}

export function normalizeComplaint(input: string): string {
  let text = input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  // Preserve compound technical terms before punctuation stripping
  for (const [pattern, replacement] of COMPOUND_TERMS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => SYNONYMS[token] ?? token)
    .join(" ")
    .trim();
}

/** Content tokens used for keyword scoring (stopwords removed). */
export function tokenize(input: string): string[] {
  return normalizeComplaint(input)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** Stable cache key: normalized, stopword-free, alphabetically ordered. */
export function cacheKey(input: string): string {
  const tokens = tokenize(input);
  const base = tokens.length > 0 ? tokens : normalizeComplaint(input).split(" ");
  return Array.from(new Set(base)).sort().join("|");
}
