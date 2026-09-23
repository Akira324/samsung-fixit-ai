export type Severity = "Low" | "Medium" | "High" | "Critical";

export interface TroubleshootStep {
  instruction: string;
  deeplink: string; // approved intent action, or "unresolved"
  deeplinkLabel?: string | null | undefined;
}

export interface TroubleshootResult {
  problem: string;
  category: string;
  severity: Severity;
  steps: TroubleshootStep[];
  source: "cache" | "knowledge_base" | "llm" | "llm+knowledge_base" | "fallback";
  flowId?: string | null | undefined;
  confidence?: number | undefined;
  note?: string | undefined;
}

export interface TroubleshootResponse extends TroubleshootResult {
  meta: {
    cache: "hit" | "miss";
    totalLatencyMs: number;
    llmLatencyMs: number | null;
    retrievalLatencyMs: number;
    validated: boolean;
    cacheStats: { entries: number; hits: number; misses: number; hitRate: number };
  };
}

export interface EnrichedQuery {
  problem: string;
  category: string;
  severity: Severity;
  keywords: string[];
}

export interface KnowledgeFlow {
  id: string;
  problem: string;
  severity: Severity;
  keywords: string[];
  validated: boolean;
  steps: { instruction: string; deeplink: string }[];
}

export interface KnowledgeCategory {
  category: string;
  flows: KnowledgeFlow[];
}
