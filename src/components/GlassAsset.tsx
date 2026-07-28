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
  let computedFillLevel = fillLevel || '0%';
  let liquidHeightPx = 0;
  let offsetBottomPx = 0;
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
    computedFillLevel = `${fillRatio * 100}%`;
    const bowlPx = metrics.floorY - metrics.rimY;
    liquidHeightPx = bowlPx * fillRatio;
    offsetBottomPx = 96 - metrics.floorY;

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

  const useMetricsHeight = !!metrics && (currentVolumeOz > 0 || foamHeightPx > 0);
  const liquidCssHeight = useMetricsHeight
    ? `${((liquidHeightPx + offsetBottomPx) / 96) * 100}%`
    : undefined;

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
        overflow: isOverlay ? 'hidden' : undefined,
        gap: isOverlay ? 2 : 0,
        lineHeight: 0,
      }}
    >
      <div
        className={`asset-art-root${animClass ? ` ${animClass}` : ''}`}
        style={{
          position: 'relative',
          width: isOverlay ? 'min(100%, 56px)' : 'clamp(80px, 18vw, 160px)',
          maxWidth: isOverlay ? '100%' : undefined,
          maxHeight: isOverlay ? '70%' : undefined,
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
          flex: isOverlay ? '1 1 auto' : undefined,
        }}
      >
        {/* SVG-native clip: clipPath units share viewBox 0 0 64 96 and scale with art */}
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
          {clipId && (hasVisibleLiquid || foamHeightPx > 0) ? (
            <g clipPath={`url(#${clipId})`}>
              <foreignObject x="0" y="0" width="64" height="96">
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                  }}
                >
                  {hasVisibleLiquid ? (
                    <div
                      className="liquid"
                      style={
                        {
                          '--liquid-color': liquidColor || 'transparent',
                          '--fill-level': computedFillLevel,
                          ...(liquidCssHeight
                            ? { height: liquidCssHeight, bottom: '0%' }
                            : {}),
                        } as React.CSSProperties
                      }
                    />
                  ) : null}
                  {foamHeightPx > 0 ? (
                    <div
                      className="sour-foam"
                      style={{
                        height: `${(foamHeightPx / 96) * 100}%`,
                        bottom: `${((liquidHeightPx + offsetBottomPx) / 96) * 100}%`,
                        display: 'block',
                      }}
                    />
                  ) : null}
                </div>
              </foreignObject>
            </g>
          ) : null}
          {outlineId ? <use href={`#${outlineId}`} /> : null}
        </svg>

        {iceType && metrics && (
          <div
            className="dynamic-garnish"
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 1,
              width: '100%',
              height: `${(64 / 96) * 100}%`,
              left: `${((metrics.rimLeftX + metrics.rimRightX) / 2 / 64) * 100}%`,
              top: `${(metrics.floorY / 96) * 100}%`,
              transformOrigin: 'bottom center',
              transform: `translate(-50%, -100%) scale(${metrics.garnishScale})`,
            }}
          >
            <svg style={{ width: '100%', height: '100%' }}>
              <use href={`#${iceType}`} />
            </svg>
          </div>
        )}
        {rim && metrics && (
          <div
            className="dynamic-garnish"
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 4,
              top: `${(metrics.rimY / 96) * 100}%`,
              left: `${(metrics.rimLeftX / 64) * 100}%`,
              width: `${((metrics.rimRightX - metrics.rimLeftX) / 64) * 100}%`,
              height: `${(16 / 96) * 100}%`,
              transformOrigin: 'top left',
              transform: 'translateY(-50%)',
            }}
          >
            <svg
              viewBox="0 0 60 16"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              preserveAspectRatio="none"
            >
              <use href={`#${rim}`} />
            </svg>
          </div>
        )}
        {garnishes.map((g, idx) => {
          if (g.type === 'coating' || g.type === 'rim') return null;

          let top = g.y;
          if (g.type === 'floating' && metrics) {
            const fillPercentage = Math.min((effectiveVisualVolumeOz / maxOz) * 100, 95);
            const fluidPx = (metrics.floorY - metrics.rimY) * (fillPercentage / 100);
            top = metrics.floorY - fluidPx;
          }

          const trX = g.type === 'floating' ? '-50%' : g.type === 'rim-lock' ? '-50%' : '-50%';
          const trY = g.type === 'floating' ? '-50%' : g.type === 'rim-lock' ? '-50%' : '-100%';
          const r = g.rotation ? ` rotate(${g.rotation}deg)` : '';

          return (
            <div
              key={idx}
              className="dynamic-garnish"
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                zIndex:
                  g.type === 'rim-lock'
                    ? 4
                    : g.type === 'sprig' || g.type === 'floating' || g.type === 'sinker'
                      ? 1
                      : 3,
                left: `${(g.x / 64) * 100}%`,
                top: `${(top / 96) * 100}%`,
                width: g.type === 'sprig' ? `${((64 * (g.scale || 1)) / 64) * 100}%` : '100%',
                height:
                  g.type === 'sprig'
                    ? `${((g.height || 100) / 96) * 100}%`
                    : `${(64 / 96) * 100}%`,
                transformOrigin: g.type === 'sprig' ? 'bottom center' : 'center',
                transform: `translate(${trX}, ${trY}) ${
                  g.type !== 'sprig' ? `scale(${g.scale || 1})` : ''
                }${r}`.trim(),
                ...(g.rindColor ? ({ '--rind': g.rindColor } as React.CSSProperties) : {}),
                ...(g.pulpColor ? ({ '--pulp': g.pulpColor } as React.CSSProperties) : {}),
              }}
            >
              <svg
                style={{ width: '100%', height: '100%' }}
                viewBox="0 0 64 64"
                preserveAspectRatio={g.type === 'sprig' ? 'none' : undefined}
              >
                <use href={`#${g.svgHref}`} />
              </svg>
            </div>
          );
        })}
      </div>
      {label ? <div className="asset-under-label">{label}</div> : null}
    </div>
  );
}
