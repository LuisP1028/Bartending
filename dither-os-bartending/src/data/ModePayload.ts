import { AbstractRestaurantPayload } from './AbstractRestaurantPayload';
import { CocktailRecipe } from './RecipeManager';
import {
  NormalizedRestaurantPayload,
  type MappingAudit,
  type MappingAuditRecipe,
} from '../utils/LLMMenuMapper';

/**
 * Generic mode payload wrapper (Obelisco and any mode name).
 * Preserves optional mappingAudit for B+ receipt / operator inspect.
 */
export class ModePayload extends AbstractRestaurantPayload {
  readonly modeName: string;
  readonly recipes: CocktailRecipe[];
  readonly mappingAudit?: MappingAudit;

  constructor(rawJson: NormalizedRestaurantPayload) {
    super();
    this.modeName = rawJson.modeName;
    this.mappingAudit = rawJson.mappingAudit;
    const auditByName = new Map<string, MappingAuditRecipe>();
    for (const a of rawJson.mappingAudit?.recipes || []) {
      auditByName.set(a.name, a);
    }
    this.recipes = rawJson.recipes.map((r) => {
      const audit = r.mappingAudit || auditByName.get(r.name);
      return {
        name: r.name,
        vessel: r.vessel,
        validRims: r.validRims || [],
        agitation: r.agitation,
        garnishes: r.garnishes || [],
        variants: r.variants || [],
        mappingAudit: audit,
      };
    });
  }
}

/** @deprecated use ModePayload */
export { ModePayload as ObeliscoPayload };
