import { deeplinkMatcher } from "./matcher.service";
import type { Action, StepGroup } from "./types";

const ESCALATION_KEYWORDS = [
  "customer support",
  "customer care",
  "customer support center",
  "service center",
  "authorized service center",
  "authorized techcorp service center",
  "authorized samsung service center",
  "schedule service",
  "require service",
  "contact support",
  "repair",
];

export class StepExtractor {
  /**
   * Deterministically parses SIIS article text into structured Action objects.
   * Ensures 100% grounded content: only derives steps and instructions present in the text.
   */
  public extractActions(title: string, content: string, query?: string): Action[] {
    const rawSections = this.splitIntoSections(content);
    const actions: Action[] = [];

    for (const section of rawSections) {
      const trimmedTitle = section.header.trim();

      // In composite multi-topic documents, ignore sub-sections that are unrelated to the query
      if (query && trimmedTitle && !this.isSectionRelevant(trimmedTitle, section.body, query, title)) {
        continue;
      }

      const textLines = section.body
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#"));

      if (textLines.length === 0 && !trimmedTitle) {
        continue;
      }

      const actionName = this.cleanHeaderTitle(trimmedTitle) || "Troubleshooting Step";
      const fullBodyText = textLines.join(" ");

      // Extract description: first sentence or first 120 chars
      const firstSentenceMatch = fullBodyText.match(/^([^.!?]+[.!?])/);
      const description =
        firstSentenceMatch?.[1]?.trim() || fullBodyText.slice(0, 120).trim();

      // Extract concrete steps from bullet points or numbered sentences
      const steps = this.extractStepLines(textLines);

      // Deeplink matching
      const matchResult = deeplinkMatcher.matchAction(actionName, description, steps);

      const stepGroup: StepGroup = {
        steps: steps.length > 0 ? steps : [fullBodyText],
        actionableDeeplink: matchResult.actionableDeeplink,
        validationDeeplink: matchResult.validationDeeplink,
      };

      actions.push({
        actionName,
        description: description || actionName,
        stepGroups: [stepGroup],
        category: matchResult.category,
      });

      // Check if this section contains explicit support escalation at the end
      const explicitSupportMatch = this.extractExplicitSupportEscalation(fullBodyText);
      if (explicitSupportMatch) {
        actions.push({
          actionName: explicitSupportMatch.actionName,
          description: explicitSupportMatch.description,
          stepGroups: [
            {
              steps: [explicitSupportMatch.instruction],
              actionableDeeplink: null,
              validationDeeplink: null,
            },
          ],
          category: "manual",
        });
      }
    }

    // If no sections were found (e.g., flat text without headers)
    if (actions.length === 0) {
      const lines = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const matchResult = deeplinkMatcher.matchAction(title, title, lines);
      actions.push({
        actionName: title,
        description: lines[0] || title,
        stepGroups: [
          {
            steps: lines.slice(0, 5),
            actionableDeeplink: matchResult.actionableDeeplink,
            validationDeeplink: matchResult.validationDeeplink,
          },
        ],
        category: matchResult.category,
      });
    }

    return actions;
  }

  private splitIntoSections(content: string): { header: string; body: string }[] {
    const lines = content.split("\n");
    const sections: { header: string; body: string }[] = [];
    let currentHeader = "";
    let currentBodyLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Match markdown headers: ## Step 1: ..., ### Step 2: ..., etc.
      if (/^#{2,4}\s+/.test(trimmed) || /^(Step\s+\d+|###?\s*\d+\.)/i.test(trimmed)) {
        if (currentHeader || currentBodyLines.length > 0) {
          sections.push({
            header: currentHeader,
            body: currentBodyLines.join("\n"),
          });
          currentBodyLines = [];
        }
        currentHeader = trimmed.replace(/^#{2,4}\s+/, "");
      } else {
        currentBodyLines.push(line);
      }
    }

    if (currentHeader || currentBodyLines.length > 0) {
      sections.push({
        header: currentHeader,
        body: currentBodyLines.join("\n"),
      });
    }

    return sections.filter((s) => s.header || s.body.trim().length > 0);
  }

  private cleanHeaderTitle(header: string): string {
    return header
      .replace(/^Step\s+\d+:\s*/i, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/[:\-]+$/, "")
      .trim();
  }

  private extractStepLines(lines: string[]): string[] {
    const steps: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Avoid headers, glossary markers, or disclaimers
      if (
        trimmed.startsWith("#") ||
        trimmed.startsWith("Glossary") ||
        trimmed.startsWith("Note:") ||
        trimmed.length < 5
      ) {
        continue;
      }
      // If the line is an actionable instruction
      steps.push(trimmed);
    }
    return steps.slice(0, 10);
  }

  private extractExplicitSupportEscalation(
    text: string
  ): { actionName: string; description: string; instruction: string } | null {
    const lower = text.toLowerCase();
    const hasEscalation = ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
    if (!hasEscalation) return null;

    // Check if there is an explicit sentence about contacting customer support or service center
    const sentences = text.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const sLower = s.toLowerCase();
      if (
        (sLower.includes("customer support") ||
          sLower.includes("service center") ||
          sLower.includes("require service") ||
          sLower.includes("schedule service")) &&
        (sLower.includes("contact") ||
          sLower.includes("visit") ||
          sLower.includes("authorized") ||
          sLower.includes("assistance"))
      ) {
        return {
          actionName: "Contact Customer Support or Service Center",
          description: "Grounded escalation step per official guidance",
          instruction: s.trim(),
        };
      }
    }
    return null;
  }

  private isSectionRelevant(
    header: string,
    body: string,
    query: string,
    docTitle: string
  ): boolean {
    // Numbered steps (e.g. "Step 1", "1.") are part of sequential procedures
    if (/^(step\s+\d+|\d+\.)/i.test(header)) {
      return true;
    }

    const lowerDocTitle = docTitle.toLowerCase();
    // Only composite documents with generic overview titles require sub-section filtering
    const isCompositeDoc =
      lowerDocTitle.includes("some things to check") ||
      lowerDocTitle.includes("first");

    if (!isCompositeDoc) {
      return true;
    }

    const lowerHeader = header.toLowerCase();
    const lowerQuery = query.toLowerCase();

    const genericHeaderWords = new Set([
      "screen", "display", "phone", "tablet", "device", "nexa", "techcorp", "fold",
      "issue", "issues", "problem", "problems", "process", "reason", "reasons",
      "lock", "check", "first", "step", "steps", "thing", "things", "about", "your"
    ]);

    const headerKeywords = lowerHeader
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !genericHeaderWords.has(w));

    if (headerKeywords.length === 0) {
      return true;
    }

    // A secondary section in a composite guide is only included if its specific topic is in the query
    return headerKeywords.some((kw) => lowerQuery.includes(kw));
  }

}


export const stepExtractor = new StepExtractor();
