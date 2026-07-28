'use client';

import React, { useMemo, useState } from 'react';
import {
  PRODUCT_MONEY_WIDTH_VW,
  decomposeWholeDollars,
} from '@/lib/receipt/moneyFanout';
import MoneyFanoutVisual from '@/components/receipt/MoneyFanoutVisual';

/** Default demo amount for this test page. */
const DEFAULT_AMOUNT = 17;

export default function MoneyFanoutTestPage() {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);

  const denoms = useMemo(() => decomposeWholeDollars(amount), [amount]);
  const sum = useMemo(() => denoms.reduce((s, d) => s + d, 0), [denoms]);
  const whole = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#121212',
        color: '#f0f0f0',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        padding: '28px 32px 48px',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          borderBottom: '2px solid #ffb000',
          paddingBottom: 14,
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: '1.35rem',
            letterSpacing: '0.04em',
            color: '#ffb000',
          }}
        >
          {'>>'} MONEY_FANOUT_TEST
        </h1>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#c8c8c8', maxWidth: '48rem' }}>
          Standalone fanout preview. Shared <code>MoneyFanoutVisual</code> (product
          parity). Bills at <strong>{PRODUCT_MONEY_WIDTH_VW}vw</strong>, rotated{' '}
          <strong>90°</strong>, fanned horizontally. Default amount{' '}
          <strong>{DEFAULT_AMOUNT}</strong>. Route: <code>/money-fanout-test</code>
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <label htmlFor="fanout-amount" style={{ fontSize: '0.9rem' }}>
          Amount
        </label>
        <input
          id="fanout-amount"
          type="number"
          min={0}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{
            width: 100,
            background: '#0e0e0e',
            border: '1px solid #555',
            color: '#fff',
            font: 'inherit',
            padding: '6px 8px',
          }}
        />
        <button
          type="button"
          onClick={() => setAmount(DEFAULT_AMOUNT)}
          style={{
            border: '1px solid #ffb000',
            background: '#1e1e1e',
            color: '#ffb000',
            font: 'inherit',
            fontSize: '0.8rem',
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          Reset to {DEFAULT_AMOUNT}
        </button>
      </div>

      <div
        style={{
          marginBottom: 20,
          fontSize: '0.9rem',
          lineHeight: 1.5,
          color: '#e8e0c0',
        }}
      >
        <div>
          Input: <strong>{amount}</strong> → whole dollars:{' '}
          <strong>{whole}</strong>
        </div>
        <div>
          Decomposition: [{denoms.join(', ') || 'empty'}] (sum={sum})
        </div>
        <div>Bill count: {denoms.length}</div>
      </div>

      <section
        aria-label={`Money fanout for ${whole}`}
        style={{
          position: 'relative',
          minHeight: '32vw',
          padding: '40px 24px 48px',
          backgroundColor: '#2a2a2a',
          backgroundImage:
            'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
          border: '1px solid #333',
          overflow: 'visible',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {denoms.length === 0 ? (
          <p style={{ color: '#888', margin: 0 }}>(no bills — whole dollars = 0)</p>
        ) : (
          <MoneyFanoutVisual denoms={denoms} />
        )}
      </section>

      <p style={{ marginTop: 24, fontSize: '0.8rem', color: '#888' }}>
        Expected for 17: greedy → 10 + 5 + 1 + 1 (four bills). Success validate uses
        the same visual via <code>MoneyFanoutFlyby</code> (L→R).
      </p>
    </div>
  );
}
