/**
 * Auto-register a pipeline character in src/data/characters.ts
 */

import fs from 'fs';
import path from 'path';

function constNameForId(characterId) {
  return `CHARACTER_${characterId
    .replace(/^patron_/, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')}`;
}

function displayNameForId(characterId) {
  return characterId
    .replace(/^patron_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 48) || 'Patron';
}

/**
 * @param {string} repoRoot
 * @param {string} characterId
 * @param {{ displayName?: string, personality?: string }} [opts]
 * @returns {{ path: string, constName: string, inserted: boolean }}
 */
export function registerCharacterInSource(repoRoot, characterId, opts = {}) {
  const filePath = path.join(repoRoot, 'src/data/characters.ts');
  if (!fs.existsSync(filePath)) {
    throw new Error(`characters.ts not found: ${filePath}`);
  }
  let src = fs.readFileSync(filePath, 'utf8');

  if (src.includes(`id: '${characterId}'`) || src.includes(`id: "${characterId}"`)) {
    return { path: filePath, constName: constNameForId(characterId), inserted: false };
  }

  const constName = constNameForId(characterId);
  if (src.includes(`export const ${constName}`)) {
    return { path: filePath, constName, inserted: false };
  }

  const displayName = opts.displayName || displayNameForId(characterId);
  const personality =
    opts.personality ||
    `${characterId.replace(/^patron_/, '').replace(/[^a-z0-9]+/gi, '_')}_friendly`;

  // Sizes/spawn/sitOffset come from DEFAULT_PATRON_STAGE via buildCharacterDef
  // Nested assets: public/assets/patrons/{characterId}/sit.png (see patronAssetPaths)
  const defBlock = `
/** Pipeline auto-registered patron (${characterId}). */
export const ${constName} = buildCharacterDef({
  id: '${characterId}',
  displayName: '${displayName.replace(/'/g, "\\'")}',
  personality: '${personality.replace(/'/g, "\\'")}',
  walkFrameCount: 2,
  walkFrameMs: 120,
});
`;

  // Insert definition before CHARACTERS registry
  const registryMarker = 'export const CHARACTERS: Record<string, CharacterDef> = {';
  const regIdx = src.indexOf(registryMarker);
  if (regIdx === -1) {
    throw new Error('Could not find CHARACTERS registry in characters.ts');
  }
  src = src.slice(0, regIdx) + defBlock + '\n' + src.slice(regIdx);

  // Add to registry object — after opening brace of CHARACTERS
  const openIdx = src.indexOf(registryMarker) + registryMarker.length;
  const entry = `\n  [${constName}.id]: ${constName},`;
  src = src.slice(0, openIdx) + entry + src.slice(openIdx);

  fs.writeFileSync(filePath, src, 'utf8');
  return { path: filePath, constName, inserted: true };
}
