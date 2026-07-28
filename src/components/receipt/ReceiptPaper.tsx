'use client';

import React, { useEffect, useRef } from 'react';
import type { ReceiptEntity } from '@/lib/receipt/types';
import { FIXED_PAPER_PALETTE } from '@/lib/receipt/palettes';
import { getJaggedEdge, getCrumpledSprite } from '@/lib/receipt/proceduralArt';
import { drawBarcode } from '@/lib/receipt/drawBarcode';
import { formatMoney } from '@/lib/receipt/priceTicket';
import { resolveModeReceiptBrand } from '@/lib/receipt/modeReceiptBranding';

type ReceiptPaperProps = {
  entity: ReceiptEntity;
  /** Active game mode label for closed-face title (e.g. OBELISCO, CLASSICS). */
  modeName: string;
  /** True when this receipt owns the live drink_placement build. */
  isActiveOrder?: boolean;
  onAnimationEnd: (instanceId: string, rect: DOMRect) => void;
  onPointerDown: (instanceId: string, e: React.PointerEvent) => void;
  onPointerMove: (instanceId: string, e: React.PointerEvent) => void;
  onPointerUp: (instanceId: string, e: React.PointerEvent) => void;
  onContextMenu: (instanceId: string, e: React.MouseEvent) => void;
  /** Click-equivalent expand/contract (keyboard). */
  onToggleExpand: (instanceId: string) => void;
};

