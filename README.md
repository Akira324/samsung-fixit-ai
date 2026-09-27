# Samsung FixIt AI — Smart Guided Troubleshooting & Deeplinking

An intelligent, grounded device troubleshooting engine and interactive assistant built for the **Samsung PRISM Generative AI Hackathon (Theme 2: Smart Guided Troubleshooting & Deeplinking)**.

Samsung FixIt AI pairs natural language customer complaints with internal TechCorp/Samsung knowledge store articles (SIIS) and maps every actionable step to verified, verbatim Android system and settings deeplinks—enforcing conservative relevance gating, strict schema compliance, and zero hallucination.

---

## 1. Problem Statement

* **Diagnostic Friction**: Modern mobile operating systems feature hundreds of deeply nested settings and configuration screens. When encountering technical faults, users struggle to diagnose the root issue and locate the precise settings page.
* **LLM Hallucination Risk**: Standard generative AI models frequently hallucinate non-existent settings paths, emit invalid or fabricated deep link URIs, and suggest inappropriate troubleshooting steps (e.g., advising email server reconfiguration for physical screen display failures).
* **Compliance & Safety**: Automated troubleshooting must guarantee that emitted deep links exist verbatim within the official platform catalog, sensitive operations (reboots, factory resets, physical damage checks) remain strictly manual, and customer escalation paths are accurately preserved.

---

## 2. Solution Overview

Samsung FixIt AI implements a dual-mode troubleshooting architecture:

1. **Theme 2 Grounded Pipeline (`POST /v1/troubleshoot`)**:
   * Evaluates natural language queries against SIIS (internal knowledge store) articles.
   * Employs a **Conservative Relevance Gate** (relevance threshold ≥ 0.65) that rejects weak or mismatched query-article pairings.
   * Extracts grounded actions and step groups directly from article text without inventing steps.
   * Deterministically maps actions to an official **578-entry Deeplink Catalog** using action intent metadata (never opaque URI heuristics).
   * Strictly validates all responses against the competition `schema.py` specification via Zod.
   * Enforces zero-emission guards on dummy items (`voiceassist://dummy_positive` and `DL-DUMMY`).

2. **Standard Interactive Pipeline (`POST /api/troubleshoot`)**:
   * Fast-path in-memory normalized cache (~0.1 ms hit latency).
   * Lexical retrieval scoring against `knowledge_base.json`.
   * Optional two-stage LLM enrichment and reasoning (compatible with any OpenAI-compatible provider, e.g. OpenRouter / Google Gemma).

3. **Modern Web Interface**:
   * Full-stack application powered by TanStack Start and React 19.
   * Automatic symptom classification that routes incoming complaints seamlessly to the appropriate engine.
   * Visual indicators for action categories (`auto`, `manual`, `critical`), verification conditions, and deeplink targets.

---

## 3. System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │               User Client               │
                    │        (Web Browser / REST API)         │
                    └────────────────────┬────────────────────┘
                                         │
                        HTTP POST /v1/troubleshoot or /api/troubleshoot
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │       TanStack Start / Nitro SSR        │
                    │          (Node.js Server Runtime)       │
                    └───────┬─────────────────────────┬───────┘
                            │                         │
             POST /v1/troubleshoot         POST /api/troubleshoot
                            │                         │
                            ▼                         ▼
         ┌──────────────────────────────┐  ┌──────────────────────────────┐
         │       Theme 2 Pipeline       │  │      Standard Pipeline       │
         │ (Deterministic & Grounded)   │  │ (Knowledge Base + LLM/Cache) │
         └──────────────┬───────────────┘  └──────────────┬───────────────┘
                        │                                 │
     ┌──────────────────┴──────────────────┐              │
     │ 1. Query Normalization              │              ├── Fast-Path Cache (0.1ms)
     │ 2. Grounding Retrieval (SIIS 20)    │              ├── Lexical Retrieval
     │ 3. Conservative Relevance Gate      │              ├── LLM Engine (Optional)
     │ 4. Grounded Step Extraction         │              └── Approved Deeplinks
     │ 5. Verbatim Catalog Matcher (578)   │
     │ 6. Strict Zod / schema.py Validate  │
     └──────────────────┬──────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │ ContextDeeplinkResponse JSON │
         │   (Grounded Actions, Steps,  │
         │   Validation & Deeplinks)    │
         └──────────────────────────────┘
