'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from './JoinBarCommLink.module.css';

export type JoinBarIdentity = {
  name: string;
  email: string | null;
  phone: string | null;
};

type Props = {
  onTransmit: (identity: JoinBarIdentity) => void;
  onClose: () => void;
};

/**
 * FS89 — Comm-Link stage (ported from joinbar.html).
 * Collects alias + email-or-phone before camera uplink.
 */
export default function JoinBarCommLink({ onTransmit, onClose }: Props) {
  const [alias, setAlias] = useState('');
  const [comm, setComm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const name = alias.trim();
      const contact = comm.trim();
      if (!name) {
        setError('ALIAS REQUIRED');
        return;
      }
      if (!contact) {
        setError('EMAIL OR COMM-NUMBER REQUIRED');
        return;
      }
      // Map single comm field: email if it looks like one, else phone
      const isEmail = contact.includes('@');
      onTransmit({
        name,
        email: isEmail ? contact : null,
        phone: isEmail ? null : contact,
      });
    },
    [alias, comm, onTransmit]
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Establish Comm-Link">
      <main className={styles.terminal}>
        <div className={styles.scanlines} aria-hidden="true" />
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.headerRow}>
            <h1 className={styles.headerTitle}>Establish Comm-Link</h1>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close join"
            >
              Abort
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="join-alias" className={styles.inputLabel}>
              Enter Alias:
            </label>
            <input
              id="join-alias"
              className={styles.synthInput}
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Awaiting identity..."
              autoComplete="off"
              required
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="join-comm" className={styles.inputLabel}>
              Enter Email or Comm-Number:
            </label>
            <input
              id="join-comm"
              className={styles.synthInput}
              type="text"
              value={comm}
              onChange={(e) => setComm(e.target.value)}
              placeholder="Awaiting signal..."
              autoComplete="off"
              required
            />
          </div>

          <div className={styles.promoNotice}>
            <span>[ Security Override ]</span>
            Transmitted data will strictly be utilized for neon bar promotions
            and sector uplink alerts. No external routing permitted.
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button type="submit" className={styles.submitBtn}>
            Transmit Data
          </button>
        </form>
      </main>
    </div>
  );
}
