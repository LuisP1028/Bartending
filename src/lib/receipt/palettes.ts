import type { PaperStyleKey } from './types';

export type PaperPalette = {
  paper: string;
  ink: string;
  label: string;
};

/** Single fixed thermal palette (player cannot choose other colors). */
export const FIXED_PAPER_STYLE: PaperStyleKey = 'white';

export const FIXED_PAPER_PALETTE: PaperPalette = {
  paper: '#F4F4F0',
  ink: '#1A1A1A',
  label: 'Thermal',
};

export const PAPER_PALETTES: Record<PaperStyleKey, PaperPalette> = {
  white: FIXED_PAPER_PALETTE,
};
