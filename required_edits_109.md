# RE109 — Master Component-to-Edit Matrix: Hugging Face LLM Dialogue Node: Dynamic In-Character Cocktail Ordering, Error-Aware Rejection Speech, and Retro Dialogue Presentation

**Spec:** [functional_specification_109.md](./functional_specification_109.md)  
**Map:** [wayfinder/20261009T230349-536-rqj9/map.md](./wayfinder/20261009T230349-536-rqj9/map.md)  
**Tickets:**
- [Ticket 001: Hugging Face Inference Backend Service & Fail-Fast Authentication Architecture](./wayfinder/20261009T230349-536-rqj9/tickets/ticket-001.md)
- [Ticket 002: Deterministic Patron Persona Resolution & System Instruction Governance](./wayfinder/20261009T230349-536-rqj9/tickets/ticket-002.md)
- [Ticket 003: Seating Transition (onSitComplete) Wiring & In-Character Drink Order Generation](./wayfinder/20261009T230349-536-rqj9/tickets/ticket-003.md)
- [Ticket 004: Drink Delivery Interaction & Error-Aware Rejection Speech Dispatch Architecture](./wayfinder/20261009T230349-536-rqj9/tickets/ticket-004.md)
- [Ticket 005: Diegetic Retro RPG Dialogue Box Stage Integration & Typewriter Presentation](./wayfinder/20261009T230349-536-rqj9/tickets/ticket-005.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **HF Dialogue Backend API Endpoint** | `src/app/api/dialogue/route.ts` | `src/lib/hfDialogueService.ts` | `POST` handler, payload validation, status mapping, telemetry serialization |
| **Hugging Face Inference Client Engine** | `src/lib/hfDialogueService.ts` | `src/data/characterDialogue.ts` | `generateDialogueCompletion`, `buildSystemPrompt`, `sanitizeDialogueOutput`, timeout abort signal |
| **Patron Persona Resolution & System Instructions** | `src/data/characterDialogue.ts` | `src/lib/db.ts` | `resolveAuthoritativePersona`, filesystem inspection, PostgreSQL fallback |
| **Stage Seating & Event Dispatcher** | `src/components/PatronLayer.tsx` | `src/data/patronLayout.ts` | `onSitComplete`, `onServeDrinkToSeat`, pointer event listeners on `.pov-patron-sprite--sit` |
| **Game State & Order Orchestrator** | `src/app/page.tsx` | `src/hooks/useSimulation.ts`, `src/data/RecipeManager.ts` | `seatOrders`, `handlePatronSitComplete`, `handleServeDrinkToSeat`, `draggable` vessel |
| **Retro RPG Dialogue Box View** | `src/components/RetroRpgDialogueBox.tsx` | `src/components/RetroRpgDialogueBox.module.css` | Typewriter engine, corner scrollwork SVG loops, silver portrait frame, gold pixel typography |
| **Stage CSS & Pointer Interactions** | `src/app/globals.css` | `src/app/layout.tsx` | `.pov-patron-sprite--sit` pointer events, draggable vessel styles |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/lib/hfDialogueService.ts` | Entire file (New) | `ticket-001.md`, `ticket-002.md` | Create Hugging Face inference service client with fail-fast auth, timeout, prompt construction, and sanitization | Authenticates via `process.env.HF_TOKEN`; fails fast with structured error if unset; applies 4000ms timeout; enforces 120-char uppercase formatting. |
| `src/app/api/dialogue/route.ts` | Entire file (New) | `ticket-001.md` | Implement Next.js App Router POST API handler for dialogue generation | Validates JSON payload (`type`, `characterId`); returns HTTP 200 on success, HTTP 500/503 on auth failure, HTTP 502/504 on upstream error. |
| `src/data/characterDialogue.ts` | L35–L69 | `ticket-002.md` | Add `resolveAuthoritativePersona` checking disk `personality.txt` then DB `patrons.about_me` | Fails fast with `PERSONA_NOT_FOUND` if neither exists; eliminates silent fallbacks to static catalog for registered patrons. |
| `src/components/PatronLayer.tsx` | L62–L73, L550–L574 | `ticket-004.md` | Add `onServeDrinkToSeat` prop; wire `onDragOver`, `onDrop`, and `onClick` on seated patrons | Seated patrons become interactive drop/click targets; invokes callback with `seatId` to initiate drink delivery. |
| `src/components/RetroRpgDialogueBox.module.css` | Entire file (New) | `ticket-005.md` | Port CSS styling from `retro_rpg_dialogue_box.html` into CSS module | Matches 16-bit aesthetic: navy background (`#09133b`), double white borders, silver beveled portrait, gold speaker text (`#f7ca18`). |
| `src/components/RetroRpgDialogueBox.tsx` | Entire file (New) | `ticket-005.md` | Create reusable retro RPG dialogue React component | Typewriter timing (35ms base + 120ms punctuation delay); bouncing prompt arrow; click-to-complete or advance. |
| `src/app/globals.css` | L781–L800 | `ticket-004.md` | Update `.pov-patron-sprite--sit` to allow pointer events; add grab cursor to draggable active vessel | Enables mouse/touch interaction with seated patrons and indicates draggability on active cocktail vessel. |
| `src/app/page.tsx` | L160–L185, L1412–L1421, L1585–L1610, L1640–L1650 | `ticket-003.md`, `ticket-004.md`, `ticket-005.md` | Maintain per-seat order states; wire `onSitComplete`; implement `handleServeDrinkToSeat`; make vessel draggable; mount `RetroRpgDialogueBox` | Multi-seat concurrency isolation; automatic order generation on seating; error-aware rejection speech on invalid drink delivery; diegetic stage rendering. |

---

## 3. Detailed Component-by-Component Specifications

### 3.1 `src/lib/hfDialogueService.ts`
- **Governing Tickets:** `ticket-001.md`, `ticket-002.md`
- **Proposed Implementation:**
  ```typescript
  import { resolveAuthoritativePersona } from '@/data/characterDialogue';

  export type DialogueRequestType = 'order' | 'rejection';

  export interface OrderDialoguePayload {
    type: 'order';
    characterId: string;
    cocktail: {
      name: string;
      vessel: string;
      garnishes: string[];
      agitation: string;
      flavorNotes?: string;
    };
  }

  export interface RejectionDialoguePayload {
    type: 'rejection';
    characterId: string;
    recipe: {
      name: string;
      vessel: string;
      garnishes: string[];
      agitation: string;
    };
    deliveredDrink: {
      vessel: string | null;
      ingredients: Record<string, number>;
      rim: string | null;
      agitation: string | null;
      garnishes: string[];
    };
    discrepancies: string[];
  }

  export type DialoguePayload = OrderDialoguePayload | RejectionDialoguePayload;

  export interface DialogueServiceResult {
    dialogue: string;
    characterId: string;
    model: string;
    latencyMs: number;
  }

  export function buildSystemPrompt(personaText: string): string {
    return [
      `You are a bar patron seated at Obelisco, a vintage retro cocktail lounge.`,
      `PERSONA: ${personaText}`,
      `OUTPUT CONSTRAINTS:`,
      `- Speak strictly in character according to your persona.`,
      `- Deliver exactly 1 to 2 short sentences.`,
      `- Speak in ALL UPPERCASE letters.`,
      `- Maximum 120 characters total length.`,
      `- Do not use quotation marks, markdown, asterisks, or stage directions (no emojis, no *grumbles*).`,
      `- Output ONLY your spoken line.`
    ].join('\n');
  }

  export function sanitizeDialogueOutput(rawText: string): string {
    let text = rawText
      .replace(/["'“”‘’]/g, '')
      .replace(/\*.*?\*/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    if (!text || text.length === 0) {
      const err = new Error('LLM returned empty or whitespace-only dialogue string');
      (err as any).code = 'DIALOGUE_EMPTY_ERROR';
      throw err;
    }

    if (text.length > 120) {
      const truncated = text.slice(0, 120);
      const lastPunct = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
      if (lastPunct > 40) {
        text = truncated.slice(0, lastPunct + 1);
      } else {
        const lastSpace = truncated.lastIndexOf(' ');
        text = (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim() + '!';
      }
    }

    return text;
  }

  export async function generateDialogueCompletion(
    payload: DialoguePayload
  ): Promise<DialogueServiceResult> {
    const start = Date.now();
    const token = process.env.HF_TOKEN?.trim();
    if (!token) {
      const error = new Error('HF_TOKEN environment variable is not set or empty');
      (error as any).code = 'HF_TOKEN_MISSING';
      (error as any).statusCode = 500;
      throw error;
    }

    const persona = await resolveAuthoritativePersona(payload.characterId);
    const systemPrompt = buildSystemPrompt(persona);

    let userPrompt = '';
    if (payload.type === 'order') {
      const { cocktail } = payload;
      userPrompt = `You are ordering a drink. You want: ${cocktail.name} in a ${cocktail.vessel} glass with ${cocktail.garnishes.join(', ') || 'no garnish'}. Speak your order in character without listing technical recipe schemas or ounces.`;
    } else {
      const { recipe, discrepancies } = payload;
      userPrompt = `The bartender served you the wrong drink. You ordered: ${recipe.name} in a ${recipe.vessel} with ${recipe.garnishes.join(', ') || 'no garnish'}. The drink had the following mistakes: ${discrepancies.join('; ')}. Deliver an in-character rejection line complaining specifically about the error(s).`;
    }

    const model = process.env.HF_DIALOGUE_MODEL || 'Qwen/Qwen2.5-72B-Instruct';

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 120,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const err = new Error(`Hugging Face API returned status ${response.status}: ${errText}`);
      (err as any).code = 'HF_UPSTREAM_ERROR';
      (err as any).statusCode = response.status === 401 ? 500 : response.status;
      (err as any).details = errText;
      throw err;
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content || '';
    const cleanDialogue = sanitizeDialogueOutput(rawContent);

    return {
      dialogue: cleanDialogue,
      characterId: payload.characterId,
      model,
      latencyMs: Date.now() - start,
    };
  }
  ```

---

### 3.2 `src/app/api/dialogue/route.ts`
- **Governing Tickets:** `ticket-001.md`
- **Proposed Implementation:**
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import {
    generateDialogueCompletion,
    type DialoguePayload,
  } from '@/lib/hfDialogueService';

  export async function POST(request: NextRequest) {
    try {
      const body = (await request.json()) as DialoguePayload;
      if (!body || !body.type || !body.characterId) {
        return NextResponse.json(
          { error: 'Missing required dialogue payload fields: type and characterId', code: 'INVALID_PAYLOAD' },
          { status: 400 }
        );
      }

      const result = await generateDialogueCompletion(body);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const code = error.code || 'INTERNAL_ERROR';
      return NextResponse.json(
        {
          error: error.message || 'Dialogue generation error',
          code,
          details: error.details || undefined,
          timestamp: new Date().toISOString(),
        },
        { status: statusCode }
      );
    }
  }
  ```

---

### 3.3 `src/data/characterDialogue.ts`
- **Target Lines:** L35–L69
- **Governing Tickets:** `ticket-002.md`
- **Proposed Transformations:**
  Extend with asynchronous authoritative resolution:
  ```typescript
  import { query } from '@/lib/db';

  export async function resolveAuthoritativePersona(
    characterId: string,
    repoRoot: string = process.cwd()
  ): Promise<string> {
    // 1. Check authoritative disk file
    const filePrompt = loadCharacterPromptFile(characterId, repoRoot);
    if (filePrompt && filePrompt.length > 0) {
      return filePrompt;
    }

    // 2. Query relational PostgreSQL database fallback
    try {
      const res = await query<{ about_me: string | null }>(
        'SELECT about_me FROM patrons WHERE id = $1 LIMIT 1',
        [characterId]
      );
      const dbBio = res.rows[0]?.about_me?.trim();
      if (dbBio && dbBio.length > 0) {
        return dbBio;
      }
    } catch {
      // Database query error or table empty
    }

    // 3. Fallback to static catalog if defined for stock characters
    const personality = getCharacterPersonality(characterId);
    const catalogPrompt = resolveSystemPromptForPersonality(personality);
    if (catalogPrompt && catalogPrompt.length > 0) {
      return catalogPrompt;
    }

    // 4. Fatal fail-fast
    const err = new Error(`Authoritative persona not found on disk or database for patron "${characterId}"`);
    (err as any).code = 'PERSONA_NOT_FOUND';
    (err as any).statusCode = 404;
    throw err;
  }
  ```

---

### 3.4 `src/components/PatronLayer.tsx`
- **Target Lines:** L62–L73, L550–L574
- **Governing Tickets:** `ticket-004.md`
- **Proposed Transformations:**
  1. Add `onServeDrinkToSeat?: (seatId: string) => void;` to `PatronLayerProps`.
  2. In JSX mapping over `instances`, bind drop/dragover/click events on seated patrons:
     ```tsx
     <img
       key={inst.instanceKey}
       className={`pov-patron-sprite${
         isSeated ? ' pov-patron-sprite--sit' : ' pov-patron-sprite--walk'
       }`}
       src={src}
       alt=""
       draggable={false}
       data-character-id={inst.characterId}
       data-seat-id={inst.seatId}
       data-phase={inst.phase}
       style={{
         left: `${pct.leftPct}%`,
         top: `${pct.topPct}%`,
         width: `${widthPct}%`,
         transform: `translate(-50%, -100%)${inst.flipX ? ' scaleX(-1)' : ''}`,
       }}
       onDragOver={isSeated ? (e) => {
         e.preventDefault();
         e.dataTransfer.dropEffect = 'copy';
       } : undefined}
       onDrop={isSeated ? (e) => {
         e.preventDefault();
         onServeDrinkToSeat?.(inst.seatId);
       } : undefined}
       onClick={isSeated ? () => {
         onServeDrinkToSeat?.(inst.seatId);
       } : undefined}
     />
     ```

---

### 3.5 `src/components/RetroRpgDialogueBox.tsx` & `.module.css`
- **Governing Tickets:** `ticket-005.md`
- **Proposed Implementation (`RetroRpgDialogueBox.tsx`):**
  ```tsx
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
        setDisplayedText('');
        setIsTyping(false);
        setShowArrow(false);
        clearTimer();
        return;
      }

      clearTimer();
      setDisplayedText('');
      setIsTyping(true);
      setShowArrow(false);

      let index = 0;
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
      <div className={styles.wrapper} onClick={handleClick} role="dialog" aria-live="polite">
        {/* Corner Loops */}
        <svg className={`${styles.cornerLoop} ${styles.pixelArt}`} style={{ top: -6, left: -6 }} viewBox="0 0 24 24">
          <rect x="0" y="0" width="8" height="8" fill="#ffffff" stroke="#000000" strokeWidth="0.5" />
          <rect x="2" y="2" width="4" height="4" fill="#09133b" />
          <rect x="8" y="2" width="6" height="4" fill="#ffffff" />
          <rect x="2" y="8" width="4" height="6" fill="#ffffff" />
          <rect x="7" y="7" width="5" height="5" fill="#ffffff" />
        </svg>
        <svg className={`${styles.cornerLoop} ${styles.pixelArt}`} style={{ top: -6, right: -6 }} viewBox="0 0 24 24">
          <rect x="16" y="0" width="8" height="8" fill="#ffffff" stroke="#000000" strokeWidth="0.5" />
          <rect x="18" y="2" width="4" height="4" fill="#09133b" />
          <rect x="10" y="2" width="6" height="4" fill="#ffffff" />
          <rect x="18" y="8" width="4" height="6" fill="#ffffff" />
          <rect x="12" y="7" width="5" height="5" fill="#ffffff" />
        </svg>
        <svg className={`${styles.cornerLoop} ${styles.pixelArt}`} style={{ bottom: -6, left: -6 }} viewBox="0 0 24 24">
          <rect x="0" y="16" width="8" height="8" fill="#ffffff" stroke="#000000" strokeWidth="0.5" />
          <rect x="2" y="18" width="4" height="4" fill="#09133b" />
          <rect x="8" y="18" width="6" height="4" fill="#ffffff" />
          <rect x="2" y="10" width="4" height="6" fill="#ffffff" />
          <rect x="7" y="12" width="5" height="5" fill="#ffffff" />
        </svg>
        <svg className={`${styles.cornerLoop} ${styles.pixelArt}`} style={{ bottom: -6, right: -6 }} viewBox="0 0 24 24">
          <rect x="16" y="16" width="8" height="8" fill="#ffffff" stroke="#000000" strokeWidth="0.5" />
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
                  <svg width="14" height="10" viewBox="0 0 10 7" className={styles.pixelArt}>
                    <polygon points="0,0 10,0 5,6" fill="#ffffff" stroke="#000000" strokeWidth="0.8" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

