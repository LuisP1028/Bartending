import React from 'react';

type GlassAssetProps = {
  outlineId: string;
  clipId: string;
  label: string;
  /** Manifest glass id (e.g. ROCKS) for HardwareMetrics — not display text. */
  vesselId?: string | null;
  subLabel?: string;
  liquidColor?: string;
  fillLevel?: string;
  currentVolumeOz?: number;
  maxOz?: number;
  ingredients?: Record<string, number>;
  garnishes?: any[];
  agitation?: string;
  iceType?: string | null;
  rim?: string | null;
  onClick?: () => void;
  animClass?: string;
  presentation?: 'card' | 'cardless' | 'overlay';
};

import { HardwareMetrics } from '../hooks/useSimulation';
import {
  DrinkMethod,
  isShakeFamilyMethod,
  isStirFamilyMethod,
} from '../data/methods';

function resolveGlassMetrics(vesselId?: string | null, label?: string) {
  if (vesselId && HardwareMetrics[vesselId]) {
    return HardwareMetrics[vesselId];
  }
  if (!label) return null;
  // Prefer longer keys so RIBBED_COUPE wins over COUPE
  const keys = Object.keys(HardwareMetrics).sort((a, b) => b.length - a.length);
  const normalized = label.replace(/\s+/g, '_').toUpperCase();
  for (const key of keys) {
    if (label.includes(key) || normalized.includes(key)) {
      return HardwareMetrics[key];
    }
  }
  return null;
}

/**
 * FS64: garnish/ice/rim in the same SVG viewBox as liquid/outline so mobile
 * art-root letterboxing cannot desync HTML % layers from the glass.
 */
function SvgIce({
  iceType,
  rimLeftX,
  rimRightX,
  floorY,
  garnishScale,
}: {
  iceType: string;
  rimLeftX: number;
  rimRightX: number;
  floorY: number;
  garnishScale: number;
}) {
  const cx = (rimLeftX + rimRightX) / 2;
  const s = garnishScale;
  // 64×64 symbol box, bottom-center on floor, scaled about bottom center
  return (
    <g transform={`translate(${cx}, ${floorY}) scale(${s}) translate(-32, -64)`}>
      <svg x={0} y={0} width={64} height={64} viewBox="0 0 64 64" overflow="visible">
        <use href={`#${iceType}`} />
      </svg>
    </g>
  );
}

function SvgRimStrip({
  rimId,
  rimLeftX,
  rimRightX,
  rimY,
}: {
  rimId: string;
  rimLeftX: number;
  rimRightX: number;
  rimY: number;
}) {
  const w = Math.max(1, rimRightX - rimLeftX);
  const h = 16;
  // Vertically centered on rimY (was translateY(-50%) in HTML)
  return (
    <svg
      x={rimLeftX}
      y={rimY - h / 2}
      width={w}
      height={h}
      viewBox="0 0 60 16"
      preserveAspectRatio="none"
      overflow="visible"
    >
      <use href={`#${rimId}`} />
    </svg>
  );
}

function SvgGarnishItem({
  g,
  topY,
}: {
  g: {
    type?: string;
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
    height?: number;
    svgHref?: string;
    rindColor?: string;
    pulpColor?: string;
  };
  topY: number;
}) {
  const x = g.x ?? 32;
  const y = topY;
  const s = g.scale ?? 1;
  const rot = g.rotation ?? 0;
  const href = g.svgHref ? `#${g.svgHref}` : '';

  if (!href) return null;

  // Sprig: tall stem, bottom-center at (x,y), optional rotation; width ~64*scale
  if (g.type === 'sprig') {
    const sh = g.height || 100;
    const sw = 64 * s;
    return (
      <g transform={`translate(${x}, ${y}) rotate(${rot}) translate(${-sw / 2}, ${-sh})`}>
        <svg
          x={0}
          y={0}
          width={sw}
          height={sh}
          viewBox="0 0 64 64"
          preserveAspectRatio="none"
          overflow="visible"
          style={
            {
              ...(g.rindColor ? { ['--rind' as string]: g.rindColor } : {}),
              ...(g.pulpColor ? { ['--pulp' as string]: g.pulpColor } : {}),
            } as React.CSSProperties
          }
        >
          <use href={href} />
        </svg>
      </g>
    );
  }

  // floating / rim-lock: center of 64×64 at (x,y)
  // sinker / default: bottom-center of 64×64 at (x,y)
  const centerAnchor = g.type === 'floating' || g.type === 'rim-lock';
  const ox = -32;
  const oy = centerAnchor ? -32 : -64;

  return (
    <g transform={`translate(${x}, ${y}) scale(${s}) translate(${ox}, ${oy})`}>
      <svg
        x={0}
        y={0}
        width={64}
        height={64}
        viewBox="0 0 64 64"
        overflow="visible"
        style={
          {
            ...(g.rindColor ? { ['--rind' as string]: g.rindColor } : {}),
            ...(g.pulpColor ? { ['--pulp' as string]: g.pulpColor } : {}),
          } as React.CSSProperties
        }
      >
        <use href={href} />
      </svg>
    </g>
  );
}

