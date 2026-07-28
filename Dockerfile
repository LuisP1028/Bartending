# Hugging Face Spaces — Docker SDK (Next.js)
# App must listen on 0.0.0.0:7860
FROM node:20-bookworm-slim

# better-sqlite3 needs native build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces run as UID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    NODE_ENV=production \
    PORT=7860 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR $HOME/app

COPY --chown=user package.json package-lock.json ./
RUN npm ci

COPY --chown=user . .
RUN mkdir -p data && npm run build

EXPOSE 7860

CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "7860"]
