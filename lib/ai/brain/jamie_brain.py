import sys
import os

# Add current directory to path for imports
sys.path.append(os.path.dirname(__file__))
from pulse_query import pulse_search, _safe_print

def jamie_answer(question):
    print(f"\n[Jamie Thinking] Querying Production Intelligence...")

    results = pulse_search(question, limit=5)

    if not results:
        return "I couldn't find a surgical match in my production cartridges. Please check the SunsetWars swarm status."

    lines = [f"--- PULSE SEARCH RESULTS for '{question}' ---"]
    for result in results:
        lines.append(f"\n[SOURCE: {result['source']}] [SCORE: {result['score']:.2f}]")
        lines.append(result["text"])
        lines.append("-" * 20)

    return "\n".join(lines)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        _safe_print("Usage: python jamie_brain.py '<question>'")
    else:
        _safe_print(jamie_answer(" ".join(sys.argv[1:])))
