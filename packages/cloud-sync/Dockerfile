FROM oven/bun:1.3.11

WORKDIR /app

# Preserve the monorepo lockfile so container installs are reproducible.
COPY package.json bun.lock ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/plugins/package.json ./packages/plugins/package.json
COPY packages/extension/package.json ./packages/extension/package.json
COPY packages/desktop/package.json ./packages/desktop/package.json
COPY packages/android/package.json ./packages/android/package.json
COPY packages/cloud-sync/package.json ./packages/cloud-sync/package.json
RUN bun install --frozen-lockfile --production --filter @betterx/cloud-sync

# Copy source
COPY packages/cloud-sync/src ./packages/cloud-sync/src

EXPOSE 4000

ENV NODE_ENV=production
ENV DATABASE_URL=/data/betterx.db

RUN mkdir -p /data
VOLUME /data

WORKDIR /app/packages/cloud-sync
CMD ["bun", "run", "src/index.ts"]
