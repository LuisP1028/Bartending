"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';

const BOOT_VIDEO_SRC = '/assets/boot/doom_gamestudio.mp4';
/** Fail-open if video never ends (decode hang, network). */
const BOOT_FAILSAFE_MS = 90_000;
/** Taps on the housing screen required to skip the intro. */
const BOOT_SKIP_TAPS = 5;

type BootIntroProps = {
  onComplete: () => void;
};

/**
 * FS79 — Full-viewport Game Boy chrome; intro MP4 plays only in the housing screen.
 * No native controls / no system player UI (playsInline + muted + no controls).
 * Five taps on the housing screen skip the sequence.
 */
export default function BootIntro({ onComplete }: BootIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const finishedRef = useRef(false);
  const skipTapsRef = useRef(0);
  const [skipTaps, setSkipTaps] = useState(0);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete();
  }, [onComplete]);

  const onScreenPointer = useCallback(
    (e: React.PointerEvent) => {
      // Only primary pointer (avoid multi-touch double-counting)
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      skipTapsRef.current += 1;
      const n = skipTapsRef.current;
      setSkipTaps(n);
      if (n >= BOOT_SKIP_TAPS) {
        finish();
      }
    },
    [finish],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.playsInline = true;

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay blocked: still finish after failsafe; user sees first frame
        });
      }
    };

    tryPlay();
    const onCanPlay = () => tryPlay();
    video.addEventListener('canplay', onCanPlay);

    const failsafe = window.setTimeout(finish, BOOT_FAILSAFE_MS);

    return () => {
      video.removeEventListener('canplay', onCanPlay);
      window.clearTimeout(failsafe);
      video.pause();
    };
  }, [finish]);

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
                  aria-label="Boot intro"
                  onEnded={finish}
                  onError={finish}
                />
                <button
                  type="button"
                  className="boot-intro__skip-hit"
                  aria-label={
                    skipTaps >= BOOT_SKIP_TAPS
                      ? 'Skipping intro'
                      : `Skip intro: tap ${BOOT_SKIP_TAPS - skipTaps} more time${
                          BOOT_SKIP_TAPS - skipTaps === 1 ? '' : 's'
                        }`
                  }
                  onPointerDown={onScreenPointer}
                />
              </div>
            </div>
            <div className="gb-shell__controls" aria-hidden="true">
              <div className="gb-shell__btn-direction">
                <div className="gb-shell__btn-direction-v" />
                <div className="gb-shell__btn-direction-h" />
              </div>
              <div className="gb-shell__btn-ab">
                <span className="gb-shell__btn-b" />
                <span className="gb-shell__btn-a" />
              </div>
              <div className="gb-shell__btn-start-select">
                <span className="gb-shell__btn-select">SELECT</span>
                <span className="gb-shell__btn-start">START</span>
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
}
