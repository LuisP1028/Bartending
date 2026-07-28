# Deploy: Hugging Face Space + GitHub Pages iframe

Two hosts, one game:

1. **Hugging Face Space (Docker)** — runs Next.js (the real app)
2. **GitHub Pages** — static page that iframes the Space

Your HF account (from local CLI): **ChoppedCheese**

---

## A. Hugging Face Space

### 1. Create the Space (once)

```bash
hf repo create dither-os-bartending --repo-type space --space_sdk docker
```

Space page: `https://huggingface.co/spaces/ChoppedCheese/dither-os-bartending`

### 2. Commit only what the game needs

Do **not** upload `aaa*`, `Assets_*`, `wayfinder`, raw `drinks/`, etc. Use the repo `.gitignore` and only stage runtime files (see checklist below).

### 3. Upload to the Space (recommended)

Hugging Face rejects plain git pushes of raw PNGs/JPGs unless you use **Git LFS / Xet**. Easiest path:

```bash
# From a clean deploy folder (or the repo root with excludes)
hf upload ChoppedCheese/dither-os-bartending /path/to/deploy-folder . \
  --repo-type space \
  --commit-message "Deploy bartender app"
```

If you prefer git:

```bash
git lfs install
git lfs track "*.png" "*.jpg" "*.jpeg" "*.webp"
git add .gitattributes
# re-add binaries so they become LFS pointers, then:
git remote add hf https://huggingface.co/spaces/ChoppedCheese/dither-os-bartending
git push hf main
```

First Docker build can take several minutes (`npm ci` + Next build + native `better-sqlite3`).

### 4. Confirm the app URL

When the Space is **Running**, open:

- Hub: `https://huggingface.co/spaces/ChoppedCheese/dither-os-bartending`
- Direct (iframe target): `https://choppedcheese-dither-os-bartending.hf.space`

If the direct URL differs slightly, copy it from the Space UI (“Embed this Space” / open in new tab) and paste it into `docs/index.html` as `SPACE_URL`.

### 5. Optional secrets

Space → **Settings** → **Variables and secrets**:

- `HUGGINGFACE_TOKEN` — menu LLM (if used)
- `PII_ENCRYPTION_KEY` — patron signup DB encryption
- `XAI_API_KEY` — patron art pipeline (optional)

Core bartender play works without these.

---

## B. GitHub Pages (iframe shell)

### 1. Create a GitHub repo and push

```bash
# example — create repo on github.com first, then:
git remote add origin https://github.com/<you>/bartending.git
git push -u origin main
```

### 2. Enable Pages

GitHub → repo → **Settings** → **Pages**:

- Source: **Deploy from a branch**
- Branch: `main`
- Folder: **`/docs`**

Save. Site will be at:

`https://<you>.github.io/bartending/`  
(or `https://<you>.github.io/` for a `username.github.io` repo)

### 3. Set the iframe URL

Edit `docs/index.html`:

```js
const SPACE_URL = "https://choppedcheese-dither-os-bartending.hf.space";
```

Commit and push. Pages rebuilds in a minute or two.

---

## What to include in git (minimal)

| Include | Why |
|---------|-----|
| `src/`, `public/` | App + assets |
| `package.json`, `package-lock.json` | Dependencies |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` | Build |
| `Dockerfile`, `.dockerignore`, `README.md` | HF Space |
| `docs/index.html` | GH Pages |
| `scripts/patron-pipeline/lib` (+ thin pipeline entry) | Patron API only if you want it |
| `data/.gitkeep` | SQLite dir placeholder |

| Exclude | Why |
|---------|-----|
| `node_modules/`, `.next/` | Regenerated in Docker |
| `aaa*`, `Assets_*`, `wayfinder/` | Spec/dev dumps |
| `scripts/patron-pipeline/staging` | Huge local scratch |
| `.env*` | Secrets |

`.dockerignore` already keeps the Docker **image** lean even if extra files exist in the repo.

---

## Local Docker smoke test (optional)

```bash
docker build -t dither-bartending .
docker run --rm -p 7860:7860 dither-bartending
```

Open [http://localhost:7860](http://localhost:7860).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Space build fails on `better-sqlite3` | Dockerfile already installs `python3 make g++`; check build logs |
| App not reachable | Must bind `0.0.0.0:7860` (Dockerfile `CMD` does this) |
| iframe blank | Confirm Space is Running; fix `SPACE_URL`; free Spaces sleep and wake slowly |
| iframe blocked | Rare HF/CSP issue — use “Open full screen” link; ensure Space is **public** |
| Cold start | First visit after sleep can take 30–90s |
