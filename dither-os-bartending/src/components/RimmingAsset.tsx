import React from 'react';

type RimmingAssetProps = {
  type: string;
  svgHref: string;
  label: string;
  onClick?: () => void;
  presentation?: 'card' | 'cardless' | 'overlay';
};

/** Native drawing space for rim coating strips in GlobalSVGDefs (width 60 × height ~16). */
const RIM_VIEWBOX = '0 0 60 16';

export default function RimmingAsset({ type, svgHref, label, onClick, presentation = 'card' }: RimmingAssetProps) {
  const isOverlay = presentation === 'overlay';
  const bare = presentation === 'cardless' || isOverlay;

  return (
    <div
      onClick={onClick}
      data-garnish-type={type}
      className="rimming-asset-root"
      aria-label={label}
      title={label}
      style={{
        border: bare ? 'none' : '2px solid #222',
        background: bare ? 'transparent' : '#0d0d0d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: isOverlay ? '100%' : 'auto',
        width: isOverlay ? '100%' : undefined,
        minHeight: isOverlay ? 0 : undefined,
        maxWidth: isOverlay ? '100%' : undefined,
        maxHeight: isOverlay ? '100%' : undefined,
        padding: isOverlay ? '2px 0' : 'clamp(8px, 1.5vw, 12px)',
        position: 'relative',
        cursor: onClick ? 'pointer' : undefined,
        lineHeight: 0,
        boxSizing: 'border-box',
        outline: 'none',
        boxShadow: bare ? 'none' : undefined,
        overflow: isOverlay ? 'hidden' : undefined,
        gap: isOverlay ? 2 : 4,
      }}
    >
      <div
        className="asset-art-root"
        style={{
          width: isOverlay ? 'min(100%, 90px)' : 'clamp(80px, 15vw, 160px)',
          maxWidth: isOverlay ? '100%' : undefined,
          maxHeight: isOverlay ? '50%' : undefined,
          aspectRatio: '60 / 16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformOrigin: 'center center',
          flexShrink: 1,
          outline: 'none',
          boxShadow: 'none',
          boxSizing: 'border-box',
          minHeight: 0,
          flex: isOverlay ? '1 1 auto' : undefined,
        }}
      >
        <svg
          viewBox={RIM_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'block',
            overflow: isOverlay ? 'hidden' : 'visible',
          }}
        >
          <use href={`#${svgHref}`} />
        </svg>
      </div>
      {label ? <div className="asset-under-label">{label}</div> : null}
    </div>
  );
}
