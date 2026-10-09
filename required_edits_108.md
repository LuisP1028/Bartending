# RE108 — Master Component-to-Edit Matrix: "Join the bar!" Configuration Refinement: "About Me" Bio Capture and Character Prompt File Generation

**Spec:** [functional_specification_108.md](./functional_specification_108.md)  
**Map:** [wayfinder/20261009T224812-747-ypdn/map.md](./wayfinder/20261009T224812-747-ypdn/map.md)  
**Tickets:**
- [Ticket 001: Registration Modal 'About Me' Profile Section & Client Validation Architecture](./wayfinder/20261009T224812-747-ypdn/tickets/ticket-001.md)
- [Ticket 002: Authoritative Prompt File Generation (personality.txt) & Strict Content Fidelity Governance](./wayfinder/20261009T224812-747-ypdn/tickets/ticket-002.md)
- [Ticket 003: Durable Persona Persistence, Metadata Ingestion & Relational Schema Standardization](./wayfinder/20261009T224812-747-ypdn/tickets/ticket-003.md)
- [Ticket 004: Cloud Asset Synchronization & Asset Route Serving Protocol for personality.txt](./wayfinder/20261009T224812-747-ypdn/tickets/ticket-004.md)
- [Ticket 005: Stock Patron Persona Parity, Prompt Resolution Normalization & Self-Healing Restoration Architecture](./wayfinder/20261009T224812-747-ypdn/tickets/ticket-005.md)

---

## 1. System Layer Component Ownership Register

| Lifecycle / Architectural Responsibility | Primary Component & File Path | Supporting Modules & Data Definitions | Key Functions, Hooks & Data Structures |
| :--- | :--- | :--- | :--- |
| **In-Game Patron Registration Form** | `src/components/PatronSignupForm.tsx` | `src/components/PatronSignupForm.tsx` | `aboutMe` state, `<textarea>`, 10–500 char validation, multipart submission |
| **Server Registration & File Generation** | `src/app/api/patrons/register/route.ts` | `src/lib/patronFolders.ts`, `src/lib/patronIdentity.ts` | `POST` handler, `aboutMe` validation, `ensurePatronFolders`, `personality.txt` write |
| **Patron Folder & Filesystem Manager** | `src/lib/patronFolders.ts` | `scripts/patron-pipeline/lib/patronFolder.mjs` | `ensurePatronFolders`, `PatronMeta`, `PatronFolderIdentity`, `ensurePersonalityFile` |
| **Relational Database Schema & Migrations** | `src/lib/db.ts` | `src/lib/runtimePatronStore.ts` | `ensureSchema`, `patrons.about_me`, `patrons.prompt_ready` |
| **Runtime Persistence Store** | `src/lib/runtimePatronStore.ts` | `src/lib/db.ts` | `readRuntimePatronsDb`, `upsertRuntimePatronDb`, `RuntimePatronRecord` |
| **Asset Pipeline CLI** | `scripts/patron-pipeline/generate-patron-assets.mjs` | `scripts/patron-pipeline/lib/patronFolder.mjs` | `parseArgs`, `--about-me`, `maybeUpsertPostgresPatron` |
| **Cloud Storage (GCS) Publication** | `src/lib/gcsStorage.ts` | `scripts/patron-pipeline/lib/gcsStorage.mjs` | `uploadPatronPackToGcs`, `uploadPatronAssetsToGcs`, `personality.txt` MIME `text/plain` |
| **Runtime Asset Serving Route** | `src/app/api/patrons/assets/[characterId]/[file]/route.ts` | `src/lib/patronPackReady.ts` | `ALLOWED` set, `personality.txt` whitelist, `text/plain; charset=utf-8` |
| **Prompt Resolution & Stock Persona Assets** | `src/data/characterDialogue.ts` | `public/assets/patrons/{id}/personality.txt` | `loadCharacterPromptFile`, `resolveSystemPromptForCharacterId`, stock files |

---

## 2. Master Component-to-Edit Matrix

