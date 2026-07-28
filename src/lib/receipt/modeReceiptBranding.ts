/**
 * Mode → full free-receipt header logo branding.
 *
 * To add a mode receipt logo: place a PNG under public/assets/logos/<mode>/
 * and add an entry to MODE_RECEIPT_BRANDING.
 */

export type ModeReceiptBrand = {
  /** Public URL path under /public */
  logoSrc: string;
  logoAlt: string;
};

export type ModeReceiptBrandingMap = Record<string, ModeReceiptBrand>;

export const MODE_RECEIPT_BRANDING: ModeReceiptBrandingMap = {
  OBELISCO: {
    logoSrc: '/assets/logos/obelisco/obelisco-logo-02.png',
    logoAlt: 'Obelisco Restaurant',
  },
  CLASSICS: {
    logoSrc: '/assets/logos/classics/classics-receipt-logo.png',
    logoAlt: 'Classics',
  },
};

const FALLBACK_MODE = 'OBELISCO';

/** Resolve full-face receipt logo for the active mode id. */
export function resolveModeReceiptBrand(modeName: string): ModeReceiptBrand {
  const key = (modeName || '').trim().toUpperCase();
  return MODE_RECEIPT_BRANDING[key] ?? MODE_RECEIPT_BRANDING[FALLBACK_MODE];
}
