---
title: DITHER-OS Bartending
emoji: 🍸
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Pixel bartender simulator (Next.js)
---

# DITHER-OS Bartending

Lounge bartender simulator — pour, build drinks, serve patrons.

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Hugging Face Space (this repo)

This Space uses the **Docker** SDK. The container builds Next.js and serves on port **7860**.

Optional secrets (Space → Settings → Variables and secrets):

| Name | Purpose |
|------|---------|
| `HUGGINGFACE_TOKEN` | Menu LLM mapping (if used) |
| `HUGGINGFACE_MODEL` | Override default HF model |
| `PII_ENCRYPTION_KEY` | Patron signup contact encryption |
| `XAI_API_KEY` | **Join the bar** character generation (Imagine full `--run`) |
| `XAIKEY` | Alias for `XAI_API_KEY` |

SQLite / `data/runtime-patrons.json` under `/data` is **ephemeral** on free Spaces (lost on restart) unless you attach persistent storage.

## GitHub Pages iframe shell

Static embed lives in [`docs/index.html`](docs/index.html). Point GitHub Pages at the `/docs` folder and set your Space URL in that file.

Direct Space URL (after deploy):

`https://huggingface.co/spaces/ChoppedCheese/<space-name>`

Embed URL form:

`https://choppedcheese-<space-name>.hf.space`
