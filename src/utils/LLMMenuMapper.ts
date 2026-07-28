import { FreestyleManifest } from '../data/Manifest';
import { isDrinkMethodId, type DrinkMethodId } from '../data/methods';
import {
  isGenericSourceName,
  validateModeMenu,
  type StructuredDrink,
} from '../lib/menu/templateSchema';
import * as fs from 'fs';

export interface RawMenuIngredient {
  name: string;
  amount: string;
}

export interface RawMenuRecipe {
  name: string;
  vessel: string;
  ingredients: string[] | RawMenuIngredient[];
  agitation?: string;
  garnishes?: string[];
}

export interface RawRestaurantMenu {
  modeName: string;
  rawMenu: RawMenuRecipe[] | string;
}

export interface MappingAuditIngredient {
  source: string;
  id: string;
  oz: number;
  generic?: boolean;
  flagged?: boolean;
}

export interface MappingAuditRecipe {
  name: string;
  vessel?: { source: string; id: string };
  rims?: { source: string; id: string }[];
  garnishes?: { source: string; id: string }[];
  variants: {
    variantName: string;
    ingredients: MappingAuditIngredient[];
  }[];
}

export interface MappingAudit {
  recipes: MappingAuditRecipe[];
}

export interface NormalizedRestaurantPayload {
  modeName: string;
  recipes: {
    name: string;
    vessel: string;
    validRims: string[];
    agitation: string;
    garnishes: string[];
    variants: {
      variantName: string;
      ingredients: Record<string, number>;
    }[];
    /** Optional per-recipe audit slice (also on root mappingAudit). */
    mappingAudit?: MappingAuditRecipe;
  }[];
  mappingAudit?: MappingAudit;
}

export const MAPPING_SYSTEM_PROMPT = `
You are an expert mixology data parser for DITHER-OS. Map one structured cocktail into JSON.

CRITICAL:
1. Use ONLY exact IDs from ALLOWED_DATABASE (real id strings like tequilareposado, juicefreshlime — never invented ids).
2. Closest-archetype mapping for brands/display names (e.g. Casamigos Reposado → tequilareposado).
3. Quantities are already decimal ounces — keep them.
4. agitation MUST be exactly one of: BUILT, BOSTON_SHAKER_TIN, STIRRED, "Shake/Double Strain", "Dry Shake/Ice Shake/Double Strain".
5. variants MUST be 1:1 with the input variants (same names, full ingredients each). Do NOT invent slash expansions or extra variants.
6. Include mappingAudit mirroring each mapped field with source display strings from the input.
7. Output ONLY valid JSON (no markdown fences, no prose).

Schema:
{
  "modeName": "STRING",
  "recipes": [
    {
      "name": "STRING",
      "vessel": "GLASSWARE_ID",
      "validRims": ["RIM_ID_OR_NONE"],
      "agitation": "DrinkMethod_ID",
      "garnishes": ["GARNISH_ID"],
      "variants": [
        { "variantName": "STRING", "ingredients": { "INGREDIENT_ID": 1.0 } }
      ]
    }
  ],
  "mappingAudit": {
    "recipes": [
      {
        "name": "STRING",
        "vessel": { "source": "display", "id": "GLASSWARE_ID" },
        "rims": [{ "source": "display", "id": "RIM_ID" }],
        "garnishes": [{ "source": "display", "id": "GARNISH_ID" }],
        "variants": [
          {
            "variantName": "STRING",
            "ingredients": [
              { "source": "display", "id": "INGREDIENT_ID", "oz": 1.0, "generic": false, "flagged": false }
            ]
          }
        ]
      }
    ]
  }
}

ALLOWED_DATABASE:
{ALLOWED_DATABASE}
`;

export function generatePrompt(allowedDbObject: unknown): string {
  return MAPPING_SYSTEM_PROMPT.replace(
    '{ALLOWED_DATABASE}',
    JSON.stringify(allowedDbObject, null, 2)
  );
}

