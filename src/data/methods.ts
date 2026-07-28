/**
 * Shared agitation / straining methods from hotspot tools + baseline.
 *
 * - CRYSTAL_CUT → Built
 * - BOSTON_SHAKER_TIN → Shaken
 * - BAR_SPOON_STIRRER → Stirred
 * - FINE_MESH_STRAINER → Shake/Double Strain
 * - DRY_ICE_DOUBLE_STRAIN → Dry Shake/Ice Shake/Double Strain (fan-out tile)
 */

export const DrinkMethod = {
  BUILT: 'BUILT',
  BOSTON_SHAKER_TIN: 'BOSTON_SHAKER_TIN',
  STIRRED: 'STIRRED',
  /**
   * Shaken + double strained — payload / ticket string.
   * Applied by FINE_MESH_STRAINER (Double Strain asset).
   */
  DOUBLE_STRAIN: 'Shake/Double Strain',
  /**
   * Dry shake → ice shake → double strain — payload / ticket string.
   * Applied by DRY_ICE_DOUBLE_STRAIN (fan-out composite in double_strainer zone).
   */
  DRY_ICE_DOUBLE_STRAIN: 'Dry Shake/Ice Shake/Double Strain',
} as const;

export type DrinkMethodId = (typeof DrinkMethod)[keyof typeof DrinkMethod];

export const DRINK_METHOD_IDS: readonly DrinkMethodId[] = [
  DrinkMethod.BUILT,
  DrinkMethod.BOSTON_SHAKER_TIN,
  DrinkMethod.STIRRED,
  DrinkMethod.DOUBLE_STRAIN,
  DrinkMethod.DRY_ICE_DOUBLE_STRAIN,
];

export const DRINK_METHOD_LABELS: Record<DrinkMethodId, string> = {
  [DrinkMethod.BUILT]: 'Built',
  [DrinkMethod.BOSTON_SHAKER_TIN]: 'Shaken',
  [DrinkMethod.STIRRED]: 'Stirred',
  [DrinkMethod.DOUBLE_STRAIN]: 'Shaken + Double Strain',
  [DrinkMethod.DRY_ICE_DOUBLE_STRAIN]: 'Dry / Ice / Double Strain',
};

export function isDrinkMethodId(v: string): v is DrinkMethodId {
  return (DRINK_METHOD_IDS as readonly string[]).includes(v);
}

export function drinkMethodLabel(method: string): string {
  if (isDrinkMethodId(method)) return DRINK_METHOD_LABELS[method];
  return method;
}

/**
 * Map hardware tool Manifest id → drink method.
 * More specific ids before generic TIN/SHAKER/SPOON matches.
 */
export function methodFromHardwareToolId(toolId: string): DrinkMethodId | null {
  const id = toolId.toUpperCase();
  if (id.includes('DRY_ICE_DOUBLE_STRAIN') || toolId === 'DRY_ICE_DOUBLE_STRAIN') {
    return DrinkMethod.DRY_ICE_DOUBLE_STRAIN;
  }
  if (id.includes('FINE_MESH_STRAINER') || toolId === 'FINE_MESH_STRAINER') {
    return DrinkMethod.DOUBLE_STRAIN;
  }
  if (id.includes('CRYSTAL_CUT') || toolId === 'CRYSTAL_CUT') {
    return DrinkMethod.BUILT;
  }
  if (id.includes('SHAKER') || id.includes('TIN')) {
    return DrinkMethod.BOSTON_SHAKER_TIN;
  }
  if (id.includes('SPOON') || id.includes('YARAI') || id.includes('MIX_GLASS')) {
    return DrinkMethod.STIRRED;
  }
  return null;
}

/**
 * Visual anim class for method apply.
 * Shake paths (including double-strain composites) use shake anim.
 */
export function animClassForMethod(method: string): '' | 'anim-shaken' | 'anim-stirred' {
  if (
    method === DrinkMethod.BOSTON_SHAKER_TIN ||
    method === DrinkMethod.DOUBLE_STRAIN ||
    method === DrinkMethod.DRY_ICE_DOUBLE_STRAIN ||
    method.toLowerCase().includes('shake')
  ) {
    return 'anim-shaken';
  }
  if (method === DrinkMethod.STIRRED || /stir/i.test(method)) {
    return 'anim-stirred';
  }
  return '';
}

/** Dilution / froth: shake-family (all shake + double-strain methods). */
export function isShakeFamilyMethod(method: string): boolean {
  return (
    method === DrinkMethod.BOSTON_SHAKER_TIN ||
    method === DrinkMethod.DOUBLE_STRAIN ||
    method === DrinkMethod.DRY_ICE_DOUBLE_STRAIN ||
    method.toLowerCase().includes('shake')
  );
}

/** Dilution: stir-family only. */
export function isStirFamilyMethod(method: string): boolean {
  return method === DrinkMethod.STIRRED || /stir/i.test(method);
}
