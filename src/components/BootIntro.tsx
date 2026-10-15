"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const BOOT_VIDEO_SRC = '/assets/boot/doom_gamestudio.mp4';
/** Fail-open if video never ends (decode hang, network). */
const BOOT_FAILSAFE_MS = 90_000;
/** Taps on the housing screen required to skip the intro. */
const BOOT_SKIP_TAPS = 5;
/** How long to keep retrying muted autoplay after mount. */
const AUTOPLAY_RETRY_MS = 8_000;

export type BootIntroHandle = {
  /** A button: count toward skip tap / unlock playback (FS118 INV-AB-SWAP-01) */
  interactTap: () => void;
  /** Start / B / Select override: finish intro immediately (FS118 INV-AB-SWAP-01) */
  finish: () => void;
};

type BootIntroProps = {
  onComplete: () => void;
  /** When true, renders only the inner playfield content inside GameBoy3DShell */
  embeddedIn3DShell?: boolean;
};

/**
 * FS79 / FS009 — Studio boot sequence inside the Game Boy screen.
 * No native controls / no system player UI (playsInline + muted + no controls).
 * Five taps on the housing screen (or B button presses) skip the sequence; Start skips immediately to play.
 */
const BootIntro = forwardRef<BootIntroHandle, BootIntroProps>(function BootIntro(
  { onComplete, embeddedIn3DShell = false },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const finishedRef = useRef(false);
  const skipTapsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [skipTaps, setSkipTaps] = useState(0);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }
    onCompleteRef.current();
  }, []);

  const forceMutedInline = useCallback((video: HTMLVideoElement) => {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.playsInline = true;
  }, []);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || finishedRef.current) return;
    forceMutedInline(video);
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        /* Autoplay may be blocked until a later canplay / user gesture */
      });
    }
  }, [forceMutedInline]);

  const interactTap = useCallback(() => {
    tryPlay();
    skipTapsRef.current += 1;
    const n = skipTapsRef.current;
    setSkipTaps(n);
    if (n >= BOOT_SKIP_TAPS) {
      finish();
    }
  }, [finish, tryPlay]);

  useImperativeHandle(
    ref,
    () => ({
      interactTap,
      finish,
    }),
    [interactTap, finish]
  );

  const onScreenPointer = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      interactTap();
    },
    [interactTap],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    forceMutedInline(video);

    const onReady = () => tryPlay();
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('canplaythrough', onReady);
    // If tab becomes visible again (HF iframe / mobile background), retry.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    document.addEventListener('visibilitychange', onVisible);

    tryPlay();
    // Aggressive short retries — covers delayed moov parse / Space cold start.
    const started = Date.now();
    const retryId = window.setInterval(() => {
      if (finishedRef.current) return;
      if (!video.paused && !video.ended) return;
      if (Date.now() - started > AUTOPLAY_RETRY_MS) {
        window.clearInterval(retryId);
        return;
      }
      tryPlay();
    }, 250);

    const failsafe = window.setTimeout(finish, BOOT_FAILSAFE_MS);

    return () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('canplaythrough', onReady);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(retryId);
      window.clearTimeout(failsafe);
      // Do not pause here on dep churn — Strict Mode remount would kill a healthy play.
      // finish() pauses explicitly when leaving the intro.
    };
  }, [finish, forceMutedInline, tryPlay]);

  const playfieldContent = (
    <>
      <video
        ref={videoRef}
        className="boot-intro__video"
        src={BOOT_VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
        controlsList="nodownload nofullscreen noremoteplayback"
        tabIndex={-1}
        aria-hidden
        onEnded={finish}
        onError={finish}
      />
      <div
        role="button"
        tabIndex={0}
        className="boot-intro__skip-hit"
        aria-label={
          skipTaps >= BOOT_SKIP_TAPS
            ? 'Skipping intro'
            : `Skip intro: tap ${BOOT_SKIP_TAPS - skipTaps} more time${
                BOOT_SKIP_TAPS - skipTaps === 1 ? '' : 's'
              }`
        }
        onPointerDown={onScreenPointer}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            interactTap();
          }
        }}
      />
    </>
  );

  if (embeddedIn3DShell) {
    return (
      <div
        className="boot-intro__embedded"
        role="dialog"
        aria-label="Studio boot sequence"
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        {playfieldContent}
      </div>
    );
  }

  return (
    <div className="boot-intro" role="dialog" aria-label="Studio boot sequence">
      <div className="boot-intro__slot gb-shell-slot">
        <div className="gb-shell-scale">
          <div className="gb-shell" aria-hidden={false}>
            <div className="gb-shell__on-off" aria-hidden="true">
              {'< off-on >'}
            </div>
            <div className="gb-shell__screen-cont">
              <div className="gb-shell__power" aria-hidden="true" />
              <div className="gb-shell__header" aria-hidden="true">
                DOT MATRIX WITH STEREO SOUND
              </div>
              <div className="gb-shell__playfield boot-intro__playfield">
                {playfieldContent}
              </div>
            </div>
            <div className="gb-shell__controls" aria-hidden={false}>
              <div className="gb-shell__btn-direction" aria-hidden="true">
                <div className="gb-shell__btn-direction-v" />
                <div className="gb-shell__btn-direction-h" />
              </div>
              <div className="gb-shell__btn-ab" aria-hidden="true">
                <span className="gb-shell__btn-b" />
                <span className="gb-shell__btn-a" />
              </div>
              <div className="gb-shell__btn-start-select">
                <span className="gb-shell__btn-select" aria-hidden="true">
                  SELECT
                </span>
                <button
                  type="button"
                  className="gb-shell__btn-start"
                  aria-label="Start game immediately"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    finish();
                  }}
                />
              </div>
            </div>
            <div className="gb-shell__speakers" aria-hidden="true" />
            <div className="gb-shell__phones" aria-hidden="true">
              phones
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BootIntro;

