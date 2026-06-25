import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert a local document to Markdown using microsoft/markitdown."
    )
    parser.add_argument("input", help="Local document path to convert.")
    parser.add_argument(
        "--use-plugins",
        action="store_true",
        help="Enable installed MarkItDown plugins. Keep off for ordinary local imports.",
    )
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    if not input_path.exists() or not input_path.is_file():
        print(f"Input file does not exist: {input_path}", file=sys.stderr)
        return 2

    try:
        from markitdown import MarkItDown
    except Exception as exc:
        print(
            "Missing Python package 'markitdown'. Install it with:\n"
            "  python -m pip install -r apps/pulse/requirements-markitdown.txt\n"
            f"Import error: {exc}",
            file=sys.stderr,
        )
        return 3

    try:
        converter = MarkItDown(enable_plugins=args.use_plugins)
        if hasattr(converter, "convert_local"):
            result = converter.convert_local(str(input_path))
        else:
            result = converter.convert(str(input_path))
    except Exception as exc:
        print(f"MarkItDown conversion failed: {exc}", file=sys.stderr)
        return 4

    payload = {
        "sourcePath": str(input_path),
        "textContent": getattr(result, "text_content", "") or "",
    }
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
