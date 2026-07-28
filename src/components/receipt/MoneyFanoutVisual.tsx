'use client';

import React from 'react';
import {
  PRODUCT_MONEY_WIDTH_VW,
  moneyPublicSrc,
} from '@/lib/receipt/moneyFanout';

export type MoneyFanoutVisualProps = {
  /** Face values from decomposeWholeDollars (largest-first). */
  denoms: number[];
  className?: string;
};

/**
 * Approved sideways + horizontal Monopoly fan (parity with /money-fanout-test).
 * No travel animation — presentation only.
 */
export default function MoneyFanoutVisual({
  denoms,
  className,
}: MoneyFanoutVisualProps) {
  if (!denoms.length) return null;

  return (
    <div
      className={className}
      aria-hidden
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8vw 4vw',
        pointerEvents: 'none',
      }}
    >
      {denoms.map((denom, index) => {
        const sign = index % 2 === 0 ? -1 : 1;
        const fanTilt = sign * (3 + (index % 3));
        const totalRotate = 90 + fanTilt;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`fan-${index}-${denom}`}
            src={moneyPublicSrc(denom)}
            alt=""
            draggable={false}
            style={{
              width: `${PRODUCT_MONEY_WIDTH_VW}vw`,
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              marginLeft: index === 0 ? 0 : '-10.5vw',
              transform: `rotate(${totalRotate}deg)`,
              transformOrigin: 'center center',
              zIndex: index + 1,
              position: 'relative',
              userSelect: 'none',
              pointerEvents: 'none',
              filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.45))',
            }}
          />
        );
      })}
    </div>
  );
}