export default function GlassAsset({
  outlineId,
  clipId,
  label,
  vesselId,
  subLabel: _subLabel,
  liquidColor,
  fillLevel,
  currentVolumeOz = 0,
  maxOz = 10,
  ingredients = {},
  garnishes = [],
  agitation = DrinkMethod.BUILT,
  iceType,
  rim,
  onClick,
  animClass = '',
  presentation = 'card',
}: GlassAssetProps) {
  const isOverlay = presentation === 'overlay';
  const bare = presentation === 'cardless' || isOverlay;
  let liquidHeightPx = 0;
  let foamHeightPx = 0;
  const metrics = resolveGlassMetrics(vesselId, label);

  let effectiveVisualVolumeOz = currentVolumeOz;
  if (currentVolumeOz > 0) {
    if (isShakeFamilyMethod(agitation)) {
      effectiveVisualVolumeOz *= 1.25;
    } else if (isStirFamilyMethod(agitation)) {
      effectiveVisualVolumeOz *= 1.15;
    }

    if (iceType === 'LARGE_ICE_ROCK') effectiveVisualVolumeOz += 3.5;
    else if (iceType === 'STANDARD_ICE') effectiveVisualVolumeOz += 3.0;
  }

  // Metrics-based bowl height when we have geometry (simulation + static fill both benefit)
  if (metrics) {
    const fillRatio = Math.min(effectiveVisualVolumeOz / maxOz, 0.95);
    const bowlPx = metrics.floorY - metrics.rimY;
    liquidHeightPx = bowlPx * fillRatio;

    const hasFroth =
      ingredients['mixereggwhite'] > 0 && isShakeFamilyMethod(agitation);
    if (hasFroth) {
      const eggVolume = ingredients['mixereggwhite'] || 0;
      const foamRatio = Math.min((eggVolume / maxOz) * 1.5, 0.3);
      foamHeightPx = bowlPx * foamRatio;
    }
  }

  const hasVisibleLiquid =
    !!liquidColor &&
    liquidColor !== 'transparent' &&
    (currentVolumeOz > 0 || (fillLevel && fillLevel !== '0%' && fillLevel !== '0'));

  /*
   * FS63: SVG viewBox geometry for liquid/foam (no foreignObject).
   * FO + CSS .liquid paints as a solid square plate on mobile Safari.
   */
  let liquidY = 96;
  let liquidH = 0;
  if (hasVisibleLiquid) {
    if (metrics && currentVolumeOz > 0) {
      liquidH = Math.max(0, liquidHeightPx);
      liquidY = metrics.floorY - liquidH;
    } else if (fillLevel) {
      // Static / carousel-style fillLevel string ("62%", "0.4", …)
      const raw = String(fillLevel).trim();
      let ratio = 0;
      if (raw.endsWith('%')) {
        const n = parseFloat(raw.slice(0, -1));
        ratio = Number.isFinite(n) ? n / 100 : 0;
      } else {
        const n = parseFloat(raw);
        if (Number.isFinite(n)) ratio = n > 1 ? n / 100 : n;
      }
      ratio = Math.min(0.95, Math.max(0, ratio));
      if (metrics) {
        const bowlPx = metrics.floorY - metrics.rimY;
        liquidH = bowlPx * ratio;
        liquidY = metrics.floorY - liquidH;
      } else {
        liquidH = 96 * ratio;
        liquidY = 96 - liquidH;
      }
    }
  }
  const foamY =
    foamHeightPx > 0 ? Math.max(0, liquidY - foamHeightPx) : 0;
  const foamH =
    foamHeightPx > 0 ? Math.min(foamHeightPx, liquidY - foamY) : 0;

  // Paint order: under-outline garnishes, liquid, ice, outline, rim + rim-lock
  const underOutline = (garnishes || []).filter(
    (g) =>
      g.type === 'sprig' ||
      g.type === 'floating' ||
      g.type === 'sinker'
  );
  const overOutline = (garnishes || []).filter(
    (g) =>
      g.type &&
      g.type !== 'coating' &&
      g.type !== 'rim' &&
      g.type !== 'sprig' &&
      g.type !== 'floating' &&
      g.type !== 'sinker'
  );

  const renderGarnishList = (list: any[]) =>
    list.map((g, idx) => {
      if (g.type === 'coating' || g.type === 'rim') return null;
      let topY = g.y ?? 0;
      if (g.type === 'floating' && metrics) {
        const fillPercentage = Math.min(
          (effectiveVisualVolumeOz / maxOz) * 100,
          95
        );
        const fluidPx =
          (metrics.floorY - metrics.rimY) * (fillPercentage / 100);
        topY = metrics.floorY - fluidPx;
      }
      return (
        <SvgGarnishItem
          key={`${g.type || 'g'}-${g.svgHref || idx}-${idx}`}
          g={g}
          topY={topY}
        />
      );
    });

  return (
    <div
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        border: bare ? 'none' : 'clamp(2px, 0.5vmin, 4px) solid var(--glass-dark)',
        background: bare ? 'transparent' : '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isOverlay ? 'center' : 'flex-end',
        padding: isOverlay ? '2px 0' : bare ? 'clamp(4px, 1vw, 8px)' : 'clamp(8px, 1.5vw, 16px)',
        position: 'relative',
        minHeight: bare ? 'auto' : 'clamp(200px, 30vh, 420px)',
        width: isOverlay ? '100%' : 'auto',
        height: isOverlay ? '100%' : undefined,
        maxWidth: isOverlay ? '100%' : undefined,
        maxHeight: isOverlay ? '100%' : undefined,
        boxShadow: bare ? 'none' : 'clamp(4px, 1vmin, 8px) clamp(4px, 1vmin, 8px) 0 #000',
        cursor: onClick ? 'pointer' : undefined,
        boxSizing: 'border-box',
        /* FS64: do not clip vessel garnish overhangs on mobile overlay */
        overflow: isOverlay ? 'visible' : undefined,
        gap: isOverlay ? 2 : 0,
        lineHeight: 0,
      }}
    >
      <div
        className={`asset-art-root${animClass ? ` ${animClass}` : ''}`}
        style={{
          position: 'relative',
          width: isOverlay ? 'min(100%, 72px)' : 'clamp(80px, 18vw, 160px)',
          maxWidth: isOverlay ? '100%' : undefined,
          maxHeight: isOverlay ? '100%' : undefined,
          aspectRatio: '64 / 96',
          transformOrigin: isOverlay ? 'center center' : 'bottom center',
          marginBottom: isOverlay ? 0 : 'clamp(8px, 2vh, 16px)',
          display: 'flex',
          alignItems: isOverlay ? 'center' : 'flex-end',
          justifyContent: 'center',
          outline: 'none',
          boxShadow: 'none',
          boxSizing: 'border-box',
          minHeight: 0,
          flex: isOverlay ? '0 1 auto' : undefined,
          overflow: 'visible',
        }}
      >
        {/*
          FS63 liquid + FS64 ice/rim/garnishes: one SVG viewBox 0 0 64 96.
          Eliminates HTML % vs SVG meet letterbox mismatch on small mobile slots.
        */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
          viewBox="0 0 64 96"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Under-outline garnishes (sprig / floating / sinker) */}
          {metrics ? renderGarnishList(underOutline) : null}

          {clipId && (hasVisibleLiquid || foamH > 0) ? (
            <g clipPath={`url(#${clipId})`}>
              {hasVisibleLiquid && liquidH > 0 ? (
                <>
                  <rect
                    x={0}
                    y={liquidY}
                    width={64}
                    height={liquidH}
                    fill={liquidColor || 'transparent'}
                    opacity={0.88}
                  />
                  {liquidH > 2 ? (
                    <rect
                      x={0}
                      y={liquidY}
                      width={64}
                      height={Math.min(3, liquidH * 0.12)}
                      fill="rgba(255,255,255,0.35)"
                      opacity={0.7}
                    />
                  ) : null}
                </>
              ) : null}
              {foamH > 0 ? (
                <rect
                  x={0}
                  y={foamY}
                  width={64}
                  height={foamH}
                  fill="rgba(255,252,245,0.92)"
                  opacity={0.9}
                />
              ) : null}
            </g>
          ) : null}

          {iceType && metrics ? (
            <SvgIce
              iceType={iceType}
              rimLeftX={metrics.rimLeftX}
              rimRightX={metrics.rimRightX}
              floorY={metrics.floorY}
              garnishScale={metrics.garnishScale}
            />
          ) : null}

          {outlineId ? <use href={`#${outlineId}`} /> : null}

          {rim && metrics ? (
            <SvgRimStrip
              rimId={rim}
              rimLeftX={metrics.rimLeftX}
              rimRightX={metrics.rimRightX}
              rimY={metrics.rimY}
            />
          ) : null}

          {/* Rim-lock and other over-outline garnishes */}
          {metrics ? renderGarnishList(overOutline) : null}
        </svg>
      </div>
      {label ? <div className="asset-under-label">{label}</div> : null}
    </div>
  );
}
