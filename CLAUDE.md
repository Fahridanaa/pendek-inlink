# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pendek-inlink is a URL shortener service built as a monorepo using pnpm workspaces. The project consists of:
- **API backend** (Hono + Effect-TS + Drizzle ORM)
- **Web frontend** (HTMX + Alpine.js + Tailwind CSS)
- **Database package** (Drizzle ORM schemas and migrations)
- **Shared package** (Common types and utilities)

## Development Setup

Start all services:
```bash
docker-compose up -d          # Start PostgreSQL and Redis
pnpm install                  # Install dependencies
pnpm dev                      # Run all apps in parallel
```

Run individual apps:
```bash
pnpm dev:api                  # API only (http://localhost:4000)
pnpm dev:web                  # Web only
```

## Database Commands

All database commands run from the `packages/db` workspace:

```bash
# Generate migrations after schema changes
pnpm --filter db generate

# Run migrations
pnpm --filter db migrate

# Open Drizzle Studio (database GUI)
pnpm --filter db studio
```

Database connection defaults to `postgres://postgres:postgres@localhost:5432/pendekinlink` unless `DATABASE_URL` is set.

## Build Commands

```bash
pnpm build                    # Build all packages and apps
pnpm --filter api build       # Build API only
pnpm --filter db build        # Build db package only
```

## Architecture

### Monorepo Structure

- `apps/api/` - Hono backend server
- `apps/web/` - Frontend web application
- `packages/db/` - Database layer (schemas, client, migrations)
- `packages/shared/` - Shared TypeScript types

### API Architecture (apps/api)

The API follows a layered architecture with Effect-TS for functional error handling:

**Layer structure:**
- `routes/` - Hono route handlers, returns HTTP responses
- `services/` - Business logic with Effect-based error handling
- `repositories/` - Database operations (Drizzle ORM queries)
- `utils/` - Pure utility functions

**Effect-TS patterns:**
- Services use `Effect.gen` for composable error handling
- Custom tagged errors (e.g., `DatabaseError`, `NotFound`)
- `Effect.runPromise` at route boundaries to convert to Promise
- `Effect.catchTags` for specific error handling
- `Effect.runFork` for fire-and-forget operations (e.g., click tracking)

### Database Package (packages/db)

Exports:
- `db` - Drizzle database client instance
- Schema definitions and inferred types (`ShortLink`, `NewShortLink`)
- Schema is defined in `src/schema.ts`

The database client auto-connects using environment variables or defaults. Import with:
```typescript
import { db, shortlinks, type ShortLink } from "db";
```

### Key Dependencies

- **Hono** - Web framework for API routes
- **Effect-TS** - Functional error handling and composable effects
- **Drizzle ORM** - Type-safe SQL query builder
- **postgres** - PostgreSQL client
- **Redis** - Caching (currently available but not yet implemented)

## Code Style

- Use ES modules (`"type": "module"` in package.json)
- Import with `.js` extensions in TypeScript files (e.g., `./app.js`)
- API runs on port 4000 by default
- TypeScript strict mode enabled
