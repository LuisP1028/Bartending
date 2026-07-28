'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MONEY_BILLS,
  MONEY_SCALE_MAX_VW,
  MONEY_SCALE_MIN_VW,
  MONEY_SCALE_STORAGE_KEY,
  clampMoneyWidthVw,
  defaultMoneyScales,
} from '@/data/moneyAssets';
import styles from './money-scale.module.css';

function loadStoredScales(): Record<string, number> {
  const base = defaultMoneyScales();
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(MONEY_SCALE_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return base;
    }
    const obj = parsed as Record<string, unknown>;
    for (const bill of MONEY_BILLS) {
      const v = obj[bill.id];
      if (typeof v === 'number') {
        base[bill.id] = clampMoneyWidthVw(v);
      } else if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
        base[bill.id] = clampMoneyWidthVw(Number(v));
      }
    }
    return base;
  } catch {
    return base;
  }
}

function formatPct(vw: number): string {
  return `${vw.toFixed(1)}%`;
}

export default function MoneyScalePage() {
  const [scales, setScales] = useState<Record<string, number>>(defaultMoneyScales);
  const [hydrated, setHydrated] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    setScales(loadStoredScales());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(MONEY_SCALE_STORAGE_KEY, JSON.stringify(scales));
    } catch {
      // ignore quota / private mode
    }
  }, [scales, hydrated]);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const setScale = useCallback((id: string, value: number) => {
    setScales((prev) => ({
      ...prev,
      [id]: clampMoneyWidthVw(value),
    }));
  }, []);

  const summaryText = useMemo(() => {
    return MONEY_BILLS.map((bill) => {
      const vw = scales[bill.id] ?? bill.defaultWidthVw;
      return `${bill.label}: ${vw.toFixed(1)}% vw`;
    }).join('\n');
  }, [scales]);

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyStatus('Copied all scales');
    } catch {
      setCopyStatus('Copy failed — select text manually');
    }
    window.setTimeout(() => setCopyStatus(null), 2000);
  }, [summaryText]);

  const resetDefaults = useCallback(() => {
    setScales(defaultMoneyScales());
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{'>>'} MONEY_SCALE_CALIBRATION</h1>
        <p className={styles.instructions}>
          Resize each Monopoly cutout so it looks right relative to the browser.
          Scale is <strong>width as % of viewport width</strong> (height follows
          aspect ratio). Tune by eye, then copy the numbers for product sizing.
          Route: <code>/money-scale</code>
        </p>
      </header>

      <div className={styles.toolbar}>
        <button type="button" className={styles.button} onClick={copyAll}>
          Copy all scales
        </button>
        <button type="button" className={styles.button} onClick={resetDefaults}>
          Reset defaults (28% vw)
        </button>
        {copyStatus ? <span className={styles.copyStatus}>{copyStatus}</span> : null}
        {viewportWidth > 0 ? (
          <span className={styles.readout}>viewport width: {viewportWidth}px</span>
        ) : null}
      </div>

      <div className={styles.stage}>
        {MONEY_BILLS.map((bill) => {
          const vw = scales[bill.id] ?? bill.defaultWidthVw;
          const px =
            viewportWidth > 0
              ? Math.round((vw / 100) * viewportWidth)
              : null;

          return (
            <section key={bill.id} className={styles.row} aria-label={`${bill.label} scale`}>
              <div className={styles.label}>{bill.label}</div>

              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.bill}
                  src={bill.src}
                  alt={`Monopoly ${bill.label} bill`}
                  draggable={false}
                  style={{ width: `${vw}vw`, height: 'auto' }}
                />
              </div>

              <div className={styles.controls}>
                <input
                  className={styles.slider}
                  type="range"
                  min={MONEY_SCALE_MIN_VW}
                  max={MONEY_SCALE_MAX_VW}
                  step={0.1}
                  value={vw}
                  onChange={(e) => setScale(bill.id, Number(e.target.value))}
                  aria-label={`${bill.label} width percent of viewport`}
                />
                <div className={styles.numberRow}>
                  <label htmlFor={`money-vw-${bill.id}`}>% vw</label>
                  <input
                    id={`money-vw-${bill.id}`}
                    className={styles.numberInput}
                    type="number"
                    min={MONEY_SCALE_MIN_VW}
                    max={MONEY_SCALE_MAX_VW}
                    step={0.1}
                    value={Number(vw.toFixed(1))}
                    onChange={(e) => setScale(bill.id, Number(e.target.value))}
                  />
                </div>
                <div className={styles.readout}>
                  {bill.label} → {formatPct(vw)} of viewport width
                  {px != null ? ` (≈ ${px}px)` : ''}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
