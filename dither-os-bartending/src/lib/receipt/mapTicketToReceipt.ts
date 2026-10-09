import type { CocktailRecipe } from '@/data/RecipeManager';
import { FIXED_PAPER_STYLE } from './palettes';
import { formatMoney, priceTicket } from './priceTicket';
import {
  resolveDisplayName,
  resolveVesselDisplay,
  type DisplayNameResolver,
} from './displayNameRegistry';
import type {
  CreateReceiptOptions,
  PricedOrder,
  ReceiptCommercial,
  ReceiptEntity,
  ReceiptLine,
} from './types';

function cloneTicket(ticket: CocktailRecipe): CocktailRecipe {
  return {
    name: ticket.name,
    vessel: ticket.vessel,
    validRims: [...(ticket.validRims || [])],
    agitation: ticket.agitation,
    garnishes: [...(ticket.garnishes || [])],
    variants: (ticket.variants || []).map((v) => ({
      variantName: v.variantName,
      ingredients: { ...v.ingredients },
    })),
    mappingAudit: ticket.mappingAudit
      ? JSON.parse(JSON.stringify(ticket.mappingAudit))
      : undefined,
  };
}

function stableTicketFingerprint(ticket: CocktailRecipe): string {
  const variants = (ticket.variants || [])
    .map((v) => {
      const ings = Object.entries(v.ingredients)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, amt]) => `${k}:${amt}`)
        .join(',');
      return `${v.variantName}{${ings}}`;
    })
    .join('|');
  const rims = [...(ticket.validRims || [])].sort().join(',');
  const garn = [...(ticket.garnishes || [])].sort().join(',');
  return [
    ticket.name,
    ticket.vessel,
    ticket.agitation,
    rims,
    garn,
    variants,
  ].join('::');
}

/** Deterministic seed for barcode + remake identity. */
export function buildSeed(orderId: string, ticket: CocktailRecipe): string {
  const fp = stableTicketFingerprint(ticket);
  let h = 0;
  for (let i = 0; i < fp.length; i++) {
    h = (Math.imul(31, h) + fp.charCodeAt(i)) | 0;
  }
  const frag = Math.abs(h).toString(36).toUpperCase().slice(0, 8);
  const nameFrag = ticket.name.replace(/\s+/g, '').slice(0, 6).toUpperCase();
  return `${orderId}-${nameFrag}-${frag}`;
}

