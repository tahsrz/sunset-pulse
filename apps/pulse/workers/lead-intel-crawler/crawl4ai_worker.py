import argparse
import asyncio
import json
import re
import sys
from typing import Any, Dict, List
from urllib.parse import urljoin


DEFAULT_REAL_ESTATE_SCHEMA: Dict[str, Any] = {
    "name": "Property Lead Records",
    "baseSelector": ".property-card, .listing-item, tr.property-row, .search-result-item",
    "fields": [
        {"name": "property_address", "selector": ".address, .property-address, td.situs-address", "type": "text"},
        {"name": "owner_name", "selector": ".owner, .owner-name, td.owner-heading", "type": "text"},
        {"name": "market_value", "selector": ".price, .market-value, td.total-value", "type": "text"},
        {"name": "parcel_id", "selector": ".parcel-id, .account-num, td.account-id", "type": "text"},
        {"name": "detail_link", "selector": "a", "type": "attribute", "attribute": "href"},
    ],
}


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Crawl a lead-intelligence source with Crawl4AI.")
    parser.add_argument("--url", required=True)
    parser.add_argument("--mode", choices=["markdown", "json", "both"], default="both")
    parser.add_argument("--max-pages", type=int, default=1)
    parser.add_argument("--hints", default="{}")
    args = parser.parse_args()

    try:
        hints = json.loads(args.hints)
    except json.JSONDecodeError:
        hints = {}

    try:
        payload = asyncio.run(crawl(args.url, args.mode, args.max_pages, hints))
    except ImportError as exc:
        payload = {
            "status": "unavailable",
            "note": (
                f"{exc}. Install optional worker dependencies with "
                "python -m pip install -r workers/lead-intel-crawler/requirements.txt "
                "and python -m playwright install chromium."
            ),
        }
    except Exception as exc:
        payload = {"status": "failed", "note": str(exc)}

    print(json.dumps(payload, ensure_ascii=False), flush=True)
    return 0


async def crawl(url: str, mode: str, max_pages: int, hints: Dict[str, Any]) -> Dict[str, Any]:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
    from crawl4ai.content_filter_strategy import PruningContentFilter
    from crawl4ai.extraction_strategy import JsonCssExtractionStrategy
    from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

    content_profile = bounded_string(hints.get("content_profile"), 40).lower()
    is_wikipedia = content_profile == "wikipedia"
    schema = None if is_wikipedia else validate_extraction_schema(hints.get("extraction_schema") or DEFAULT_REAL_ESTATE_SCHEMA)
    browser_config = BrowserConfig(headless=True, verbose=False, use_persistent_context=False)
    markdown_generator = DefaultMarkdownGenerator(
        content_filter=PruningContentFilter(user_query=bounded_string(hints.get("query"), 300))
    )
    run_config_options: Dict[str, Any] = dict(
        cache_mode=CacheMode.BYPASS,
        markdown_generator=markdown_generator,
        word_count_threshold=5,
        page_timeout=30000,
    )
    if schema is not None:
        run_config_options["extraction_strategy"] = JsonCssExtractionStrategy(schema, verbose=False)
    run_config = CrawlerRunConfig(**run_config_options)

    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)

    if not getattr(result, "success", True):
        error_message = str(getattr(result, "error_message", None) or "Crawl4AI could not capture the source.")
        return {
            "status": classify_failure_status(error_message),
            "sourceUrl": getattr(result, "url", None) or url,
            "note": error_message,
        }

    markdown_result = getattr(result, "markdown", "") or ""
    raw_markdown = getattr(markdown_result, "fit_markdown", None) or getattr(markdown_result, "raw_markdown", None) or markdown_result
    markdown = normalize_markdown(str(raw_markdown or ""))
    metadata = getattr(result, "metadata", None) or {}
    title = metadata.get("title") or first_heading(markdown)
    description = metadata.get("description") or first_sentence(markdown)
    links = normalize_links(getattr(result, "links", None), url)
    extracted_records = parse_extracted_records(getattr(result, "extracted_content", None)) if schema else []

    payload: Dict[str, Any] = {
        "status": "completed",
        "title": title,
        "description": description,
        "links": links,
        "sourceUrl": getattr(result, "url", None) or url,
        "note": "max_pages is reserved for future multi-page expansion; this worker records the first page."
        if max_pages > 1
        else None,
    }

    if mode in ("markdown", "both"):
        payload["markdown"] = markdown

    if mode in ("json", "both"):
        payload["json"] = {
            "source_url": url,
            "title": title,
            "description": description,
            "entity_hints": hints,
            "extraction_schema": schema,
            "content_profile": content_profile or "lead_intelligence",
            "extracted_records": extracted_records,
            "signals": extract_signals(markdown),
            "link_count": len(links),
            "markdown_preview": markdown[:3000],
        }

    return payload


def classify_failure_status(message: str) -> str:
    if re.search(r"(?:\b401\b|\b403\b|unauthori[sz]ed|forbidden|access denied)", message, flags=re.I):
        return "blocked"
    return "failed"


