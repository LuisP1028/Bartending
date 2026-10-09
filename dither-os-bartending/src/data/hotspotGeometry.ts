/** ViewBox of the POV SVG stage (matches page overlay). */
export const POV_VIEWBOX = { width: 1184, height: 880 } as const;

/** Frame size as a fraction of hotspot bounding box. */
export const FRAME_WIDTH_OF_HOTSPOT = 1.05;
export const FRAME_HEIGHT_OF_HOTSPOT = 1.3;

/** Usability clamps as % of stage (prevents full-POV takeover / unusable micro-frames). */
export const FRAME_MIN_STAGE_WIDTH_PCT = 16;
export const FRAME_MIN_STAGE_HEIGHT_PCT = 20;
export const FRAME_MAX_STAGE_WIDTH_PCT = 44;
export const FRAME_MAX_STAGE_HEIGHT_PCT = 42;

/** Wide/short hotspots (e.g. rims tray): prefer wider, shorter frames so flat art sits mid-frame. */
export const WIDE_HOTSPOT_ASPECT = 1.6;
export const WIDE_FRAME_MIN_WIDTH_PCT = 16;
export const WIDE_FRAME_MIN_HEIGHT_PCT = 10;
export const WIDE_FRAME_MAX_HEIGHT_PCT = 22;
export const WIDE_FRAME_HEIGHT_OF_HOTSPOT = 1.15;
export const WIDE_FRAME_WIDTH_OF_HOTSPOT = 1.1;

/**
 * Hardware zones need room for a full tool (overlay host up to ~96px + margin).
 * Percentage mins alone fail on narrow viewports → strip crop (white bar).
 */
export const HARDWARE_ZONE_IDS = new Set([
  'hawthorne',
  'double_strainer',
  'boston_shaker',
  'ice',
]);

/** Minimum paint box for one full hardware overlay asset (px), independent of % math. */
export const HARDWARE_FRAME_MIN_PX = 112;

export type ViewBoxBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StageFrameStyle = {
  left: string;
  top: string;
  width: string;
  height: string;
  transform: string;
};

/**
 * Measure path `d` in viewBox user units via a temporary SVG (client-only).
 */
