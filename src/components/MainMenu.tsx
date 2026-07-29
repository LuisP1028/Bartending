'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './MainMenu.module.css';

const MENU_BG_SRC = '/assets/boot/menu_background.jpg';

const MENU_ITEMS = [
  { id: 'initiate', label: 'Initiate Sequence', entersPlay: true },
  { id: 'starfield', label: 'Starfield Config', entersPlay: false },
  { id: 'diagnostics', label: 'Warp Diagnostics', entersPlay: false },
  { id: 'terminate', label: 'Terminate Uplink', entersPlay: false },
] as const;

type MainMenuProps = {
  /** Leave menu → interactive game (Initiate Sequence, root B, START). */
  onEnterPlay: () => void;
};

/**
 * FS80/82 — Full-viewport Game Boy chrome; synthwave bg + Navigator menu.
 * Shell: ↑↓ navigate, A select, B back (root → play), START → play.
 */
export default function MainMenu({ onEnterPlay }: MainMenuProps) {
  const navWrapperRef = useRef<HTMLElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const phaseShiftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceCleanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  /** v1: only root screen; depth > 1 reserved for future sub-screens (FS82 O8). */
  const [screenStack] = useState<string[]>(['root']);
  const ANIMATION_DURATION_MS = 150;

  activeIndexRef.current = activeIndex;

  const snapPointer = useCallback((targetElement: HTMLElement, bypassAnimation = false) => {
    const navWrapper = navWrapperRef.current;
    const pointer = pointerRef.current;
    if (!navWrapper || !pointer) return;

    const containerRect = navWrapper.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const pointerHeight = pointer.offsetHeight || 24;
    const destinationY =
      targetRect.top - containerRect.top + targetRect.height / 2 - pointerHeight / 2;

    pointer.style.setProperty('--target-y', `${destinationY}px`);

    if (bypassAnimation) {
      pointer.style.transition = 'none';
      void pointer.offsetHeight;
      pointer.style.transition = 'transform 0.15s steps(5, end)';
      pointer.classList.remove(styles.bounceAnim);
      return;
    }

    pointer.classList.remove(styles.bounceAnim);
    if (phaseShiftTimer.current) clearTimeout(phaseShiftTimer.current);
    if (bounceCleanTimer.current) clearTimeout(bounceCleanTimer.current);

    phaseShiftTimer.current = setTimeout(() => {
      pointer.classList.add(styles.bounceAnim);
      bounceCleanTimer.current = setTimeout(() => {
        pointer.classList.remove(styles.bounceAnim);
      }, ANIMATION_DURATION_MS);
    }, ANIMATION_DURATION_MS);
  }, []);

  useEffect(() => {
    const active = buttonRefs.current[activeIndex];
    if (!active) return;

    const run = () => snapPointer(active, true);
    if (document.fonts?.ready) {
      document.fonts.ready.then(run);
    } else {
      const t = window.setTimeout(run, 200);
      return () => window.clearTimeout(t);
    }
  }, [activeIndex, snapPointer]);

  useEffect(() => {
    const onResize = () => {
      const active = buttonRefs.current[activeIndex];
      if (active) snapPointer(active, true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeIndex, snapPointer]);

  useEffect(() => {
    return () => {
      if (phaseShiftTimer.current) clearTimeout(phaseShiftTimer.current);
      if (bounceCleanTimer.current) clearTimeout(bounceCleanTimer.current);
    };
  }, []);

  const selectIndex = useCallback(
    (index: number, animatePointer: boolean) => {
      const n = MENU_ITEMS.length;
      const next = ((index % n) + n) % n;
      setActiveIndex(next);
      const el = buttonRefs.current[next];
      if (el) snapPointer(el, !animatePointer);
    },
    [snapPointer]
  );

  const moveSelection = useCallback(
    (delta: -1 | 1) => {
      const next =
        (activeIndexRef.current + delta + MENU_ITEMS.length) % MENU_ITEMS.length;
      selectIndex(next, true);
      buttonRefs.current[next]?.focus();
    },
    [selectIndex]
  );

  const activateCurrent = useCallback(() => {
    const item = MENU_ITEMS[activeIndexRef.current];
    if (item?.entersPlay) {
      onEnterPlay();
    }
    // Stub items: highlight only (future: push sub-screen onto screenStack)
  }, [onEnterPlay]);

  const returnToGame = useCallback(() => {
    onEnterPlay();
  }, [onEnterPlay]);

  /** B: pop menu stack when depth > 1; root → play. */
  const goBack = useCallback(() => {
    if (screenStack.length > 1) {
      // Future: setScreenStack((s) => s.slice(0, -1));
      return;
    }
    onEnterPlay();
  }, [onEnterPlay, screenStack.length]);

  const activateIndex = useCallback(
    (index: number) => {
      const item = MENU_ITEMS[index];
      if (item?.entersPlay) {
        onEnterPlay();
      }
    },
    [onEnterPlay]
  );

  const onItemClick = useCallback(
    (index: number) => {
      const item = MENU_ITEMS[index];
      if (!item) return;
      if (index === activeIndexRef.current) {
        if (item.entersPlay) onEnterPlay();
        return;
      }
      selectIndex(index, true);
    },
    [onEnterPlay, selectIndex]
  );

  const onNavKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      }
    },
    [goBack, moveSelection]
  );

  return (
    <div className="main-menu" role="dialog" aria-label="Main menu">
      <div className="main-menu__slot gb-shell-slot">
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
              <div className="gb-shell__playfield main-menu__playfield">
                <img
                  className="main-menu__bg"
                  src={MENU_BG_SRC}
                  alt=""
                  draggable={false}
                  aria-hidden
                />
                <div className={styles.menuRoot}>
                  <nav
                    ref={navWrapperRef}
                    className={styles.synthwaveNav}
                    aria-label="Main Navigation Terminal"
                    onKeyDown={onNavKeyDown}
                  >
                    <div className={styles.scanlines} aria-hidden="true" />
                    <div
                      ref={pointerRef}
                      className={styles.pointerGraphic}
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">
                        <rect x="36" y="20" width="4" height="12" />
                        <rect x="40" y="24" width="4" height="4" />
                        <rect x="14" y="24" width="22" height="4" />
                        <rect x="10" y="14" width="4" height="24" />
                        <rect x="14" y="14" width="8" height="4" />
                        <rect x="14" y="34" width="8" height="4" />
                        <rect x="18" y="18" width="4" height="4" />
                        <rect x="18" y="30" width="4" height="4" />
                        <rect x="4" y="44" width="2" height="6" />
                        <rect x="2" y="46" width="6" height="2" />
                        <rect x="16" y="48" width="2" height="6" />
                        <rect x="14" y="50" width="6" height="2" />
                        <rect x="28" y="46" width="2" height="6" />
                        <rect x="26" y="48" width="6" height="2" />
                      </svg>
                    </div>
                    <ul className={styles.navList} role="menu">
                      {MENU_ITEMS.map((item, index) => (
                        <li key={item.id} role="none">
                          <button
                            type="button"
                            role="menuitem"
                            ref={(el) => {
                              buttonRefs.current[index] = el;
                            }}
                            className={index === activeIndex ? styles.active : undefined}
                            aria-selected={index === activeIndex}
                            onClick={() => onItemClick(index)}
                            onFocus={() => selectIndex(index, true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                activateIndex(index);
                              }
                            }}
                          >
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
            <div className="gb-shell__controls">
              <div className="gb-shell__btn-direction">
                <div className="gb-shell__btn-direction-v" aria-hidden="true" />
                <div className="gb-shell__btn-direction-h" aria-hidden="true" />
                <button
                  type="button"
                  className="gb-shell__dpad gb-shell__dpad--up"
                  aria-label="Menu up"
                  onClick={() => moveSelection(-1)}
                />
                <button
                  type="button"
                  className="gb-shell__dpad gb-shell__dpad--down"
                  aria-label="Menu down"
                  onClick={() => moveSelection(1)}
                />
                <button
                  type="button"
                  className="gb-shell__dpad gb-shell__dpad--left"
                  aria-label="Menu left"
                  onClick={() => {
                    /* root list: no-op */
                  }}
                />
                <button
                  type="button"
                  className="gb-shell__dpad gb-shell__dpad--right"
                  aria-label="Menu right"
                  onClick={() => {
                    /* root list: no-op */
                  }}
                />
              </div>
              <div className="gb-shell__btn-ab">
                <button
                  type="button"
                  className="gb-shell__btn-b"
                  aria-label="Back"
                  onClick={goBack}
                />
                <button
                  type="button"
                  className="gb-shell__btn-a"
                  aria-label="Select"
                  onClick={activateCurrent}
                />
              </div>
              <div className="gb-shell__btn-start-select">
                <span className="gb-shell__btn-select" aria-hidden="true">
                  SELECT
                </span>
                <button
                  type="button"
                  className="gb-shell__btn-start"
                  aria-label="Return to game"
                  onClick={returnToGame}
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
}
