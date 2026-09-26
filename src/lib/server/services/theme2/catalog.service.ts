import deeplinksData from "../../data/theme2_assets/deeplinks.json";
import type { CatalogEntry, Deeplink, ValidationDeepLink } from "./types";

export const EXPECTED_CATALOG_COUNT = 578;

export class CatalogService {
  private static instance: CatalogService;
  private entries: CatalogEntry[] = [];
  private entryById: Map<string, CatalogEntry> = new Map();
  private verbatimUris: Set<string> = new Set();

  private constructor() {
    this.loadCatalog();
  }

  public static getInstance(): CatalogService {
    if (!CatalogService.instance) {
      CatalogService.instance = new CatalogService();
    }
    return CatalogService.instance;
  }

  private loadCatalog(): void {
    const rawList = (deeplinksData as unknown as { deeplinks: CatalogEntry[]; count: number }).deeplinks;
    if (!Array.isArray(rawList)) {
      throw new Error("deeplinks.json must contain a 'deeplinks' array");
    }

    if (rawList.length !== EXPECTED_CATALOG_COUNT) {
      throw new Error(
        `Catalog count mismatch: expected ${EXPECTED_CATALOG_COUNT}, received ${rawList.length}`
      );
    }

    this.entries = rawList;
    for (const entry of this.entries) {
      this.entryById.set(entry.id, entry);
      if (entry.deeplink) {
        this.verbatimUris.add(entry.deeplink);
      }
      if (entry.validation?.deeplink) {
        this.verbatimUris.add(entry.validation.deeplink);
      }
    }
  }

  public getTotalCount(): number {
    return this.entries.length;
  }

  public getAllEntries(): CatalogEntry[] {
    return this.entries;
  }

  public getById(id: string): CatalogEntry | undefined {
    return this.entryById.get(id);
  }

  /**
   * Asserts whether a given URI exists verbatim in the official catalog.
   */
  public isVerbatimUri(uri: string): boolean {
    return this.verbatimUris.has(uri);
  }

  /**
   * Builds the official Deeplink object from a matched catalog entry.
   * Derives metadata faithfully from catalog without inventing or rewriting fields.
   */
  public buildActionableDeeplink(entry: CatalogEntry): Deeplink {
    // Explicit protection against DL-DUMMY
    if (entry.id === "DL-DUMMY" || entry.deeplink === "voiceassist://dummy_positive") {
      throw new Error("DL-DUMMY must never be emitted as an actionable deeplink");
    }

    const dl: Deeplink = {
      deeplink: entry.deeplink,
      description: entry.description || "",
      message: entry.message ?? "",
    };

    if (entry.originalType) {
      dl.originalType = entry.originalType;
    }
    if (entry.classes && Object.keys(entry.classes).length > 0) {
      dl.classes = entry.classes;
    }

    return dl;
  }

  /**
   * Builds the official ValidationDeepLink object from a matched catalog entry's validation data.
   */
  public buildValidationDeeplink(entry: CatalogEntry): ValidationDeepLink | null {
    if (!entry.validation || !entry.validation.deeplink) {
      return null;
    }

    // Explicit protection against DL-DUMMY
    if (entry.id === "DL-DUMMY" || entry.validation.deeplink === "voiceassist://dummy_positive") {
      throw new Error("DL-DUMMY must never be emitted as a validation deeplink");
    }

    const val = entry.validation;
    const vdl: ValidationDeepLink = {
      deeplink: val.deeplink,
      key: val.key || "",
    };

    if (val.resultType) {
      vdl.resultType = val.resultType as any;
    }
    if (val.condition) {
      vdl.condition = val.condition as any;
    }
    if (val.value !== undefined && val.value !== null) {
      vdl.value = String(val.value);
    }

    return vdl;
  }
}

export const catalogService = CatalogService.getInstance();
