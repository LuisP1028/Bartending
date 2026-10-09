'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './JoinBarCamera.module.css';

type Props = {
  /** Called when player confirms captured still. */
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Optional busy flag while parent POSTs register. */
  busy?: boolean;
  statusMessage?: string | null;
  statusError?: boolean;
};

/**
 * FS89 — Camera uplink (ported from cameratest.html) + capture shutter.
 */
export default function JoinBarCamera({
  onCapture,
  onClose,
  busy = false,
  statusMessage = null,
  statusError = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [stillBlob, setStillBlob] = useState<Blob | null>(null);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setLive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setStillUrl(null);
    setStillBlob(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {
          /* autoplay policies may need muted playsInline — already set */
        });
      }
      setLive(true);
    } catch (err) {
      console.error('Join bar camera uplink failed', err);
      setError('ERR: SIGNAL LOST — ACCESS DENIED OR HARDWARE OFFLINE');
      setLive(false);
    }
  }, [stopStream]);

  useEffect(() => {
    void startCamera();
    return () => {
      stopStream();
      if (stillUrl) URL.revokeObjectURL(stillUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        stopStream();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose, stopStream]);

  const captureStill = useCallback(() => {
    const video = videoRef.current;
    if (!video || !live || video.readyState < 2) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 640;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (stillUrl) URL.revokeObjectURL(stillUrl);
        const url = URL.createObjectURL(blob);
        setStillBlob(blob);
        setStillUrl(url);
        stopStream();
      },
      'image/jpeg',
      0.92
    );
  }, [live, stillUrl, stopStream]);

  const retake = useCallback(() => {
    if (stillUrl) URL.revokeObjectURL(stillUrl);
    setStillUrl(null);
    setStillBlob(null);
    void startCamera();
  }, [startCamera, stillUrl]);

  const usePhoto = useCallback(() => {
    if (!stillBlob) return;
    const file = new File([stillBlob], 'join-selfie.jpg', {
      type: stillBlob.type || 'image/jpeg',
    });
    onCapture(file);
  }, [onCapture, stillBlob]);

  const handleClose = useCallback(() => {
    if (busy) return;
    stopStream();
    onClose();
  }, [busy, onClose, stopStream]);

  const showingStill = !!stillUrl;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Visual uplink terminal"
    >
      <main className={styles.terminal}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Visual Uplink</h1>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={busy}
            aria-label="Close camera"
          >
            Abort
          </button>
        </div>

        <div className={styles.boundingBox}>
          <div className={styles.scanlines} aria-hidden="true" />
          <div className={styles.flicker} aria-hidden="true" />
          <div className={`${styles.hudCorner} ${styles.tl}`} aria-hidden />
          <div className={`${styles.hudCorner} ${styles.tr}`} aria-hidden />
          <div className={`${styles.hudCorner} ${styles.bl}`} aria-hidden />
          <div className={`${styles.hudCorner} ${styles.br}`} aria-hidden />
          <div className={`${styles.hudData} ${styles.dataTopLeft}`}>CAM_01</div>
          <div className={`${styles.hudData} ${styles.dataTopRight}`}>
            <div className={styles.recDot} /> REC
          </div>
          <div className={`${styles.hudData} ${styles.dataBottomLeft}`}>
            LOC: SECTOR_7
          </div>
          <div className={`${styles.hudData} ${styles.dataBottomRight}`}>
            UPLINK: SECURE
          </div>

          {!live && !showingStill && (
            <div
              className={`${styles.statusText}${error ? ` ${styles.statusError}` : ''}`}
            >
              {error ? (
                <>
                  Err: Signal Lost
                  <br />
                  <br />
                  Access Denied Or
                  <br />
                  Hardware Offline
                </>
              ) : (
                <>
                  Initializing Uplink...
                  <br />
                  <br />
                  Awaiting Signal
                </>
              )}
            </div>
          )}

          {showingStill ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.still} src={stillUrl!} alt="Captured selfie" />
          ) : (
            <video
              ref={videoRef}
              className={styles.video}
              autoPlay
              playsInline
              muted
              aria-hidden={!live}
            />
          )}
        </div>

        <div className={styles.actions}>
          {!showingStill ? (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={captureStill}
              disabled={!live || busy}
            >
              Capture
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={retake}
                disabled={busy}
              >
                Retake
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={usePhoto}
                disabled={busy || !stillBlob}
              >
                {busy ? 'Transmitting…' : 'Use Photo'}
              </button>
            </>
          )}
        </div>

        {statusMessage ? (
          <div
            className={`${styles.statusLine}${statusError ? ` ${styles.statusLineError}` : ''}`}
          >
            {statusMessage}
          </div>
        ) : null}
      </main>
    </div>
  );
}
