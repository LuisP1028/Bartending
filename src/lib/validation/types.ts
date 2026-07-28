export interface Variant {
  variantName: string;
  ingredients: Record<string, number>;
}

export interface Recipe {
  name: string;
  vessel: string;
  validRims: string[];
  agitation: string;
  garnishes: string[];
  variants: Variant[];
}

export interface ModeData {
  modeName: string;
  recipes: Recipe[];
}

export interface Ticket {
  name: string;
  vessel: string;
  validRims: string[];
  agitation: string;
  garnishes: string[];
  variantName: string;
  ingredients: Record<string, number>;
}
