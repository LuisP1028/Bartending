'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import styles from './PatronInspectionCarousel.module.css';

export type CarouselSlide = 'order' | 'chat';

export interface PatronInspectionCarouselHandle {
  switchSlide: (dirOrSlide: 'left' | 'right' | CarouselSlide) => void;
  openFullScreenChat: () => void;
  isFullScreenChatOpen: () => boolean;
  getActiveSlide: () => CarouselSlide;
  interact: () => void;
}

export interface PatronInspectionCarouselProps {
  seatId: string;
  characterId: string;
  patronName: string;
  portraitSrc: string;
  initialGreeting: string;
  activeOrder?: {
    name: string;
    vessel: string;
    agitation?: string;
    garnishes?: string[];
  };
  onClose: () => void;
  orderReceiptNode: React.ReactNode;
}

type ChatTurn = {
  role: 'player' | 'patron';
  text: string;
};

function renderCornerLoops() {
  return (
    <>
      <svg
        className={`${styles.cornerLoop} ${styles.cornerTopLeft} ${styles.pixelArt}`}
        viewBox="0 0 24 24"
        aria-hidden="true"
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
        className={`${styles.cornerLoop} ${styles.cornerTopRight} ${styles.pixelArt}`}
        viewBox="0 0 24 24"
        aria-hidden="true"
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
        className={`${styles.cornerLoop} ${styles.cornerBottomLeft} ${styles.pixelArt}`}
        viewBox="0 0 24 24"
        aria-hidden="true"
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
        className={`${styles.cornerLoop} ${styles.cornerBottomRight} ${styles.pixelArt}`}
        viewBox="0 0 24 24"
        aria-hidden="true"
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
    </>
  );
}

const PatronInspectionCarousel = forwardRef<
  PatronInspectionCarouselHandle,
  PatronInspectionCarouselProps
