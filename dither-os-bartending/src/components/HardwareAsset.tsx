import React from 'react';
import type { HardwareFanOut } from '@/data/Manifest';

type HardwareAssetProps = {
  type: string;
  svgHref: string;
  /** Public path to raster art (e.g. PNG). Preferred over SVG symbol when set (unless fanOut). */
  imageSrc?: string;
  /** Stacked fan-out of back SVG + front image (e.g. tin + fine mesh). */
  fanOut?: HardwareFanOut;
  label: string;
  onClick?: () => void;
  presentation?: 'card' | 'cardless' | 'overlay';
};

/**
 * Shared canvas for hardware symbols in GlobalSVGDefs (paths drawn roughly in 64×96 space).
 * Raster tools (imageSrc) use the same art root; SVG tools use <use href>.
 * fanOut stacks shaken tin + double-strain mesh as a fan.
 */
const HARDWARE_VIEWBOX = '0 0 64 96';

export default function HardwareAsset({
  type,
  svgHref,
  imageSrc,
  fanOut,
  label,
  onClick,
  presentation = 'card',
}: HardwareAssetProps) {
  const isOverlay = presentation === 'overlay';
  const bare = presentation === 'cardless' || isOverlay;
  const useFanOut = Boolean(fanOut?.backSvgHref && fanOut?.frontImageSrc);
  const useRaster = !useFanOut && Boolean(imageSrc);
  const wideArt = useRaster || useFanOut;

  return (
    <div
      onClick={onClick}
      className="hardware-asset-root"
      data-hardware-type={type}
      aria-label={label}
      title={label}
      style={{
        border: bare ? 'none' : 'clamp(1px, 0.2vmin, 2px) solid #222',
        background: bare ? 'transparent' : '#0d0d0d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isOverlay ? 'center' : 'flex-end',
        height: isOverlay ? '100%' : 'auto',
        width: isOverlay ? '100%' : undefined,
        minHeight: isOverlay ? 0 : bare ? 'auto' : 'clamp(160px, 28vh, 320px)',
        maxWidth: isOverlay ? '100%' : undefined,
        maxHeight: isOverlay ? '100%' : undefined,
        padding: isOverlay ? '4px 2px' : bare ? 'clamp(4px, 1vw, 8px)' : 'clamp(8px, 1.5vw, 12px)',
        position: 'relative',
        cursor: onClick ? 'pointer' : undefined,
        lineHeight: 0,
        boxSizing: 'border-box',
        outline: 'none',
        boxShadow: bare ? 'none' : 'clamp(2px, 0.5vmin, 4px) clamp(2px, 0.5vmin, 4px) 0 #000',
        overflow: isOverlay ? 'hidden' : 'visible',
        gap: isOverlay ? 4 : 6,
      }}
    >
      <div
        className="asset-art-root hardware-art-root"
        style={{
          position: 'relative',
          width: isOverlay
            ? wideArt
              ? 'min(100%, 80px)'
              : 'min(100%, 52px)'
            : wideArt
              ? 'clamp(100px, 20vw, 168px)'
              : 'clamp(72px, 14vw, 120px)',
          maxWidth: '100%',
          maxHeight: isOverlay ? 'calc(100% - 28px)' : undefined,
          aspectRatio: wideArt ? '5 / 4' : '64 / 96',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformOrigin: 'center center',
          flexShrink: 1,
          flexGrow: isOverlay ? 1 : 0,
          outline: 'none',
          boxShadow: 'none',
          overflow: 'visible',
          boxSizing: 'border-box',
          minHeight: 0,
          margin: '0 auto',
        }}
      >
        {useFanOut && fanOut ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
            }}
          >
            {/* Back: Boston tin (Shaken), fanned back-left */}
            <div
              style={{
                position: 'absolute',
                inset: '8% 22% 12% 4%',
                transform: 'rotate(-14deg) translate(-4%, 2%)',
                transformOrigin: 'center bottom',
                opacity: 0.95,
                zIndex: 1,
              }}
            >
              <svg
                viewBox={HARDWARE_VIEWBOX}
                preserveAspectRatio="xMidYMid meet"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  overflow: 'visible',
                }}
              >
                <g transform="translate(-4, 0)">
                  <use href={`#${fanOut.backSvgHref}`} />
                </g>
              </svg>
            </div>
            {/* Front: fine mesh strainer, fanned forward-right */}
            <div
              style={{
                position: 'absolute',
                inset: '18% 2% 4% 18%',
                transform: 'rotate(12deg) translate(6%, -2%)',
                transformOrigin: 'center center',
                zIndex: 2,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fanOut.frontImageSrc}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  background: 'transparent',
                  imageRendering: 'pixelated',
                  filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.45))',
                }}
              />
            </div>
          </div>
        ) : useRaster ? (
          // eslint-disable-next-line @next/next/no-img-element -- hardware catalog sprites
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              background: 'transparent',
              imageRendering: 'pixelated',
            }}
          />
        ) : (
          <svg
            viewBox={HARDWARE_VIEWBOX}
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              display: 'block',
              margin: '0 auto',
              overflow: 'visible',
            }}
          >
            <g transform="translate(-4, 0)">
              <use href={`#${svgHref}`} />
            </g>
          </svg>
        )}
      </div>
      {label ? (
        <div
          className="asset-under-label hardware-under-label"
          style={{
            width: '100%',
            maxWidth: isOverlay
              ? '100%'
              : wideArt
                ? 'clamp(100px, 20vw, 168px)'
                : 'clamp(72px, 14vw, 120px)',
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
