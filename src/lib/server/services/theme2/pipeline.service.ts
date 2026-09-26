import { catalogService } from "./catalog.service";
import { siisService } from "./siis.service";
import { stepExtractor } from "./stepExtractor";
import { validateResponseAgainstSchema } from "./schema.validator";
import type { ContextDeeplinkResponse, Goal } from "./types";

export interface TroubleshootTheme2Request {
  query?: string;
  complaint?: string;
  siis_response?: {
    title: string;
    content: string;
  };
}

export class Theme2PipelineService {
  private static instance: Theme2PipelineService;

  private constructor() {}

  public static getInstance(): Theme2PipelineService {
    if (!Theme2PipelineService.instance) {
      Theme2PipelineService.instance = new Theme2PipelineService();
    }
    return Theme2PipelineService.instance;
  }

  /**
   * Executes the Theme 2 Smart Guided Troubleshooting Pipeline.
   *
   * Flow:
   * 1. Query normalization
   * 2. Grounding retrieval (from provided SIIS payload or closest SIIS fixture)
   * 3. Conservative Relevance Gate (evaluates confidence/alignment)
   * 4. Grounded Step & Action Extraction (100% sourced from SIIS content)
   * 5. Deterministic Catalog Matching (verbatim official catalog URIs only)
   * 6. Schema Validation (strict compliance with schema.py)
   */
  public async processTroubleshoot(
    request: TroubleshootTheme2Request
  ): Promise<ContextDeeplinkResponse> {
    const query = (request.query || request.complaint || "").trim();
    if (!query) {
      return validateResponseAgainstSchema({ contexts: [] });
    }

    let siisTitle = request.siis_response?.title;
    let siisContent = request.siis_response?.content;

    // If no siis_response was passed directly in request, search the 20 official SIIS rows
    if (!siisTitle || !siisContent) {
      const matchedRow = this.findMatchingSIISRow(query);
      if (matchedRow) {
        siisTitle = matchedRow.siis_response.title;
        siisContent = matchedRow.siis_response.content;
      }
    }

    // If still no SIIS source found, return empty contexts
    if (!siisTitle || !siisContent) {
      return validateResponseAgainstSchema({ contexts: [] });
    }

    // 2. Conservative Relevance Gate
    const evaluation = siisService.evaluateRelevance(query, siisTitle, siisContent);
    if (!evaluation.isRelevant) {
      // Rejection due to mismatch / low confidence
      return validateResponseAgainstSchema({ contexts: [] });
    }

    // 3. Grounded Action Extraction
    const actions = stepExtractor.extractActions(siisTitle, siisContent);

    // 4. Verify all emitted deeplinks exist verbatim in the official catalog
    for (const action of actions) {
      for (const group of action.stepGroups) {
        if (group.actionableDeeplink) {
          if (!catalogService.isVerbatimUri(group.actionableDeeplink.deeplink)) {
            throw new Error(
              `Integrity violation: Emitted URI ${group.actionableDeeplink.deeplink} does not exist verbatim in catalog`
            );
          }
          if (group.actionableDeeplink.deeplink === "voiceassist://dummy_positive") {
            throw new Error("Integrity violation: DL-DUMMY must never be emitted");
          }
        }
        if (group.validationDeeplink) {
          if (!catalogService.isVerbatimUri(group.validationDeeplink.deeplink)) {
            throw new Error(
              `Integrity violation: Emitted validation URI ${group.validationDeeplink.deeplink} does not exist verbatim in catalog`
            );
          }
          if (group.validationDeeplink.deeplink === "voiceassist://dummy_positive") {
            throw new Error("Integrity violation: DL-DUMMY validation must never be emitted");
          }
        }
      }
    }

    // 5. Construct Goal
    const goal: Goal = {
      goal: `Follow these steps to resolve ${siisTitle}`,
      title: siisTitle,
      actions,
      score: evaluation.score,
    };

    const response: ContextDeeplinkResponse = {
      contexts: [goal],
    };

    // 6. Strict validation against schema.py
    return validateResponseAgainstSchema(response);
  }

  /**
   * Matches an incoming query against the 20 official SIIS rows.
   */
  private findMatchingSIISRow(query: string) {
    const qLower = query.toLowerCase();
    const rows = siisService.getAllRows();

    // Exact or inclusion match against original_query
    for (const row of rows) {
      if (
        row.original_query.toLowerCase().includes(qLower) ||
        qLower.includes(row.original_query.toLowerCase())
      ) {
        return row;
      }
    }

    // Keyword overlap match
    let bestRow = null;
    let maxOverlap = 0;
    const qTokens = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));

    for (const row of rows) {
      const origTokens = new Set(row.original_query.toLowerCase().split(/\W+/).filter(Boolean));
      let overlap = 0;
      for (const t of qTokens) {
        if (origTokens.has(t)) overlap++;
      }
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestRow = row;
      }
    }

    if (maxOverlap >= 3) {
      return bestRow;
    }

    return null;
  }
}

export const theme2PipelineService = Theme2PipelineService.getInstance();