function buildAllowedDb(manifest: FreestyleManifest, drink: StructuredDrink) {
  const text = JSON.stringify(drink).toLowerCase();
  const allowed: Record<string, string[]> = {
    LIQUORS: manifest.getLiquors().map((l) => l.id),
    SYRUPS: manifest.getSyrups().map((s) => s.id),
    GLASSWARE: manifest.getGlasses().map((g) => g.id),
    RIMS: manifest.getRims().map((r) => r.id),
    GARNISHES: manifest.getGarnishes().map((g) => g.id),
    AGITATION: [
      'BUILT',
      'BOSTON_SHAKER_TIN',
      'STIRRED',
      'Shake/Double Strain',
      'Dry Shake/Ice Shake/Double Strain',
    ],
    NONE: ['NONE'],
  };
  // always include full catalogs for rims/garnishes when present
  if (!text.match(/rim|salt|sugar|tajin|none/)) {
    /* keep rims for NONE */
  }
  return allowed;
}

function collectManifestIds(manifest: FreestyleManifest): {
  liquor: Set<string>;
  syrup: Set<string>;
  glass: Set<string>;
  rim: Set<string>;
  garnish: Set<string>;
  allIngredients: Set<string>;
} {
  const liquor = new Set(manifest.getLiquors().map((x) => x.id));
  const syrup = new Set(manifest.getSyrups().map((x) => x.id));
  const glass = new Set(manifest.getGlasses().map((x) => x.id));
  const rim = new Set(manifest.getRims().map((x) => x.id));
  rim.add('NONE');
  const garnish = new Set(manifest.getGarnishes().map((x) => x.id));
  const allIngredients = new Set([...liquor, ...syrup]);
  return { liquor, syrup, glass, rim, garnish, allIngredients };
}

export function validateMappedRecipe(
  recipe: NormalizedRestaurantPayload['recipes'][0],
  structured: StructuredDrink,
  manifest: FreestyleManifest
): string[] {
  const err: string[] = [];
  const ids = collectManifestIds(manifest);

  if (!isDrinkMethodId(recipe.agitation)) {
    err.push(`Invalid agitation "${recipe.agitation}" for ${recipe.name}`);
  }
  if (recipe.agitation !== structured.methodId) {
    // allow LLM to use correct id; prefer structured if mismatch on free string already caught
  }
  if (!ids.glass.has(recipe.vessel)) {
    err.push(`Orphan vessel id "${recipe.vessel}" for ${recipe.name}`);
  }
  for (const r of recipe.validRims || []) {
    if (!ids.rim.has(r)) err.push(`Orphan rim id "${r}" for ${recipe.name}`);
  }
  for (const g of recipe.garnishes || []) {
    if (!ids.garnish.has(g)) err.push(`Orphan garnish id "${g}" for ${recipe.name}`);
  }
  const expectedVariantCount = structured.variants.length;
  if ((recipe.variants || []).length !== expectedVariantCount) {
    err.push(
      `Variant count mismatch for ${recipe.name}: expected ${expectedVariantCount}, got ${recipe.variants?.length ?? 0}`
    );
  }
  for (const v of recipe.variants || []) {
    for (const id of Object.keys(v.ingredients || {})) {
      if (!ids.allIngredients.has(id)) {
        err.push(`Orphan ingredient id "${id}" in ${recipe.name} / ${v.variantName}`);
      }
    }
  }
  return err;
}

function flagAuditGenerics(audit: MappingAuditRecipe | undefined): MappingAuditRecipe | undefined {
  if (!audit) return audit;
  return {
    ...audit,
    variants: audit.variants.map((v) => ({
      ...v,
      ingredients: v.ingredients.map((ing) => {
        const generic = isGenericSourceName(ing.source) || !!ing.generic;
        return {
          ...ing,
          generic,
          flagged: generic || !!ing.flagged,
        };
      }),
    })),
  };
}

function synthesizeAuditFromStructured(
  structured: StructuredDrink,
  recipe: NormalizedRestaurantPayload['recipes'][0]
): MappingAuditRecipe {
  return {
    name: recipe.name,
    vessel: { source: structured.vessel, id: recipe.vessel },
    rims: (recipe.validRims || []).map((id, i) => ({
      source: structured.rims[i] || (id === 'NONE' ? 'None' : id),
      id,
    })),
    garnishes: (recipe.garnishes || []).map((id, i) => ({
      source: structured.garnishes[i] || id,
      id,
    })),
    variants: (recipe.variants || []).map((v, vi) => {
      const srcVar = structured.variants[vi];
      const entries = Object.entries(v.ingredients || {});
      return {
        variantName: v.variantName,
        ingredients: entries.map(([id, oz], ii) => {
          const source = srcVar?.ingredients[ii]?.sourceName || id;
          const generic = isGenericSourceName(source);
          return { source, id, oz, generic, flagged: generic };
        }),
      };
    }),
  };
}

