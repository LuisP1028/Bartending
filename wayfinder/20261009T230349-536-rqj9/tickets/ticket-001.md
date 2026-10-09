---
ticket_id: "001"
title: "Hugging Face Inference Backend Service & Fail-Fast Authentication Architecture"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_109.md"
---

# Ticket 001: Hugging Face Inference Backend Service & Fail-Fast Authentication Architecture

## Question
How does the server-side dialogue endpoint (`src/app/api/dialogue/route.ts` and `src/lib/hfDialogueService.ts`) authenticate against the Hugging Face Inference API using server credentials (`process.env.HF_TOKEN`), target an instruction-tuned conversational model endpoint (`https://router.huggingface.co/v1/chat/completions`), enforce a 4000ms upstream abort timeout, and raise immediate structured non-zero error telemetry (`HF_TOKEN_MISSING`, `HF_UPSTREAM_ERROR`) with zero mock fallbacks?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_109.md`
  - §Desired Functionality (1): "The dialogue service must authenticate against the Hugging Face Inference API using the repository-configured environment variable (`HF_TOKEN`). The service must target an instruction-tuned conversational model endpoint suitable for rapid low-latency character dialogue generation."
  - §Desired Functionality (1): "If `HF_TOKEN` is unset, empty, or fails authentication, the node must immediately return a structured, non-zero error status with explicit diagnostic details. Silent exception swallowing, simulated hardcoded responses, or arbitrary default fallbacks are strictly prohibited."
  - §Edge Cases & Behavioral Boundaries (1): "If the Hugging Face API exceeds a configured timeout threshold (e.g., 4000ms) or returns an HTTP 429/503 status, execution must surface an explicit dialogue error event to telemetry rather than freezing the game loop."
  - §Acceptance Criteria (AC1 & AC2): "Backend dialogue route successfully authenticates using `HF_TOKEN` and completes test prompts. When `HF_TOKEN` is unset, the dialogue service immediately raises a fatal HTTP 500/503 with explicit error telemetry. Zero mock fallbacks."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Existing Hugging Face Patterns in Repository
In `src/utils/LLMMenuMapper.ts` (L270–L305), the codebase connects to the Hugging Face OpenAI-compatible chat router:
```typescript
const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(userPayload, null, 2) },
    ],
    max_tokens: 4000,
    temperature: 0.1,
  }),
});
```
However, this is a batch menu mapper script, not a runtime API service for in-game dialogue generation. Currently, no route exists at `src/app/api/dialogue/route.ts`.

### 2. Missing Authentication and Timeout Handling
No backend service exists to validate `HF_TOKEN`, apply strict request timeout abort signals (`AbortSignal.timeout(4000)`), or surface standardized JSON error payloads when credentials fail.

## Architectural Decisions to Lock

### 1. Dedicated Service Module (`src/lib/hfDialogueService.ts`)
- Introduce a server-only dialogue service module exporting `generateDialogueCompletion`:
  ```typescript
  export type DialogueRequestType = 'order' | 'rejection';

  export interface OrderDialoguePayload {
    type: 'order';
    characterId: string;
    cocktail: {
      name: string;
      vessel: string;
      garnishes: string[];
      agitation: string;
      flavorNotes?: string;
    };
  }

  export interface RejectionDialoguePayload {
    type: 'rejection';
    characterId: string;
    recipe: {
      name: string;
      vessel: string;
      garnishes: string[];
      agitation: string;
    };
    deliveredDrink: {
      vessel: string | null;
      ingredients: Record<string, number>;
      rim: string | null;
      agitation: string | null;
      garnishes: string[];
    };
    discrepancies: string[];
  }

  export type DialoguePayload = OrderDialoguePayload | RejectionDialoguePayload;

  export interface DialogueServiceResult {
    dialogue: string;
    characterId: string;
    model: string;
    latencyMs: number;
  }
  ```

### 2. Strict Authentication & Fail-Fast Invariant
- At the start of `generateDialogueCompletion`:
  ```typescript
  const token = process.env.HF_TOKEN?.trim();
  if (!token) {
    const error = new Error('HF_TOKEN environment variable is not set or empty');
    (error as any).code = 'HF_TOKEN_MISSING';
    (error as any).statusCode = 500;
    throw error;
  }
  ```
- Mock fallbacks, simulated canned text, or empty strings are strictly disallowed.

### 3. Model Binding, Endpoint & Timeout Signal
- Model selection: read from `process.env.HF_DIALOGUE_MODEL` with default `Qwen/Qwen2.5-72B-Instruct` (or `meta-llama/Llama-3.1-8B-Instruct`).
- Endpoint: `https://router.huggingface.co/v1/chat/completions`.
- Upstream timeout threshold: `4000ms` enforced via `AbortSignal.timeout(4000)`.
- If upstream returns non-200 (e.g. 401 unauthorized, 429 rate limit, 503 unavailable) or network aborts:
  ```typescript
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`Hugging Face API returned status ${response.status}: ${errorBody}`);
    (error as any).code = 'HF_UPSTREAM_ERROR';
    (error as any).statusCode = response.status === 401 ? 500 : response.status;
    (error as any).details = errorBody;
    throw error;
  }
  ```

### 4. HTTP API Route (`src/app/api/dialogue/route.ts`)
- Implements `POST(request: NextRequest)`:
  - Parses incoming JSON body and validates presence of `type` and `characterId`.
  - Dispatches to `generateDialogueCompletion`.
  - Surfaces structured error responses:
    ```json
    {
      "error": "HF_TOKEN environment variable is not set or empty",
      "code": "HF_TOKEN_MISSING",
      "timestamp": "2026-10-09T23:03:49.000Z"
    }
    ```
    with appropriate HTTP status codes (500 for missing token / auth failure, 502/504 for upstream gateway/timeout failures).
