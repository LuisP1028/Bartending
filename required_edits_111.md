# RE111 — Master Component-to-Edit Matrix: Mode Selection Menu "Join the bar!" Personality Capture and Registration Workflow Completion

**Spec:** [functional_specification_111.md](./functional_specification_111.md)  
**Map:** [wayfinder/20261014T231600-111-jbar/map.md](./wayfinder/20261014T231600-111-jbar/map.md)  
**Tickets:**
- [Ticket 001: Comm-Link Personality Input UI, Screen Glass Containment & Mobile Focus-Zoom Prevention](./wayfinder/20261014T231600-111-jbar/tickets/ticket-001.md)
- [Ticket 002: Console D-Pad, A/B Shell Controls & Keyboard Focus Cycle Expansion](./wayfinder/20261014T231600-111-jbar/tickets/ticket-002.md)
- [Ticket 003: Pre-Camera Bio Validation, Identity Contract Extension & Registration Payload Forwarding](./wayfinder/20261014T231600-111-jbar/tickets/ticket-003.md)
- [Ticket 004: FS111 Integration Test Decision Mapping, Payload Admissibility Governance & Master Verification Protocol](./wayfinder/20261014T231600-111-jbar/tickets/ticket-004.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **Comm-Link Terminal Input UI & Focus Navigation** | `src/components/JoinBarCommLink.tsx` | `src/components/JoinBarCommLink.module.css`, `src/components/MainMenu.tsx` | `JoinBarIdentity`, `JoinBarCommLinkHandle`, `FOCUS_COUNT = 4`, `aboutMe` state, `aboutMeRef`, `applyFocus`, `moveFocus`, `activate`, `tryTransmit` |
| **Comm-Link Terminal Styling & Glass Containment** | `src/components/JoinBarCommLink.module.css` | `src/app/gameboy-shell.css` | `.form`, `.inputGroup`, `.labelRow`, `.charCount`, `.synthInput`, `.synthTextarea`, `.controlFocused` |
| **Menu Join Orchestrator & Multipart Payload Dispatch** | `src/app/page.tsx` | `src/components/JoinBarCamera.tsx`, `src/app/api/patrons/register/route.ts` | `joinIdentity`, `onJoinTransmit`, `onJoinCapture`, `FormData` (`aboutMe` field forwarding) |
| **Backend Registration & Prompt File Synthesis** | `src/app/api/patrons/register/route.ts` | `src/lib/patronFolders.ts`, `src/lib/runtimePatronStore.ts` | `POST` handler (`aboutMe` validation 10–500 chars), `ensurePatronFolders` (`personality.txt` + `meta.json`) |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/JoinBarCommLink.tsx` | L13–L18 (`JoinBarIdentity`) | `ticket-003.md` | Add `aboutMe: string` to `JoinBarIdentity` | Locks identity contract between Stage 1 (Comm-Link) and Stage 2 (Camera / Registration). |
| `src/components/JoinBarCommLink.tsx` | L32–L68 (`FOCUS_COUNT`, state, refs, `applyFocus`) | `ticket-001.md`, `ticket-002.md` | Set `FOCUS_COUNT = 4`; add `aboutMe` state and `aboutMeRef`; map index `2` to `aboutMeRef` and index `3` to `submitRef` with `scrollIntoView({ block: 'nearest' })` | Expands D-pad and arrow key focus cycle across Alias (0), Comm (1), Personality (2), and Transmit Data (3). |
| `src/components/JoinBarCommLink.tsx` | L69–L99 (`tryTransmit`, `activate`) | `ticket-002.md`, `ticket-003.md` | Validate `aboutMe.trim()` (required, $\ge 10$ chars, $\le 500$ chars); focus index `2` on failure; emit `aboutMe: bio` in `onTransmit`; trigger `tryTransmit()` when `focusIndex === 3` in `activate()` | Blocks transition to camera when personality bio is missing or invalid; surfaces terminal error message; submits on A at index 3. |
| `src/components/JoinBarCommLink.tsx` | L199–L218 (JSX form controls) | `ticket-001.md`, `ticket-002.md` | Render `#join-personality` `<textarea>` with label, live `{aboutMe.length}/500` counter, placeholder, `maxLength={500}`, and `focusIndex === 2` highlight; update submit button focus check to `focusIndex === 3` | Satisfies AC1, AC2, AC3, and AC4 inside the Comm-Link terminal. |
| `src/components/JoinBarCommLink.module.css` | L75–L86, L125–L176 (`.form`, `.labelRow`, `.charCount`, `.synthTextarea`, `.promoNotice`) | `ticket-001.md` | Add `.labelRow`, `.charCount`, and `.synthTextarea` (`font-size: 16px`, `-webkit-text-size-adjust: 100%`, `min-height: 56px`, `max-height: 96px`); refine `.form` and `.promoNotice` spacing for 4-control glass containment | Prevents iOS Safari focus-zoom (`font-size: 16px`) and guarantees all controls remain accessible inside the Game Boy playfield glass. |
| `src/app/page.tsx` | L1675–L1696 (`onJoinCapture`) | `ticket-003.md` | Verify `joinIdentity.aboutMe` is present and set `body.set('aboutMe', joinIdentity.aboutMe)` on `FormData` before `fetch('/api/patrons/register')` | Eliminates the `aboutMe is required` HTTP 400 error when confirming a selfie in the "JOIN THE BAR!" workflow (AC5, AC6). |

---

## 3. Detailed Component-by-Component Specifications

### 3.1 `src/components/JoinBarCommLink.tsx`
- **Governing Tickets:** `ticket-001.md`, `ticket-002.md`, `ticket-003.md`
- **Exact Transformations:**
  1. Extend `JoinBarIdentity`:
     ```typescript
     export type JoinBarIdentity = {
       name: string;
       email: string | null;
       phone: string | null;
       aboutMe: string;
     };
     ```
  2. Update `FOCUS_COUNT` and add `aboutMe` state + `aboutMeRef`:
     ```typescript
     const FOCUS_COUNT = 4; // alias, comm, personality, transmit
     ```
     ```typescript
     const [alias, setAlias] = useState('');
     const [comm, setComm] = useState('');
     const [aboutMe, setAboutMe] = useState('');
     const [error, setError] = useState<string | null>(null);
     const [focusIndex, setFocusIndex] = useState(0);
     const aliasRef = useRef<HTMLInputElement>(null);
     const commRef = useRef<HTMLInputElement>(null);
     const aboutMeRef = useRef<HTMLTextAreaElement>(null);
     const submitRef = useRef<HTMLButtonElement>(null);
     ```
  3. Update `applyFocus`:
     ```typescript
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
     ```
  4. Update `tryTransmit` and `activate`:
     ```typescript
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
     ```
  5. Insert the Personality `<textarea>` input group and update `submitRef` focus index to `3`:
     ```tsx
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
     ```

---

### 3.2 `src/components/JoinBarCommLink.module.css`
- **Governing Tickets:** `ticket-001.md`
- **Exact Transformations:**
  1. Update `.form` to allow clean scrolling in compact glass viewports:
     ```css
     .form {
       position: relative;
       z-index: 10;
       display: flex;
       flex-direction: column;
       gap: clamp(8px, 2.2%, 14px);
       flex: 1 0 auto;
       min-height: 100%;
       width: 100%;
       height: auto;
       box-sizing: border-box;
     }
     ```
  2. Add `.labelRow`, `.charCount`, and `.synthTextarea`:
     ```css
     .labelRow {
       display: flex;
       align-items: baseline;
       justify-content: space-between;
       gap: 8px;
     }

     .charCount {
       color: var(--color-mountain-purple);
       font-size: clamp(7px, 1.6vw, 9px);
       line-height: 1.5;
       flex-shrink: 0;
     }

     .synthTextarea {
       min-height: 54px;
       max-height: 96px;
       resize: vertical;
       font-size: 16px;
       line-height: 1.3;
       text-transform: none;
     }
     ```

---

### 3.3 `src/app/page.tsx`
- **Governing Tickets:** `ticket-003.md`
- **Exact Transformations:**
  In `onJoinCapture` (L1675–L1696):
  ```typescript
  if (!joinIdentity || !joinIdentity.aboutMe) {
    setJoinStatus('ERR: IDENTITY LOST — RESTART COMM-LINK');
    setJoinStatusError(true);
    return;
  }
  setJoinBusy(true);
  setJoinStatus('GENERATING PATRON…');
  setJoinStatusError(false);
  try {
    const body = new FormData();
    body.set('name', joinIdentity.name);
    if (joinIdentity.email) body.set('email', joinIdentity.email);
    if (joinIdentity.phone) body.set('phone', joinIdentity.phone);
    body.set('aboutMe', joinIdentity.aboutMe);
    body.set('photo', file);
    body.set('runPipeline', '1');
  ```

---

## 4. Verification & Validation Protocol
All modifications must be verified against integration tests `IT-FS111-01` through `IT-FS111-06` detailed in `wayfinder/20261014T231600-111-jbar/test_matrix_111.md`.
