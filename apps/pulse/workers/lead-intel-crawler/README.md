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
