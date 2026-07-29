'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './MainMenu.module.css';

const MENU_BG_SRC = '/assets/boot/menu_background.jpg';

/** Gold cutouts — same family as in-game sys-header mode controls (FS87). */
const OBELISCO_MODE_LOGO_SRC = '/assets/logos/obelisco/obelisco-logo-gold.png';
const CLASSICS_MODE_LOGO_SRC = '/assets/logos/classics/classics-logo-gold.png';

const MODE_LOGOS = [
  { mode: 'OBELISCO' as const, src: OBELISCO_MODE_LOGO_SRC, label: 'OBELISCO' },
  { mode: 'CLASSICS' as const, src: CLASSICS_MODE_LOGO_SRC, label: 'CLASSICS' },
];

const MODE_SELECTION_INDEX = 0;

const MENU_ITEMS = [
  { id: 'mode-selection', label: 'Mode Selection', isModeSelection: true, opensJoinBar: false },
  { id: 'join-bar', label: 'Join the bar!', isModeSelection: false, opensJoinBar: true },
  { id: 'diagnostics', label: 'Warp Diagnostics', isModeSelection: false, opensJoinBar: false },
  { id: 'terminate', label: 'Terminate Uplink', isModeSelection: false, opensJoinBar: false },
] as const;

export type MenuPlayMode = 'OBELISCO' | 'CLASSICS';

type MainMenuProps = {
  /** Enter play without changing mode (root B, START). */
  onEnterPlay: () => void;
  /** Enter play after selecting a mode from MODE SELECTION logos. */
  onSelectModeAndPlay: (mode: MenuPlayMode) => void;
  /** FS89: open Join the bar Comm-Link → camera flow. */
  onOpenJoinBar: () => void;
  /**
   * FS90: Join Comm-Link / Camera UI mounted inside the Game Boy glass
   * (playfield) so it stretches to screen size, not the full browser viewport.
   */
  joinOverlay?: React.ReactNode;
  /**
   * FS92: Game Boy B / Escape back handler.
   * Return true if the active nested screen consumed back (do not enter play).
   * Host owns the stack (e.g. camera → comm → menu).
   */
  onShellBack?: () => boolean;
};

/**
 * FS80/82/87/89/90/92 — Full-viewport Game Boy chrome; synthwave bg + Navigator menu.
 * Shell: ↑↓ navigate, ←→ mode logos, A select, B = back (stack) or root → play.
 */