async function mapStructuredDrink(
  manifest: FreestyleManifest,
  drink: StructuredDrink,
  modeName: string
): Promise<{
  recipe: NormalizedRestaurantPayload['recipes'][0];
  audit: MappingAuditRecipe;
}> {
  const allowedDbObject = buildAllowedDb(manifest, drink);
  const systemPrompt = generatePrompt(allowedDbObject);
  const model = process.env.HUGGINGFACE_MODEL || 'deepseek-ai/DeepSeek-V4-Pro';
  const token = process.env.HUGGINGFACE_TOKEN;

  if (!token) {
    throw new Error('HUGGINGFACE_TOKEN is required for menu mapping');
  }

  const userPayload = {
    modeName,
    drink: {
      name: drink.name,
      vessel: drink.vessel,
      garnishes: drink.garnishes.length ? drink.garnishes : ['None'],
      rims: drink.rims.length ? drink.rims : ['None'],
      agitation: drink.methodId,
      variants: drink.variants,
    },
  };

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

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || String(content).trim().length === 0) {
    throw new Error('Context Limit Exceeded');
  }

  fs.appendFileSync('debug_llm_raw_output.txt', content + '\n\n');

  const jsonMatch = String(content).match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;
  const parsed = JSON.parse(jsonStr) as NormalizedRestaurantPayload;

  let recipe = parsed.recipes?.[0];
  if (!recipe) {
    throw new Error(`Mapper returned no recipe for ${drink.name}`);
  }

  // Force method from template (source of truth)
  recipe = {
    ...recipe,
    name: recipe.name || drink.name,
    agitation: drink.methodId as DrinkMethodId,
  };

  let audit =
    parsed.mappingAudit?.recipes?.[0] ||
    (recipe as { mappingAudit?: MappingAuditRecipe }).mappingAudit ||
    synthesizeAuditFromStructured(drink, recipe);
  audit = flagAuditGenerics(audit)!;
  audit.name = recipe.name;

  const postErr = validateMappedRecipe(recipe, drink, manifest);
  if (postErr.length) {
    throw new Error(`Post-parse validation failed for ${drink.name}:\n${postErr.join('\n')}`);
  }

  return {
    recipe: { ...recipe, mappingAudit: audit },
    audit,
  };
}

export interface FetchMappingInput {
  modeName: string;
  /** Validated template markdown string */
  rawMenu: string;
}

/**
 * Map a template-validated mode menu to NormalizedRestaurantPayload.
 * Hard-fails on invalid template or orphan IDs.
 */
export async function fetchDeepSeekMapping(
  manifest: FreestyleManifest,
  rawMenu: FetchMappingInput
): Promise<NormalizedRestaurantPayload> {
  fs.writeFileSync('debug_llm_raw_output.txt', '');

  const modeName = rawMenu.modeName;
  const md = rawMenu.rawMenu;
  const v = validateModeMenu(md);
  if (!v.ok) {
    throw new Error(
      `Template validation failed — mapper refused:\n${v.errors.join('\n')}`
    );
  }

  const normalizedRecipes: NormalizedRestaurantPayload['recipes'] = [];
  const audits: MappingAuditRecipe[] = [];

  console.log(`\n[RAG] Starting iterative mapping for mode: ${modeName}`);
  console.log(`[RAG] Total recipes to process: ${v.drinks.length}\n`);

  for (let i = 0; i < v.drinks.length; i++) {
    const drink = v.drinks[i];
    console.log(
      `[RAG] -> Mapping "${drink.name}" (${i + 1}/${v.drinks.length})...`
    );
    const start = Date.now();
    const { recipe, audit } = await mapStructuredDrink(manifest, drink, modeName);
    console.log(
      `[RAG] <- Mapped "${drink.name}" in ${((Date.now() - start) / 1000).toFixed(1)}s.`
    );
    normalizedRecipes.push(recipe);
    audits.push(audit);
  }

  console.log(`\n[RAG] Mapping complete for ${modeName}.`);

  return {
    modeName,
    recipes: normalizedRecipes,
    mappingAudit: { recipes: audits },
  };
}

