/**
 * Knowledge base retrieval (stage: KNOWLEDGE BASE / RETRIEVAL).
 *
 * Data-driven: new flows are added to data/knowledge_base.json only.
 * Scoring is lexical with IDF-like token weighting and bigram matching.
 * An embedding/vector layer can replace scoreFlow() without changing any caller.
 */
import knowledgeBase from "../data/knowledge_base.json";
import { tokenize } from "../utils/normalize";
import type { KnowledgeCategory, KnowledgeFlow } from "../types";

const CATEGORIES = knowledgeBase.categories as unknown as KnowledgeCategory[];

export interface RetrievalMatch {
  category: string;
  flow: KnowledgeFlow;
  score: number;
}

// ---------------------------------------------------------------------------
// Pre-computed IDF (inverse document frequency) weights.
//
// tokenDocFreq[token] = number of flows whose (keywords + problem + category)
// contain that token.  Rarer tokens are more discriminating.
// ---------------------------------------------------------------------------
const tokenDocFreq = new Map<string, number>();
const totalFlows = CATEGORIES.reduce((sum, c) => sum + c.flows.length, 0);

for (const cat of CATEGORIES) {
  for (const flow of cat.flows) {
    const haystack = [
      ...flow.keywords.map((k) => k.toLowerCase()),
      flow.problem.toLowerCase(),
      cat.category.toLowerCase(),
    ].join(" ");
    const tokens = new Set(tokenize(haystack));
    for (const t of tokens) {
      tokenDocFreq.set(t, (tokenDocFreq.get(t) ?? 0) + 1);
    }
  }
}

/** IDF weight: log(N / df).  Rare tokens get higher weight. */
function idf(token: string): number {
  const df = tokenDocFreq.get(token) ?? 0;
  if (df === 0) return 1; // unseen token — neutral weight
  return Math.log((totalFlows + 1) / (df + 1)) + 1; // smoothed, minimum 1
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreFlow(tokens: string[], flow: KnowledgeFlow, category: string): number {
  if (tokens.length === 0) return 0;

  const haystack = [
    ...flow.keywords.map((k) => k.toLowerCase()),
    flow.problem.toLowerCase(),
    category.toLowerCase(),
  ].join(" ");
  const haystackTokens = new Set(tokenize(haystack));

  let score = 0;

  // Token-level matching with IDF weight
  for (const token of tokens) {
    const weight = idf(token);
    if (haystackTokens.has(token)) {
      score += weight;
    } else if (haystack.includes(token)) {
      score += weight * 0.5;
    }
  }

  // Multi-word keyword phrase matching (stronger signal)
  const joined = tokens.join(" ");
  for (const keyword of flow.keywords) {
    const k = tokenize(keyword).join(" ");
    if (k.includes(" ") && joined.includes(k)) score += 2.0;
  }

  // Bigram matching: consecutive token pairs in the query that appear in haystack
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    if (haystack.includes(bigram)) score += 1.0;
  }

  return score / Math.sqrt(tokens.length);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve top matching flows, optionally boosting a specific category.
 */
export function retrieveFlows(
  query: string,
  limit = 3,
  categoryBoost?: string,
): RetrievalMatch[] {
  const tokens = tokenize(query);
  const matches: RetrievalMatch[] = [];
  for (const category of CATEGORIES) {
    const boost = categoryBoost && category.category.toLowerCase() === categoryBoost.toLowerCase()
      ? 1.5
      : 0;
    for (const flow of category.flows) {
      const score = scoreFlow(tokens, flow, category.category) + boost;
      if (score > 0) matches.push({ category: category.category, flow, score });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function bestFlow(query: string, minScore = 1, categoryBoost?: string): RetrievalMatch | null {
  const [top] = retrieveFlows(query, 1, categoryBoost);
  return top && top.score >= minScore ? top : null;
}

export function getFlowById(id: string): RetrievalMatch | null {
  for (const category of CATEGORIES) {
    const flow = category.flows.find((f) => f.id === id);
    if (flow) return { category: category.category, flow, score: 1 };
  }
  return null;
}

export function listCategories(): string[] {
  return CATEGORIES.map((c) => c.category);
}

export function knowledgeBaseSize(): number {
  return CATEGORIES.reduce((sum, c) => sum + c.flows.length, 0);
}
