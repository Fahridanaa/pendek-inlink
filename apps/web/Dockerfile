FROM node:20-alpine AS builder

WORKDIR /app

# Copy root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy web package.json
COPY apps/web/package.json ./apps/web/

# Enable corepack (pnpm version from packageManager)
RUN corepack enable

# Install deps (monorepo-aware)
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web ./apps/web

# Build only web
RUN pnpm --filter web build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
