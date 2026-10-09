/**
 * Personality → system prompt catalog for the future LLM dialogue node.
 * No network calls here — routing data only.
 */

import fs from 'fs';
import path from 'path';
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
