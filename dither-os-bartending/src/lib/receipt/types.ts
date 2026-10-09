import type { CocktailRecipe } from '@/data/RecipeManager';

/** Fixed thermal white only — multi-color styles removed. */
export type PaperStyleKey = 'white';

export type ReceiptPhase = 'printing' | 'free';

export type ReceiptLine = {
  label: string;
  /** Right-hand secondary text (price or value). */
  value: string;
  /** When true, treated as a commercial/price line for copy formatting. */
  commercial?: boolean;
  /** B+ mapping audit: template source phrase */
  sourceLabel?: string;
  /** B+ mapped Manifest id */
  mappedId?: string;
  /** Highlight generic/suspect mapping for operator inspect */
  flagged?: boolean;
  generic?: boolean;
};

/** Structured money line frozen at print (menu JSON when available). */
export type PricedLine = {
  id?: string;
  label: string;
  amount: number;
  kind?: 'drink' | 'ingredient' | 'garnish' | 'other';
};

/** Print-time frozen pricing — summary TOTAL and full commercial share this. */
export type PricedOrder = {
  lines: PricedLine[];
  subtotal: number;
  tax: number;
  total: number;
};

/** Display strings derived once from PricedOrder (no re-price on render). */
export type ReceiptCommercial = {
  lines: ReceiptLine[];
  subtotal: string;
  tax: string;
  total: string;
};

export type ReceiptEntity = {
  instanceId: string;
  orderId: string;
  seed: string;
  paperStyle: PaperStyleKey;
  ticket: CocktailRecipe;
  issuedAt: Date;
  paid: boolean;
  /** Frozen priced order (menu-backed when upstream supplies prices). */
  pricedOrder: PricedOrder;
  /** Display commercial block derived from pricedOrder at create. */
  commercial: ReceiptCommercial;
  /** Full recipe rows — full Inspect face only. */
  bodyLines: ReceiptLine[];
  /** Compact ingredients cue for summary slip. */
  summaryIngredientsLine: string;
  phase: ReceiptPhase;
  crumpled: boolean;
  creased: boolean;
  inspected: boolean;
  position: { left: number; top: number };
  zIndex: number;
  /** When true, receipt is still inside the printer mask. */
  inMask: boolean;
  /** Success validate handoff — slide away then remove (FS37). */
  handoffExit?: boolean;
  /** FS51: character id bound at sit-complete print; absent = legacy/unattached */
  characterId?: string;
  /** FS51: bar_seat_* id bound at sit-complete print */
  seatId?: string;
};

export type CreateReceiptOptions = {
  /** Upstream-supplied pricing; skips interim resolver when present. */
  pricedOrder?: PricedOrder;
  /** Optional menu id → unit price (future menu JSON). */
  priceTable?: Record<string, number>;
  /** FS51: character id bound at sit-complete print */
  characterId?: string;
  /** FS51: bar_seat_* id bound at sit-complete print */
  seatId?: string;
};