export function makeOrderId(): string {
  return `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Count-form ingredients summary for free-paper summary slip (selected variant only). */
export function buildIngredientsSummary(ticket: CocktailRecipe): string {
  const selected = ticket.variants?.[0];
  const ingCount = selected ? Object.keys(selected.ingredients || {}).length : 0;
  const garnCount = (ticket.garnishes || []).length;
  const parts: string[] = [];
  parts.push(`${ingCount} ingredient${ingCount === 1 ? '' : 's'}`);
  parts.push(`${garnCount} garnish${garnCount === 1 ? '' : 'es'}`);
  return parts.join(' · ');
}

/**
 * Full-face body lines. Ingredient/garnish/rim names use manifest `label` via resolve.
 * Ticket ids remain on entity.ticket for validation/remake.
 */
export function buildBodyLines(
  ticket: CocktailRecipe,
  resolveName: DisplayNameResolver = resolveDisplayName
): ReceiptLine[] {
  const audit = ticket.mappingAudit;
  const lines: ReceiptLine[] = [
    { label: ticket.name, value: '' },
    {
      label: 'VESSEL',
      value: resolveVesselDisplay(ticket.vessel),
      sourceLabel: audit?.vessel?.source,
      mappedId: audit?.vessel?.id || ticket.vessel,
    },
    { label: 'METHOD', value: ticket.agitation },
  ];

  // Orders are pinned to a single variant (variants[0]); never dump the catalog menu.
  const selectedVariant = ticket.variants?.[0];
  if (selectedVariant) {
    lines.push({ label: `[${selectedVariant.variantName}]`, value: '' });
    const auditVar =
      audit?.variants?.find((v) => v.variantName === selectedVariant.variantName) ||
      audit?.variants?.[0];
    const auditById = new Map(
      (auditVar?.ingredients || []).map((i) => [i.id, i] as const)
    );

    Object.entries(selectedVariant.ingredients).forEach(([ingId, amt]) => {
      const a = auditById.get(ingId);
      const display = resolveName(ingId);
      const source = a?.source;
      const flagged = !!(a?.flagged || a?.generic);
      // Player-facing: Manifest label only (no menu source → trail, no ⚠ chrome).
      const label = `  ${display}`;
      lines.push({
        label,
        value: `${amt} oz`,
        sourceLabel: source,
        mappedId: ingId,
        flagged,
        generic: a?.generic,
      });
    });
  }

  if (ticket.garnishes && ticket.garnishes.length > 0) {
    ticket.garnishes.forEach((g, i) => {
      const ga = audit?.garnishes?.[i];
      lines.push({
        label: `+ ${resolveName(g)}`,
        value: 'GRN',
        sourceLabel: ga?.source,
        mappedId: g,
      });
    });
  }

  const rims = ticket.validRims || [];
  const meaningfulRims = rims.filter((r) => r && r !== 'NONE');
  if (meaningfulRims.length > 0) {
    lines.push({
      label: 'RIMS',
      value: meaningfulRims.map((r) => resolveName(r)).join(', '),
    });
  }

  return lines;
}

/** Derive display commercial strings once from frozen priced order. */
export function commercialFromPricedOrder(priced: PricedOrder): ReceiptCommercial {
  return {
    lines: priced.lines.map((l) => ({
      label: l.label,
      value: formatMoney(l.amount),
      commercial: true,
    })),
    subtotal: priced.subtotal.toFixed(2),
    tax: priced.tax.toFixed(2),
    total: priced.total.toFixed(2),
  };
}

/** Ensure commercial labels are display-safe (drink name stays human; no garnish clones). */
function prettyPricedOrder(
  priced: PricedOrder,
  resolveName: DisplayNameResolver
): PricedOrder {
  return {
    ...priced,
    lines: priced.lines.map((l) => {
      // Prefer not to re-pretty drink titles; asset lines if any use catalog names
      if (l.kind === 'drink' || !l.id) return l;
      if (l.kind === 'garnish') {
        // Spec: avoid commercial garnish list; if present, still pretty
        return { ...l, label: `+ ${resolveName(l.id)}` };
      }
      return { ...l, label: resolveName(l.id) };
    }),
  };
}

export function createReceiptEntity(
  ticket: CocktailRecipe,
  zIndex: number,
  options?: CreateReceiptOptions
): ReceiptEntity {
  const cloned = cloneTicket(ticket);
  const orderId = makeOrderId();
  const seed = buildSeed(orderId, cloned);
  const issuedAt = new Date();
  const resolveName = resolveDisplayName;

  let pricedOrder: PricedOrder =
    options?.pricedOrder ??
    priceTicket(cloned, options?.priceTable, resolveName);

  // If caller supplied a raw pricedOrder, still pretty-print asset lines
  if (options?.pricedOrder) {
    pricedOrder = prettyPricedOrder(pricedOrder, resolveName);
  }

  return {
    instanceId: `rcpt-${orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    orderId,
    seed,
    paperStyle: FIXED_PAPER_STYLE,
    ticket: cloned,
    issuedAt,
    paid: false,
    pricedOrder,
    commercial: commercialFromPricedOrder(pricedOrder),
    bodyLines: buildBodyLines(cloned, resolveName),
    summaryIngredientsLine: buildIngredientsSummary(cloned),
    phase: 'printing',
    crumpled: false,
    creased: false,
    inspected: false,
    position: { left: 0, top: 0 },
    zIndex,
    inMask: true,
    ...(options?.characterId ? { characterId: options.characterId } : {}),
    ...(options?.seatId ? { seatId: options.seatId } : {}),
  };
}

/** Full recipe + frozen prices for clipboard (pretty names, not raw ids). */
export function formatRecipeClipboard(entity: ReceiptEntity): string {
  const t = entity.ticket;
  const resolveName = resolveDisplayName;
  const lines: string[] = [
    `DITHER-OS RECIPE [${entity.orderId}]`,
    `SEED: ${entity.seed}`,
    `DRINK: ${t.name}`,
    `VESSEL: ${resolveVesselDisplay(t.vessel)}`,
    `METHOD: ${t.agitation}`,
  ];

  if (t.validRims?.length) {
    const rimText = t.validRims
      .filter((r) => r && r !== 'NONE')
      .map((r) => resolveName(r))
      .join(', ');
    if (rimText) lines.push(`RIMS: ${rimText}`);
  }
  if (t.garnishes?.length) {
    lines.push(
      `GARNISHES: ${t.garnishes.map((g) => resolveName(g)).join(', ')}`
    );
  }
  const selected = t.variants?.[0];
  if (selected) {
    lines.push(`[${selected.variantName}]`);
    Object.entries(selected.ingredients).forEach(([id, amt]) => {
      lines.push(`  ${resolveName(id)}: ${amt} oz`);
    });
  }

  lines.push('--- PRICING ---');
  entity.pricedOrder.lines.forEach((l) => {
    lines.push(`${l.label.padEnd(24)} ${formatMoney(l.amount)}`);
  });
  if (entity.pricedOrder.tax > 0) {
    lines.push(`SUBTOTAL                 ${formatMoney(entity.pricedOrder.subtotal)}`);
    lines.push(`TAX                      ${formatMoney(entity.pricedOrder.tax)}`);
  }
  lines.push(`TOTAL:                   ${formatMoney(entity.pricedOrder.total)}`);
  return lines.join('\n');
}
