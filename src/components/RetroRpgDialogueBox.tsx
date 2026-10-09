'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import styles from './RetroRpgDialogueBox.module.css';

export interface RetroRpgDialogueBoxProps {
  isOpen: boolean;
  speakerName: string;
  portraitSrc: string;
  message: string;
  onAdvance?: () => void;
  onDismiss?: () => void;
  speedMs?: number;
}

export default function RetroRpgDialogueBox({
  isOpen,
  speakerName,
  portraitSrc,
  message,
  onAdvance,
  onDismiss,
  speedMs = 35,
}: RetroRpgDialogueBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showArrow, setShowArrow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !message) {
      clearTimer();
      return;
    }

    clearTimer();
    let index = 0;

    timeoutRef.current = setTimeout(() => {
      setDisplayedText('');
      setIsTyping(true);
      setShowArrow(false);

      function step() {
        if (index < message.length) {
          const char = message[index];
          setDisplayedText(message.slice(0, index + 1));
          index++;

          let delay = speedMs;
          if (['.', '!', '?'].includes(char)) {
            delay += 120;
          }
          timeoutRef.current = setTimeout(step, delay);
        } else {
          setIsTyping(false);
          setShowArrow(true);
        }
      }

      timeoutRef.current = setTimeout(step, speedMs);
    }, 0);

    return () => clearTimer();
  }, [isOpen, message, speedMs, clearTimer]);

  if (!isOpen) return null;

  const handleClick = () => {
    if (isTyping) {
      clearTimer();
      setDisplayedText(message);
      setIsTyping(false);
      setShowArrow(true);
    } else {
      onAdvance?.();
      onDismiss?.();
    }
  };

  return (
    <div
      className={styles.wrapper}
      onClick={handleClick}
      role="dialog"
      aria-live="polite"
    >
      {/* Corner Loops */}
      <svg
        className={`${styles.cornerLoop} ${styles.pixelArt}`}
        style={{ top: -6, left: -6 }}
        viewBox="0 0 24 24"
      >
        <rect
          x="0"
          y="0"
          width="8"
          height="8"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="0.5"
        />
        <rect x="2" y="2" width="4" height="4" fill="#09133b" />
        <rect x="8" y="2" width="6" height="4" fill="#ffffff" />
        <rect x="2" y="8" width="4" height="6" fill="#ffffff" />
        <rect x="7" y="7" width="5" height="5" fill="#ffffff" />
      </svg>
      <svg
        className={`${styles.cornerLoop} ${styles.pixelArt}`}
        style={{ top: -6, right: -6 }}
        viewBox="0 0 24 24"
      >
        <rect
          x="16"
          y="0"
          width="8"
          height="8"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="0.5"
        />
        <rect x="18" y="2" width="4" height="4" fill="#09133b" />
        <rect x="10" y="2" width="6" height="4" fill="#ffffff" />
        <rect x="18" y="8" width="4" height="6" fill="#ffffff" />
        <rect x="12" y="7" width="5" height="5" fill="#ffffff" />
      </svg>
      <svg
        className={`${styles.cornerLoop} ${styles.pixelArt}`}
        style={{ bottom: -6, left: -6 }}
        viewBox="0 0 24 24"
      >
        <rect
          x="0"
          y="16"
          width="8"
          height="8"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="0.5"
        />
        <rect x="2" y="18" width="4" height="4" fill="#09133b" />
        <rect x="8" y="18" width="6" height="4" fill="#ffffff" />
        <rect x="2" y="10" width="4" height="6" fill="#ffffff" />
        <rect x="7" y="12" width="5" height="5" fill="#ffffff" />
      </svg>
      <svg
        className={`${styles.cornerLoop} ${styles.pixelArt}`}
        style={{ bottom: -6, right: -6 }}
        viewBox="0 0 24 24"
      >
        <rect
          x="16"
          y="16"
          width="8"
          height="8"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="0.5"
        />
        <rect x="18" y="18" width="4" height="4" fill="#09133b" />
        <rect x="10" y="18" width="6" height="4" fill="#ffffff" />
        <rect x="18" y="10" width="4" height="6" fill="#ffffff" />
        <rect x="12" y="12" width="5" height="5" fill="#ffffff" />
      </svg>

      <div className={styles.window}>
        <div className={styles.portraitFrame}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={portraitSrc}
            alt={speakerName}
            className={styles.portraitImg}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.tried) {
                target.dataset.tried = '1';
                target.src = portraitSrc.replace(/talk\.png$/, 'sit.png');
              }
            }}
          />
        </div>

        <div className={styles.content}>
          <div className={styles.speakerName}>{speakerName}:</div>
          <div className={styles.body}>
            <p className={styles.text}>{displayedText}</p>
            {showArrow && (
              <div className={styles.promptArrow}>
                <svg
                  width="14"
                  height="10"
                  viewBox="0 0 10 7"
                  className={styles.pixelArt}
                >
                  <polygon
                    points="0,0 10,0 5,6"
                    fill="#ffffff"
                    stroke="#000000"
                    strokeWidth="0.8"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
