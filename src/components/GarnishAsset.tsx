import React from 'react';

type GarnishAssetProps = {
  type: string;
  svgHref: string;
  label: string;
  subLabel?: string;
  rindColor?: string;
  pulpColor?: string;
  onClick?: () => void;
  presentation?: 'card' | 'cardless' | 'overlay';
};

export default function GarnishAsset({
  type,
  svgHref,
  label,
  subLabel: _subLabel,
  rindColor,
  pulpColor,
  onClick,
  presentation = 'card',
}: GarnishAssetProps) {
  const isOverlay = presentation === 'overlay';
  const bare = presentation === 'cardless' || isOverlay;

  return (
    <div
      onClick={onClick}
      data-garnish-type={type}
      aria-label={label}
      title={label}
      style={{
        border: bare ? 'none' : 'clamp(1px, 0.2vmin, 2px) solid #222',
        background: bare ? 'transparent' : '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: isOverlay ? '100%' : 'auto',
        width: isOverlay ? '100%' : undefined,
        minWidth: bare && !isOverlay ? 'auto' : bare ? undefined : 'clamp(140px, 25vh, 180px)',
        maxWidth: isOverlay ? '100%' : undefined,
        maxHeight: isOverlay ? '100%' : undefined,
        padding: isOverlay ? '2px 0' : 'clamp(8px, 1.5vw, 12px)',
        position: 'relative',
        cursor: onClick ? 'pointer' : undefined,
        boxSizing: 'border-box',
        overflow: isOverlay ? 'hidden' : undefined,
        gap: isOverlay ? 2 : 4,
        ...(rindColor ? { '--rind': rindColor } as React.CSSProperties : {}),
        ...(pulpColor ? { '--pulp': pulpColor } as React.CSSProperties : {})
      }}
    >
      <div
        className="asset-art-root"
        style={{
          width: isOverlay ? 'min(100%, 48px)' : 'clamp(48px, 10vw, 80px)',
          maxWidth: isOverlay ? '100%' : undefined,
          maxHeight: isOverlay ? '70%' : undefined,
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformOrigin: 'center center',
          outline: 'none',
          boxShadow: 'none',
          boxSizing: 'border-box',
          minHeight: 0,
          flex: isOverlay ? '1 1 auto' : undefined,
        }}
      >
        <svg
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: isOverlay ? 'hidden' : 'visible',
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          <use href={`#${svgHref}`} />
        </svg>
      </div>
      {label ? <div className="asset-under-label">{label}</div> : null}
    </div>
  );
}
