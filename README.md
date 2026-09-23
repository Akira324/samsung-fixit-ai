# Samsung AI Troubleshooter

Prototype for the **Samsung PRISM Generative AI Hackathon 2026–27, Theme 2**.

A user describes a device problem in everyday language. The system enriches the
query, retrieves the matching troubleshooting flow, reasons with an LLM,
validates the output, maps every step to a verified Android Settings deeplink,
caches the validated answer, and returns structured JSON.

---

## 1. Project structure

```
src/
  routes/
    index.tsx                     # Home page
    api/troubleshoot.ts           # POST /api/troubleshoot
    api/health.ts                 # GET  /api/health (KB size, cache stats, LLM status)
  components/troubleshooter/
    Header.tsx  ComplaintInput.tsx  ExampleProblems.tsx  LoadingState.tsx
    ResultSummary.tsx  TroubleshootingStep.tsx  ResultsPanel.tsx  ErrorMessage.tsx
  services/
    troubleshootApi.ts            # the only place the UI talks HTTP
  lib/server/                     # server-only; never reaches the browser bundle
    types.ts
    utils/normalize.ts            # query normalization + cache key
    services/
      troubleshooting.service.ts  # pipeline orchestrator
      cache.service.ts            # fast-path cache + hit/miss stats
      retrieval.service.ts        # knowledge base retrieval/scoring
      llm.service.ts              # two-stage LLM engine
      validation.service.ts       # schema + deeplink validation
      deeplink.service.ts         # approved deeplink map
    data/knowledge_base.json      # all troubleshooting flows (data-driven)
.env.example
```

## 2. Setup

```bash
bun install          # or npm install
cp .env.example .env # then add your LLM key
```

## 3. Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `LLM_API_KEY` | no* | Your LLM provider API key. Server-side only. |
| `LLM_BASE_URL` | no | OpenAI-compatible LLM base URL. This prototype uses OpenRouter. |
| `LLM_MODEL` | no | Free LLM model identifier. Current prototype uses `google/gemma-4-26b-a4b-it:free`. |

*Without a key, the pipeline still runs fully on the knowledge base + cache; the LLM enrichment/reasoning stages are skipped. The `.env` file is gitignored and must never be committed.

## 4. Run the backend

The API and the web app run in the same process:

```bash
bun run dev     # http://localhost:8080
```

API endpoints: `POST /api/troubleshoot`, `GET /api/health`.

## 5. Run the frontend

Same command — open `http://localhost:8080`. Production build: `bun run build`.

## 6. API documentation

### `POST /api/troubleshoot`

Request:

```json
{ "complaint": "My WiFi keeps disconnecting every few minutes" }
```

Response `200`:

```json
{
  "problem": "Wi-Fi repeatedly disconnects",
  "category": "Network Connectivity",
  "severity": "High",
  "steps": [
    { "instruction": "Open Wi-Fi settings and confirm you are connected to the correct network",
      "deeplink": "android.settings.WIFI_SETTINGS", "deeplinkLabel": "Open Wi-Fi Settings" },
    { "instruction": "Turn Wi-Fi off and back on to force a fresh connection",
      "deeplink": "android.settings.WIFI_SETTINGS", "deeplinkLabel": "Open Wi-Fi Settings" }
  ],
  "source": "knowledge_base",
  "flowId": "wifi_disconnects",
  "confidence": 0.86,
  "meta": {
    "cache": "miss",
    "totalLatencyMs": 2.8,
    "llmLatencyMs": null,
    "retrievalLatencyMs": 1.9,
    "validated": true,
    "cacheStats": { "entries": 1, "hits": 0, "misses": 1, "hitRate": 0 }
  }
}
```

Errors return `{ "error": "<user-friendly message>" }` with `400` (empty or too
short complaint, malformed body) or `500` (unexpected failure). Stack traces,
provider errors and keys are never returned.

### `GET /api/health`

Returns knowledge-base size, category list, cache stats and whether an LLM key
is configured.

## 7. Example request

```bash
curl -X POST http://localhost:8080/api/troubleshoot \
  -H 'Content-Type: application/json' \
  -d '{"complaint":"My wireless earbuds won'\''t connect"}'
```

## 8. Architecture

```
USER → WEB FRONTEND → REST API
        ↓
   FAST-PATH CACHE  ──hit──► validated answer (measured ~0.1–0.5 ms)
        │ miss
   QUERY ENRICHMENT (LLM stage 1: complaint → problem/category/severity/keywords)
        ↓
   RETRIEVAL (knowledge_base.json, lexical scoring; swappable for embeddings)
        ↓
   LLM TROUBLESHOOTING ENGINE (stage 2: grounded step generation)
        ↓
   VALIDATION (schema, ordering, instructions, approved deeplinks only)
        ↓
   DEEPLINK MAPPING (verified android.settings.* actions, else "unresolved")
        ↓
   CACHE SAVE (validated results only) → STRUCTURED JSON → FRONTEND
```

Each stage is a separate module with a narrow interface, so retrieval can become
vector search, the cache can become Redis, and the LLM provider can change
without touching the others.

Degradation is layered: LLM failure → knowledge-base answer; no confident match
→ graceful "unknown problem" response with safe generic checks and an explanatory
note (never invented steps, never cached).

## 9. Adding a new troubleshooting flow

Edit `src/lib/server/data/knowledge_base.json` only — no backend code changes:

```json
{
  "id": "nfc_not_working",
  "problem": "NFC payments are not detected",
  "severity": "Medium",
  "keywords": ["nfc", "tap to pay", "contactless"],
  "validated": true,
  "steps": [
    { "instruction": "Open connection settings and turn NFC on", "deeplink": "android.settings.NFC_SETTINGS" }
  ]
}
```

If a step has no verified Settings action, use `"deeplink": "unresolved"` — the
UI renders it as a manual step. To make a new deeplink usable, add it to
`APPROVED_DEEPLINKS` in `deeplink.service.ts`; anything outside that map is
rejected by the validator, including LLM output.

## 10. How caching works

1. The complaint is normalized: lowercased, accent/punctuation stripped,
   synonyms folded (`wi-fi`→`wifi`, `disconnects`→`disconnect`), stopwords
   removed, tokens de-duplicated and sorted into a stable key.
2. `cacheLookup` returns a stored validated result on a hit and the response is
   returned immediately with `meta.cache: "hit"` — the LLM is never called.
3. On a miss the full pipeline runs and only a validated, non-fallback result is
   stored (24 h TTL, 5 000-entry cap).

Measured on this machine: cache hits return in **~0.1 ms** total handler time
(`meta.totalLatencyMs`), well under the 300 ms target; knowledge-base misses
without the LLM measured 1–5 ms. LLM-backed misses depend on your provider and
are reported separately as `meta.llmLatencyMs`.
