import { catalogService } from "./catalog.service";
import type { CatalogEntry, Deeplink, ValidationDeepLink } from "./types";

export interface MatchResult {
  catalogId: string | null;
  actionableDeeplink: Deeplink | null;
  validationDeeplink: ValidationDeepLink | null;
  category: "auto" | "manual";
  confidence: number;
  matchReason: string;
}

// Intent phrases that explicitly MUST remain manual per Section 11 of the specification
const MANUAL_INTENT_PATTERNS = [
  "force restart",
  "restart your phone",
  "restart your device",
  "reboot",
  "charge",
  "charging",
  "liquid",
  "moisture",
  "ldi",
  "physical damage",
  "inspect",
  "safe mode",
  "clear cache",
  "clear data",
  "data transfer",
  "smart view",
  "mirroring",
  "repair",
  "service center",
  "customer support",
  "customer care",
  "factory reset",
  "usb mouse",
  "keyboard",
  "recovery menu",
];

export class DeeplinkMatcher {
  private static instance: DeeplinkMatcher;

  private constructor() {}

  public static getInstance(): DeeplinkMatcher {
    if (!DeeplinkMatcher.instance) {
      DeeplinkMatcher.instance = new DeeplinkMatcher();
    }
    return DeeplinkMatcher.instance;
  }

  /**
   * Deterministically matches a grounded action to an official catalog entry.
   *
   * Constraints:
   * 1. Uses ONLY message, description, qna_description, and originalType.
   * 2. NEVER inspects or matches on opaque URI strings.
   * 3. NEVER emits DL-DUMMY or voiceassist://dummy_positive.
   * 4. Actions in the explicit manual list return null deeplinks.
   * 5. Emits verified catalog metadata verbatim.
   */
  public matchAction(actionName: string, description: string, steps: string[]): MatchResult {
    const textToMatch = `${actionName} ${description} ${steps.join(" ")}`.toLowerCase();

    // 1. Check if the intent belongs to the manual-only list
    for (const pattern of MANUAL_INTENT_PATTERNS) {
      // If the action title is primarily a manual action (like "Force a Restart", "Charge the Device")
      if (actionName.toLowerCase().includes(pattern)) {
        return {
          catalogId: null,
          actionableDeeplink: null,
          validationDeeplink: null,
          category: "manual",
          confidence: 1.0,
          matchReason: `Action matches explicit manual pattern: "${pattern}"`,
        };
      }
    }

    // 2. High-precision deterministic matching for known settings targets
    // Wi-Fi settings (DL-0313)
    if (
      (textToMatch.includes("wi-fi") || textToMatch.includes("wifi") || textToMatch.includes("internet connection")) &&
      (textToMatch.includes("settings") || textToMatch.includes("connect") || textToMatch.includes("check connection")) &&
      !textToMatch.includes("multi window")
    ) {
      return this.buildResultForId("DL-0313", "Precise Wi-Fi settings match");
    }

    // Backup data (DL-0542)
    if (
      (textToMatch.includes("back up") || textToMatch.includes("backup")) &&
      (textToMatch.includes("data") || textToMatch.includes("cloud") || textToMatch.includes("accounts and backup"))
    ) {
      return this.buildResultForId("DL-0542", "Precise Backup data match");
    }

    // Multi-window for all apps (DL-0168)
    if (
      textToMatch.includes("multi window") ||
      textToMatch.includes("split screen") ||
      textToMatch.includes("pop-up view") ||
      textToMatch.includes("swipe for split screen")
    ) {
      return this.buildResultForId("DL-0168", "Precise Multi-window match");
    }

    // Rotate to landscape mode (DL-0461)
    if (
      (textToMatch.includes("rotate") || textToMatch.includes("rotation") || textToMatch.includes("landscape")) &&
      (textToMatch.includes("mode") || textToMatch.includes("screen") || textToMatch.includes("auto-rotate"))
    ) {
      return this.buildResultForId("DL-0461", "Precise Landscape rotation match");
    }

    // Touch sensitivity enable (DL-0126) vs disable (DL-0125)
    if (textToMatch.includes("touch sensitivity")) {
      if (
        textToMatch.includes("disable") ||
        textToMatch.includes("turn off") ||
        textToMatch.includes("deactivate")
      ) {
        return this.buildResultForId("DL-0125", "Precise Disable touch sensitivity match");
      }
      return this.buildResultForId("DL-0126", "Precise Enable touch sensitivity match");
    }

    // Navigation bar (DL-0169)
    if (
      textToMatch.includes("navigation bar") ||
      textToMatch.includes("nav bar") ||
      (textToMatch.includes("navigation") && textToMatch.includes("gesture"))
    ) {
      return this.buildResultForId("DL-0169", "Precise Navigation bar match");
    }

    // 3. Precise search through catalog metadata
    // Only consider entries where action target is clear and distinct
    const normAction = actionName.toLowerCase().trim();
    for (const entry of catalogService.getAllEntries()) {
      if (entry.id === "DL-DUMMY") continue;

      const msg = (entry.message || "").toLowerCase().trim();
      if (!msg) continue;

      // Exact title match or direct message match
      if (normAction === msg || normAction === (entry.description || "").toLowerCase().trim()) {
        return this.buildResultForEntry(entry, `Exact catalog message match on "${entry.message}"`);
      }
    }

    // 4. Default: No precise catalog match -> remains manual with null deeplinks
    return {
      catalogId: null,
      actionableDeeplink: null,
      validationDeeplink: null,
      category: "manual",
      confidence: 0.0,
      matchReason: "No precise catalog match found; default to manual",
    };
  }

  private buildResultForId(catalogId: string, reason: string): MatchResult {
    const entry = catalogService.getById(catalogId);
    if (!entry) {
      throw new Error(`Catalog entry ${catalogId} not found in official catalog`);
    }
    return this.buildResultForEntry(entry, reason);
  }

  private buildResultForEntry(entry: CatalogEntry, reason: string): MatchResult {
    // Explicit assertion: Never emit DL-DUMMY
    if (entry.id === "DL-DUMMY" || entry.deeplink === "voiceassist://dummy_positive") {
      return {
        catalogId: null,
        actionableDeeplink: null,
        validationDeeplink: null,
        category: "manual",
        confidence: 0.0,
        matchReason: "DL-DUMMY filtered out",
      };
    }

    const actionable = catalogService.buildActionableDeeplink(entry);
    const validation = catalogService.buildValidationDeeplink(entry);

    return {
      catalogId: entry.id,
      actionableDeeplink: actionable,
      validationDeeplink: validation,
      category: "auto",
      confidence: 1.0,
      matchReason: reason,
    };
  }
}

export const deeplinkMatcher = DeeplinkMatcher.getInstance();
