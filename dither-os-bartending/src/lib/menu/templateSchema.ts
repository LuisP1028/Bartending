/**
 * Mode menu markdown template: parse + hard-fail validation (FS26 / RE26).
 * No LLM calls.
 */
import {
  DrinkMethod,
  DRINK_METHOD_IDS,
  type DrinkMethodId,
} from '@/data/methods';

/** Template method labels → sim DrinkMethod IDs (product locked). */
export const METHOD_LABEL_TO_ID: Record<string, DrinkMethodId> = {
  Built: DrinkMethod.BUILT,
  Shaken: DrinkMethod.BOSTON_SHAKER_TIN,
  Stirred: DrinkMethod.STIRRED,
  'Shake/Double Strain': DrinkMethod.DOUBLE_STRAIN,
  'Dry Shake/Ice Shake/Double Strain': DrinkMethod.DRY_ICE_DOUBLE_STRAIN,
  // aliases from methods.ts display labels
  'Shaken + Double Strain': DrinkMethod.DOUBLE_STRAIN,
  'Dry / Ice / Double Strain': DrinkMethod.DRY_ICE_DOUBLE_STRAIN,
};

export const METHOD_ID_TO_LABEL: Record<string, string> = {
  [DrinkMethod.BUILT]: 'Built',
  [DrinkMethod.BOSTON_SHAKER_TIN]: 'Shaken',
  [DrinkMethod.STIRRED]: 'Stirred',
  [DrinkMethod.DOUBLE_STRAIN]: 'Shake/Double Strain',
  [DrinkMethod.DRY_ICE_DOUBLE_STRAIN]: 'Dry Shake/Ice Shake/Double Strain',
};

/** Initial generic/ambiguous source phrases (case-insensitive). */
export const GENERIC_SOURCE_PHRASES: readonly string[] = [
  'puree',
  'fruit puree',
  'fruit pureé',
  'fruit pureè',
  'oj',
  'juice',
  'syrup',
  'liqueur',
  'liquer',
];

export interface StructuredIngredient {
  amountOz: number;
  sourceName: string;
}

export interface StructuredVariant {
  variantName: string;
  ingredients: StructuredIngredient[];
}

export interface StructuredDrink {
  name: string;
  garnishes: string[]; // display names; empty if None
  vessel: string;
  rims: string[]; // display names; empty means None
  variants: StructuredVariant[];
  methodLabel: string;
  methodId: DrinkMethodId;
  /** Original markdown block (optional). */
  rawBlock?: string;
}

export type ValidationResult =
  | { ok: true; drinks: StructuredDrink[] }
  | { ok: false; errors: string[] };

const INGREDIENT_RE = /^\*\s+(\d+(?:\.\d+)?)oz\s+(.+)$/;
const LABEL_LINE_RE = /^-([A-Za-z]+):\s*(.+?)-$/;
const METHOD_LINE_RE = /^\*\*Method:\s*(.+?)\*\*$/i;
const VARIANT_HEADER_RE = /^\*\*(.+?)\*\*$/;

export function isGenericSourceName(sourceName: string): boolean {
  const n = sourceName.trim().toLowerCase();
  if (!n) return true;
  if (GENERIC_SOURCE_PHRASES.includes(n)) return true;
  // bare single-token generics
  if (['puree', 'oj', 'juice', 'syrup', 'liqueur', 'liquer'].includes(n)) return true;
  return false;
}

