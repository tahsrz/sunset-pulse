# Crawl4AI Lead Intelligence Worker

This optional worker turns approved lead-intelligence URLs into Markdown and compact JSON for the Pulse app.

Install locally from `apps/pulse`:

```bash
python -m pip install -r workers/lead-intel-crawler/requirements.txt
python -m playwright install chromium
```

Run a manual smoke test:

```bash
npm run lead:intel:crawl -- --url https://example.com --mode both --hints "{}"
```

The Next.js route is guarded by operator access:

```text
GET  /api/intelligence/crawl-lead
POST /api/intelligence/crawl-lead
```

Keep the crawler local/operator-first. The default ledger is `cartridges/lead-intel/crawl-results.jsonl`, which is ignored by Git.

## Wikipedia to TAH

The same Crawl4AI worker powers a resumable alphabetical Wikipedia ingestion pipeline. MediaWiki's `allpages` cursor enumerates canonical article URLs; Crawl4AI extracts each page; Sunset Pulse forges a deterministic binary TAH cartridge for each bounded batch.

Run one batch from `apps/pulse`:

```bash
npm run wikipedia:crawl
```

Run continuously with persisted checkpoints and bounded retries:

```bash
npm run wikipedia:crawl:continuous
```

Local state and provenance manifests live under `cartridges/wikipedia/` and are ignored by Git. Binary `.tah` batches in that directory are discovered automatically by Pulse search. Useful environment controls:

```text
WIKIPEDIA_LANGUAGE=en
WIKIPEDIA_BATCH_SIZE=10
WIKIPEDIA_REQUEST_DELAY_MS=1000
WIKIPEDIA_TAH_OUTPUT_DIR=cartridges/wikipedia
WIKIPEDIA_INGESTION_STATE_PATH=cartridges/wikipedia/ingestion-state.json
LEAD_INTEL_ALLOWED_DOMAINS=wikipedia.org
```

The Windows `start-web-knowledge-worker.ps1` launcher starts this continuous worker alongside the older SunsetWars ingestion orchestrator. Registering the scheduled task remains an explicit operator action.
