import { ModePayload } from './ModePayload';
import { NormalizedRestaurantPayload } from '../utils/LLMMenuMapper';

/**
 * Backward-compatible alias for ModePayload (any mode JSON, not only Obelisco).
 */
export class ObeliscoPayload extends ModePayload {
  constructor(rawJson: NormalizedRestaurantPayload) {
    super(rawJson);
  }
}
