import { FreestyleManifest } from './Manifest';
import type { MappingAuditRecipe } from '../utils/LLMMenuMapper';

export interface CocktailRecipe {
  name: string;
  vessel: string;
  validRims: string[];
  agitation: string;
  garnishes: string[];
  variants: {
    variantName: string;
    ingredients: Record<string, number>;
  }[];
  /** B+ mapping audit for operator/receipt display */
  mappingAudit?: MappingAuditRecipe;
}

/**
 * Pin a multi-variant catalog recipe to a single order variant (deep copy).
 * Used so receipts/validation represent one drink SKU, not every variation.
 */
export function pinRandomVariant(recipe: CocktailRecipe): CocktailRecipe {
  const sourceVariants =
    recipe.variants && recipe.variants.length > 0
      ? recipe.variants
      : [{ variantName: 'Default', ingredients: {} as Record<string, number> }];

  const chosen = sourceVariants[Math.floor(Math.random() * sourceVariants.length)];
  const audit = recipe.mappingAudit
    ? {
        ...recipe.mappingAudit,
        variants: (recipe.mappingAudit.variants || []).filter(
          (v) => v.variantName === chosen.variantName
        ),
      }
    : undefined;

  return {
    name: recipe.name,
    vessel: recipe.vessel,
    validRims: [...(recipe.validRims || [])],
    agitation: recipe.agitation,
    garnishes: [...(recipe.garnishes || [])],
    variants: [
      {
        variantName: chosen.variantName,
        ingredients: { ...chosen.ingredients },
      },
    ],
    mappingAudit: audit,
  };
}

export class RecipeManager {
  private activeMode: string = 'OBELISCO';
  private modes: Record<string, CocktailRecipe[]> = {};
  private manifest: FreestyleManifest;

  constructor(manifest: FreestyleManifest, recipes: CocktailRecipe[]) {
    this.manifest = manifest;
    this.activeMode = manifest.modeName;
    this.modes[manifest.modeName] = recipes;
  }

  getRandomTicket(): CocktailRecipe | null {
    const currentRecipes = this.modes[this.activeMode];
    if (!currentRecipes || currentRecipes.length === 0) return null;
    const recipe = currentRecipes[Math.floor(Math.random() * currentRecipes.length)];
    return pinRandomVariant(recipe);
  }

  /**
   * Validates a built drink against a pinned ticket (exactly one order variant).
   * Sibling catalog variants are not accepted.
   */
  validateDrink(d: any, t: CocktailRecipe): string[] {
    const err: string[] = [];
    if (d.vessel !== t.vessel) err.push(`[GLS] Expected ${t.vessel}, Got ${d.vessel}`);
    const userRim = d.rim || 'NONE';
    const validRims = t.validRims && t.validRims.length > 0 ? t.validRims : ['NONE'];
    if (!validRims.includes(userRim)) {
      err.push(`[RIM] Expected one of [${validRims.join(', ')}], Got ${userRim}`);
    }

    const v = t.variants?.[0];
    if (v) {
      for (const k of Object.keys(v.ingredients)) {
        const expected = v.ingredients[k];
        const got = d.ingredients?.[k] || 0;
        if (Math.abs(expected - got) > 0.05) {
          err.push(`[ING] ${k}: Expected ${expected}, Got ${got}`);
        }
      }
      for (const k of Object.keys(d.ingredients || {})) {
        if (v.ingredients[k] === undefined && d.ingredients[k] > 0) {
          err.push(`[ING] ${k}: Overpour (Not in Recipe)`);
        }
      }
    }

    if (t.agitation !== d.agitation) {
      err.push(`[MTD] Expected ${t.agitation}, Got ${d.agitation}`);
    }

    const appliedGarnishes = (d.garnishes || []).map((g: any) =>
      typeof g === 'string' ? g : g.id
    );

    t.garnishes.forEach((g: string) => {
      if (!appliedGarnishes.includes(g)) err.push(`[GRN] Missing ${g}`);
    });

    appliedGarnishes.forEach((g: string) => {
      if (!t.garnishes.includes(g)) err.push(`[GRN] Extra/Invalid Garnish Applied: ${g}`);
    });

    return err;
  }
}
