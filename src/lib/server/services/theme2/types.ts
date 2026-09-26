/**
 * TypeScript types directly reflecting schema.py for Samsung PRISM Theme 2.
 */

export type Condition = "greater" | "equal" | "less";

export type ResultTypes = "boolean" | "integer" | "str" | "float";

export type ActionCategory = "auto" | "manual" | "critical";

export interface BaseDeeplink {
  deeplink: string;
}

export interface Deeplink extends BaseDeeplink {
  description: string;
  message?: string | null | undefined;
  classes?: Record<string, string> | null | undefined;
  originalType?: string | null | undefined;
}

export interface ValidationDeepLink extends BaseDeeplink {
  key: string;
  resultType?: ResultTypes | null | undefined;
  condition?: Condition | null | undefined;
  value?: string | null | undefined;
}

export interface StepGroup {
  steps: string[];
  validationDeeplink?: ValidationDeepLink | null | undefined;
  actionableDeeplink?: Deeplink | null | undefined;
}

export interface Action {
  actionName: string;
  description: string;
  stepGroups: StepGroup[];
  category?: ActionCategory | undefined;
}

export interface Goal {
  goal: string;
  title: string;
  actions: Action[];
  score: number;
}

export interface ContextDeeplinkResponse {
  contexts: Goal[];
}

/**
 * Catalog entry as stored in deeplinks.json
 */
export interface CatalogValidation {
  deeplink: string;
  key: string;
  resultType?: string | null | undefined;
  condition?: string | null | undefined;
  value?: string | null | undefined;
}

export interface CatalogEntry {
  id: string;
  deeplink: string;
  description: string;
  message?: string | null | undefined;
  originalType?: string | null | undefined;
  control_type?: string | null | undefined;
  qna_description?: string | null | undefined;
  classes?: Record<string, string> | null | undefined;
  validation?: CatalogValidation | null | undefined;
}

/**
 * SIIS row as stored in siis_responses.json
 */
export interface SIISRow {
  id: string;
  original_query: string;
  siis_response: {
    title: string;
    content: string;
  };
}
