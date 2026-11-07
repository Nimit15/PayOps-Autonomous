# PayOps Autonomous - PayPal AI Hackathon 2026

## 1. Zero-Tolerance Anti-Shortcut Rules (Hard Prohibitions)
| Forbidden Agent Shortcut | Why It Loses Hackathons | Mandatory Winner Standard to Enforce Instead |
| :--- | :--- | :--- |
| **Silent Mock or Hardcoded Fallbacks** | Judges inspect network tabs and backend logs. If a failed API call silently falls back to hardcoded JSON or a fake JavaScript math formula, the project is flagged as "smoke and mirrors." | **Never silently mock core logic in production paths.** Every prediction, transaction, or agent action must execute through the real pipeline. If an offline/browser fallback is included, it must run real exported logic with an explicit `"Offline Mode"` badge. |
| **Procedural Placeholder Visuals & Dummy Assets** | Using primitive shapes, generic stock icons, or `Lorem Ipsum` data when a challenge calls for spatial, visual, financial, or domain-specific fidelity forfeits 20–30% of the rubric immediately. | **Automate real asset & data ingestion via headless scripts.** Write Python/CLI pipelines to fetch, convert, and optimize real domain assets plus graceful fallback views for constrained browsers. |
| **Git-Ignored Weights, Keys, or Broken Fresh Clones** | Standard `.gitignore` templates exclude `*.pkl`, `*.onnx`, `*.db`, or seed data. When a judge clones the repo and runs the server, it crashes or loads 0 models/records. | **Guarantee zero-setup fresh-clone boot.** Force-commit production-ready weights/seed databases, or auto-build/download them deterministically on server startup. Verify every build in an isolated `/tmp` clone before submission. |
| **Single Baseline Model / Happy-Path Prompt** | Training a single uncalibrated model on one random train/test split—or wrapping a single raw LLM prompt without verification—cannot beat teams that prove rigor quantitatively. | **Run systematic benchmarks + deterministic guardrails.** For ML: compare multiple model families. For LLM/Agents: enforce deterministic code verifiers, schema guards, and citation/fact ledgers that can overrule the model. |
| **Disconnected or Contradictory Outputs** | Independent sub-models or multi-step prompts often emit outputs that violate domain laws, conservation rules, budget caps, or hierarchical probability logic. | **Encode domain invariants in deterministic code.** Enforce mathematical and logical constraints in a post-processing verification layer backed by property-based unit tests. |
| **Middle-Screen-Only Prototypes** | Building only a central dashboard that requires tedious manual form entry and produces no portable output feels like a toy, not a deployable product. | **Close the First-Mile Input and Last-Mile Output loop.** Build 1-click unstructured ingestion AND 1-click actionable export. |

## 2. PayPal SDK & API Version Mandates
- **NEVER** use deprecated PayPal v1 REST SDKs (`paypal-rest-sdk`, `paypal-node-sdk`)
- **ALWAYS** use PayPal REST v2 APIs (`/v2/checkout/orders`, `/v2/invoicing`, `/v1/billing`, `/v1/catalogs`, `/v1/reporting`)
- **ALWAYS** use PayPal JS SDK v6 on frontend (`https://www.paypal.com/sdk/js?client-id=...&components=buttons,fastlane`)
- **ALWAYS** use `@paypal/agent-toolkit` for agent function-calling
- Run `/paypal:doctor` after every milestone to verify zero integration warnings

## 3. Authentication & Token Management
- **NEVER** hardcode static `PAYPAL_ACCESS_TOKEN` in the deployed app (expires every 8-9 hours)
- **ALWAYS** implement server-side `PayPalAuthManager` singleton:
  - Exchange `PAYPAL_CLIENT_ID` + `PAYPAL_SECRET` via `POST /v1/oauth2/token`
  - Cache token in-memory with 5-min safety buffer before `expires_in`
  - Auto-refresh on any `401` response
- For MCP plugin during development: run `/paypal:setup refresh` on `401`

## 4. API Scope Restrictions
- **STRICTLY** use only 100% instantly available PayPal Sandbox APIs.
- **NEVER** use gated APIs requiring manual review (Store Sync, certain Braintree scopes).

## 5. Real Integration Mandate
- **NEVER** mock PayPal responses or hardcode fake AI output
- **EVERY** feature must execute real HTTP calls against `https://api-m.sandbox.paypal.com`
- Build deterministic **Sandbox Data Seeder** (`/api/sandbox/seed`) that populates real sandbox records.
- Include **1-click "Seed Sandbox Data" button** in UI for judges.

## 6. Development Workflow (6-Day / 6-Gate Schedule)
- **Gate 1**: Setup, Merging Docs, Scaffolding, and Initial Invariants Testing.
- **Gate 2**: Core PayPal Engine, Auth, Webhooks, & Auto-Seeder.
- **Gate 3**: Channel3 Procurement & v6 Checkout.
- **Gate 4**: AG Studio Command Center.
- **Gate 5**: Bryntum Gantt + Render Workflow Deployment.
- **Gate 6**: Verification, `/paypal:doctor`, Submission (Freeze & submit by Nov 11, 2026 @ 6:00 PM IST).
