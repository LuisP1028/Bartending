/**
 * Monopoly bill cutouts for scale calibration (/money-scale).
 * Public files are published under public/assets/money/ from Assets_N/*_nobg.png.
 */

export type MoneyBill = {
  id: string;
  label: string;
  denomination: number;
  src: string;
  defaultWidthVw: number;
};

/** Default width as % of viewport width (operator tunes on /money-scale). */
export const DEFAULT_MONEY_WIDTH_VW = 28;

export const MONEY_BILLS: MoneyBill[] = [
  {
    id: '1',
    label: '$1',
    denomination: 1,
    src: '/assets/money/monopoly_1.png',
    defaultWidthVw: DEFAULT_MONEY_WIDTH_VW,
  },
  {
    id: '5',
    label: '$5',
    denomination: 5,
    src: '/assets/money/monopoly_5.png',
    defaultWidthVw: DEFAULT_MONEY_WIDTH_VW,
  },
  {
    id: '10',
    label: '$10',
    denomination: 10,
    src: '/assets/money/monopoly_10.png',
    defaultWidthVw: DEFAULT_MONEY_WIDTH_VW,
  },
  {
    id: '20',
    label: '$20',
    denomination: 20,
    src: '/assets/money/monopoly_20.png',
    defaultWidthVw: DEFAULT_MONEY_WIDTH_VW,
  },
  {
    id: '50',
    label: '$50',
    denomination: 50,
    src: '/assets/money/monopoly_50.png',
    defaultWidthVw: DEFAULT_MONEY_WIDTH_VW,
  },
  {
    id: '100',
    label: '$100',
    denomination: 100,
    src: '/assets/money/monopoly_100.png',
    defaultWidthVw: DEFAULT_MONEY_WIDTH_VW,
  },
  {
    id: '500',
    label: '$500',
    denomination: 500,
    src: '/assets/money/monopoly_500.png',
    defaultWidthVw: DEFAULT_MONEY_WIDTH_VW,
  },
];

export const MONEY_SCALE_STORAGE_KEY = 'money-scale-calibration-v1';
export const MONEY_SCALE_MIN_VW = 5;
export const MONEY_SCALE_MAX_VW = 95;

export function clampMoneyWidthVw(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MONEY_WIDTH_VW;
  return Math.min(MONEY_SCALE_MAX_VW, Math.max(MONEY_SCALE_MIN_VW, value));
}

export function defaultMoneyScales(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const bill of MONEY_BILLS) {
    out[bill.id] = bill.defaultWidthVw;
  }
  return out;
}