```

---

## 4. Theme 2 Pipeline Flow

The Theme 2 pipeline ([pipeline.service.ts](file:///c:/Users/Aarush%20Jain/Desktop/samsung-fixit-ai-main/src/lib/server/services/theme2/pipeline.service.ts)) executes the following deterministic stages:

```
[Input: query + optional siis_response]
                  │
                  ▼
         [Relevance Gate] ──(Score < 0.65 or Mismatch)──► Return { contexts: [] }
                  │
             (Score ≥ 0.65)
                  ▼
      [Grounded Step Extractor] ──► Parse sections & steps solely from SIIS text
                  │
                  ▼
        [Deeplink Matcher] ──► Match metadata against 578 Catalog entries
                  │             • Manual blacklist (reboot, battery, damage, etc.)
                  │             • Guard against DL-DUMMY & dummy_positive
                  │             • Verify emitted URIs exist verbatim
                  ▼
       [Schema Validator] ──► Strict Zod validation against schema.py
                  │
                  ▼
        [Emitted Response]
```

1. **Input Normalization**: Accepts `query` (or `complaint`) and an optional `siis_response` payload. If `siis_response` is omitted, it locates the matching record from the 20 internal SIIS fixtures. If no query is provided, it immediately returns `{ contexts: [] }`.
2. **Conservative Relevance Gate**: Evaluates topical alignment between the complaint and article using token Jaccard similarity, content coverage, and domain mismatch rules. For example, queries describing display flashing/crashing paired with email server articles or TV screen mirroring articles are rejected and return `{ contexts: [] }`.
3. **Grounded Step Extraction**: Splits article content into logical sections, extracting action titles, summaries, and sequential step instructions. Support escalations (authorized service centers, customer care) are captured as explicit manual actions.
4. **Deterministic Catalog Matching**: Matches extracted actions against the 578 official entries in `deeplinks.json` using title, description, and keywords:
   * **Explicit Manual Rule**: Mandatory manual actions (Force Restart, Charging, Liquid Damage Inspection, Safe Mode, Storage Wipe, Data Transfer, Screen Mirroring, Repair Escalation) strictly return `actionableDeeplink: null` and `category: "manual"`.
   * **Dummy Guard**: `DL-DUMMY` and `voiceassist://dummy_positive` are explicitly blocked from emission.
   * **Verbatim Integrity**: Every emitted deeplink and validation deeplink is asserted to exist verbatim in the catalog.
5. **Schema Validation**: Validates the output against `schema.py` using Zod schemas (`Goal`, `Action`, `StepGroup`, `Deeplink`, `ValidationDeepLink`).

---

## 5. Technology Stack

