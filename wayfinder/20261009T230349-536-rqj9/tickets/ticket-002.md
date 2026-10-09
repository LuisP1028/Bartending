---
ticket_id: "002"
title: "Deterministic Patron Persona Resolution & System Instruction Governance"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_109.md"
---

# Ticket 002: Deterministic Patron Persona Resolution & System Instruction Governance

## Question
How does the dialogue node deterministically resolve the patron's authoritative persona from disk (`public/assets/patrons/{characterId}/personality.txt`) or PostgreSQL database fallback (`patrons.about_me`), construct the immutable system instruction prompt (persona adherence, Obelisco bar setting immersion, 1–2 uppercase sentences, max 120 chars, zero markdown, zero quotes), and fail fast if neither source exists?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_109.md`
  - §Desired Functionality (2): "Prior to dispatching a completion request, the system must resolve the patron's authoritative prompt file (`public/assets/patrons/{characterId}/personality.txt`). If the prompt file is missing on disk, the system must attempt resolution via the patron's relational database record (`about_me`), failing fast with an explicit error if neither exists."
  - §Desired Functionality (2): "The system prompt must enforce: 1. Full adherence to the character's persona defined in `personality.txt`. 2. Strict setting immersion (seated at Obelisco bar). 3. Output formatting constraint: exactly 1 to 2 short sentences, all uppercase, maximum 120 characters, zero markdown syntax, zero quotation marks."
  - §Edge Cases & Behavioral Boundaries (3): "If the model returns an empty string or malformed payload, the dialogue validator must catch the error immediately and emit an explicit failure record."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Existing Prompt File Resolution in `src/data/characterDialogue.ts`
In `src/data/characterDialogue.ts` (L35–L69):
```typescript
export function loadCharacterPromptFile(
  characterId: string,
  repoRoot: string = process.cwd()
): string | null {
  const filePath = path.join(
    repoRoot,
    'public/assets/patrons',
    characterId,
    'personality.txt'
  );
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (content.length > 0) return content;
    }
  } catch {
    /* fall through to catalog */
  }
  return null;
}
```
Currently, `loadCharacterPromptFile` checks only the local filesystem and falls back to a static catalog (`PERSONALITY_SYSTEM_PROMPTS`). It does not query the PostgreSQL database (`patrons.about_me`) if the disk file is absent, nor does it fail fast with a structured exception when a registered patron lacks both disk and DB records.

### 2. Missing Output Sanitization & Formatting Enforcement
The LLM response must satisfy strict diegetic formatting bounds (1–2 sentences, uppercase, max 120 chars, zero quotes/markdown). Without strict post-processing and invariant assertions, raw LLM outputs could overflow the 16-bit dialogue box or include markdown formatting (`**`, `""`, etc.).

## Architectural Decisions to Lock

### 1. Unified Persona Resolution Hierarchy (`src/data/characterDialogue.ts`)
- Implement `resolveAuthoritativePersona(characterId: string, repoRoot?: string): Promise<string>`:
  1. **Primary (Disk):** Check `public/assets/patrons/${characterId}/personality.txt`. If exists and non-empty, return trimmed text.
  2. **Secondary (Database Fallback):** If disk file is absent or empty, query PostgreSQL:
     ```typescript
     import { query } from '@/lib/db';
     const result = await query<{ about_me: string | null }>(
       'SELECT about_me FROM patrons WHERE id = $1',
       [characterId]
     );
     const dbBio = result.rows[0]?.about_me?.trim();
     if (dbBio && dbBio.length > 0) {
       return dbBio;
     }
     ```
  3. **Fatal Failure (Fail Fast):** If neither source yields persona text, raise fatal exception:
     ```typescript
     const err = new Error(`Authoritative persona not found on disk or database for patron "${characterId}"`);
     (err as any).code = 'PERSONA_NOT_FOUND';
     (err as any).statusCode = 404;
     throw err;
     ```

### 2. System Instruction Invariant Template
- Define the immutable system prompt builder in `src/lib/hfDialogueService.ts`:
  ```typescript
  export function buildSystemPrompt(personaText: string): string {
    return [
      `You are a bar patron seated at Obelisco, a vintage retro cocktail lounge.`,
      `PERSONA: ${personaText}`,
      `OUTPUT CONSTRAINTS:`,
      `- Speak strictly in character according to your persona.`,
      `- Deliver exactly 1 to 2 short sentences.`,
      `- Speak in ALL UPPERCASE letters.`,
      `- Maximum 120 characters total length.`,
      `- Do not use quotation marks, markdown, asterisks, or stage directions (no *sighs* or emojis).`,
      `- Output ONLY your spoken line.`
    ].join('\n');
  }
  ```

### 3. Output Sanitization & Invariant Validation
- Define post-processing pipeline in `src/lib/hfDialogueService.ts`:
  ```typescript
  export function sanitizeDialogueOutput(rawText: string): string {
    let text = rawText
      .replace(/["'“”‘’]/g, '')       // Strip quotation marks
      .replace(/\*.*?\*/g, '')         // Strip stage directions / markdown asterisks
      .replace(/```[\s\S]*?```/g, '')  // Strip code fences
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim()
      .toUpperCase();

    if (!text || text.length === 0) {
      const err = new Error('LLM returned empty or whitespace-only dialogue string');
      (err as any).code = 'DIALOGUE_EMPTY_ERROR';
      throw err;
    }

    if (text.length > 120) {
      // Find clean sentence boundary or space boundary under 120 chars
      const truncated = text.slice(0, 120);
      const lastPunct = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
      if (lastPunct > 40) {
        text = truncated.slice(0, lastPunct + 1);
      } else {
        const lastSpace = truncated.lastIndexOf(' ');
        text = (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim() + '!';
      }
    }

    return text;
  }
  ```
