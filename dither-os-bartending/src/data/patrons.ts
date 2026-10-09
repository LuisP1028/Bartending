/**
 * Compatibility facade for patron/character data.
 * Canonical character + asset definitions live in `characters.ts`.
 * Walk/sit paths: convention resolver in `patronAssetPaths.ts`.
 */

export type {
  PatronDef,
  PatronAssets,
  CharacterDef,
  CharacterDefInput,
  ResolvePatronAssetsOptions,
} from './characters';
export {
  CHARACTER_ELDER,
  CHARACTERS,
  PATRON_ELDER,
  listCharacters,
  getCharacter,
  requireCharacter,
  getCharacterAssets,
  getCharacterPersonality,
  characterToPatronDef,
  buildCharacterDef,
  resolvePatronAssets,
  buildWalkFrameSrcs,
  sitSrcForCharacter,
  walkFrameSrc,
  PATRON_ASSETS_PUBLIC_BASE,
  DEFAULT_WALK_FRAME_COUNT,
  DEFAULT_WALK_FRAME_MS,
} from './characters';

export { resolveSystemPromptForCharacterId } from './characterDialogue';

/** Bar stool zone ids used for seating / HOTSPOT EDIT. */
export const BAR_SEAT_ZONE_IDS = [
  'bar_seat_1',
  'bar_seat_2',
  'bar_seat_3',
  'bar_seat_4',
] as const;

export type BarSeatZoneId = (typeof BAR_SEAT_ZONE_IDS)[number];
