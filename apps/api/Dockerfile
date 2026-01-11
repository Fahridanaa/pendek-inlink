FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY packages/db ./packages/db
COPY apps/api ./apps/api

RUN pnpm --filter db build
RUN pnpm --filter api build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/

# Copy migrations
COPY --from=builder /app/packages/db/migrations ./packages/db/migrations

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