export default function ReceiptPaper({
  entity,
  modeName,
  isActiveOrder = false,
  onAnimationEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu,
  onToggleExpand,
}: ReceiptPaperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const palette = FIXED_PAPER_PALETTE;
  const showFull = entity.inspected && !entity.crumpled;
  const brand = resolveModeReceiptBrand(modeName);

  useEffect(() => {
    if (showFull && canvasRef.current) {
      drawBarcode(canvasRef.current, entity.seed, palette.ink);
    }
  }, [entity.seed, palette.ink, showFull]);

  const isHandoffExit = !!entity.handoffExit;

  const classNames = [
    'receipt-wrapper',
    entity.phase === 'printing' ? 'anim-printing' : '',
    entity.crumpled ? 'state-crumpled' : '',
    // Inspected + not crumpled drives Full face (showFull) and scale class
    showFull ? 'state-inspected' : '',
    isActiveOrder ? 'receipt-wrapper--active-order' : '',
    isHandoffExit ? 'receipt-wrapper--handoff-exit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    '--paper-bg': palette.paper,
    '--ink-color': palette.ink,
    '--jagged-svg': getJaggedEdge(palette.paper),
    '--crumpled-svg': getCrumpledSprite(palette.paper, palette.ink),
    left: entity.inMask ? 0 : `${entity.position.left}px`,
    top: entity.inMask ? 0 : `${entity.position.top}px`,
    zIndex: showFull ? 9000 : entity.zIndex,
    margin: 0,
  } as React.CSSProperties;

  const dateStr = entity.issuedAt.toLocaleDateString();
  const timeStr = entity.issuedAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalDisplay = formatMoney(entity.pricedOrder.total);
  const tax = entity.pricedOrder.tax;

  const bodyLines =
    entity.bodyLines && entity.bodyLines.length > 0
      ? entity.bodyLines
      : [
          { label: entity.ticket.name, value: '' },
          { label: 'VESSEL', value: entity.ticket.vessel },
          { label: 'METHOD', value: entity.ticket.agitation },
        ];

  return (
    <div
      ref={wrapperRef}
      className={classNames}
      style={style}
      data-instance-id={entity.instanceId}
      data-receipt-face={showFull ? 'full' : 'summary'}
      data-inspected={showFull ? 'true' : 'false'}
      data-active-order={isActiveOrder ? 'true' : 'false'}
      data-handoff-exit={isHandoffExit ? 'true' : 'false'}
      aria-current={isActiveOrder && !isHandoffExit ? 'true' : undefined}
      onAnimationEnd={() => {
        if (entity.phase !== 'printing' || !wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        onAnimationEnd(entity.instanceId, rect);
      }}
      onPointerDown={(e) => {
        if (isHandoffExit) return;
        onPointerDown(entity.instanceId, e);
      }}
      onPointerMove={(e) => {
        if (isHandoffExit) return;
        onPointerMove(entity.instanceId, e);
      }}
      onPointerUp={(e) => {
        if (isHandoffExit) return;
        onPointerUp(entity.instanceId, e);
      }}
      onContextMenu={(e) => onContextMenu(entity.instanceId, e)}
      title={
        isHandoffExit
          ? undefined
          : showFull
            ? 'Click to collapse'
            : 'Click to expand'
      }
      role="button"
      tabIndex={
        entity.phase === 'free' && !entity.inMask && !isHandoffExit ? 0 : -1
      }
      onKeyDown={(e) => {
        if (isHandoffExit) return;
        if (entity.phase !== 'free' || entity.inMask || entity.crumpled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleExpand(entity.instanceId);
        }
      }}
    >
      {/* Fixed-size face; overflow-y scroll for long full tickets */}
      <div
        className={`receipt-paper${entity.creased ? ' state-creased' : ''}${
          showFull ? ' receipt-paper--full' : ' receipt-paper--summary'
        }`}
        onWheel={(e) => {
          // Keep wheel scroll on the ticket; do not scroll the page behind
          e.stopPropagation();
        }}
      >
        {showFull ? (
          <>
            <div className="r-header">
              {/* Full face: mode-keyed brand logo (MODE_RECEIPT_BRANDING) */}
              <img
                className="r-logo"
                src={brand.logoSrc}
                alt={brand.logoAlt}
                draggable={false}
              />
              <div className="r-line r-meta">
                <span className="r-line-label">CHK: {entity.orderId}</span>
                <span className="r-line-value">{dateStr}</span>
              </div>
              <div className="r-line r-meta">
                <span className="r-line-label">SRV: V_BARTENDER</span>
                <span className="r-line-value">{timeStr}</span>
              </div>
            </div>

            <div className="r-divider" />

            {/* Full drink instructions from frozen bodyLines (ticket at print) */}
            {bodyLines.map((line, i) => (
              <div
                className={
                  line.flagged || line.generic ? 'r-line r-line--flagged' : 'r-line'
                }
                key={`body-${i}`}
              >
                <span className="r-line-label">{line.label}</span>
                <span className="r-line-value">{line.value}</span>
              </div>
            ))}

            <div className="r-divider" />

            {entity.commercial.lines.map((line, i) => (
              <div className="r-line r-commercial" key={`com-${i}`}>
                <span className="r-line-label">{line.label}</span>
                <span className="r-line-value">{line.value}</span>
              </div>
            ))}

            <div className="r-divider" />

            <div className="r-line">
              <span className="r-line-label">SUBTOTAL</span>
              <span className="r-line-value">${entity.commercial.subtotal}</span>
            </div>
            {tax > 0 && (
              <div className="r-line">
                <span className="r-line-label">PIXEL TAX</span>
                <span className="r-line-value">${entity.commercial.tax}</span>
              </div>
            )}
            <div className="r-line r-total">
              <span className="r-line-label">TOTAL</span>
              <span className="r-line-value">{totalDisplay}</span>
            </div>

            <div className="r-divider" />

            <div className="r-footer">NO REFUNDS ON SPILLED PIXELS</div>

            <div className="r-barcode-container">
              <canvas ref={canvasRef} className="r-barcode" width={240} height={36} />
              <div className="r-seed">{entity.seed}</div>
            </div>

            {entity.paid ? <div className="stamp-paid">PAID</div> : null}
          </>
        ) : (
          <>
            <div className="r-header r-header--summary">
              <div className="r-title r-title--summary">{modeName}</div>
              <div className="r-line r-meta">
                <span className="r-line-label">CHK: {entity.orderId}</span>
                <span className="r-line-value">{timeStr}</span>
              </div>
            </div>
            <div className="r-divider" />
            <div className="r-summary-name">{entity.ticket.name}</div>
            <div className="r-summary-row">
              <span>{entity.ticket.vessel}</span>
              <span className="r-summary-method">{entity.ticket.agitation}</span>
            </div>
            <div className="r-summary-ings">{entity.summaryIngredientsLine}</div>
            <div className="r-divider" />
            <div className="r-line r-total r-total--summary">
              <span className="r-line-label">TOTAL</span>
              <span className="r-line-value">{totalDisplay}</span>
            </div>
          </>
        )}
      </div>
      <div className="crumpled-wad" aria-hidden />
    </div>
  );
}