| Component / File Path | Target Lines / Symbols | Governing Ticket | Nature of Required Edit | Contract / Invariant Locked |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/PatronSignupForm.tsx` | L63–L131, L163–L217 | `ticket-001.md` | Add "About Me" textarea, 10–500 char validation, character counter, multipart payload | Enforces non-whitespace minimum 10 chars, max 500 chars; dispatches sanitized `aboutMe` in `FormData`. |
| `src/app/api/patrons/register/route.ts` | L36–L78, L116–L130, L173–L188, L343–L355 | `ticket-002.md`, `ticket-003.md` | Validate `aboutMe`, write `personality.txt` to public/staging, pass `--about-me` to pipeline CLI, persist to DB | Writes literal user bio verbatim in UTF-8 without wrappers; completes $< 50\text{ms}$; persists `about_me` and `prompt_ready = true` in DB. |
| `src/lib/patronFolders.ts` | L12–L36, L38–L89 | `ticket-002.md`, `ticket-003.md`, `ticket-005.md` | Update `PatronFolderIdentity` and `PatronMeta` with `aboutMe`; write `personality.txt`; add `ensurePersonalityFile` | Mirrors `personality.txt` in public and staging folders; updates `meta.json` with `aboutMe`; provides self-healing recovery. |
| `scripts/patron-pipeline/lib/patronFolder.mjs` | L12–L71 | `ticket-002.md`, `ticket-003.md` | Support `aboutMe` in identity and metadata; write `personality.txt` to staging and public | Parity with TypeScript folder utility for CLI pipeline executions. |
| `src/lib/db.ts` | L59–L79 | `ticket-003.md` | Add `about_me TEXT` and `prompt_ready BOOLEAN NOT NULL DEFAULT FALSE` to `patrons` table | Adds columns to `CREATE TABLE` and idempotent `ALTER TABLE` statements in `ensureSchema()`. |
| `src/lib/runtimePatronStore.ts` | L11–L26, L55–L93, L95–L143 | `ticket-003.md` | Add `aboutMe` and `promptReady` to `RuntimePatronRecord`, `readRuntimePatronsDb`, `upsertRuntimePatronDb` | Database queries select and insert `about_me` and `prompt_ready` columns. |
| `scripts/patron-pipeline/generate-patron-assets.mjs` | L78–L145, L401–L417, L607–L650 | `ticket-003.md` | Add `--about-me` CLI argument parsing, forward `aboutMe` to `ensurePatronFolders`, persist in `maybeUpsertPostgresPatron` | Full CLI pipeline propagates user bio from command line to folder and database. |
| `src/lib/gcsStorage.ts` | L90–L96, L98–L147 | `ticket-004.md` | Upload `personality.txt` to GCS with `contentType: 'text/plain; charset=utf-8'`; update `PatronCloudPackUrls` | Publishes `personality.txt` alongside sprite PNGs to Google Cloud Storage. |
| `scripts/patron-pipeline/lib/gcsStorage.mjs` | L86–L132 | `ticket-004.md` | Upload `personality.txt` in `uploadPatronAssetsToGcs` with `text/plain; charset=utf-8` | Pipeline CLI parity for cloud synchronization. |
| `src/app/api/patrons/assets/[characterId]/[file]/route.ts` | L14–L25, L88–L102 | `ticket-004.md` | Add `'personality.txt'` to `ALLOWED` set; serve with `text/plain; charset=utf-8` and cache headers | Enables HTTP retrieval of patron prompt files for external / dynamic consumers. |
| `src/data/characterDialogue.ts` | L1–L40 | `ticket-005.md` | Add `loadCharacterPromptFile`; update `resolveSystemPromptForCharacterId` to prioritize file-backed prompts | Unifies stock and dynamic prompt resolution from `personality.txt`. |
| `public/assets/patrons/patron_elder/personality.txt` | Entire file | `ticket-005.md` | Create canonical Elder prompt file | Authoritative dry-humored, knowing veteran description for Elder. |
| `public/assets/patrons/caesar_9aea2cd1a4bf32d6/personality.txt` | Entire file | `ticket-005.md` | Create canonical Caesar prompt file | Authoritative dramatic Roman general description for Caesar. |
| `public/assets/patrons/trump_ca36306f5c662816/personality.txt` | Entire file | `ticket-005.md` | Create canonical Trump prompt file | Authoritative bombastic tycoon description for Trump. |

---

## 3. Detailed Component-by-Component Specifications

### 3.1 `src/components/PatronSignupForm.tsx`
- **Target Lines:** L63–L131, L163–L217
- **Governing Tickets:** `ticket-001.md`
- **Proposed Transformations:**
  1. Add `aboutMe` state variable:
     ```tsx
     const [aboutMe, setAboutMe] = useState('');
     ```
  2. In `onSubmit`:
     ```tsx
     const trimmedBio = aboutMe.trim();
     if (!trimmedBio) {
       setError('About Me personality bio is required');
       return;
     }
     if (trimmedBio.length < 10) {
       setError('About Me bio must be at least 10 characters long');
       return;
     }
     if (aboutMe.length > 500) {
       setError('About Me bio cannot exceed 500 characters');
       return;
     }
     // ...
     body.set('aboutMe', trimmedBio);
     ```
  3. In JSX return:
     Insert `<textarea>` profile section before photo upload with clear guidance and character counter:
     ```tsx
     <label style={labelStyle}>
       About Me (Personality & Tone) *
       <textarea
         style={{
           ...inputStyle,
           minHeight: 72,
           maxHeight: 140,
           resize: 'vertical',
           fontFamily: 'inherit',
           fontSize: '0.85rem',
           lineHeight: 1.35,
         }}
         value={aboutMe}
         onChange={(e) => setAboutMe(e.target.value)}
         placeholder="e.g. Grumpy retired sailor who loves bitter drinks and speaks in short, dry remarks..."
         maxLength={500}
         required
       />
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.75 }}>
         <span>Describe persona, tone, quirks, or cocktail preferences</span>
         <span>{aboutMe.length}/500</span>
       </div>
     </label>
     ```
  4. Reset `aboutMe` to `''` on modal close / success.

### 3.2 `src/app/api/patrons/register/route.ts`
- **Target Lines:** L36–L78, L116–L130, L173–L188, L343–L355
- **Governing Tickets:** `ticket-002.md`, `ticket-003.md`
- **Proposed Transformations:**
  1. Parse and validate `aboutMe`:
     ```typescript
     const rawAboutMe = form.get('aboutMe') ?? form.get('about_me');
     const aboutMe = typeof rawAboutMe === 'string' ? rawAboutMe.trim() : '';

     if (!aboutMe) {
       return NextResponse.json({ error: 'aboutMe is required' }, { status: 400 });
     }
     if (aboutMe.length < 10) {
       return NextResponse.json({ error: 'aboutMe must be at least 10 characters long' }, { status: 400 });
     }
     if (aboutMe.length > 500) {
       return NextResponse.json({ error: 'aboutMe cannot exceed 500 characters' }, { status: 400 });
     }
     ```
  2. Pass `aboutMe` into `ensurePatronFolders`:
     ```typescript
     const folders = ensurePatronFolders(root, { ...identity, aboutMe });
     ```
  3. When spawning `generate-patron-assets.mjs`, forward `--about-me`:
     ```typescript
     const args = [
       script,
       '--run',
       '--repo-root',
       root,
       '--photo',
       photoPath,
       '--name',
       name,
       '--character-id',
       identity.characterId,
       '--no-register',
       '--about-me',
       aboutMe,
       ...(email ? ['--email', email] : []),
       ...(phone ? ['--phone', phone] : []),
     ];
     ```
  4. In `child.on('close')`, pass `aboutMe` and `promptReady: true` to `upsertRuntimePatronDb`:
     ```typescript
     await upsertRuntimePatronDb({
       id: identity.characterId,
       displayName: identity.displayName,
       personality: `${identity.characterId.replace(/^patron_/, '').replace(/[^a-z0-9]+/gi, '_')}_friendly`,
       aboutMe,
       promptReady: true,
       walkFrameCount: 2,
       walkFrameMs: 120,
       sitUrl: cloudUrls.sitUrl,
       talkUrl: cloudUrls.talkUrl,
       walk01Url: cloudUrls.walk01Url,
       walk02Url: cloudUrls.walk02Url,
       sourceUrl: cloudUrls.sourceUrl,
     });
     ```

### 3.3 `src/lib/patronFolders.ts` & `scripts/patron-pipeline/lib/patronFolder.mjs`
- **Target Lines:** L12–L36, L38–L89
- **Governing Tickets:** `ticket-002.md`, `ticket-003.md`, `ticket-005.md`
- **Proposed Transformations:**
  1. Add `aboutMe?: string` to `PatronFolderIdentity` and `PatronMeta`.
  2. In `ensurePatronFolders`:
     - Write `meta.json` with `aboutMe: identity.aboutMe || undefined`.
     - When `identity.aboutMe` is provided, synchronously write `personality.txt` to `publicDir` and `stagingDir`:
       ```typescript
       if (identity.aboutMe !== undefined && identity.aboutMe !== null) {
         if (createPublic) {
           fs.writeFileSync(path.join(publicDir, 'personality.txt'), identity.aboutMe, 'utf8');
         }
         if (createStaging) {
           fs.writeFileSync(path.join(stagingDir, 'personality.txt'), identity.aboutMe, 'utf8');
         }
       }
       ```
  3. Export `ensurePersonalityFile(repoRoot: string, characterId: string, aboutMeFallback?: string | null): boolean` for self-healing prompt restoration.

### 3.4 `src/lib/db.ts`
- **Target Lines:** L59–L79
- **Governing Tickets:** `ticket-003.md`
- **Proposed Transformations:**
  1. In `ensureSchema()`, append idempotent column migrations:
     ```sql
     ALTER TABLE patrons ADD COLUMN IF NOT EXISTS about_me TEXT;
     ALTER TABLE patrons ADD COLUMN IF NOT EXISTS prompt_ready BOOLEAN NOT NULL DEFAULT FALSE;
     ```
  2. Include `about_me TEXT, prompt_ready BOOLEAN NOT NULL DEFAULT FALSE,` in the `CREATE TABLE IF NOT EXISTS patrons` statement.

### 3.5 `src/lib/runtimePatronStore.ts`
- **Target Lines:** L11–L26, L55–L93, L95–L143
- **Governing Tickets:** `ticket-003.md`
- **Proposed Transformations:**
  1. Add `aboutMe?: string; promptReady?: boolean;` to `RuntimePatronRecord`.
  2. In `readRuntimePatronsDb()`, select `about_me` and `prompt_ready`, mapping them to `aboutMe: row.about_me ?? undefined` and `promptReady: row.prompt_ready ?? false`.
  3. In `upsertRuntimePatronDb(record)`, accept `aboutMe?: string; promptReady?: boolean;`, including them in the `INSERT` and `ON CONFLICT (id) DO UPDATE SET` clauses.

### 3.6 `scripts/patron-pipeline/generate-patron-assets.mjs`
- **Target Lines:** L78–L145, L401–L417, L607–L650
- **Governing Tickets:** `ticket-003.md`
- **Proposed Transformations:**
  1. In `parseArgs(argv)`, parse `--about-me <text>`.
  2. Pass `aboutMe` into `ensurePatronFolders(REPO_ROOT, { ...identity, aboutMe: args.aboutMe })`.
  3. In `maybeUpsertPostgresPatron(characterId, identity, cloudUrls, aboutMe)`, persist `about_me` and `prompt_ready = TRUE`.

### 3.7 `src/lib/gcsStorage.ts` & `scripts/patron-pipeline/lib/gcsStorage.mjs`
- **Target Lines:** L90–L96, L98–L147
- **Governing Tickets:** `ticket-004.md`
- **Proposed Transformations:**
  1. Add `personalityUrl?: string;` to `PatronCloudPackUrls`.
  2. In `uploadPatronPackToGcs`, check if `localPaths.personality` or `path.join(path.dirname(localPaths.sit), 'personality.txt')` exists.
  3. If present, upload to `patrons/${characterId}/personality.txt` with `contentType: 'text/plain; charset=utf-8'`.
  4. Mirror in `scripts/patron-pipeline/lib/gcsStorage.mjs`.

### 3.8 `src/app/api/patrons/assets/[characterId]/[file]/route.ts`
- **Target Lines:** L14–L25, L88–L102
- **Governing Tickets:** `ticket-004.md`
- **Proposed Transformations:**
  1. Add `'personality.txt'` to the `ALLOWED` set.
  2. When serving `personality.txt`, set `Content-Type: text/plain; charset=utf-8` and `Cache-Control: public, max-age=3600, must-revalidate`.

### 3.9 `src/data/characterDialogue.ts`
- **Target Lines:** L1–L40
- **Governing Tickets:** `ticket-005.md`
- **Proposed Transformations:**
  1. Implement `loadCharacterPromptFile(characterId: string, repoRoot?: string): string | null` reading `public/assets/patrons/{characterId}/personality.txt`.
  2. In `resolveSystemPromptForCharacterId(characterId: string, repoRoot?: string): string | null`, return file-backed prompt if present, falling back to catalog.

### 3.10 Stock Patron Prompt Files (`public/assets/patrons/`)
- **Governing Tickets:** `ticket-005.md`
- **File Paths & Exact Contents:**
  1. `public/assets/patrons/patron_elder/personality.txt`:
     ```
     A wise, dry-humored bar veteran with an unhurried demeanour who speaks in short, wry observations. Has seen every cocktail order twice and appreciates strong, classic, bitter drinks.
     ```
  2. `public/assets/patrons/caesar_9aea2cd1a4bf32d6/personality.txt`:
     ```
     An imperious Roman general who commands the bar with grand rhetoric, sharp wit, and dramatic flair. Demands drinks fit for an emperor with laurel-crowned confidence.
     ```
  3. `public/assets/patrons/trump_ca36306f5c662816/personality.txt`:
     ```
     A bombastic, hyper-confident tycoon with superlative vocabulary and repetitive banter. Only accepts the finest, most luxurious golden cocktails made by winners.
     ```

---

## 4. Edge Cases, Invariants & Verification Checklist

1. **Special Characters & Emojis in Bio:**
   - UTF-8 encoding preserved without character escaping or corruption.
2. **Missing Prompt File Self-Healing:**
   - `ensurePersonalityFile` re-materializes `personality.txt` from PostgreSQL `patrons.about_me` if deleted from disk.
3. **Registration Without Image Generation (`runPipeline=false`):**
   - `personality.txt` written synchronously to `public/assets/patrons/{characterId}/` before response returns.
4. **Offline / Disconnected Reliability:**
   - Synchronous filesystem writes execute in $< 50\text{ms}$ with zero third-party network dependencies.
5. **Stock Patron Parity:**
   - Elder, Caesar, and Trump prompt files exist on disk and resolve identically to user-registered patrons.
