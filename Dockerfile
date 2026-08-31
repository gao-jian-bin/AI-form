FROM node:24-bookworm-slim AS build

WORKDIR /app
ENV NUXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/ai-forum.db \
    UPLOAD_DIR=/data/uploads \
    NUXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/.output ./.output
COPY --chmod=755 scripts/docker-entrypoint.sh /usr/local/bin/ai-forum-entrypoint
RUN mkdir -p /data/uploads && chown -R node:node /data

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/ai-forum-entrypoint"]
CMD ["node", ".output/server/index.mjs"]