function splitBlocks(md: string): string[] {
  const trimmed = md.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return [];
  return trimmed
    .split(/(?=^##\s)/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseLabeledLine(
  line: string,
  expected: string
): string | null {
  const m = line.match(LABEL_LINE_RE);
  if (!m) return null;
  if (m[1].toLowerCase() !== expected.toLowerCase()) return null;
  return m[2].trim();
}

function parseCommaList(value: string): string[] {
  const v = value.trim();
  if (!v || /^none$/i.test(v)) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDrinkBlock(block: string, index: number): { drink?: StructuredDrink; errors: string[] } {
  const errors: string[] = [];
  const prefix = `Drink block ${index + 1}`;
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0 && l.trim() !== '---');

  if (lines.length === 0) {
    errors.push(`${prefix}: empty block`);
    return { errors };
  }

  const title = lines[0].match(/^##\s+(.+)$/);
  if (!title || !title[1].trim()) {
    errors.push(`${prefix}: missing or empty ## Name`);
    return { errors };
  }
  const name = title[1].trim();

  if (lines.length < 5) {
    errors.push(`${prefix} (${name}): incomplete structure (need garnish, vessel, rim, ingredients, method)`);
  }

  const garnishRaw = lines[1] ? parseLabeledLine(lines[1].trim(), 'Garnish') : null;
  const vesselRaw = lines[2] ? parseLabeledLine(lines[2].trim(), 'Vessel') : null;
  const rimRaw = lines[3] ? parseLabeledLine(lines[3].trim(), 'Rim') : null;

  if (garnishRaw === null) {
    errors.push(`${prefix} (${name}): line 2 must be -Garnish: …-`);
  }
  if (vesselRaw === null || !vesselRaw.trim()) {
    errors.push(`${prefix} (${name}): line 3 must be -Vessel: <one glass>- with non-empty vessel`);
  }
  if (rimRaw === null) {
    errors.push(`${prefix} (${name}): line 4 must be -Rim: …- (use None if no rim)`);
  }

  const rest = lines.slice(4);
  let methodLabel: string | null = null;
  let methodId: DrinkMethodId | null = null;
  const bodyLines: string[] = [];

  for (const line of rest) {
    const t = line.trim();
    if (t === '---') continue;
    const methodMatch = t.match(METHOD_LINE_RE);
    if (methodMatch) {
      if (methodLabel !== null) {
        errors.push(`${prefix} (${name}): multiple method lines`);
      }
      methodLabel = methodMatch[1].trim();
      methodId = METHOD_LABEL_TO_ID[methodLabel] ?? null;
      if (!methodId) {
        errors.push(
          `${prefix} (${name}): invalid method "${methodLabel}" (allowed: ${Object.keys(METHOD_LABEL_TO_ID).filter((k) => !k.includes('+') && !k.includes('/ Ice')).join(', ')})`
        );
      }
      continue;
    }
    if (methodLabel !== null) {
      // ingredients after method
      if (t.startsWith('*') || VARIANT_HEADER_RE.test(t)) {
        errors.push(`${prefix} (${name}): content after method line is forbidden`);
      }
      continue;
    }
    bodyLines.push(t);
  }

  if (methodLabel === null || methodId === null) {
    errors.push(`${prefix} (${name}): missing **Method: <Label>** line`);
  }

  // Parse variants / ingredients from bodyLines
  type VAcc = { name: string; ings: StructuredIngredient[] };
  const variants: VAcc[] = [];
  let current: VAcc | null = null;
  let sawVariantHeader = false;

  const pushDefaultIfNeeded = () => {
    if (!current && variants.length === 0) {
      current = { name: 'Default', ings: [] };
    }
  };

  for (const t of bodyLines) {
    const vh = t.match(VARIANT_HEADER_RE);
    if (vh && !t.match(METHOD_LINE_RE)) {
      // not an ingredient
      const vname = vh[1].trim();
      if (/^Method:/i.test(vname)) continue;
      sawVariantHeader = true;
      if (current && current.ings.length === 0 && current.name === 'Default' && variants.length === 0) {
        // abandon empty default
        current = null;
      }
      if (current) variants.push(current);
      current = { name: vname, ings: [] };
      continue;
    }

    if (t.includes('/')) {
      // slash-choice forbidden on ingredient lines
      if (t.startsWith('*')) {
        errors.push(`${prefix} (${name}): slash-choices forbidden on ingredient lines: ${t}`);
        continue;
      }
    }

    const ing = t.match(INGREDIENT_RE);
    if (ing) {
      pushDefaultIfNeeded();
      if (!current) current = { name: 'Default', ings: [] };
      const amountOz = parseFloat(ing[1]);
      const sourceName = ing[2].trim();
      if (!sourceName) {
        errors.push(`${prefix} (${name}): ingredient missing name`);
        continue;
      }
      if (/[¼½¾⅓⅔⅛⅜⅝⅞]/.test(t) || /\d+\s+\d+\/\d+/.test(t)) {
        errors.push(`${prefix} (${name}): unicode/mixed fractions forbidden: ${t}`);
        continue;
      }
      current.ings.push({ amountOz, sourceName });
      continue;
    }

    // Legacy-looking ingredient without oz
    if (t.startsWith('*')) {
      errors.push(
        `${prefix} (${name}): ingredient must match "* <decimal>oz <Name>": ${t}`
      );
      continue;
    }

    errors.push(`${prefix} (${name}): unexpected line: ${t}`);
  }

  if (current) variants.push(current);

  if (variants.length === 0) {
    errors.push(`${prefix} (${name}): at least one ingredient required`);
  }

  for (const v of variants) {
    if (v.ings.length === 0) {
      errors.push(`${prefix} (${name}): variant "${v.name}" has no ingredients (partial variants forbidden)`);
    }
  }

  // Single-build should not require headers; multi needs headers — both OK
  if (!sawVariantHeader && variants.length === 1) {
    variants[0].name = 'Default';
  }

  if (errors.length > 0 || !methodId || !methodLabel || vesselRaw === null || !vesselRaw.trim()) {
    return { errors };
  }

  const garnishes = parseCommaList(garnishRaw ?? 'None');
  const rims = parseCommaList(rimRaw ?? 'None');

  const drink: StructuredDrink = {
    name,
    garnishes,
    vessel: vesselRaw.trim(),
    rims,
    variants: variants.map((v) => ({
      variantName: v.name,
      ingredients: v.ings,
    })),
    methodLabel,
    methodId,
    rawBlock: block,
  };

  return { drink, errors: [] };
}

/**
 * Parse + validate full mode menu markdown.
 */
export function validateModeMenu(md: string): ValidationResult {
  const errors: string[] = [];
  const blocks = splitBlocks(md);

  if (blocks.length === 0) {
    return { ok: false, errors: ['Menu is empty or has no ## drink blocks'] };
  }

  const drinks: StructuredDrink[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.startsWith('## ')) {
      errors.push(`Block ${i + 1}: must start with ## Name`);
      continue;
    }
    // Require --- separator: either ends with --- or is not last without ---
    // RE: require --- for every block including last
    if (!/(^|\n)---\s*$/.test(block.trim()) && !md.includes(block.trim() + '\n---')) {
      // Allow if following content has --- after block in original — check block ends with ---
      const endsWithRule = /---\s*$/.test(block.trim());
      if (!endsWithRule) {
        // soft: if file has --- between blocks, split may strip last --- onto next
        // Re-check: blocks from split on ## may keep trailing ---
        if (!block.includes('---')) {
          errors.push(`Drink block ${i + 1}: missing trailing --- separator`);
        }
      }
    }

    const { drink, errors: be } = parseDrinkBlock(block, i);
    errors.push(...be);
    if (drink) drinks.push(drink);
  }

  // Prose outside: any non-empty content before first ##
  const before = md.split(/^##\s/m)[0]?.trim();
  if (before && !before.startsWith('#')) {
    // allow empty
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  if (drinks.length === 0) {
    return { ok: false, errors: ['No valid drinks parsed'] };
  }
  return { ok: true, drinks };
}

export function parseModeMenuMarkdown(md: string): ValidationResult {
  return validateModeMenu(md);
}

export function assertDrinkMethodId(v: string): v is DrinkMethodId {
  return (DRINK_METHOD_IDS as readonly string[]).includes(v);
}

/** Serialize a structured drink back to template markdown (for append). */
export function formatDrinkBlock(drink: StructuredDrink): string {
  const garn =
    drink.garnishes.length === 0 ? 'None' : drink.garnishes.join(', ');
  const rim = drink.rims.length === 0 ? 'None' : drink.rims.join(', ');
  const multi =
    drink.variants.length > 1 || drink.variants[0]?.variantName !== 'Default';
  const out: string[] = [
    `## ${drink.name}`,
    `-Garnish: ${garn}-`,
    `-Vessel: ${drink.vessel}-`,
    `-Rim: ${rim}-`,
  ];
  for (const v of drink.variants) {
    if (multi) out.push(`**${v.variantName}**`);
    for (const ing of v.ingredients) {
      const amt = ing.amountOz;
      const amtStr = Number.isInteger(amt) ? `${amt}.0` : String(amt);
      out.push(`* ${amtStr}oz ${ing.sourceName}`);
    }
  }
  out.push(
    `**Method: ${METHOD_ID_TO_LABEL[drink.methodId] ?? drink.methodLabel}**`
  );
  out.push('---');
  return out.join('\n');
}
