/**
 * Whole-dollar greedy breakdown for Monopoly money fanout (FS47 / FS49).
 * Denominations: 500, 100, 50, 20, 10, 5, 1.
 */

/** Product bill display width (% of viewport). Operator lock: 15vw. */
export const PRODUCT_MONEY_WIDTH_VW = 15;

export const MONEY_DENOMS_DESC: readonly number[] = [
  500, 100, 50, 20, 10, 5, 1,
] as const;

/**
 * @returns ordered list of face values (largest first); empty if none
 */
export function decomposeWholeDollars(total: number): number[] {
  if (!Number.isFinite(total)) return [];
  let whole = Math.max(0, Math.floor(total));
  if (whole === 0) return [];

  const out: number[] = [];
  for (const d of MONEY_DENOMS_DESC) {
    while (whole >= d) {
      out.push(d);
      whole -= d;
    }
  }
  return out;
}

export function moneyPublicSrc(denom: number): string {
  return `/assets/money/monopoly_${denom}.png`;
}
