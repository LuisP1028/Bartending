import { FreestyleManifest, DefaultFreestyleManifest, PayloadManifest } from './Manifest';
import { RecipeManager, CocktailRecipe } from './RecipeManager';
import { AbstractRestaurantPayload } from './AbstractRestaurantPayload';

export abstract class RestaurantMode {
  abstract readonly modeName: string;
  abstract getManifest(): FreestyleManifest;
  abstract getRecipeManager(): RecipeManager;
}

export class FreestyleMode extends RestaurantMode {
  readonly modeName = 'FREESTYLE';
  private manifest: FreestyleManifest;
  private recipes: CocktailRecipe[];
  private manager: RecipeManager;

  constructor() {
    super();
    this.manifest = new DefaultFreestyleManifest();
    this.recipes = [];
    this.manager = new RecipeManager(this.manifest, this.recipes);
  }

  getManifest(): FreestyleManifest {
    return this.manifest;
  }

  getRecipeManager(): RecipeManager {
    return this.manager;
  }
}

export class ConfiguredRestaurantMode extends RestaurantMode {
  readonly modeName: string;
  private manifest: FreestyleManifest;
  private manager: RecipeManager;

  constructor(payload: AbstractRestaurantPayload, globalManifest?: FreestyleManifest) {
    super();
    this.modeName = payload.modeName;
    const base = globalManifest || new DefaultFreestyleManifest();
    this.manifest = new PayloadManifest(payload, base);
    
    const recipes: CocktailRecipe[] = payload.recipes;
    
    this.manager = new RecipeManager(this.manifest, recipes);
  }

  getManifest(): FreestyleManifest {
    return this.manifest;
  }

  getRecipeManager(): RecipeManager {
    return this.manager;
  }
}
