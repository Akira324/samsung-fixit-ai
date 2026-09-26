import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { catalogService, EXPECTED_CATALOG_COUNT } from "../catalog.service";
import { siisService, EXPECTED_SIIS_COUNT } from "../siis.service";
import { deeplinkMatcher } from "../matcher.service";
import { theme2PipelineService } from "../pipeline.service";
import { validateResponseAgainstSchema } from "../schema.validator";

describe("Samsung PRISM Theme 2 — Verification Suite", () => {
  // 1. Asset Counts
  describe("1. Asset Counts", () => {
    test(`Catalog entry count equals exactly ${EXPECTED_CATALOG_COUNT}`, () => {
      assert.equal(catalogService.getTotalCount(), 578);
    });

    test(`SIIS rows count equals exactly ${EXPECTED_SIIS_COUNT}`, () => {
      assert.equal(siisService.getTotalCount(), 20);
    });
  });

  // 2. DL-DUMMY & Dummy Positive Protection
  describe("2. DL-DUMMY Protection", () => {
    test("DL-DUMMY entry exists in catalog file but is never matched or emitted", () => {
      const dummy = catalogService.getById("DL-DUMMY");
      assert.ok(dummy, "DL-DUMMY is present in raw catalog data");

      // Matcher with ambiguous or settings text must NOT return DL-DUMMY
      const match = deeplinkMatcher.matchAction(
        "General settings",
        "Open random screen",
        ["Navigate to settings"]
      );
      assert.notEqual(match.catalogId, "DL-DUMMY");
      assert.equal(match.actionableDeeplink, null);
      assert.equal(match.validationDeeplink, null);
      assert.equal(match.category, "manual");
    });

    test("Explicit assert: voiceassist://dummy_positive is never emitted", async () => {
      const allRows = siisService.getAllRows();
      for (const row of allRows) {
        const res = await theme2PipelineService.processTroubleshoot({
          query: row.original_query,
          siis_response: row.siis_response,
        });
        for (const ctx of res.contexts) {
          for (const act of ctx.actions) {
            for (const sg of act.stepGroups) {
              if (sg.actionableDeeplink) {
                assert.notEqual(
                  sg.actionableDeeplink.deeplink,
                  "voiceassist://dummy_positive",
                  "Actionable deeplink must not be dummy_positive"
                );
              }
              if (sg.validationDeeplink) {
                assert.notEqual(
                  sg.validationDeeplink.deeplink,
                  "voiceassist://dummy_positive",
                  "Validation deeplink must not be dummy_positive"
                );
              }
            }
          }
        }
      }
    });
  });

  // 3. Known Regression Mappings
  describe("3. Known Regression Mappings (Metadata lookup without hardcoded URIs)", () => {
    const requiredCases = [
      {
        name: "Connection-check / open Wi-Fi settings",
        actionName: "Check Wi-Fi connection",
        description: "Open Wi-Fi settings to connect to network",
        steps: ["Navigate to Settings and tap Wi-Fi"],
        expectedId: "DL-0313",
      },
      {
        name: "Enable backup data",
        actionName: "Back Up Phone Data",
        description: "Enables data backup to cloud",
        steps: ["Tap Accounts and backup and tap Back up data"],
        expectedId: "DL-0542",
      },
      {
        name: "Enable multi-window",
        actionName: "Use Multi window",
        description: "Enables multi window for all apps",
        steps: ["Swipe for split screen"],
        expectedId: "DL-0168",
      },
      {
        name: "View landscape rotation",
        actionName: "Rotate to landscape mode",
        description: "Opens the rotate to landscape mode settings page",
        steps: ["Rotate screen"],
        expectedId: "DL-0461",
      },
      {
        name: "Enable touch sensitivity",
        actionName: "Increase Touch Sensitivity",
        description: "Enables touch sensitivity for screen response",
        steps: ["Turn on touch sensitivity"],
        expectedId: "DL-0126",
      },
      {
        name: "Disable touch sensitivity",
        actionName: "Disable Touch Sensitivity",
        description: "Disables touch sensitivity",
        steps: ["Turn off touch sensitivity"],
        expectedId: "DL-0125",
      },
      {
        name: "View navigation bar",
        actionName: "View Navigation Bar",
        description: "Opens navigation bar settings",
        steps: ["Change gesture navigation bar layout"],
        expectedId: "DL-0169",
      },
    ];

    for (const testCase of requiredCases) {
      test(`Resolves ${testCase.name} to ${testCase.expectedId}`, () => {
        const expectedEntry = catalogService.getById(testCase.expectedId);
        assert.ok(expectedEntry, `Catalog entry ${testCase.expectedId} must exist`);

        const result = deeplinkMatcher.matchAction(
          testCase.actionName,
          testCase.description,
          testCase.steps
        );

        assert.equal(result.catalogId, testCase.expectedId);
        assert.ok(result.actionableDeeplink, "Actionable deeplink must be present");
        assert.equal(result.actionableDeeplink?.deeplink, expectedEntry.deeplink);
        assert.equal(result.actionableDeeplink?.description, expectedEntry.description);

        if (expectedEntry.validation?.deeplink) {
          assert.ok(result.validationDeeplink, "Validation deeplink must be present");
          assert.equal(result.validationDeeplink?.deeplink, expectedEntry.validation.deeplink);
          assert.equal(result.validationDeeplink?.key, expectedEntry.validation.key);
        }
      });
    }
  });

  // 4. Verbatim Catalog URI Integrity
  describe("4. Deeplink Verbatim Catalog Integrity", () => {
    test("Every emitted deeplink across all 20 rows exists verbatim in deeplinks.json", async () => {
      const allRows = siisService.getAllRows();
      let totalEmitted = 0;

      for (const row of allRows) {
        const res = await theme2PipelineService.processTroubleshoot({
          query: row.original_query,
          siis_response: row.siis_response,
        });

        for (const ctx of res.contexts) {
          for (const act of ctx.actions) {
            for (const sg of act.stepGroups) {
              if (sg.actionableDeeplink) {
                totalEmitted++;
                assert.ok(
                  catalogService.isVerbatimUri(sg.actionableDeeplink.deeplink),
                  `Emitted actionable URI ${sg.actionableDeeplink.deeplink} must exist in catalog`
                );
              }
              if (sg.validationDeeplink) {
                totalEmitted++;
                assert.ok(
                  catalogService.isVerbatimUri(sg.validationDeeplink.deeplink),
                  `Emitted validation URI ${sg.validationDeeplink.deeplink} must exist in catalog`
                );
              }
            }
          }
        }
      }
      assert.ok(totalEmitted > 0, "At least some automatic deeplinks must be emitted");
    });
  });

  // 5. Actions That Must Remain Manual
  describe("5. Manual Actions (No loose or fabricated matches)", () => {
    const manualActions = [
      "Force a Restart",
      "Charge the Device",
      "Check for Physical Damage and Liquid Exposure",
      "Restart in Safe Mode",
      "Clear Email App Cache and Data",
      "Data Transfer using USB",
      "Screen Mirroring with Smart View",
      "Schedule Screen Repair Service",
    ];

    for (const name of manualActions) {
      test(`Action "${name}" remains manual with null deeplinks`, () => {
        const result = deeplinkMatcher.matchAction(name, name, ["Step instruction"]);
        assert.equal(result.actionableDeeplink, null);
        assert.equal(result.validationDeeplink, null);
        assert.equal(result.category, "manual");
      });
    }
  });

  // 6. Conservative Relevance Gate & Weak SIIS Protection
  describe("6. Relevance Gate & Weak SIIS Protection", () => {
    test("Weak pairing row_1 (display flash query vs email server article) is rejected -> empty contexts", async () => {
      const row1 = siisService.getById("row_1");
      assert.ok(row1);

      const res = await theme2PipelineService.processTroubleshoot({
        query: row1.original_query,
        siis_response: row1.siis_response,
      });

      assert.deepEqual(res, { contexts: [] });
    });

    test("Weak pairing row_8 (display small query vs TV screen mirroring) is rejected -> empty contexts", async () => {
      const row8 = siisService.getById("row_8");
      assert.ok(row8);

      const res = await theme2PipelineService.processTroubleshoot({
        query: row8.original_query,
        siis_response: row8.siis_response,
      });

      assert.deepEqual(res, { contexts: [] });
    });

    test("Strong pairing row_2 (blank screen query vs Blank or black display) passes gate", async () => {
      const row2 = siisService.getById("row_2");
      assert.ok(row2);

      const res = await theme2PipelineService.processTroubleshoot({
        query: row2.original_query,
        siis_response: row2.siis_response,
      });

      assert.equal(res.contexts.length, 1);
      assert.equal(res.contexts[0]?.title, "Blank or black display on a smartphone or tablet");
      assert.ok(res.contexts[0]?.actions.length > 0);
    });
  });

  // 7. Schema Validation on All 20 Rows
  describe("7. schema.py Validation Across All 20 Rows", () => {
    const allRows = siisService.getAllRows();

    for (const row of allRows) {
      test(`Row ${row.id} strictly validates against schema.py`, async () => {
        const res = await theme2PipelineService.processTroubleshoot({
          query: row.original_query,
          siis_response: row.siis_response,
        });

        // Throws if validation fails
        const validated = validateResponseAgainstSchema(res);
        assert.ok(validated);
      });
    }
  });

  // 8. Explicit Customer Support Grounding
  describe("8. Customer Support / Service Grounding", () => {
    test("Support escalation is preserved when SIIS explicitly contains service instructions (row_2)", async () => {
      const row2 = siisService.getById("row_2");
      assert.ok(row2);

      const res = await theme2PipelineService.processTroubleshoot({
        query: row2.original_query,
        siis_response: row2.siis_response,
      });

      const supportAction = res.contexts[0]?.actions.find((a) =>
        a.actionName.toLowerCase().includes("support") || a.actionName.toLowerCase().includes("service")
      );
      assert.ok(supportAction, "Support action must be included when explicit in text");
      assert.equal(supportAction.stepGroups[0]?.actionableDeeplink, null);
      assert.equal(supportAction.category, "manual");
    });
  });
});
