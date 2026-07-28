/** Discrete pour sizes (oz) for jigger control + simulation cycle. */
export const POUR_VOLUME_OZ = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0] as const;

export type PourVolumeOz = (typeof POUR_VOLUME_OZ)[number];
