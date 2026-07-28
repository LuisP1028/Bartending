import {
  clonePatronLayout,
  getDefaultPatronLayout,
  mergePatronLayout,
  type PatronLayout,
} from '@/data/patronLayout';

const STORAGE_KEY = 'pov-patron-layouts-v1';

export function loadPatronLayouts(): Record<string, PatronLayout> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<PatronLayout>>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, PatronLayout> = {};
    for (const [id, patch] of Object.entries(parsed)) {
      out[id] = mergePatronLayout(getDefaultPatronLayout(id), patch);
    }
    return out;
  } catch {
    return {};
  }
}

export function savePatronLayouts(layouts: Record<string, PatronLayout>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    /* ignore */
  }
}

export function resolvePatronLayout(
  patronId: string,
  overrides: Record<string, PatronLayout>
): PatronLayout {
  const base = getDefaultPatronLayout(patronId);
  const stored = overrides[patronId];
  return stored ? mergePatronLayout(base, stored) : clonePatronLayout(base);
}
