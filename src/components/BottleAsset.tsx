import React from 'react';

type BottleAssetProps = {
  archetype: string;
  liquidColor: string;
  fillLevel: string;
  label: string;
  subLabel?: string;
  hexText?: string;
  liquidClass?: 'liquid' | 'liquid-opaque' | 'liquid-sparkle';
  customForeground?: React.ReactNode;
  onClick?: () => void;
  /** `card` = accordion chrome; `cardless` = no card; `overlay` = POV carousel tile. */
  presentation?: 'card' | 'cardless' | 'overlay';
};

/** Parse fillLevel ("62%", "0.62", "62") → 0..1 for SVG liquid height. */
function parseFillRatio(fillLevel: string): number {
  const raw = String(fillLevel ?? '').trim();
  if (!raw) return 0.55;
  if (raw.endsWith('%')) {
    const n = parseFloat(raw.slice(0, -1));
    if (!Number.isFinite(n)) return 0.55;
    return Math.min(1, Math.max(0, n / 100));
  }
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0.55;
  // Values > 1 are treated as percent points (e.g. 62 → 0.62)
  if (n > 1) return Math.min(1, Math.max(0, n / 100));
  return Math.min(1, Math.max(0, n));
}

/**
 * FS57: Pure SVG liquid rect clipped to bottle path (no foreignObject).
 * foreignObject + CSS .liquid often paints as a solid square tile on mobile Safari.
 */
function SvgLiquidFill({
  clipPathId,
  liquidColor,
  fillLevel,
  sparkle,
}: {
  clipPathId: string;
  liquidColor: string;
  fillLevel: string;
  sparkle?: boolean;
}) {
  const ratio = parseFillRatio(fillLevel);
  const h = 96 * ratio;
  const y = 96 - h;
  return (
    <g clipPath={`url(#${clipPathId})`}>
      <rect
        x={0}
        y={y}
        width={64}
        height={h}
        fill={liquidColor || 'transparent'}
        opacity={0.9}
      />
      {/* Soft highlight strip (replaces CSS liquid gradient) */}
      {h > 2 ? (
        <rect
          x={0}
          y={y}
          width={64}
          height={Math.min(3, h * 0.12)}
          fill="rgba(255,255,255,0.35)"
          opacity={0.7}
        />
      ) : null}
      {sparkle && h > 8 ? (
        <g opacity={0.45} fill="#fff">
          <circle cx={20} cy={y + h * 0.35} r={0.8} />
          <circle cx={36} cy={y + h * 0.55} r={0.7} />
          <circle cx={28} cy={y + h * 0.75} r={0.6} />
        </g>
      ) : null}
    </g>
  );
}

export default function BottleAsset({
  archetype,
  liquidColor,
  fillLevel,
  label,
  subLabel: _subLabel,
  hexText: _hexText,
  liquidClass = 'liquid',
  customForeground,
  onClick,
  presentation = 'card',
}: BottleAssetProps) {
  /** Full baked bottle art in CustomBottleDefs (no dynamic liquid). */
  const isStatic = archetype.startsWith('static-');
  /** Shell + SVG liquid (CustomBottleDefs or legacy well/jug). */
  const threePlaneTypes = ['well', 'jug', 'juice-vessel', 'squeeze'];
  const isThreePlane = threePlaneTypes.includes(archetype);
  const isOverlay = presentation === 'overlay';
  const bare = presentation === 'cardless' || isOverlay;
  const sparkle = liquidClass === 'liquid-sparkle';

  return (
    <div
      onClick={onClick}
      aria-label={label}
      title={label}
      className={isOverlay ? 'bottle-asset bottle-asset--overlay' : 'bottle-asset'}
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
        lineHeight: 0,
        boxSizing: 'border-box',
        overflow: isOverlay ? 'hidden' : undefined,
        gap: isOverlay ? 2 : 0,
      }}
    >
      <div
        className="asset-art-root"
        style={{
          position: 'relative',
          /* FS57: larger overlay art so silhouette survives mobile stage cells */
          width: isOverlay ? 'min(100%, 72px)' : 'clamp(80px, 18vw, 160px)',
          maxWidth: isOverlay ? '100%' : undefined,
          maxHeight: isOverlay ? '78%' : undefined,
          height: isOverlay ? 'auto' : undefined,
          flex: isOverlay ? '1 1 auto' : undefined,
          aspectRatio: '64 / 96',
          transformOrigin: 'center center',
          marginBottom: 0,
          display: 'flex',
          alignItems: isOverlay ? 'center' : 'flex-end',
          justifyContent: 'center',
          outline: 'none',
          boxShadow: 'none',
          boxSizing: 'border-box',
          minHeight: 0,
        }}
      >
        <svg
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: isOverlay ? 'hidden' : 'visible',
            imageRendering: isStatic || isThreePlane ? 'pixelated' : undefined,
          }}
          viewBox="0 0 64 96"
          preserveAspectRatio="xMidYMid meet"
          shapeRendering={isStatic ? 'crispEdges' : undefined}
        >
          {isStatic ? (
            <use href={`#${archetype}`} />
          ) : isThreePlane ? (
            <>
              <use href={`#${archetype}-bg`} />
              <SvgLiquidFill
                clipPathId={`${archetype}-clip-16bit`}
                liquidColor={liquidColor}
                fillLevel={fillLevel}
                sparkle={sparkle}
              />
              <use href={`#${archetype}-fg`} />
            </>
          ) : (
            <>
              <SvgLiquidFill
                clipPathId={`${archetype}-clip`}
                liquidColor={liquidColor}
                fillLevel={fillLevel}
                sparkle={sparkle}
              />
              <use href={`#${archetype}-outline`} />
            </>
          )}
          {customForeground}
        </svg>
      </div>
      {label ? <div className="asset-under-label">{label}</div> : null}
    </div>
  );
}
