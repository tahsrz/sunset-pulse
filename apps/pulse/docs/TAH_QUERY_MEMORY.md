# TAH Query Memory

Sunset Pulse keeps a local query-memory cartridge so repeated command-center work can reuse context without re-spending tokens to rediscover the same ground.

## What It Saves

After each successful command, the command router appends a compact record to:

```text
apps/pulse/cartridges/query_memory.tah
```

Each memory record includes:

- command text,
- inferred intent,
- selected worker,
- relay template and delivery mode,
- source `.tah` files used,
- top concepts,
- final-screen learning recap,
- summary,
- recommended actions.

The file is a local `.tah` text cartridge. It is ignored by Git through the global `*.tah` ignore rule, so it stays local to the user machine.

## How It Saves Tokens

Before a command runs, Sunset Pulse scans recent query-memory records and recalls up to three matching memories. Recalled memories are injected as local context shards with:

```text
source: query_memory.tah
matchReason: query memory
```

That means the command center can reuse prior local context immediately, even before the segmented expert atlas is repacked.

## Trace Visibility

Command responses include:

```ts
trace.queryMemory = {
  status: 'saved' | 'disabled' | 'unavailable',
  path: string,
  recalled: number,
  saved: boolean,
  reason?: string
}
```

The command center UI shows this in the Developer Tools and Local Query Memory panels.

## Disabling

Set this environment variable to stop saving or recalling query memory:

```text
PULSE_QUERY_MEMORY_DISABLED=true
```

To relocate the memory cartridge:

```text
PULSE_QUERY_MEMORY_PATH=C:\path\to\query_memory.tah
```

## Relationship To The Atlas

Query memory is intentionally lightweight:

- it is appended instantly,
- it is local-only,
- it is available to the next query immediately,
- it does not require repacking the 400-expert segmented atlas.

Later, the memory file can be packed into the expert atlas or master archive if the user wants long-term indexed recall.
