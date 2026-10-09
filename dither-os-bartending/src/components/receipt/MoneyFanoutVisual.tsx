'use client';

import React from 'react';
import { moneyPublicSrc } from '@/lib/receipt/moneyFanout';
import '@/app/receipt.css';

export type MoneyFanoutVisualProps = {
  /** Face values from decomposeWholeDollars (largest-first). */
  denoms: number[];
  className?: string;
  /**
   * `stage` (default): stage-proportional CSS vars / cqi (on-ticket + stage flyby).
   * `viewport`: product 15vw sandbox parity (money-fanout-test only).
   */
  sizeMode?: 'stage' | 'viewport';
};

/**
 * Approved sideways + horizontal Monopoly fan (parity with /money-fanout-test).
 * No travel animation — presentation only.
 */
export default function MoneyFanoutVisual({
  denoms,
  className,
  sizeMode = 'stage',
}: MoneyFanoutVisualProps) {
  if (!denoms.length) return null;

  const rootClass = [
    'receipt-money-fanout',
    sizeMode === 'viewport' ? 'receipt-money-fanout--viewport' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} aria-hidden>
      {denoms.map((denom, index) => {
        const sign = index % 2 === 0 ? -1 : 1;
        const fanTilt = sign * (3 + (index % 3));
        const totalRotate = 90 + fanTilt;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`fan-${index}-${denom}`}
            className="receipt-money-bill"
            src={moneyPublicSrc(denom)}
            alt=""
            draggable={false}
            style={{
              transform: `rotate(${totalRotate}deg)`,
              transformOrigin: 'center center',
              zIndex: index + 1,
            }}
          />
        );
      })}
    </div>
  );
}
