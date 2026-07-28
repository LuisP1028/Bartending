'use client';

import React, { useEffect, useMemo } from 'react';
import { decomposeWholeDollars } from '@/lib/receipt/moneyFanout';
import MoneyFanoutVisual from './MoneyFanoutVisual';
import styles from './MoneyFanoutFlyby.module.css';

export type MoneyFanoutFlybyProps = {
  /** Raw ticket total; floored to whole dollars for bills. */
  total: number;
  /** Unique key so remount restarts animation. */
  playId: string;
  onComplete?: () => void;
};

/**
 * Full-viewport L→R money fanout on success validate (FS49).
 * Path/Y/duration: CSS vars on `.layer` in MoneyFanoutFlyby.module.css.
 */
export default function MoneyFanoutFlyby({
  total,
  playId,
  onComplete,
}: MoneyFanoutFlybyProps) {
  const denoms = useMemo(() => decomposeWholeDollars(total), [total]);

  useEffect(() => {
    if (denoms.length === 0) {
      onComplete?.();
    }
  }, [denoms.length, onComplete, playId]);

  if (denoms.length === 0) return null;

  return (
    <div className={styles.layer} aria-hidden data-money-flyby={playId}>
      <div
        className={styles.track}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          onComplete?.();
        }}
      >
        <MoneyFanoutVisual denoms={denoms} />
      </div>
    </div>
  );
}
