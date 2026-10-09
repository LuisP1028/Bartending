import type { CocktailRecipe } from '@/data/RecipeManager';
import type { PricedLine, PricedOrder } from './types';
import {
  resolveDisplayName,
  type DisplayNameResolver,
} from './displayNameRegistry';

/**
 * Resolve sell prices for a ticket into a frozen PricedOrder.
 *
 * Commercial listing: one primary order/drink charge (garnish fees folded in).
 * Does not re-list each garnish as a separate commercial row (those appear
 * once in the recipe body with GRN). System `id` on the drink line is the
 * drink name; amounts stay deterministic for interim pricing.
 */
export function priceTicket(
  ticket: CocktailRecipe,
  priceTable?: Record<string, number>,
  resolveName: DisplayNameResolver = resolveDisplayName
): PricedOrder {
  if (priceTable && Object.keys(priceTable).length > 0) {
    return priceFromMenuTable(ticket, priceTable, resolveName);
  }
  return priceTicketInterim(ticket, resolveName);
}

function priceFromMenuTable(
  ticket: CocktailRecipe,
  priceTable: Record<string, number>,
  resolveName: DisplayNameResolver
): PricedOrder {
  let drinkAmount = 0;
  let hasDrink = false;

  const drinkKey = ticket.name;
  if (typeof priceTable[drinkKey] === 'number') {
    drinkAmount += priceTable[drinkKey];
    hasDrink = true;
  }

  const variant = ticket.variants?.[0];
  if (variant) {
    for (const [ingId] of Object.entries(variant.ingredients)) {
      if (typeof priceTable[ingId] === 'number') {
        drinkAmount += priceTable[ingId];
        hasDrink = true;
      }
    }
  }

  for (const g of ticket.garnishes || []) {
    if (typeof priceTable[g] === 'number') {
      drinkAmount += priceTable[g];
      hasDrink = true;
    }
  }

  // No menu matches → interim single charge
  if (!hasDrink) {
    return priceTicketInterim(ticket, resolveName);
  }

  const lines: PricedLine[] = [
    {
      id: ticket.name,
      label: ticket.name,
      amount: round2(drinkAmount),
      kind: 'drink',
    },
  ];

  return finalize(lines, 0);
}

/**
 * Deterministic interim pricing: one drink/order line.
 * Garnish add-ons are included in the amount (not listed again commercially).
 */
export function priceTicketInterim(
  ticket: CocktailRecipe,
  _resolveName: DisplayNameResolver = resolveDisplayName
): PricedOrder {
  const base = 6 + (stableHash(ticket.name) % 5); // $6–$10 by drink name
  let garnishFees = 0;
  for (const g of ticket.garnishes || []) {
    garnishFees += 1 + (stableHash(g) % 2); // $1 or $2 each, folded in
  }

  const lines: PricedLine[] = [
    {
      id: ticket.name,
      label: ticket.name,
      amount: round2(base + garnishFees),
      kind: 'drink',
    },
  ];

  return finalize(lines, 0);
}

function finalize(lines: PricedLine[], taxRate: number): PricedOrder {
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);
  return { lines, subtotal, tax, total };
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}
