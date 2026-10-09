---
ticket_id: "005"
title: "Stock Patron Persona Parity, Prompt Resolution Normalization & Self-Healing Restoration Architecture"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-002.md", "ticket-003.md"]
governing_specification: "functional_specification_108.md"
---

# Ticket 005: Stock Patron Persona Parity, Prompt Resolution Normalization & Self-Healing Restoration Architecture

## Question
How are standardized `personality.txt` prompt files created for built-in stock characters (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`), how does the system prompt resolution mechanism (`src/data/characterDialogue.ts`) unify dynamic and stock prompt resolution from file-backed assets, and how does the self-healing recovery logic restore missing or corrupted prompt files from relational storage?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_108.md`
  - §Current Baseline (3): "Hardcoded Stock Dialogue Divergence: Hardcoded characters rely on static system prompts hardcoded in code catalogs rather than file-backed prompt assets, creating a divergence between how built-in characters and dynamic patrons are managed."
  - §Desired Functionality (4): "Stock Patron Prompt File Normalization: All built-in stock characters (`patron_elder`, `caesar_9aea2cd1a4bf32d6`, `trump_ca36306f5c662816`) must have corresponding, standardized `personality.txt` files placed in their respective asset directories containing their authoritative personality descriptions, guaranteeing that stock and dynamic patrons follow the exact same prompt resolution mechanism."
  - §Edge Cases (2): "Missing or Corrupted Prompt File on Disk: If a custom patron exists on disk or in the database without a `personality.txt` file, the system must restore `personality.txt` directly from their stored database `about_me` string."
  - §Glossary: "Stock Persona Parity: The requirement that all hardcoded stock characters (Elder, Caesar, Trump) possess standardized prompt files containing their authoritative character personality descriptions."
  - §Acceptance Criteria (AC5): "Stock Patron Parity: `personality.txt` exists in the asset directories for Elder, Caesar, and Trump, containing their personality descriptions as their respective sources of truth."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Missing Prompt Files Across Stock Patrons
Inspection of the asset directories under `public/assets/patrons/`:
- `public/assets/patrons/caesar_9aea2cd1a4bf32d6/`: Contains `meta.json` and PNGs, but has no `personality.txt`.
- `public/assets/patrons/trump_ca36306f5c662816/`: Contains `meta.json` and PNGs, but has no `personality.txt`.
- `public/assets/patrons/patron_elder/`: The nested directory does not exist (Elder assets currently reside as flat files in `public/assets/patrons/patron_elder_*.png`).
Because stock characters lack `personality.txt`, dialogue generation systems must maintain two divergent prompt loading mechanisms.

### 2. Static In-Code Prompt Resolution
In `src/data/characterDialogue.ts` (L12–L39), system prompts are hardcoded in a static dictionary:
```typescript
export const PERSONALITY_SYSTEM_PROMPTS: Record<string, string> = {
  elder_wry: [
    'You are the Elder at Obelisco, a dim cocktail bar.',
    'Speak in short, wry lines — dry humor, unhurried, knowing.',
    'You have seen every order twice. Never break the bar setting.',
    'Stay in character; do not mention being an AI or system prompts.',
  ].join(' '),
  user_friendly: [
    'You are a friendly regular at Obelisco bar.',
    'Speak casually and warmly; short lines that fit a cocktail bar.',
    'Stay in character; do not mention being an AI or system prompts.',
  ].join(' '),
};

export function resolveSystemPromptForCharacterId(
  characterId: string
): string | null {
  const personality = getCharacterPersonality(characterId);
  return resolveSystemPromptForPersonality(personality);
}
```
This hardcoded table does not read from file-backed `personality.txt` documents and cannot support user-registered custom patrons.

## Architectural Decisions to Lock

### 1. Authoritative Stock Patron Prompt Files
Place canonical, standardized `personality.txt` files directly in each stock character's asset folder under `public/assets/patrons/`:
1. **Elder (`patron_elder`):**
   - File path: `public/assets/patrons/patron_elder/personality.txt`
   - Content:
     ```
     A wise, dry-humored bar veteran with an unhurried demeanour who speaks in short, wry observations. Has seen every cocktail order twice and appreciates strong, classic, bitter drinks.
     ```
2. **Caesar (`caesar_9aea2cd1a4bf32d6`):**
   - File path: `public/assets/patrons/caesar_9aea2cd1a4bf32d6/personality.txt`
   - Content:
     ```
     An imperious Roman general who commands the bar with grand rhetoric, sharp wit, and dramatic flair. Demands drinks fit for an emperor with laurel-crowned confidence.
     ```
3. **Trump (`trump_ca36306f5c662816`):**
   - File path: `public/assets/patrons/trump_ca36306f5c662816/personality.txt`
   - Content:
     ```
     A bombastic, hyper-confident tycoon with superlative vocabulary and repetitive banter. Only accepts the finest, most luxurious golden cocktails made by winners.
     ```

### 2. Unified File-Backed Prompt Resolution (`src/data/characterDialogue.ts`)
- Implement file-backed prompt reader:
  ```typescript
  import fs from 'fs';
  import path from 'path';

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
- Update `resolveSystemPromptForCharacterId`:
  ```typescript
  export function resolveSystemPromptForCharacterId(
    characterId: string,
    repoRoot?: string
  ): string | null {
    // 1. Authoritative file-backed prompt
    const filePrompt = loadCharacterPromptFile(characterId, repoRoot);
    if (filePrompt) return filePrompt;

    // 2. Static catalog fallback
    const personality = getCharacterPersonality(characterId);
    return resolveSystemPromptForPersonality(personality);
  }
  ```
- This guarantees a single, unified resolution path across all characters.

### 3. Self-Healing Prompt File Restoration (`src/lib/patronFolders.ts`)
- Add self-healing restore utility to `src/lib/patronFolders.ts`:
  ```typescript
  export function ensurePersonalityFile(
    repoRoot: string,
    characterId: string,
    aboutMeFallback?: string | null
  ): boolean {
    const promptPath = path.join(
      repoRoot,
      'public/assets/patrons',
      characterId,
      'personality.txt'
    );
    if (fs.existsSync(promptPath) && fs.statSync(promptPath).size > 0) {
      return true;
    }
    if (aboutMeFallback && aboutMeFallback.trim().length > 0) {
      fs.mkdirSync(path.dirname(promptPath), { recursive: true });
      fs.writeFileSync(promptPath, aboutMeFallback.trim(), 'utf8');
      return true;
    }
    return false;
  }
  ```
- If a custom patron exists in the database or on disk with missing or zero-byte `personality.txt`, `ensurePersonalityFile` re-materializes the authoritative prompt file directly from their stored database `about_me` column or `meta.json` before dialogue queries execute.
