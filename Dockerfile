FROM node:24-bookworm-slim AS build

WORKDIR /app
ENV NUXT_TELEMETRY_DISABLED=1

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
    NUXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app/.output ./.output
RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
