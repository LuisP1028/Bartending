/**
 * Personality → system prompt catalog for the future LLM dialogue node.
 * No network calls here — routing data only.
 */

import { getCharacterPersonality } from './characters';

/**
 * Catalog keyed by CharacterDef.personality.
 * The LLM dialogue node selects the system prompt via this map.
 */
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

export function resolveSystemPromptForPersonality(
  personality: string
): string | null {
  const prompt = PERSONALITY_SYSTEM_PROMPTS[personality];
  return prompt && prompt.length > 0 ? prompt : null;
}

export function loadCharacterPromptFile(
  characterId: string,
  repoRoot: string = process.cwd()
): string | null {
  if (typeof window !== 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const filePath = path.join(
      repoRoot,
      'public/assets/patrons',
      characterId,
      'personality.txt'
    );
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (content.length > 0) return content;
    }
    const metaPath = path.join(
      repoRoot,
      'public/assets/patrons',
      characterId,
      'meta.json'
    );
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as {
        aboutMe?: string;
      };
      const aboutMe = meta.aboutMe?.trim();
      if (aboutMe && aboutMe.length > 0) return aboutMe;
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** characterId → personality → system prompt (for LLM node wiring). */
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

export class PersonaNotFoundError extends Error {
  code = 'PERSONA_NOT_FOUND';
  statusCode = 404;

  constructor(characterId: string) {
    super(`Authoritative persona not found on disk or database for patron "${characterId}"`);
    this.name = 'PersonaNotFoundError';
  }
}

export async function resolveAuthoritativePersona(
  characterId: string,
  repoRoot: string = process.cwd()
): Promise<string> {
  if (!characterId || typeof characterId !== 'string' || !characterId.trim()) {
    throw new PersonaNotFoundError(String(characterId));
  }

  // 1. Check authoritative disk file (personality.txt or meta.json aboutMe)
  const filePrompt = loadCharacterPromptFile(characterId.trim(), repoRoot);
  if (filePrompt && filePrompt.length > 0) {
    return filePrompt;
  }

  // 2. Query relational PostgreSQL database if configured
  if (
    typeof window === 'undefined' &&
    (process.env.DATABASE_URL || process.env.POSTGRES_URL)
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { query } = require('@/lib/db') as {
        query: <T>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
      };
      const res = await Promise.race([
        query<{ about_me: string | null }>(
          'SELECT about_me FROM patrons WHERE id = $1 LIMIT 1',
          [characterId.trim()]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('DB lookup timeout')), 1200)
        ),
      ]);
      const dbBio = res.rows[0]?.about_me?.trim();
      if (dbBio && dbBio.length > 0) {
        return dbBio;
      }
    } catch {
      // Database query error or timeout — proceed to fail-fast
    }
  }

  // 3. Fatal fail-fast (INV-FAILFAST-DIALOGUE-01: no silent static fallback)
  throw new PersonaNotFoundError(characterId);
}