export function measurePathBounds(d: string): ViewBoxBounds | null {
  if (typeof document === 'undefined') return null;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${POV_VIEWBOX.width} ${POV_VIEWBOX.height}`);
  svg.setAttribute('width', String(POV_VIEWBOX.width));
  svg.setAttribute('height', String(POV_VIEWBOX.height));
  svg.style.cssText = 'position:absolute;left:-99999px;top:-99999px;visibility:hidden;pointer-events:none';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);

  let bounds: ViewBoxBounds | null = null;
  try {
    const b = path.getBBox();
    if (b.width > 0 && b.height > 0) {
      bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  } catch {
    bounds = null;
  }

  document.body.removeChild(svg);
  return bounds;
}

/**
 * Prefer live DOM path getBBox when the hotspot is mounted on the stage.
 */
export function measureHotspotElementBounds(zoneId: string): ViewBoxBounds | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(`[data-zone="${zoneId}"]`) as SVGGraphicsElement | null;
  if (!el || typeof el.getBBox !== 'function') return null;
  try {
    const b = el.getBBox();
    if (b.width > 0 && b.height > 0) {
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Convert viewBox bbox → stage-percentage CSS for a centered carousel frame.
 */
export function boundsToFrameStyle(
  bounds: ViewBoxBounds,
  options?: { zoneId?: string; stageWidthPx?: number; stageHeightPx?: number }
): StageFrameStyle {
  const { width: VW, height: VH } = POV_VIEWBOX;
  const zoneId = options?.zoneId;
  const stageW = options?.stageWidthPx;
  const stageH = options?.stageHeightPx;

  const centerXPct = ((bounds.x + bounds.width / 2) / VW) * 100;
  const centerYPct = ((bounds.y + bounds.height / 2) / VH) * 100;
  const hotspotWPct = (bounds.width / VW) * 100;
  const hotspotHPct = (bounds.height / VH) * 100;

  const aspect = bounds.height > 0 ? bounds.width / bounds.height : 1;
  const isWideShort = aspect >= WIDE_HOTSPOT_ASPECT;
  const isHardwareZone = zoneId ? HARDWARE_ZONE_IDS.has(zoneId) : false;

  let frameWPct =
    hotspotWPct * (isWideShort ? WIDE_FRAME_WIDTH_OF_HOTSPOT : FRAME_WIDTH_OF_HOTSPOT);
  let frameHPct =
    hotspotHPct * (isWideShort ? WIDE_FRAME_HEIGHT_OF_HOTSPOT : FRAME_HEIGHT_OF_HOTSPOT);

  if (isWideShort) {
    frameWPct = clamp(frameWPct, WIDE_FRAME_MIN_WIDTH_PCT, FRAME_MAX_STAGE_WIDTH_PCT);
    frameHPct = clamp(frameHPct, WIDE_FRAME_MIN_HEIGHT_PCT, WIDE_FRAME_MAX_HEIGHT_PCT);
  } else {
    frameWPct = clamp(frameWPct, FRAME_MIN_STAGE_WIDTH_PCT, FRAME_MAX_STAGE_WIDTH_PCT);
    frameHPct = clamp(frameHPct, FRAME_MIN_STAGE_HEIGHT_PCT, FRAME_MAX_STAGE_HEIGHT_PCT);
  }

  // Hardware zones: ensure frame is at least HARDWARE_FRAME_MIN_PX in both axes (stage px)
  // so a full tool (≤96px) cannot be horizontally strip-cropped into a white bar.
  // Never force mins that cannot fit on stage.
  if (isHardwareZone && stageW && stageH && stageW > 0 && stageH > 0) {
    const minWPct = Math.min((HARDWARE_FRAME_MIN_PX / stageW) * 100, FRAME_MAX_STAGE_WIDTH_PCT);
    const minHPct = Math.min((HARDWARE_FRAME_MIN_PX / stageH) * 100, FRAME_MAX_STAGE_HEIGHT_PCT);
    frameWPct = clamp(
      Math.max(frameWPct, minWPct),
      Math.min(FRAME_MIN_STAGE_WIDTH_PCT, minWPct),
      FRAME_MAX_STAGE_WIDTH_PCT
    );
    frameHPct = clamp(
      Math.max(frameHPct, minHPct),
      Math.min(FRAME_MIN_STAGE_HEIGHT_PCT, minHPct),
      FRAME_MAX_STAGE_HEIGHT_PCT
    );
  }

  // Frame must fully fit on stage (0–100%). Prefer shrink over overflow near edges.
  frameWPct = clamp(frameWPct, 1, 100);
  frameHPct = clamp(frameHPct, 1, 100);

  let leftPct = centerXPct - frameWPct / 2;
  let topPct = centerYPct - frameHPct / 2;

  if (leftPct < 0) leftPct = 0;
  if (leftPct + frameWPct > 100) leftPct = Math.max(0, 100 - frameWPct);
  if (topPct < 0) topPct = 0;
  if (topPct + frameHPct > 100) topPct = Math.max(0, 100 - frameHPct);

  // If still too large (shouldn't after clamp), shrink to fit
  if (frameWPct > 100) frameWPct = 100;
  if (frameHPct > 100) frameHPct = 100;
  if (leftPct + frameWPct > 100) frameWPct = 100 - leftPct;
  if (topPct + frameHPct > 100) frameHPct = 100 - topPct;

  // Top-left placement + no translate so the full box stays on-stage
  return {
    left: `${leftPct}%`,
    top: `${topPct}%`,
    width: `${frameWPct}%`,
    height: `${frameHPct}%`,
    transform: 'none',
  };
}

export function resolveHotspotFrameStyle(
  zoneId: string,
  pathD: string,
  stageEl?: HTMLElement | null
): StageFrameStyle | null {
  const bounds =
    measureHotspotElementBounds(zoneId) ?? measurePathBounds(pathD);
  if (!bounds) return null;
  return boundsToFrameStyle(bounds, {
    zoneId,
    stageWidthPx: stageEl?.clientWidth,
    stageHeightPx: stageEl?.clientHeight,
  });
}

/**
 * CSS box for active vessel, fitted to drink_placement path bbox on the stage.
 * Glass sits centered, bottom-aligned on the pad (standing on the mat).
 */
export function resolveVesselSlotStyle(
  zoneId: string,
  pathD: string
): StageFrameStyle | null {
  const { width: VW, height: VH } = POV_VIEWBOX;
  const bounds =
    measureHotspotElementBounds(zoneId) ?? measurePathBounds(pathD);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  // Pad box in stage %
  const leftPct = (bounds.x / VW) * 100;
  const topPct = (bounds.y / VH) * 100;
  const widthPct = (bounds.width / VW) * 100;
  // Give the glass vertical room above the flat pad (pad is short; glass is tall)
  const glassHeightPct = Math.max((bounds.height / VH) * 100 * 4.5, 12);
  const glassTopPct = topPct + (bounds.height / VH) * 100 - glassHeightPct;

  return {
    left: `${leftPct}%`,
    top: `${Math.max(0, glassTopPct)}%`,
    width: `${widthPct}%`,
    height: `${glassHeightPct}%`,
    transform: 'none',
  };
}
