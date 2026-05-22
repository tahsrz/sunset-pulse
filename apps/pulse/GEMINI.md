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

---

## WSL 2 Integration & Development Guidelines

To ensure maximum performance and environment parity with our production environments, **WSL 2 (Windows Subsystem for Linux)** is the recommended engine for running Docker containers, databases, and heavy local server stacks.

### Why We Use WSL 2
1. **Docker Engine Parity:** Running Docker Desktop backed by WSL 2 eliminates the virtualization performance penalty of Hyper-V, enabling high-performance containerized services (such as Supabase/PostgreSQL).
2. **POSIX Environment Parity:** Prevents OS-specific discrepancies (such as case-insensitive filesystems or Windows line endings `\r\n` causing scripts to fail in CI/CD).
3. **Optimized Filesystem Operations:** Inside the Linux filesystem (`/home/...`), disk operations and Node compiling run significantly faster than on standard Windows NTFS.

### Accessing the Filesystem Cross-Platform
- **Windows to Linux:** Access your WSL files in Windows Explorer by typing `\\wsl$\Ubuntu\` in the navigation bar.
- **Linux to Windows:** Your Windows files are automatically mounted inside WSL under `/mnt/c/`. 

> [!CAUTION]
> **Performance Warning:** Avoid running Node or Next.js development servers inside a Windows mount path `/mnt/c/` from WSL. It degrades file-watching performance due to translation layers. For maximum disk speed, clone and run heavy projects inside the native Linux filesystem (e.g., `/home/username/SunsetPulse`).

### Recommended Dev Commands inside WSL
To open your project inside WSL using Visual Studio Code, run:
```bash
wsl
cd /path/to/project
code .
```
This launches VS Code on Windows with the remote extension connected directly to your high-performance WSL container environment.

