# Sunset Pulse Monorepo Migration Guide

This document tracks the structural changes and technical challenges encountered during the merger of **Sunset Pulse** and **cal.diy** into a unified monorepo.

## 🏗 New Architecture
```text
SunsetPulse/
├── apps/
│   ├── pulse/          # Core Real Estate Platform (Next.js)
│   ├── scheduling/     # Merged Cal.com Web Layer
│   └── api/            # Merged Cal.com API Services
├── packages/           # Shared Workspace Packages
│   ├── app-store/      # 100+ Integration Packages
│   ├── features/       # Core Scheduling Features
│   ├── platform/       # Infrastructure & Utils
│   └── (others)        # trpc, prisma, ui, etc.
└── package.json        # Root Workspace Orchestrator
```

## 🛠 Integration Challenges & Resolutions

### 1. Workspace Protocol Mismatch
**Issue:** `cal.diy` packages used the `workspace:*` or `workspace:path` protocol for internal dependencies. Standard `npm` (v10+) throws `EUNSUPPORTEDPROTOCOL` when encountering this.
**Resolution:** A recursive PowerShell script was used to remove the `workspace:` prefix from all `package.json` files in `apps/` and `packages/`.
- *Recommendation:* If using Yarn or pnpm in the future, these protocols can be restored for stricter versioning.

### 2. Nested Workspace Discovery
**Issue:** Internal dependencies were deeply nested (e.g., `packages/app-store/googlecalendar`). A single `packages/*` glob in the root `package.json` was insufficient for discovery, leading `npm` to attempt (and fail) to fetch them from the public registry.
**Resolution:** Explicitly added nested paths to the `workspaces` array:
```json
"workspaces": [
  "apps/*",
  "packages/*",
  "packages/app-store/*",
  "packages/features/*",
  "packages/platform/*"
]
```

### 3. Peer Dependency Conflicts
**Issue:** Merging two large ecosystems (Next.js 14/15 and Cal.com's React 18 stack) created significant peer dependency mismatches, particularly with `react` and `ink`.
**Resolution:** Installation was unblocked using `--legacy-peer-deps`.
- *Caution:* Future UI components shared across `pulse` and `scheduling` must be verified for React version compatibility.

### 4. Invalid Package Versions
**Issue:** The `@calcom/kysely` package referenced a non-existent version (`0.28.14`).
**Resolution:** Surgically updated to `0.29.2` after verifying available versions via `npm view`.

## 🔮 Roadmap for Future Users

### Database Unification
The current state uses **Supabase (Postgres)** for Pulse and **Prisma** for Scheduling.
- **Target:** Migrate Scheduling models into the Supabase schema.
- **Location:** `packages/prisma/schema.prisma` contains the source of truth for scheduling models.
- **First Supabase slice:** `apps/pulse/supabase/migrations/20260521010000_create_scheduling_core.sql` creates the core scheduling tables in Supabase with legacy Cal IDs for staged imports.
- **Mapping guide:** `apps/pulse/supabase/SCHEDULING_MIGRATION_MAP.md` tracks model-to-table mapping, deferred surfaces, import order, and cutover tasks.

### Environment Management
- Pulse Environment: `apps/pulse/.env`
- Scheduling Metadata: `apps/scheduling/meta/.env.example`
- *Task:* Create a unified environment loader or sync keys into a root `.env` for cross-workspace scripts.

### Build Orchestration
Currently, `pulse:dev` is defined at the root. Sibling scripts should be added for `scheduling:dev` and `api:dev` once their respective internal `package.json` scripts are verified.
