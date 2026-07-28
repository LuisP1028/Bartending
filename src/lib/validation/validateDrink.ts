import type { Ticket } from './types';
import type { SimulationState } from '../../hooks/useSimulation';

export function validateDrink(drinkState: SimulationState, ticketState: Ticket): string[] {
  const errors: string[] = [];

  // 1. Vessel Check
  if (drinkState.vessel !== ticketState.vessel) {
    errors.push(`[GLS] Expected ${ticketState.vessel}, Got ${drinkState.vessel}`);
  }

  // 2. Rim Check
  const hasRim = drinkState.rim !== null && drinkState.rim !== undefined;
  if (ticketState.validRims && ticketState.validRims.length > 0) {
    if (!hasRim) {
      errors.push(`[RIM] Missing required rim. Expected one of: ${ticketState.validRims.join(', ')}`);
    } else if (!ticketState.validRims.includes(drinkState.rim as string)) {
      errors.push(`[RIM] Invalid rim. Expected one of: ${ticketState.validRims.join(', ')}, Got ${drinkState.rim}`);
    }
  } else if (hasRim) {
    errors.push(`[RIM] Over-rimmed. No rim expected, Got ${drinkState.rim}`);
  }

  // 3. Agitation Check
  if (drinkState.agitation !== ticketState.agitation) {
    let normalizedDrinkAgitation = drinkState.agitation;
    // Adapt to legacy "Shaken" / "Stirred" -> "BOSTON_SHAKER_TIN" mapping if necessary.
    // The instructions say: "Ensures the exact agitation method (e.g. BOSTON_SHAKER_TIN) was applied."
    // In useSimulation, applyTool sets agitation to 'Shaken' or 'Stirred'.
    // We should normalize them for the check if the new schema uses different terms, but the user spec just says:
    // "Add an error string if drinkState.agitation !== ticketState.agitation."
    if (drinkState.agitation !== ticketState.agitation) {
        errors.push(`[MTD] Expected ${ticketState.agitation}, Got ${drinkState.agitation}`);
    }
  }

  // 4. Ingredient Check
  for (const [key, expectedVolume] of Object.entries(ticketState.ingredients)) {
    const actualVolume = drinkState.ingredients[key] || 0;
    if (actualVolume !== expectedVolume) {
      errors.push(`[ING] ${key}: Expected ${expectedVolume}, Got ${actualVolume}`);
    }
  }

  // 5. Overpour Check
  for (const key of Object.keys(drinkState.ingredients)) {
    if (ticketState.ingredients[key] === undefined) {
      errors.push(`[ING] ${key}: Overpour (Not in Recipe)`);
    }
  }

  // 6. Garnish Check
  const drinkGarnishIds = drinkState.garnishes.map(g => g.id);
  for (const expectedGarnish of ticketState.garnishes) {
    if (!drinkGarnishIds.includes(expectedGarnish)) {
      errors.push(`[GRN] Missing ${expectedGarnish}`);
    }
  }

  return errors;
}
