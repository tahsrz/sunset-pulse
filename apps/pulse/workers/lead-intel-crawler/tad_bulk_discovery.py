import argparse
import csv
import datetime as dt
import heapq
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Tuple


SOURCE_URL = "https://www.tad.org/content/data-download/PropertyData%28Delimited%29.ZIP"
MAX_DOWNLOAD_BYTES = 150 * 1024 * 1024


def main() -> int:
    parser = argparse.ArgumentParser(description="Discover bounded absentee-owner leads from TAD's public export.")
    parser.add_argument("--cache-dir", required=True)
    parser.add_argument("--candidate-limit", type=int, default=250)
    parser.add_argument("--minimum-years-held", type=int, default=5)
    parser.add_argument("--minimum-value", type=int, default=100000)
    parser.add_argument("--maximum-value", type=int, default=1500000)
    args = parser.parse_args()

    try:
        cache_dir = Path(args.cache_dir).resolve()
        cache_dir.mkdir(parents=True, exist_ok=True)
        archive_path, source_meta = download_export(cache_dir)
        payload = discover(
            archive_path,
            max(1, min(args.candidate_limit, 1000)),
            max(1, min(args.minimum_years_held, 50)),
            max(0, args.minimum_value),
            max(args.minimum_value, args.maximum_value),
        )
        payload.update(source_meta)
        payload["status"] = "completed"
    except Exception as exc:
        payload = {"status": "failed", "note": str(exc), "source_url": SOURCE_URL}

    print(json.dumps(payload, ensure_ascii=False), flush=True)
    return 0 if payload["status"] == "completed" else 1


def download_export(cache_dir: Path) -> Tuple[Path, Dict[str, Any]]:
    archive_path = cache_dir / "PropertyData-Delimited.zip"
    metadata_path = cache_dir / "PropertyData-Delimited.meta.json"
    prior = read_json(metadata_path)
    if archive_path.exists() and not prior and zipfile.is_zipfile(archive_path):
        prior = {
            "etag": None,
            "last_modified": None,
            "downloaded_at": dt.datetime.fromtimestamp(archive_path.stat().st_mtime, dt.timezone.utc).isoformat(),
            "byte_size": archive_path.stat().st_size,
        }
        metadata_path.write_text(json.dumps(prior, indent=2), encoding="utf-8")
        return archive_path, {
            "source_url": SOURCE_URL,
            "source_last_modified": None,
            "source_downloaded_at": prior["downloaded_at"],
            "source_byte_size": archive_path.stat().st_size,
            "used_cached_export": True,
        }
    headers = {"User-Agent": "SunsetPulseLeadDiscovery/1.0 (+local operator workflow)"}
    if archive_path.exists() and prior.get("last_modified"):
        headers["If-Modified-Since"] = prior["last_modified"]
    if archive_path.exists() and prior.get("etag"):
        headers["If-None-Match"] = prior["etag"]

    request = urllib.request.Request(SOURCE_URL, headers=headers)
    downloaded = False
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            content_length = int(response.headers.get("Content-Length") or 0)
            if content_length and content_length > MAX_DOWNLOAD_BYTES:
                raise ValueError("TAD export exceeds the configured download limit")
            with tempfile.NamedTemporaryFile(dir=cache_dir, delete=False, suffix=".part") as output:
                temp_path = Path(output.name)
                total = 0
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_DOWNLOAD_BYTES:
                        raise ValueError("TAD export exceeded the configured download limit")
                    output.write(chunk)
            temp_path.replace(archive_path)
            prior = {
                "etag": response.headers.get("ETag"),
                "last_modified": response.headers.get("Last-Modified"),
                "downloaded_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                "byte_size": total,
            }
            metadata_path.write_text(json.dumps(prior, indent=2), encoding="utf-8")
            downloaded = True
    except urllib.error.HTTPError as exc:
        if exc.code != 304 or not archive_path.exists():
            raise

    if not zipfile.is_zipfile(archive_path):
        raise ValueError("TAD export is not a valid ZIP archive")
    return archive_path, {
        "source_url": SOURCE_URL,
        "source_last_modified": prior.get("last_modified"),
        "source_downloaded_at": prior.get("downloaded_at"),
        "source_byte_size": archive_path.stat().st_size,
        "used_cached_export": not downloaded,
    }


