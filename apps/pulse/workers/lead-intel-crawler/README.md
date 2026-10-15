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

Local state, provenance manifests, catalogs, and binary `.tah` batches live only under the configured Wikipedia storage root. The Wikipedia crawler does not write corpus data to Supabase Storage. Useful environment controls:

```text
WIKIPEDIA_LANGUAGE=en
WIKIPEDIA_BATCH_SIZE=10
WIKIPEDIA_REQUEST_DELAY_MS=1000
WIKIPEDIA_TAH_OUTPUT_DIR=cartridges/wikipedia
WIKIPEDIA_INGESTION_STATE_PATH=cartridges/wikipedia/ingestion-state.json
WIKIPEDIA_STORAGE_ROOT=.pulse-local/wikipedia
LEAD_INTEL_ALLOWED_DOMAINS=wikipedia.org
```

To keep the crawler's durable filesystem state in Docker, start the bundled service from the repository root:

```bash
npm run docker:wikipedia:up
npm run docker:wikipedia:status
```

The service stores checkpoints, manifests, demand queues, catalogs, and `.tah` batches only in the named `wikipedia-data` volume at `/var/lib/sunsetpulse/wikipedia`. Stop the service with `npm run docker:wikipedia:down`; the named volume is retained unless explicitly removed.

The Windows `start-web-knowledge-worker.ps1` launcher starts this continuous worker alongside the older SunsetWars ingestion orchestrator. Registering the scheduled task remains an explicit operator action.

For a deployed Atlas monitor, set `PULSE_CRAWLER_HEARTBEAT_URL` to the deployed `/api/atlas/processes/heartbeat` endpoint and set the same random `PULSE_CRAWLER_HEARTBEAT_TOKEN` in the crawler's local `.env.local` and deployed Pulse environment. The crawler publishes only bounded progress and checkpoint metadata after each batch. Apply the `crawler_heartbeats` Supabase migration before enabling the remote heartbeat.