>(function PatronInspectionCarousel(
  {
    seatId,
    characterId,
    patronName,
    portraitSrc,
    initialGreeting,
    activeOrder,
    onClose,
    orderReceiptNode,
  },
  ref
) {
  const [activeSlide, setActiveSlide] = useState<CarouselSlide>('order');
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);

  // Starters state (INV-STARTERS-PERSONA-01 & INV-FAILFAST-DIALOGUE-01)
  const [starters, setStarters] = useState<[string, string] | null>(null);
  const [startersLoading, setStartersLoading] = useState(false);
  const [startersError, setStartersError] = useState<string | null>(null);
  const startersRequestedRef = useRef(false);

  // Conversation / reply state
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [lastPlayerMessage, setLastPlayerMessage] = useState<string | null>(null);
  const [currentPatronMessage, setCurrentPatronMessage] = useState<string>(
    initialGreeting || 'WHAT ARE WE POURING TONIGHT, BARTENDER?'
  );
  const [displayedText, setDisplayedText] = useState<string>(
    initialGreeting || 'WHAT ARE WE POURING TONIGHT, BARTENDER?'
  );
  const [isTyping, setIsTyping] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const shouldFocusInputOnExpandRef = useRef(false);
  const activeOrderRef = useRef(activeOrder);
  activeOrderRef.current = activeOrder;

  useEffect(() => {
    if (isFullScreenChat && shouldFocusInputOnExpandRef.current) {
      shouldFocusInputOnExpandRef.current = false;
      requestAnimationFrame(() => {
        customInputRef.current?.focus();
      });
    }
  }, [isFullScreenChat]);

  // Non-occluding side placement (INV-CAROUSEL-NO-OCCLUDE-01):
  // Left stools (bar_seat_1, bar_seat_2) -> carousel on right (48%-96% X)
  // Right stools (bar_seat_3, bar_seat_4) -> carousel on left (4%-52% X)
  const carouselSide: 'left' | 'right' =
    seatId === 'bar_seat_3' || seatId === 'bar_seat_4' ? 'left' : 'right';

  const clearTypewriter = useCallback(() => {
    if (typewriterTimerRef.current) {
      clearTimeout(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
  }, []);

  // Sync initial greeting if no user messages have been sent yet
  useEffect(() => {
    if (history.length === 0 && initialGreeting) {
      setCurrentPatronMessage(initialGreeting);
    }
  }, [initialGreeting, history.length]);

  // Typewriter effect for patron message in Full-Screen Chatbox or Conversation Box
  useEffect(() => {
    const msg = currentPatronMessage;
    if (!msg) {
      clearTypewriter();
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    clearTypewriter();
    let index = 0;
    const speedMs = 22;

    typewriterTimerRef.current = setTimeout(() => {
      setDisplayedText('');
      setIsTyping(true);
      setShowArrow(false);

      function step() {
        if (index < msg.length) {
          const ch = msg[index];
          setDisplayedText(msg.slice(0, index + 1));
          index += 1;
          let delay = speedMs;
          if (['.', '!', '?'].includes(ch)) {
            delay += 80;
          }
          typewriterTimerRef.current = setTimeout(step, delay);
        } else {
          setIsTyping(false);
          setShowArrow(true);
        }
      }

      typewriterTimerRef.current = setTimeout(step, speedMs);
    }, 0);

    return () => clearTypewriter();
  }, [currentPatronMessage, clearTypewriter]);

  const completeTypewriterImmediate = useCallback(() => {
    if (isTyping) {
      clearTypewriter();
      setDisplayedText(currentPatronMessage);
      setIsTyping(false);
      setShowArrow(true);
    }
  }, [isTyping, clearTypewriter, currentPatronMessage]);

  const fetchStarters = useCallback(async () => {
    setStartersLoading(true);
    setStartersError(null);
    try {
      const response = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'starters',
          characterId,
          cocktail: activeOrderRef.current,
          greeting: initialGreeting,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg =
          typeof data?.error === 'string' && data.error.trim().length > 0
            ? data.error
            : `HTTP ${response.status}: Failed to generate conversation starters`;
        throw new Error(msg);
      }
      if (
        !Array.isArray(data?.starters) ||
        data.starters.length !== 2 ||
        typeof data.starters[0] !== 'string' ||
        typeof data.starters[1] !== 'string' ||
        !data.starters[0].trim() ||
        !data.starters[1].trim()
      ) {
        throw new Error(
          '[INV-STARTERS-PERSONA-01] Backend did not return exactly 2 non-empty starters.'
        );
      }
      setStarters([data.starters[0].trim(), data.starters[1].trim()]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load conversation starters';
      setStartersError(message);
      setStarters(null);
    } finally {
      setStartersLoading(false);
    }
  }, [characterId, initialGreeting]);

  // Trigger starters generation as soon as Conversation slide or Full-Screen Chatbox is opened
  useEffect(() => {
    if ((activeSlide === 'chat' || isFullScreenChat) && !startersRequestedRef.current) {
      startersRequestedRef.current = true;
      void fetchStarters();
    }
  }, [activeSlide, isFullScreenChat, fetchStarters]);

  const handleSendMessage = useCallback(
    async (rawMessage: string) => {
      const trimmed = rawMessage.trim().slice(0, 140);
      if (!trimmed || chatLoading) return;

      // Engaging in conversation always ensures Full-Screen Chatbox mode (AC-03)
      setIsFullScreenChat(true);
      setActiveSlide('chat');
      setChatError(null);
      setChatLoading(true);
      setLastPlayerMessage(trimmed);

      const priorHistory = [...history];

      try {
        const response = await fetch('/api/dialogue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'chat',
            characterId,
            playerMessage: trimmed,
            history: priorHistory,
            cocktail: activeOrderRef.current,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg =
            typeof data?.error === 'string' && data.error.trim().length > 0
              ? data.error
              : `HTTP ${response.status}: Failed to generate patron reply`;
          throw new Error(msg);
        }

        if (typeof data?.dialogue !== 'string' || !data.dialogue.trim()) {
          throw new Error(
            '[INV-FAILFAST-DIALOGUE-01] Backend returned an empty patron reply.'
          );
        }

        const reply = data.dialogue.trim();
        setHistory([
          ...priorHistory,
          { role: 'player', text: trimmed },
          { role: 'patron', text: reply },
        ]);
        setCurrentPatronMessage(reply);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to generate patron reply';
        setChatError(message);
      } finally {
        setChatLoading(false);
      }
    },
    [characterId, chatLoading, history]
  );

  const handleSubmitCustom = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed || chatLoading) return;
    setCustomInput('');
    void handleSendMessage(trimmed);
  }, [customInput, chatLoading, handleSendMessage]);

  const switchSlide = useCallback(
    (dirOrSlide: 'left' | 'right' | CarouselSlide) => {
      if (dirOrSlide === 'order' || dirOrSlide === 'chat') {
        setActiveSlide(dirOrSlide);
        if (dirOrSlide === 'order') {
          setIsFullScreenChat(false);
        }
        return;
      }
      setActiveSlide((prev) => (prev === 'order' ? 'chat' : 'order'));
    },
    []
  );

  const openFullScreenChat = useCallback(() => {
    setActiveSlide('chat');
    setIsFullScreenChat(true);
  }, []);

  // Keyboard Left/Right support while in non-fullscreen carousel mode (AC-02)
  useEffect(() => {
    if (isFullScreenChat) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSlide((prev) => (prev === 'order' ? 'chat' : 'order'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullScreenChat]);

  useImperativeHandle(
    ref,
    () => ({
      switchSlide,
      openFullScreenChat,
      isFullScreenChatOpen: () => isFullScreenChat,
      getActiveSlide: () => activeSlide,
      interact: () => {
        if (!isFullScreenChat) {
          if (activeSlide === 'order') {
            setActiveSlide('chat');
          } else {
            setIsFullScreenChat(true);
          }
        } else if (isTyping) {
          completeTypewriterImmediate();
        }
      },
    }),
    [
      switchSlide,
      openFullScreenChat,
      isFullScreenChat,
      activeSlide,
      isTyping,
      completeTypewriterImmediate,
    ]
  );

  const handlePortraitError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (!target.dataset.tried) {
      target.dataset.tried = '1';
      target.src = portraitSrc.replace(/talk\.png$/, 'sit.png');
    }
  };

  const activeError = chatError || startersError;

  // =========================================================================
  // MODE B: Full-Screen Patron Chatbox (AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09)
  // =========================================================================
  if (isFullScreenChat) {
    return (
      <div
        className={styles.fullScreenChatbox}
        data-testid="patron-chatbox-fullscreen"
        data-seat-id={seatId}
        data-character-id={characterId}
        data-fullscreen-chat="true"
        role="dialog"
        aria-label={`Conversation with ${patronName}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {renderCornerLoops()}
        <div className={styles.fullScreenWindow}>
          {/* Header: Patron Photo + Gold Display Name + Return to Order + Close */}
          <div className={styles.chatboxHeader}>
            <div className={styles.chatboxIdentity}>
              <div className={styles.chatboxPortraitFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitSrc}
                  alt={patronName}
                  className={styles.chatboxPortraitImg}
                  data-testid="chatbox-patron-photo"
                  onError={handlePortraitError}
                />
              </div>
              <div className={styles.chatboxNameStack}>
                <div
                  className={styles.chatboxPatronName}
                  data-testid="chatbox-patron-name"
                >
                  {patronName}
                </div>
                {activeOrder?.name ? (
                  <div className={styles.chatboxOrderTag}>
                    ORDER: {activeOrder.name}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.chatboxHeaderActions}>
              <button
                type="button"
                className={styles.backToOrderBtn}
                data-testid="chatbox-back-to-order"
                onClick={() => {
                  setIsFullScreenChat(false);
                  setActiveSlide('order');
                }}
                title="Return to Patron Order Receipt"
              >
                ◀ ORDER
              </button>
              <button
                type="button"
                className={styles.chatboxCloseBtn}
                data-testid="chatbox-close-btn"
                aria-label="Close patron chatbox"
                onClick={onClose}
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Central Conversation Transcript & Typewriter Speech Area */}
          <div
            className={styles.chatboxTranscript}
            onClick={completeTypewriterImmediate}
          >
            {lastPlayerMessage ? (
              <div
                className={styles.playerBubble}
                data-testid="chatbox-player-message"
              >
                YOU: {lastPlayerMessage}
              </div>
            ) : null}

            <div className={styles.patronSpeechRow}>
              {chatLoading ? (
                <p
                  className={styles.thinkingText}
                  data-testid="chatbox-thinking"
                >
                  ...
                </p>
              ) : (
                <p
                  className={styles.patronMessageText}
                  data-testid="chatbox-patron-message"
                >
                  {displayedText}
                </p>
              )}
              {!chatLoading && showArrow && (
                <div className={styles.promptArrow}>
                  <svg
                    width="12"
                    height="8"
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

          {/* Fail-Fast Diagnostic Error Banner (AC-08) */}
          {activeError ? (
            <div
              className={styles.errorBanner}
              data-testid="patron-chat-error"
              role="alert"
            >
              <span className={styles.errorText}>
                [DIALOGUE ERROR] {activeError}
              </span>
              <button
                type="button"
                className={styles.retryBtn}
                data-testid="patron-chat-retry"
                onClick={() => {
                  if (startersError) {
                    void fetchStarters();
                  } else {
                    setChatError(null);
                  }
                }}
              >
                RETRY
              </button>
            </div>
          ) : null}

          {/* Two Dynamic LLM-Generated Starters (AC-05) */}
          <div
            className={styles.startersContainer}
            data-testid="chatbox-starters"
          >
            {startersLoading ? (
              <div
                className={styles.startersLoading}
                data-testid="chat-starters-loading"
              >
                CONNECTING TO PERSONA NODE...
              </div>
            ) : starters ? (
              <>
                <button
                  type="button"
                  className={styles.starterBtn}
                  data-testid="chat-starter-0"
                  disabled={chatLoading}
                  onClick={() => {
                    void handleSendMessage(starters[0]);
                  }}
                >
                  ▸ {starters[0]}
                </button>
                <button
                  type="button"
                  className={styles.starterBtn}
                  data-testid="chat-starter-1"
                  disabled={chatLoading}
                  onClick={() => {
                    void handleSendMessage(starters[1]);
                  }}
                >
                  ▸ {starters[1]}
                </button>
              </>
            ) : null}
          </div>

          {/* Custom Freeform Player Text Input & SEND (AC-06) */}
          <div className={styles.customInputRow}>
            <input
              ref={customInputRef}
              type="text"
              className={styles.customInput}
              data-testid="chat-custom-input"
              maxLength={140}
              value={customInput}
              placeholder="SAY SOMETHING..."
              disabled={chatLoading}
              onChange={(e) => setCustomInput(e.target.value.slice(0, 140))}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose();
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitCustom();
                }
              }}
            />
            <button
              type="button"
              className={styles.sendBtn}
              data-testid="chat-send-btn"
              disabled={chatLoading || !customInput.trim()}
              onClick={handleSubmitCustom}
            >
              SEND
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODE A: Non-Occluding 2-Slide Patron Inspection Carousel (AC-01, AC-02)
  // =========================================================================
  return (
    <div
      className={`${styles.carouselContainer} ${
        carouselSide === 'left' ? styles.sideLeft : styles.sideRight
      }`}
      data-testid="patron-inspection-carousel"
      data-seat-id={seatId}
      data-character-id={characterId}
      data-carousel-side={carouselSide}
      data-side={carouselSide}
      data-active-slide={activeSlide}
      data-fullscreen-chat="false"
      role="region"
      aria-label={`Inspection carousel for ${patronName}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Carousel Top Navigation Bar */}
      <div className={styles.carouselHeader}>
        <button
          type="button"
          className={styles.navArrowBtn}
          data-testid="carousel-prev-btn"
          aria-label="Previous slide"
          onClick={() => switchSlide('left')}
        >
          ◀
        </button>

        <div className={styles.tabGroup} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSlide === 'order'}
            className={`${styles.tabBtn} ${
              activeSlide === 'order' ? styles.tabBtnActive : ''
            }`}
            data-testid="carousel-tab-order"
            onClick={() => switchSlide('order')}
          >
            ORDER
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSlide === 'chat'}
            className={`${styles.tabBtn} ${
              activeSlide === 'chat' ? styles.tabBtnActive : ''
            }`}
            data-testid="carousel-tab-chat"
            onClick={() => switchSlide('chat')}
          >
            CHAT
          </button>
        </div>

        <button
          type="button"
          className={styles.navArrowBtn}
          data-testid="carousel-next-btn"
          aria-label="Next slide"
          onClick={() => switchSlide('right')}
        >
          ▶
        </button>

        <button
          type="button"
          className={styles.closeBtn}
          data-testid="carousel-close-btn"
          aria-label="Close patron inspection"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* Carousel Active Slide Body */}
      <div className={styles.carouselBody}>
        {activeSlide === 'order' ? (
          <div
            className={styles.orderSlideViewport}
            data-testid="carousel-slide-order"
          >
            {orderReceiptNode}
          </div>
        ) : (
          <div
            className={styles.conversationSlideBox}
            data-testid="patron-conversation-box"
            onClick={() => openFullScreenChat()}
          >
            {renderCornerLoops()}
            <div className={styles.convHeaderRow}>
              <div className={styles.convPortraitFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitSrc}
                  alt={patronName}
                  className={styles.convPortraitImg}
                  data-testid="conversation-box-patron-photo"
                  onError={handlePortraitError}
                />
              </div>
              <div className={styles.convSpeakerMeta}>
                <div
                  className={styles.convSpeakerName}
                  data-testid="conversation-box-patron-name"
                >
                  {patronName}
                </div>
                {activeOrder?.name ? (
                  <div className={styles.convOrderSub}>
                    {activeOrder.name}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.convGreetingBody}>
              <p className={styles.convGreetingText}>{displayedText}</p>
            </div>

            {activeError ? (
              <div
                className={styles.errorBanner}
                data-testid="patron-chat-error"
                role="alert"
                onClick={(e) => e.stopPropagation()}
              >
                <span className={styles.errorText}>
                  [DIALOGUE ERROR] {activeError}
                </span>
                <button
                  type="button"
                  className={styles.retryBtn}
                  data-testid="patron-chat-retry"
                  onClick={() => {
                    void fetchStarters();
                  }}
                >
                  RETRY
                </button>
              </div>
            ) : null}

            <div
              className={styles.startersContainer}
              data-testid="chatbox-starters"
              onClick={(e) => e.stopPropagation()}
            >
              {startersLoading ? (
                <div
                  className={styles.startersLoading}
                  data-testid="chat-starters-loading"
                >
                  CONNECTING TO PERSONA NODE...
                </div>
              ) : starters ? (
                <>
                  <button
                    type="button"
                    className={styles.starterBtn}
                    data-testid="chat-starter-0"
                    disabled={chatLoading}
                    onClick={() => {
                      openFullScreenChat();
                      void handleSendMessage(starters[0]);
                    }}
                  >
                    ▸ {starters[0]}
                  </button>
                  <button
                    type="button"
                    className={styles.starterBtn}
                    data-testid="chat-starter-1"
                    disabled={chatLoading}
                    onClick={() => {
                      openFullScreenChat();
                      void handleSendMessage(starters[1]);
                    }}
                  >
                    ▸ {starters[1]}
                  </button>
                </>
              ) : null}
            </div>

            <div
              className={styles.customInputRow}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                className={styles.customInput}
                data-testid="chat-custom-input"
                maxLength={140}
                value={customInput}
                placeholder="SAY SOMETHING..."
                disabled={chatLoading}
                onFocus={() => {
                  shouldFocusInputOnExpandRef.current = true;
                  openFullScreenChat();
                }}
                onChange={(e) => setCustomInput(e.target.value.slice(0, 140))}
              />
              <button
                type="button"
                className={styles.sendBtn}
                data-testid="chat-send-btn"
                onClick={() => {
                  shouldFocusInputOnExpandRef.current = true;
                  openFullScreenChat();
                }}
              >
                TALK
              </button>
            </div>

            <button
              type="button"
              className={styles.convTalkActionBtn}
              data-testid="conversation-box-talk-btn"
              onClick={(e) => {
                e.stopPropagation();
                openFullScreenChat();
              }}
            >
              OPEN FULL CHAT ⛶
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default PatronInspectionCarousel;