def discover(
    archive_path: Path,
    candidate_limit: int,
    minimum_years_held: int,
    minimum_value: int,
    maximum_value: int,
) -> Dict[str, Any]:
    cutoff = dt.date.today().replace(year=dt.date.today().year - minimum_years_held)
    heap: List[Tuple[int, str, Dict[str, Any]]] = []
    scanned = eligible = 0

    with zipfile.ZipFile(archive_path) as archive:
        entries = [entry for entry in archive.infolist() if entry.filename.lower().endswith(".txt")]
        if len(entries) != 1:
            raise ValueError("TAD export must contain exactly one delimited text file")
        with archive.open(entries[0]) as raw:
            lines = (line.decode("utf-8-sig", "replace") for line in raw)
            for row in csv.DictReader(lines, delimiter="|"):
                scanned += 1
                candidate = candidate_from_row(row, cutoff, minimum_value, maximum_value)
                if not candidate:
                    continue
                eligible += 1
                key = str(candidate["account_number"])
                item = (int(candidate["score"]), key, candidate)
                if len(heap) < candidate_limit:
                    heapq.heappush(heap, item)
                elif item[:2] > heap[0][:2]:
                    heapq.heapreplace(heap, item)

    candidates = [item[2] for item in sorted(heap, reverse=True)]
    return {
        "scanned_records": scanned,
        "eligible_records": eligible,
        "candidate_count": len(candidates),
        "filters": {
            "property_class": "A",
            "minimum_years_held": minimum_years_held,
            "minimum_value": minimum_value,
            "maximum_value": maximum_value,
            "mailing_address_differs_from_situs": True,
        },
        "candidates": candidates,
    }


def candidate_from_row(row: Dict[str, str], cutoff: dt.date, minimum_value: int, maximum_value: int):
    if clean(row.get("Property_Class")) != "A":
        return None
    account_number = clean(row.get("Account_Num"))
    owner_name = clean(row.get("Owner_Name"))
    owner_street = clean(row.get("Owner_Address"))
    situs_address = clean(row.get("Situs_Address"))
    if not account_number or not owner_name or not owner_street or not situs_address:
        return None
    if normalize_address(owner_street) == normalize_address(situs_address):
        return None

    deed_date = parse_date(row.get("Deed_Date"))
    if not deed_date or deed_date > cutoff or deed_date.year <= 1900:
        return None
    total_value = parse_int(row.get("Total_Value"))
    if total_value < minimum_value or total_value > maximum_value:
        return None

    owner_city_state = clean(row.get("Owner_CityState"))
    owner_zip = clean(row.get("Owner_Zip"))
    mailing_address = ", ".join(part for part in (owner_street, owner_city_state, owner_zip) if part)
    years_held = max(0, dt.date.today().year - deed_date.year)
    reasons = ["residential_class_a", "mailing_differs_from_situs", "held_at_least_five_years"]
    score = min(years_held, 40)
    if re.search(r"\bP\.?O\.?\s+BOX\b", owner_street, flags=re.I):
        score += 15
        reasons.append("po_box_mailing")
    if owner_city_state and " TX" not in f" {owner_city_state.upper()}":
        score += 25
        reasons.append("out_of_state_mailing")
    if 200000 <= total_value <= 750000:
        score += 10
        reasons.append("target_value_band")

    return {
        "account_number": account_number,
        "owner_name": owner_name,
        "property_address": situs_address,
        "mailing_address": mailing_address,
        "deed_date": deed_date.isoformat(),
        "years_held": years_held,
        "total_value": total_value,
        "appraisal_year": clean(row.get("Appraisal_Year")),
        "property_class": "A",
        "gis_link": clean(row.get("GIS_Link")),
        "score": score,
        "reasons": reasons,
    }


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_address(value: str) -> str:
    normalized = re.sub(r"[^A-Z0-9]", "", value.upper())
    return normalized.replace("STREET", "ST").replace("ROAD", "RD").replace("AVENUE", "AVE")


def parse_date(value: Any):
    try:
        return dt.date.fromisoformat(clean(value)[:10])
    except ValueError:
        return None


def parse_int(value: Any) -> int:
    try:
        return int(float(clean(value).replace(",", "") or 0))
    except ValueError:
        return 0


def read_json(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    except (json.JSONDecodeError, OSError):
        return {}


if __name__ == "__main__":
    sys.exit(main())
