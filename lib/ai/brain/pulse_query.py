import argparse
import json
import math
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Add builder to path for MemoriaQuery
sys.path.append(os.path.dirname(__file__))
from cityhash import city_hash64, get_memoria_indices, normalize
from memoria_query import MemoriaQuery

TAH_MAGIC = 0x54414821
STOPWORDS = {
    "what", "does", "this", "that", "with", "from", "your", "have", "about",
    "tell", "give", "show", "find", "for", "and", "the", "are", "was", "were",
    "how", "why", "who", "where", "when", "can", "could", "would", "should",
}


def _safe_print(text=""):
    """Print cartridge text safely on Windows consoles and redirected stdout."""
    try:
        print(text)
    except UnicodeEncodeError:
        encoded = str(text).encode(sys.stdout.encoding or "utf-8", errors="replace")
        print(encoded.decode(sys.stdout.encoding or "utf-8", errors="replace"))


def _clean_text(text):
    return str(text).replace("\0", "").strip()


def _cartridge_dirs():
    base_dir = Path(__file__).resolve().parents[3]
    dirs = [
        base_dir / "cartridges",
        base_dir.parent / "SunsetWars" / "cartridges",
        Path("/tmp/cartridges"),
        Path("/tmp"),
    ]

    configured = os.environ.get("PULSE_CARTRIDGE_DIRS", "")
    for raw_dir in configured.split(os.pathsep):
        if raw_dir.strip():
            dirs.append(Path(raw_dir.strip()))

    seen = set()
    resolved = []
    for directory in dirs:
        directory = directory.resolve()
        if directory in seen or not directory.exists():
            continue
        seen.add(directory)
        resolved.append(directory)
    return resolved


def _query_terms(query):
    clean_query = re.sub(r"[^\w\s]", " ", query.lower()).strip()
    terms = [term for term in clean_query.split() if len(term) > 2 and term not in STOPWORDS]
    ngrams = terms[:]
    for index in range(len(terms) - 1):
        ngrams.append(f"{terms[index]} {terms[index + 1]}")
    return clean_query, terms, ngrams


def _score_text(base_score, text, clean_query, terms):
    normalized = text.lower()
    term_matches = sum(1 for term in terms if term in normalized)
    phrase_match = bool(clean_query and clean_query in normalized)
    definition_match = "stand for" in clean_query and "stands for" in normalized
    if not term_matches and not phrase_match:
        return None
    return base_score + term_matches * 10 + (25 if phrase_match else 0) + (35 if definition_match else 0)


class SingleFileTAHQuery:
    """Minimal reader for single-file TAH! cartridges forged by TAHBuilder."""

    def __init__(self, path):
        self.path = Path(path)
        self.buffer = self.path.read_bytes()
        if len(self.buffer) < 64:
            raise ValueError(f"Invalid TAH cartridge: {self.path.name}")

        magic = int.from_bytes(self.buffer[0:4], "little")
        if magic != TAH_MAGIC:
            raise ValueError(f"Unexpected TAH magic: {hex(magic)}")

        self.k = self.buffer[6]
        self.m = int.from_bytes(self.buffer[8:16], "little")
        self.shard_count = int.from_bytes(self.buffer[16:20], "little")
        self.bloom_offset = 64
        self.bloom_size = math.ceil(self.m / 8)
        self.index_offset = self.bloom_offset + self.bloom_size
        self.global_bloom = self.buffer[self.bloom_offset:self.index_offset]

    def contains_keyword(self, keyword):
        for idx in get_memoria_indices(keyword, self.m, self.k):
            if not (self.global_bloom[idx // 8] & (1 << (idx % 8))):
                return False
        return True

    def _shard(self, index):
        entry_offset = self.index_offset + index * 80
        if entry_offset + 80 > len(self.buffer):
            return None

        offset = int.from_bytes(self.buffer[entry_offset + 8:entry_offset + 16], "little")
        length = int.from_bytes(self.buffer[entry_offset + 16:entry_offset + 20], "little")
        kw_hash = int.from_bytes(self.buffer[entry_offset + 24:entry_offset + 32], "little")
        data = _clean_text(self.buffer[offset:offset + length].split(b"\0", 1)[0].decode("utf-8", errors="ignore"))
        return {"data": data, "kw_hash": kw_hash}

    def get_matches(self, query_text, top_n=3):
        clean_query, terms, ngrams = _query_terms(query_text)
        candidate_terms = [clean_query] + ngrams
        scores = {}

        for term in candidate_terms:
            if not term or not self.contains_keyword(term):
                continue

            term_hash = city_hash64(normalize(term))
            for index in range(self.shard_count):
                shard = self._shard(index)
                if not shard:
                    continue
                if shard["kw_hash"] == term_hash or term in shard["data"].lower():
                    score = _score_text(1.0, shard["data"], clean_query, terms)
                    if score is not None:
                        scores[index] = max(scores.get(index, 0), score)

        results = []
        for index, score in sorted(scores.items(), key=lambda item: item[1], reverse=True)[:top_n]:
            shard = self._shard(index)
            if shard:
                results.append((score, shard["data"]))
        return results


def _search_hat(path, query_terms, top_n):
    try:
        q = MemoriaQuery(path)
        clean_query, terms, _ = _query_terms(query_terms)
        matches = []
        for score, data in q.get_matches(query_terms, top_n=top_n * 4):
            data = _clean_text(data)
            adjusted_score = _score_text(score, data, clean_query, terms)
            if adjusted_score is not None:
                matches.append((adjusted_score, path.name, data))
        q.close()
        return matches[:top_n]
    except Exception:
        return []


def _search_tah(path, query_terms, top_n):
    try:
        q = SingleFileTAHQuery(path)
        return [(score, path.name, data) for score, data in q.get_matches(query_terms, top_n=top_n)]
    except Exception:
        return []


def pulse_search(query_terms, limit=10, print_results=False):
    cartridges = []
    for directory in _cartridge_dirs():
        cartridges.extend(directory.glob("*.hat"))
        cartridges.extend(directory.glob("*.tah"))

    results = []

    def search_path(path):
        if path.suffix == ".hat":
            paired_tah = Path(str(path)[:-8] + ".tah.tah") if str(path).endswith(".tah.hat") else path.with_suffix(".tah")
            if not paired_tah.exists():
                return []
            return _search_hat(path, query_terms, min(limit, 5))
        return _search_tah(path, query_terms, min(limit, 5))

    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(search_path, path) for path in cartridges]
        for future in futures:
            results.extend(future.result())

    results.sort(key=lambda item: item[0], reverse=True)
    structured = [
        {"score": score, "source": source, "text": _clean_text(text)}
        for score, source, text in results[:limit]
    ]

    if print_results:
        print_pulse_results(query_terms, structured)

    return structured


def print_pulse_results(query_terms, results):
    if not results:
        _safe_print("No matches found in tactical library.")
        return

    _safe_print(f"--- PULSE SEARCH RESULTS for '{query_terms}' ---")
    for result in results:
        _safe_print(f"\n[SOURCE: {result['source']}] [SCORE: {result['score']:.2f}]")
        _safe_print(result["text"])
        _safe_print("-" * 20)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Query SunsetPulse TAH/HAT cartridges.")
    parser.add_argument("query", nargs="+", help="Query terms to search for.")
    parser.add_argument("--limit", type=int, default=10, help="Maximum result count.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args()

    query = " ".join(args.query)
    matches = pulse_search(query, limit=args.limit, print_results=not args.json)
    if args.json:
        _safe_print(json.dumps(matches, ensure_ascii=False, indent=2))