def validate_extraction_schema(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("extraction_schema must be an object")

    name = bounded_string(value.get("name"), 120) or "Property Lead Records"
    base_selector = bounded_string(value.get("baseSelector"), 500)
    raw_fields = value.get("fields")
    if not base_selector or not isinstance(raw_fields, list) or not raw_fields:
        raise ValueError("extraction_schema requires baseSelector and fields")
    if len(raw_fields) > 20:
        raise ValueError("extraction_schema supports at most 20 fields")

    fields: List[Dict[str, str]] = []
    seen = set()
    for raw_field in raw_fields:
        if not isinstance(raw_field, dict):
            raise ValueError("each extraction field must be an object")
        field_name = bounded_string(raw_field.get("name"), 80)
        selector = bounded_string(raw_field.get("selector"), 500)
        field_type = bounded_string(raw_field.get("type"), 20) or "text"
        if not field_name or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", field_name):
            raise ValueError("extraction field names must use letters, numbers, and underscores")
        if field_name in seen or not selector or field_type not in ("text", "attribute"):
            raise ValueError("extraction fields require unique names, selectors, and supported types")
        field = {"name": field_name, "selector": selector, "type": field_type}
        if field_type == "attribute":
            attribute = bounded_string(raw_field.get("attribute"), 80)
            if not attribute or not re.fullmatch(r"[A-Za-z_:][-A-Za-z0-9_:.]*", attribute):
                raise ValueError("attribute extraction fields require a valid attribute name")
            field["attribute"] = attribute
        seen.add(field_name)
        fields.append(field)

    return {"name": name, "baseSelector": base_selector, "fields": fields}


def parse_extracted_records(value: Any) -> List[Dict[str, Any]]:
    if not value:
        return []
    try:
        parsed = json.loads(value) if isinstance(value, str) else value
    except (json.JSONDecodeError, TypeError):
        return []
    if isinstance(parsed, dict):
        parsed = [parsed]
    if not isinstance(parsed, list):
        return []

    records: List[Dict[str, Any]] = []
    for item in parsed[:100]:
        if not isinstance(item, dict):
            continue
        records.append({
            bounded_string(key, 80): bounded_string(field_value, 2000)
            for key, field_value in list(item.items())[:20]
            if bounded_string(key, 80)
        })
    return records


def bounded_string(value: Any, limit: int) -> str:
    if value is None:
        return ""
    return str(value).strip()[:limit]


def normalize_markdown(value: str) -> str:
    cleaned = value.replace("\r\n", "\n")
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n{4,}", "\n\n\n", cleaned)
    return cleaned.strip()


def first_heading(markdown: str) -> str | None:
    for line in markdown.splitlines():
        text = line.strip()
        if text.startswith("#"):
            return text.lstrip("#").strip()[:240] or None
    return None


def first_sentence(markdown: str) -> str | None:
    text = re.sub(r"\s+", " ", re.sub(r"[#*_`>\[\]()]|\!\[[^\]]*\]", " ", markdown)).strip()
    if not text:
        return None
    match = re.search(r"(.{40,280}?[.!?])\s", text)
    return (match.group(1) if match else text[:280]).strip()


def normalize_links(raw_links: Any, base_url: str) -> List[Dict[str, str | None]]:
    if isinstance(raw_links, dict):
        candidates = []
        for group in raw_links.values():
            if isinstance(group, list):
                candidates.extend(group)
    elif isinstance(raw_links, list):
        candidates = raw_links
    else:
        candidates = []

    links: List[Dict[str, str | None]] = []
    seen = set()
    for link in candidates:
        if isinstance(link, str):
            href = link
            text = None
        elif isinstance(link, dict):
            href = link.get("href") or link.get("url")
            text = link.get("text") or link.get("title")
        else:
            continue

        if not href:
            continue
        absolute = urljoin(base_url, str(href))
        if absolute in seen:
            continue
        seen.add(absolute)
        links.append({"href": absolute, "text": str(text).strip()[:180] if text else None})
        if len(links) >= 80:
            break
    return links


def extract_signals(markdown: str) -> Dict[str, Any]:
    money_values = sorted(set(re.findall(r"\$[\d,]+(?:\.\d{2})?", markdown)))[:25]
    phone_values = sorted(set(re.findall(r"\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}", markdown)))[:25]
    emails = sorted(set(re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", markdown)))[:25]
    addresses = sorted(set(re.findall(r"\b\d{1,6}\s+[A-Za-z0-9 .'-]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Trail|Trl|Circle|Cir|Parkway|Pkwy|Way|Place|Pl|Highway|Hwy)\b", markdown, flags=re.I)))[:25]
    return {
        "money_values": money_values,
        "phones": phone_values,
        "emails": emails,
        "addresses": addresses,
        "owner_names": extract_labeled_values(markdown, [r"owner(?:'s)?(?: name)?", r"taxpayer(?: name)?"]),
        "first_names": extract_labeled_values(markdown, [r"first name"]),
        "last_names": extract_labeled_values(markdown, [r"last name"]),
        "property_addresses": extract_labeled_values(markdown, [r"property address", r"situs address", r"site address"]),
        "mailing_addresses": extract_labeled_values(markdown, [r"mailing address", r"owner address", r"taxpayer address"]),
        "word_count": len(markdown.split()),
    }


def extract_labeled_values(markdown: str, labels: List[str]) -> List[str]:
    values: List[str] = []
    seen = set()
    label_pattern = "|".join(f"(?:{label})" for label in labels)

    for raw_line in markdown.splitlines():
        line = re.sub(r"^[#>*\-\s]+", "", raw_line).strip()
        match = re.match(rf"^(?:{label_pattern})\s*[:\-]\s*(.+)$", line, flags=re.I)
        if not match:
            continue
        value = re.sub(r"[*_`\[\]]", "", match.group(1)).strip()[:500]
        comparable = re.sub(r"\W", "", value).lower()
        if not value or comparable in seen:
            continue
        seen.add(comparable)
        values.append(value)
        if len(values) >= 10:
            break

    return values


if __name__ == "__main__":
    sys.exit(main())
