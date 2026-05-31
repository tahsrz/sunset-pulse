"""
Local CMS USB bridge scaffold.

This intentionally avoids payment control paths. It only sends bridge heartbeats
and sanitized transaction/export batches to Sunset Pulse.

Examples:
  python scripts/cms_usb_bridge.py --mock
  python scripts/cms_usb_bridge.py --port COM7 --endpoint http://localhost:3001
  python scripts/cms_usb_bridge.py --file scratch/transset-sample.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def post_json(endpoint: str, path: str, payload: dict, token: str | None = None) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{endpoint.rstrip('/')}{path}",
        data=body,
        headers={
            "Content-Type": "application/json",
            **({"x-cms-bridge-token": token} if token else {}),
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def heartbeat(endpoint: str, port: str, token: str | None, mock: bool) -> dict:
    return post_json(
        endpoint,
        "/api/cms/usb",
        {
            "status": "attached",
            "mode": "mock" if mock else "usb-serial",
            "deviceLabel": "RubyCi USB export bridge",
            "portName": port,
            "vendorId": "11CA",
            "productId": "0220",
            "warning": "Mock bridge heartbeat." if mock else "Live USB bridge heartbeat. Export parsing is read-only.",
        },
        token,
    )


def ingest_file(endpoint: str, file_path: Path, token: str | None) -> dict:
    raw = json.loads(file_path.read_text(encoding="utf-8"))
    records = raw.get("records", raw if isinstance(raw, list) else [])
    return post_json(
        endpoint,
        "/api/cms/ingest",
        {
            "batchId": raw.get("batchId") if isinstance(raw, dict) else f"USB-FILE-{int(time.time())}",
            "source": "RubyCi USB file export",
            "records": records,
            "warnings": ["Imported from local bridge file mode."],
        },
        token,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Sunset Pulse CMS USB bridge scaffold")
    parser.add_argument("--endpoint", default=os.environ.get("SUNSET_PULSE_ENDPOINT", "http://localhost:3001"))
    parser.add_argument("--token", default=os.environ.get("CMS_BRIDGE_TOKEN"))
    parser.add_argument("--port", default=os.environ.get("CMS_USB_PORT", "AUTO"))
    parser.add_argument("--file", type=Path, help="Read a sanitized JSON export file and submit it as a batch.")
    parser.add_argument("--mock", action="store_true", help="Run a one-shot mock attach heartbeat.")
    parser.add_argument("--watch", action="store_true", help="Keep sending heartbeats every 30 seconds.")
    args = parser.parse_args()

    try:
      bridge = heartbeat(args.endpoint, args.port, args.token, args.mock)
      print(json.dumps({"event": "heartbeat", "result": bridge}, indent=2))

      if args.file:
          ingest = ingest_file(args.endpoint, args.file, args.token)
          print(json.dumps({"event": "ingest", "result": ingest}, indent=2))

      while args.watch:
          time.sleep(30)
          bridge = heartbeat(args.endpoint, args.port, args.token, args.mock)
          print(json.dumps({"event": "heartbeat", "at": datetime.now(timezone.utc).isoformat(), "result": bridge}))

      return 0
    except Exception as exc:
      print(f"CMS USB bridge failed: {exc}", file=sys.stderr)
      return 1


if __name__ == "__main__":
    raise SystemExit(main())
