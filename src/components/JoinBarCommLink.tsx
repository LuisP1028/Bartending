'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import styles from './JoinBarCommLink.module.css';

export type JoinBarIdentity = {
  name: string;
  email: string | null;
  phone: string | null;
  aboutMe: string;
};

/** FS93 — shell D-pad / A bridge while Comm-Link is active. */
export type JoinBarCommLinkHandle = {
  /** delta -1 up / +1 down (also used for left/right). */
  moveFocus: (delta: -1 | 1) => void;
  /** A: focus input or submit when Transmit focused. */
  activate: () => void;
};

type Props = {
  onTransmit: (identity: JoinBarIdentity) => void;
  onClose: () => void;
};

const FOCUS_COUNT = 4; // alias, comm, personality, transmit

/**
 * FS89/93/111 — Comm-Link: alias + email/phone + personality bio; no Safari zoom; D-pad field nav.
 */
const JoinBarCommLink = forwardRef<JoinBarCommLinkHandle, Props>(
  function JoinBarCommLink({ onTransmit, onClose }, ref) {
    const [alias, setAlias] = useState('');
    const [comm, setComm] = useState('');
    const [aboutMe, setAboutMe] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [focusIndex, setFocusIndex] = useState(0);
    const aliasRef = useRef<HTMLInputElement>(null);
    const commRef = useRef<HTMLInputElement>(null);
    const aboutMeRef = useRef<HTMLTextAreaElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const applyFocus = useCallback((index: number) => {
      const i = ((index % FOCUS_COUNT) + FOCUS_COUNT) % FOCUS_COUNT;
      setFocusIndex(i);
      requestAnimationFrame(() => {
        const target =
          i === 0
            ? aliasRef.current
            : i === 1
              ? commRef.current
              : i === 2
                ? aboutMeRef.current
                : submitRef.current;
        target?.focus();
        target?.scrollIntoView?.({ block: 'nearest' });
      });
    }, []);

    useEffect(() => {
      applyFocus(0);
    }, [applyFocus]);

    const moveFocus = useCallback(
      (delta: -1 | 1) => {
        applyFocus(focusIndex + delta);
      },
      [applyFocus, focusIndex]
    );

    const tryTransmit = useCallback(() => {
      setError(null);
      const name = alias.trim();
      const contact = comm.trim();
      const bio = aboutMe.trim();
      if (!name) {
        setError('ALIAS REQUIRED');
        applyFocus(0);
        return;
      }
      if (!contact) {
        setError('EMAIL OR COMM-NUMBER REQUIRED');
        applyFocus(1);
        return;
      }
      if (!bio) {
        setError('PERSONALITY BIO REQUIRED');
        applyFocus(2);
        return;
      }
      if (bio.length < 10) {
        setError('PERSONALITY BIO MUST BE AT LEAST 10 CHARACTERS');
        applyFocus(2);
        return;
      }
      if (aboutMe.length > 500 || bio.length > 500) {
        setError('PERSONALITY BIO CANNOT EXCEED 500 CHARACTERS');
        applyFocus(2);
        return;
      }
      // Map single comm field: email if it looks like one, else phone
      const isEmail = contact.includes('@');
      onTransmit({
        name,
        email: isEmail ? contact : null,
        phone: isEmail ? null : contact,
        aboutMe: bio,
      });
    }, [alias, comm, aboutMe, onTransmit, applyFocus]);

    const activate = useCallback(() => {
      if (focusIndex === 3) {
        tryTransmit();
        return;
      }
      applyFocus(focusIndex);
    }, [focusIndex, tryTransmit, applyFocus]);

    useImperativeHandle(
      ref,
      () => ({
        moveFocus,
        activate,
      }),
      [moveFocus, activate]
    );

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          moveFocus(1);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          moveFocus(-1);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose, moveFocus]);

    const onSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        tryTransmit();
      },
      [tryTransmit]
    );

    return (
      <div
        className={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-label="Establish Comm-Link"
      >
        <main className={styles.terminal}>
          <div className={styles.scanlines} aria-hidden="true" />
          <form ref={formRef} className={styles.form} onSubmit={onSubmit}>
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
                ref={aliasRef}
                id="join-alias"
                className={`${styles.synthInput}${
                  focusIndex === 0 ? ` ${styles.controlFocused}` : ''
                }`}
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onFocus={() => setFocusIndex(0)}
                placeholder="Awaiting identity..."
                autoComplete="off"
                // 16px in CSS prevents iOS Safari focus-zoom (FS93)
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="join-comm" className={styles.inputLabel}>
                Enter Email or Comm-Number:
              </label>
              <input
                ref={commRef}
                id="join-comm"
                className={`${styles.synthInput}${
                  focusIndex === 1 ? ` ${styles.controlFocused}` : ''
                }`}
                type="text"
                inputMode="email"
                value={comm}
                onChange={(e) => setComm(e.target.value)}
                onFocus={() => setFocusIndex(1)}
                placeholder="Awaiting signal..."
                autoComplete="off"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="join-personality" className={styles.inputLabel}>
                  Enter Personality / About Me:
                </label>
                <span className={styles.charCount}>{aboutMe.length}/500</span>
              </div>
              <textarea
                ref={aboutMeRef}
                id="join-personality"
                className={`${styles.synthInput} ${styles.synthTextarea}${
                  focusIndex === 2 ? ` ${styles.controlFocused}` : ''
                }`}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                onFocus={() => setFocusIndex(2)}
                placeholder="Describe persona, tone, quirks, or drink preferences (10-500 chars)..."
                maxLength={500}
                rows={2}
                required
              />
            </div>

            <div className={styles.promoNotice}>
              <span>[ Security Override ]</span>
              Transmitted data will strictly be utilized for neon bar promotions
              and sector uplink alerts. No external routing permitted.
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}

            <button
              ref={submitRef}
              type="submit"
              className={`${styles.submitBtn}${
                focusIndex === 3 ? ` ${styles.controlFocused}` : ''
              }`}
              onFocus={() => setFocusIndex(3)}
            >
              Transmit Data
            </button>
          </form>
        </main>
      </div>
    );
  }
);

export default JoinBarCommLink;