export default function MainMenu({
  onEnterPlay,
  onSelectModeAndPlay,
  onOpenJoinBar,
  joinOverlay = null,
  onShellBack,
}: MainMenuProps) {
  const navWrapperRef = useRef<HTMLElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  /** Focus targets for pointer snap: logo buttons when on MODE SELECTION, else row buttons. */
  const focusTargetRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const logoButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const phaseShiftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceCleanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef(0);
  const logoIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  /** 0 = OBELISCO, 1 = CLASSICS — only meaningful on MODE SELECTION row. */
  const [logoIndex, setLogoIndex] = useState(0);
  /** v1: only root screen; depth > 1 reserved for future sub-screens (FS82 O8). */
  const [screenStack] = useState<string[]>(['root']);
  const ANIMATION_DURATION_MS = 150;

  activeIndexRef.current = activeIndex;
  logoIndexRef.current = logoIndex;

  const resolveFocusTarget = useCallback(
    (rowIndex: number, logo: number): HTMLButtonElement | null => {
      if (rowIndex === MODE_SELECTION_INDEX) {
        return logoButtonRefs.current[logo] ?? null;
      }
      return focusTargetRefs.current[rowIndex] ?? null;
    },
    []
  );

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

  const snapToCurrent = useCallback(
    (bypassAnimation: boolean) => {
      const el = resolveFocusTarget(activeIndexRef.current, logoIndexRef.current);
      if (el) snapPointer(el, bypassAnimation);
    },
    [resolveFocusTarget, snapPointer]
  );

  useEffect(() => {
    const run = () => snapToCurrent(true);
    if (document.fonts?.ready) {
      document.fonts.ready.then(run);
    } else {
      const t = window.setTimeout(run, 200);
      return () => window.clearTimeout(t);
    }
  }, [activeIndex, logoIndex, snapToCurrent]);

  useEffect(() => {
    const onResize = () => snapToCurrent(true);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [snapToCurrent]);

  useEffect(() => {
    return () => {
      if (phaseShiftTimer.current) clearTimeout(phaseShiftTimer.current);
      if (bounceCleanTimer.current) clearTimeout(bounceCleanTimer.current);
    };
  }, []);

  const selectIndex = useCallback(
    (index: number, animatePointer: boolean, nextLogoIndex?: number) => {
      const n = MENU_ITEMS.length;
      const next = ((index % n) + n) % n;
      setActiveIndex(next);
      const logo =
        next === MODE_SELECTION_INDEX
          ? nextLogoIndex !== undefined
            ? nextLogoIndex
            : next === activeIndexRef.current
              ? logoIndexRef.current
              : 0
          : logoIndexRef.current;
      if (next === MODE_SELECTION_INDEX) {
        setLogoIndex(logo);
        logoIndexRef.current = logo;
      }
      activeIndexRef.current = next;
      const el = resolveFocusTarget(next, logo);
      if (el) {
        snapPointer(el, !animatePointer);
        el.focus();
      }
    },
    [resolveFocusTarget, snapPointer]
  );

  const moveSelection = useCallback(
    (delta: -1 | 1) => {
      const next =
        (activeIndexRef.current + delta + MENU_ITEMS.length) % MENU_ITEMS.length;
      // Landing on MODE SELECTION defaults logo focus to OBELISCO
      selectIndex(next, true, next === MODE_SELECTION_INDEX ? 0 : undefined);
    },
    [selectIndex]
  );

  const moveLogo = useCallback(
    (delta: -1 | 1) => {
      if (activeIndexRef.current !== MODE_SELECTION_INDEX) return;
      const next = (logoIndexRef.current + delta + MODE_LOGOS.length) % MODE_LOGOS.length;
      setLogoIndex(next);
      logoIndexRef.current = next;
      const el = logoButtonRefs.current[next];
      if (el) {
        snapPointer(el, false);
        el.focus();
      }
    },
    [snapPointer]
  );

  const activateModeLogo = useCallback(
    (index: number) => {
      const entry = MODE_LOGOS[index];
      if (!entry) return;
      onSelectModeAndPlay(entry.mode);
    },
    [onSelectModeAndPlay]
  );

  const activateCurrent = useCallback(() => {
    if (activeIndexRef.current === MODE_SELECTION_INDEX) {
      activateModeLogo(logoIndexRef.current);
      return;
    }
    const item = MENU_ITEMS[activeIndexRef.current];
    if (item?.opensJoinBar) {
      onOpenJoinBar();
    }
    // Other stubs: highlight only
  }, [activateModeLogo, onOpenJoinBar]);

  const returnToGame = useCallback(() => {
    onEnterPlay();
  }, [onEnterPlay]);

  /**
   * FS92 — B / Escape: abstract shell back.
   * 1) Host nested flow (join, etc.) via onShellBack
   * 2) Future in-menu screenStack pop
   * 3) Root menu only → enter play
   */
  const goBack = useCallback(() => {
    if (onShellBack?.()) return;
    if (screenStack.length > 1) {
      // Future: setScreenStack((s) => s.slice(0, -1));
      return;
    }
    onEnterPlay();
  }, [onEnterPlay, onShellBack, screenStack.length]);

  const onLogoClick = useCallback(
    (index: number) => {
      setActiveIndex(MODE_SELECTION_INDEX);
      activeIndexRef.current = MODE_SELECTION_INDEX;
      setLogoIndex(index);
      logoIndexRef.current = index;
      activateModeLogo(index);
    },
    [activateModeLogo]
  );

  const onStubClick = useCallback(
    (index: number) => {
      const item = MENU_ITEMS[index];
      if (index === activeIndexRef.current) {
        if (item?.opensJoinBar) onOpenJoinBar();
        return;
      }
      selectIndex(index, true);
    },
    [selectIndex, onOpenJoinBar]
  );

  const onNavKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveLogo(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveLogo(1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      }
    },
    [goBack, moveLogo, moveSelection]
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
                    style={joinOverlay ? { visibility: 'hidden' } : undefined}
                    aria-hidden={joinOverlay ? true : undefined}
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
                      {MENU_ITEMS.map((item, index) => {
                        if (item.isModeSelection) {
                          const rowActive = index === activeIndex;
                          return (
                            <li
                              key={item.id}
                              role="none"
                              className={styles.modeSelectionItem}
                            >
                              <div
                                className={`${styles.modeSelectionBlock}${
                                  rowActive ? ` ${styles.modeSelectionBlockActive}` : ''
                                }`}
                                aria-label="Mode selection"
                              >
                                <div
                                  className={`${styles.modeSelectionTitle}${
                                    rowActive ? ` ${styles.active}` : ''
                                  }`}
                                  aria-hidden="true"
                                >
                                  {item.label}
                                </div>
                                <div className={styles.modeLogoRow} role="group">
                                  {MODE_LOGOS.map((logo, li) => {
                                    const focused =
                                      rowActive && logoIndex === li;
                                    return (
                                      <button
                                        key={logo.mode}
                                        type="button"
                                        role="menuitem"
                                        ref={(el) => {
                                          logoButtonRefs.current[li] = el;
                                          if (li === 0) {
                                            focusTargetRefs.current[index] = el;
                                          }
                                        }}
                                        className={`${styles.modeLogoBtn}${
                                          focused ? ` ${styles.modeLogoBtnActive}` : ''
                                        }`}
                                        aria-label={logo.label}
                                        aria-selected={focused}
                                        onClick={() => onLogoClick(li)}
                                        onFocus={() => {
                                          setActiveIndex(MODE_SELECTION_INDEX);
                                          activeIndexRef.current = MODE_SELECTION_INDEX;
                                          setLogoIndex(li);
                                          logoIndexRef.current = li;
                                          if (logoButtonRefs.current[li]) {
                                            snapPointer(logoButtonRefs.current[li]!, true);
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            activateModeLogo(li);
                                          }
                                        }}
                                      >
                                        <img
                                          src={logo.src}
                                          alt=""
                                          draggable={false}
                                          className={styles.modeLogoImg}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </li>
                          );
                        }

                        return (
                          <li key={item.id} role="none">
                            <button
                              type="button"
                              role="menuitem"
                              ref={(el) => {
                                focusTargetRefs.current[index] = el;
                              }}
                              className={
                                index === activeIndex ? styles.active : undefined
                              }
                              aria-selected={index === activeIndex}
                              onClick={() => onStubClick(index)}
                              onFocus={() => selectIndex(index, true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  if (item.opensJoinBar) onOpenJoinBar();
                                }
                              }}
                            >
                              {item.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                </div>
                {/* FS90: Join overlays fill the glass hole (playfield), not the browser window */}
                {joinOverlay}
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
                  onClick={() => moveLogo(-1)}
                />
                <button
                  type="button"
                  className="gb-shell__dpad gb-shell__dpad--right"
                  aria-label="Menu right"
                  onClick={() => moveLogo(1)}
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