---

### 3.6 `src/app/globals.css`
- **Target Lines:** L781–L800
- **Governing Tickets:** `ticket-004.md`
- **Proposed Transformations:**
  ```css
  .pov-patron-sprite--sit {
      height: auto;
      max-height: none;
      pointer-events: auto;
      cursor: pointer;
  }

  .pov-active-vessel[draggable="true"] {
      cursor: grab;
  }

  .pov-active-vessel[draggable="true"]:active {
      cursor: grabbing;
  }
  ```

---

### 3.7 `src/app/page.tsx`
- **Target Lines:** L160–L185, L1412–L1421, L1585–L1610, L1640–L1650
- **Governing Tickets:** `ticket-003.md`, `ticket-004.md`, `ticket-005.md`
- **Proposed Transformations:**
  1. Add state:
     ```typescript
     interface SeatOrder {
       seatId: string;
       characterId: string;
       instanceKey: string;
       recipe: CocktailRecipe;
       orderDialogue: string | null;
       status: 'ordered' | 'served' | 'rejected';
     }
     const [seatOrders, setSeatOrders] = useState<Record<string, SeatOrder>>({});
     const [rejectionDialogues, setRejectionDialogues] = useState<Record<string, string>>({});
     const [activeDialogueSeat, setActiveDialogueSeat] = useState<string | null>(null);
     ```
  2. Implement `handlePatronSitComplete` and pass to `<PatronLayer onSitComplete={handlePatronSitComplete} onServeDrinkToSeat={handleServeDrinkToSeat} />`.
  3. Implement `handleServeDrinkToSeat(seatId: string)`:
     - Validates active vessel against `seatOrders[seatId].recipe`.
     - On pass: `runSuccessHandoff()`, sets status to `'served'`.
     - On failure: posts to `/api/dialogue` with `type: 'rejection'`, sets rejection speech in state, activates `RetroRpgDialogueBox`.
  4. Make active vessel `draggable={!vesselHandoff && !!state.vessel}`:
     ```tsx
     <div
       ref={vesselSlotRef}
       className={`pov-active-vessel${vesselHandoff ? ' pov-active-vessel--handoff' : ''}`}
       draggable={!vesselHandoff && !!state.vessel}
       onDragStart={(e) => {
         e.dataTransfer.setData('text/plain', 'cocktail-vessel');
         e.dataTransfer.effectAllowed = 'copy';
       }}
       // ...
     >
     ```
  5. Render `RetroRpgDialogueBox` inside `PovStageShell`:
     ```tsx
     {activeDialogueSeat && seatOrders[activeDialogueSeat] && (
       <RetroRpgDialogueBox
         isOpen={true}
         speakerName={requireCharacter(seatOrders[activeDialogueSeat].characterId).displayName}
         portraitSrc={
           talkSrcForCharacter(seatOrders[activeDialogueSeat].characterId) ||
           sitSrcForCharacter(seatOrders[activeDialogueSeat].characterId)
         }
         message={
           seatOrders[activeDialogueSeat].status === 'rejected'
             ? (rejectionDialogues[activeDialogueSeat] || 'IMPROPERLY PREPARED!')
             : (seatOrders[activeDialogueSeat].orderDialogue || 'AWAITING ORDER...')
         }
         onDismiss={() => setActiveDialogueSeat(null)}
       />
     )}
     ```

---

## 4. Edge Cases, Invariants & Verification Checklist

1. **Missing or Unset `HF_TOKEN`:**
   - Server returns structured HTTP 500/503 with `{ error: 'HF_TOKEN environment variable is not set or empty', code: 'HF_TOKEN_MISSING' }`.
   - Zero mock strings or canned placeholders emitted.
2. **Upstream Timeout & Rate Limits:**
   - 4000ms abort signal halts hung requests; returns non-zero error telemetry without freezing browser or game loop.
3. **Multi-Seat Concurrency Isolation:**
   - Seated patrons at `bar_seat_1` and `bar_seat_3` maintain distinct `seatOrders` entries; order and rejection messages do not collide.
4. **Premature Patron Departure:**
   - If a patron begins leaving the bar or seats are reset, active dialogue for that seat immediately closes cleanly.
5. **Retro Styling & Typewriter Parity:**
   - Dual white border, navy background, silver portrait frame, gold speaker name, 30–40ms typewriter timing, punctuation pauses, and bouncing prompt arrow match `retro_rpg_dialogue_box.html`.
