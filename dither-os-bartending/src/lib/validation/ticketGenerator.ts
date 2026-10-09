import type { ModeData, Ticket } from './types';

export function generateTicket(modeData: ModeData): Ticket | null {
  if (!modeData || !modeData.recipes || modeData.recipes.length === 0) {
    return null;
  }

  // Select a random recipe
  const recipeIndex = Math.floor(Math.random() * modeData.recipes.length);
  const recipe = modeData.recipes[recipeIndex];

  // Select a random variant
  let variantName = "Default";
  let ingredients: Record<string, number> = {};

  if (recipe.variants && recipe.variants.length > 0) {
    const variantIndex = Math.floor(Math.random() * recipe.variants.length);
    const variant = recipe.variants[variantIndex];
    variantName = variant.variantName;
    ingredients = { ...variant.ingredients };
  }

  return {
    name: recipe.name,
    vessel: recipe.vessel,
    validRims: [...(recipe.validRims || [])],
    agitation: recipe.agitation,
    garnishes: [...(recipe.garnishes || [])],
    variantName,
    ingredients,
  };
}
