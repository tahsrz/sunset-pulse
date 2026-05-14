# Sunset Pulse // Testing Infrastructure

## Overview
As of May 2026, Sunset Pulse uses a dual-layer testing strategy:
1. **End-to-End (E2E)**: Powered by **Playwright**. Specs are located in `/tests/*.spec.ts`.
2. **Unit Testing**: Powered by **Vitest**. Tests are located in `/tests/unit/*.test.ts`.

## Unit Testing (Vitest)
- **Config**: `vitest.config.ts`
- **Setup**: `tests/setup.ts` (includes global mocks for Supabase and other external services).
- **Execution**:
  - `npm run test:unit`: Run all unit tests once.
  - `npm run test:unit:watch`: Run unit tests in watch mode.

### Core Targets
- **Foundational Logic**: `lib/core/cityhash.ts`
- **Intelligence Layer**: `lib/ai/purifier.ts`, `lib/intelligence/neighborhoodIntel.ts`
- **Retrieval System**: `lib/core/tah_retriever.ts`
- **Business Logic**: `lib/intelligence/leadProcessor.ts`

## Testing Mandates
- **Mocks**: Always mock external APIs (Supabase, OpenAI, Anthropic, Telegram) in unit tests.
- **Cartridges**: Use actual `.tah` cartridges for retrieval tests when available, but ensure tests fail gracefully if cartridges are missing.
- **Lead Integrity**: Unit tests for `leadProcessor` must verify Zod validation and probability jitter logic.
