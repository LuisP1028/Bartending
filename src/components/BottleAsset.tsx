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
  /** Shell + CSS liquid (CustomBottleDefs or legacy well/jug). */
  const threePlaneTypes = ['well', 'jug', 'juice-vessel', 'squeeze'];
  const isThreePlane = threePlaneTypes.includes(archetype);
  const isOverlay = presentation === 'overlay';
  const bare = presentation === 'cardless' || isOverlay;

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
          width: isOverlay ? 'min(100%, 56px)' : 'clamp(80px, 18vw, 160px)',
          maxWidth: isOverlay ? '100%' : undefined,
          maxHeight: isOverlay ? '72%' : undefined,
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
              <g clipPath={`url(#${archetype}-clip-16bit)`}>
                <foreignObject width="100%" height="100%" x="0" y="0">
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <div
                      className={liquidClass}
                      style={{
                        '--liquid-color': liquidColor,
                        '--fill-level': fillLevel
                      } as React.CSSProperties}
                    />
                  </div>
                </foreignObject>
              </g>
              <use href={`#${archetype}-fg`} />
            </>
          ) : (
            <>
              <g clipPath={`url(#${archetype}-clip)`}>
                <foreignObject width="100%" height="100%" x="0" y="0">
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <div
                      className={liquidClass}
                      style={{
                        '--liquid-color': liquidColor,
                        '--fill-level': fillLevel
                      } as React.CSSProperties}
                    />
                  </div>
                </foreignObject>
              </g>
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
