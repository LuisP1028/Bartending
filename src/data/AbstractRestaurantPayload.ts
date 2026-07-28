import { CocktailRecipe } from './RecipeManager';

export abstract class AbstractRestaurantPayload {
  abstract readonly modeName: string;
  abstract readonly recipes: CocktailRecipe[];
}
