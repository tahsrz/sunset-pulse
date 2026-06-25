import argparse
import asyncio
import json
import re
import sys
from typing import Any, Dict, List
from urllib.parse import urljoin


def main() -> int:
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

    print(json.dumps(payload, ensure_ascii=False))
    return 0


async def crawl(url: str, mode: str, max_pages: int, hints: Dict[str, Any]) -> Dict[str, Any]:
    from crawl4ai import AsyncWebCrawler

    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url)

    markdown = normalize_markdown(getattr(result, "markdown", "") or "")
    metadata = getattr(result, "metadata", None) or {}
    title = metadata.get("title") or first_heading(markdown)
    description = metadata.get("description") or first_sentence(markdown)
    links = normalize_links(getattr(result, "links", None), url)

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
            "signals": extract_signals(markdown),
            "link_count": len(links),
            "markdown_preview": markdown[:3000],
        }

    return payload


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
    addresses = sorted(set(re.findall(r"\b\d{2,6}\s+[A-Za-z0-9 .'-]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct)\b", markdown, flags=re.I)))[:25]
    return {
        "money_values": money_values,
        "phones": phone_values,
        "emails": emails,
        "addresses": addresses,
        "word_count": len(markdown.split()),
    }


if __name__ == "__main__":
    sys.exit(main())