* **Framework & Frontend**: [TanStack Start](https://tanstack.com/start) (SSR), [TanStack Router](https://tanstack.com/router), [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com).
* **UI Components & Icons**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/).
* **Validation & Schemas**: [Zod 3.25](https://zod.dev/) (strict compliance with competition `schema.py`).
* **Server Runtime**: Node.js 20+ (Bookworm Slim) with [Nitro](https://nitro.build/) engine.
* **Testing**: Node.js built-in test runner (`node:test`, `node:assert/strict`) via `tsx`.
* **Containerization**: Multi-stage production `Dockerfile` and `docker-compose.yml`.

---

## 6. Project Structure

```
samsung-fixit-ai/
├── Dockerfile                             # Multi-stage production Docker image
├── docker-compose.yml                     # Container orchestration definition
├── package.json                           # Scripts, dependencies, and overrides
├── tsconfig.json                          # TypeScript configuration
├── vite.config.ts                         # Vite + TanStack Start configuration
├── public/                                # Static assets
├── src/
│   ├── routeTree.gen.ts                   # TanStack Router generated routes
│   ├── routes/
│   │   ├── __root.tsx                     # Root document, layout, and meta tags
│   │   ├── index.tsx                      # Web UI home page
│   │   ├── api/
│   │   │   ├── health.ts                  # GET  /api/health
│   │   │   └── troubleshoot.ts            # POST /api/troubleshoot (Standard pipeline)
│   │   └── v1/
│   │       └── troubleshoot.ts            # POST /v1/troubleshoot (Theme 2 pipeline)
│   ├── components/troubleshooter/         # Frontend React components
│   │   ├── ComplaintInput.tsx             # Natural language input box
│   │   ├── ExampleProblems.tsx            # One-click test fixtures & complaints
│   │   ├── Header.tsx                     # App header & branding
│   │   ├── LoadingState.tsx               # Skeleton loaders & progress feedback
│   │   ├── ResultsPanel.tsx               # Results coordinator (Standard & Theme 2)
│   │   ├── ResultSummary.tsx              # Metadata, confidence, & flow summary
│   │   ├── TroubleshootingStep.tsx        # Render step groups & deeplink badges
│   │   └── ErrorMessage.tsx               # User-friendly error display
│   ├── services/
│   │   └── troubleshootApi.ts             # Client API service & fixture router
│   └── lib/server/
│       ├── data/
│       │   ├── knowledge_base.json        # Curated standard troubleshooting flows
│       │   └── theme2_assets/
│       │       ├── deeplinks.json         # Official 578-entry catalog
│       │       ├── siis_responses.json    # Official 20 SIIS reference fixtures
│       │       ├── input.txt              # Official test queries
│       │       └── schema.py              # Reference Python schema definition
│       ├── services/
│       │   ├── cache.service.ts           # Fast-path cache (TTL, eviction, stats)
│       │   ├── deeplink.service.ts        # Approved standard Android settings map
│       │   ├── llm.service.ts             # Two-stage OpenAI/OpenRouter engine
│       │   ├── retrieval.service.ts       # Lexical knowledge base retrieval
│       │   ├── troubleshooting.service.ts # Standard pipeline orchestrator
│       │   ├── validation.service.ts      # Standard schema validation
│       │   └── theme2/                    # Theme 2 Core Services
│       │       ├── catalog.service.ts     # Catalog loader & verbatim URI validator
│       │       ├── matcher.service.ts     # Deterministic action-to-deeplink matcher
│       │       ├── pipeline.service.ts    # Main Theme 2 pipeline orchestrator
│       │       ├── schema.validator.ts    # Zod validator mirroring schema.py
│       │       ├── siis.service.ts        # SIIS fixtures & relevance gate
│       │       ├── stepExtractor.ts       # Grounded text parser
│       │       ├── types.ts               # Theme 2 TypeScript interfaces
│       │       └── __tests__/
│       │           └── theme2.test.ts     # Comprehensive 44-test verification suite
│       └── utils/
│           └── normalize.ts               # Complaint text normalization utilities
```

---

## 7. Local Setup & Installation

### Prerequisites
* **Node.js**: v20.x or higher (or **Bun** v1.1+)
* **npm** (comes with Node.js)

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd samsung-fixit-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or: bun install
   ```

3. **Configure Environment Variables** *(Optional)*:
   ```bash
   cp .env.example .env
   ```
   *Note: An LLM key is optional. Without an LLM key, the standard pipeline runs offline using `knowledge_base.json` and cache, and the Theme 2 pipeline runs 100% locally and deterministically.*

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

5. **Production Build & Execution**:
   ```bash
   npm run build
   npm start
   ```

---

## 8. Docker Instructions

The repository includes a multi-stage production `Dockerfile` (using `node:20-bookworm-slim`, running under an unprivileged `node` user with a container health check) and a `docker-compose.yml` configuration.

### Using Docker Compose (Recommended)

```bash
# Build and start container in detached mode
docker compose up -d --build

# View container logs
docker compose logs -f

# Check container status
docker compose ps

# Stop container
docker compose down
```

### Using Docker CLI Directly

```bash
# 1. Build the production image
docker build -t samsung-fixit-ai .

# 2. Run the container
docker run -d \
  --name samsung-fixit-ai \
  -p 8080:8080 \
  --restart unless-stopped \
  samsung-fixit-ai

# 3. Check health status
curl http://localhost:8080/api/health
```

---

## 9. API Reference

### 1. `POST /v1/troubleshoot` (Theme 2 Pipeline)

Primary competition endpoint complying with the Theme 2 specification.

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `query` or `complaint` | `string` | **Yes** | Natural language customer complaint or device symptom. If empty, returns `{ contexts: [] }`. |
| `siis_response` | `object` | No | Direct SIIS grounding document (`{ title: string, content: string }`). If omitted, matched from internal fixtures. |

#### Example Request
```bash
curl -X POST http://localhost:8080/v1/troubleshoot \
  -H "Content-Type: application/json" \
  -d '{
    "query": "My Nexa X1 screen turns completely blank or white and no text appears when I search for a stock price or use the Quick Assist app, and it happens with other apps too.",
    "siis_response": {
      "title": "Blank or black display on a smartphone or tablet",
      "content": "## Troubleshooting Steps for Device Not Turning On\n### Step 1: Check for Physical Damage and Liquid Exposure\n..."
    }
  }'
```

#### Example Response (`200 OK`)
```json
{
  "contexts": [
    {
      "goal": "Follow these steps to resolve Blank or black display on a smartphone or tablet",
      "title": "Blank or black display on a smartphone or tablet",
      "score": 0.95,
      "actions": [
        {
          "actionName": "Check for Physical Damage and Liquid Exposure",
          "description": "First, please carefully inspect your phone or tablet, charger, and USB cable for any physical damage or signs of liquid exposure.",
          "category": "manual",
          "stepGroups": [
            {
              "steps": [
                "Examine the USB connections for any corrosion or bent pins.",
                "Turn off your phone or tablet.",
                "Insert the ejector tool into the small hole next to the SIM/MicroSD tray."
              ],
              "actionableDeeplink": null,
              "validationDeeplink": null
            }
          ]
        },
        {
          "actionName": "Force a Restart",
          "description": "If there's no physical or liquid damage, let's try to force a restart on your device.",
          "category": "manual",
          "stepGroups": [
            {
              "steps": [
                "Press and hold both the Power button and Volume down button simultaneously for at least 20 seconds."
              ],
              "actionableDeeplink": null,
              "validationDeeplink": null
            }
          ]
        }
      ]
    }
  ]
}
```

*Note: If a query fails the Conservative Relevance Gate (e.g. display issues matched to email server articles), `{ "contexts": [] }` is returned.*

---

### 2. `POST /api/troubleshoot` (Standard Interactive Pipeline)

Standard troubleshooting endpoint with fast-path caching and optional LLM augmentation.

#### Request Body
```json
{
  "complaint": "My WiFi keeps disconnecting every few minutes"
}
```

#### Example Response (`200 OK`)
```json
{
  "problem": "Wi-Fi repeatedly disconnects",
  "category": "Network Connectivity",
  "severity": "High",
  "steps": [
    {
      "instruction": "Open Wi-Fi settings and confirm you are connected to the correct network",
      "deeplink": "android.settings.WIFI_SETTINGS",
      "deeplinkLabel": "Open Wi-Fi Settings"
    },
    {
      "instruction": "Turn Wi-Fi off and back on to force a fresh connection",
      "deeplink": "android.settings.WIFI_SETTINGS",
      "deeplinkLabel": "Open Wi-Fi Settings"
    }
  ],
  "source": "knowledge_base",
  "flowId": "wifi_disconnects",
  "confidence": 0.86,
  "meta": {
    "cache": "miss",
    "totalLatencyMs": 2.1,
    "llmLatencyMs": null,
    "retrievalLatencyMs": 1.4,
    "validated": true,
    "cacheStats": {
      "entries": 1,
      "hits": 0,
      "misses": 1,
      "hitRate": 0
    }
  }
}
```

---

### 3. `GET /api/health`

Service health check reporting operational status, knowledge base metrics, cache statistics, and LLM configuration.

#### Example Response (`200 OK`)
```json
{
  "status": "ok",
  "llmConfigured": false,
  "freeModel": true,
  "model": "google/gemma-4-26b-a4b-it:free",
  "knowledgeBase": {
    "flows": 12,
    "categories": [
      "Battery & Charging",
      "Display & Screen",
      "Network Connectivity",
      "Performance & Storage",
      "System & Apps"
    ]
  },
  "cache": {
    "entries": 0,
    "hits": 0,
    "misses": 0,
    "hitRate": 0
  }
}
```

---

## 10. Automated Testing & Verification

The project includes an automated test suite verifying all 8 core constraints of the Theme 2 specification.

### Running the Test Suite
```bash
npm test
```

### Verification Coverage (44 Passing Tests)

1. **Asset Integrity**:
   * Asserts catalog contains exactly 578 entries (`EXPECTED_CATALOG_COUNT = 578`).
   * Asserts SIIS responses contain exactly 20 fixture rows (`EXPECTED_SIIS_COUNT = 20`).
2. **DL-DUMMY & Dummy Positive Protection**:
   * Ensures `DL-DUMMY` is never matched or emitted.
   * Asserts `voiceassist://dummy_positive` is never emitted across any action or validation group.
3. **Regression Mappings**:
   * Asserts accurate metadata-based resolution for critical actions (Wi-Fi Settings `DL-0313`, Backup Data `DL-0542`, Multi Window `DL-0168`, Landscape Rotation `DL-0461`, Touch Sensitivity `DL-0126`, Disable Touch `DL-0125`, Navigation Bar `DL-0169`).
4. **Verbatim Catalog URI Integrity**:
   * Asserts that every single emitted actionable and validation URI exists verbatim in `deeplinks.json`.
5. **Manual Action Enforcement**:
   * Asserts that sensitive operations (Force Restart, Charging, Liquid Damage Inspection, Safe Mode, Storage Wipe, Data Transfer, Screen Mirroring, Repair Escalation) always have `null` deeplinks and `category: "manual"`.
6. **Conservative Relevance Gate**:
   * Asserts rejection (`{ contexts: [] }`) on mismatched pairs (e.g. tablet display flash paired with email server guide; small screen paired with TV screen mirroring).
   * Asserts acceptance on valid pairs (e.g. blank screen query paired with blank/black display article).
7. **Strict schema.py Compliance**:
   * Validates output format across all 20 SIIS rows against Zod schemas matching `schema.py`.
8. **Customer Support Escalation**:
   * Asserts that when text explicitly mentions authorized service centers or customer support, an escalation action is preserved as a manual action.

---

## 11. Known Boundaries & Limitations

* **Strict Grounding Bound**: The Theme 2 extractor derives actions and steps solely from the provided text. It does not fabricate or extrapolate recovery procedures absent from the knowledge source.
* **Catalog Coverage**: Automated deeplinking is bounded by the 578 entries in the catalog. Actions outside the catalog safely degrade to manual guidance (`actionableDeeplink: null`).
* **Standalone Operation**: The application runs completely self-contained without requiring internet connectivity or third-party API keys during evaluation. Optional LLM features for the standard pipeline are purely additive.

---

## 12. Usage & Demo Instructions

### Interactive Browser Demo
1. Run `npm run dev` and navigate to `http://localhost:8080`.
2. Click any of the pre-loaded example problem badges (e.g., *"My Nexa X1 screen turns completely blank or white..."* or *"My WiFi keeps disconnecting"*).
3. Observe real-time classification:
   * **Theme 2 Symptoms**: Displays structured resolution goals, step-by-step instructions, action categorization (`auto` / `manual`), and direct deeplink triggers.
   * **Standard Queries**: Displays problem classification, severity level, verified Settings deeplink cards, and pipeline latency metrics.

### PowerShell CLI Demonstration (Theme 2 API)

```powershell
# Read fixture and invoke POST /v1/troubleshoot
$data = Get-Content .\src\lib\server\data\theme2_assets\siis_responses.json -Raw | ConvertFrom-Json
$body = @{
    query = $data.responses[1].original_query
    siis_response = $data.responses[1].siis_response
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri http://localhost:8080/v1/troubleshoot -Method POST -ContentType "application/json" -Body $body
```
