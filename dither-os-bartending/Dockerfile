# Hugging Face Spaces — Docker SDK (Next.js)
# App must listen on 0.0.0.0:7860
# node:20 images already ship a UID 1000 user named "node"
FROM node:20-bookworm-slim

# better-sqlite3 needs native build tools
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

USER node
ENV HOME=/home/node \
    PATH=/home/node/.local/bin:$PATH \
    NODE_ENV=production \
    PORT=7860 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR $HOME/app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN mkdir -p data && npm run build

EXPOSE 7860

CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "7860"]
