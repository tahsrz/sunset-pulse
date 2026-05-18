import os
import sys
from concurrent.futures import ThreadPoolExecutor

# Add builder to path for MemoriaQuery
sys.path.append(os.path.dirname(__file__))
from memoria_query import MemoriaQuery

def pulse_search(query_terms):
    # Fixed path for SunsetPulse: lib/ai/brain/pulse_query.py -> ../../../cartridges
    cartridge_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "cartridges"))
    if not os.path.exists(cartridge_dir):
        print(f"Error: Cartridges directory not found at {cartridge_dir}")
        return

    # Look for .hat files (Header Atlas) which are the entry points for Memoria Vaults
    vaults = [f for f in os.listdir(cartridge_dir) if f.endswith('.hat')]
    
    results = []
    
    def search_vault(filename):
        path = os.path.join(cartridge_dir, filename)
        try:
            q = MemoriaQuery(path)
            matches = q.get_matches(query_terms)
            q.close()
            # results are (score, data)
            return [(score, filename, data) for score, data in matches]
        except Exception as e:
            # print(f"Error searching {filename}: {e}")
            return []

    # Parallel search across all vaults
    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(search_vault, v) for v in vaults]
        for future in futures:
            results.extend(future.result())

    if not results:
        print("No matches found in tactical library.")
        return

    # Sort results by score (descending)
    results.sort(key=lambda x: x[0], reverse=True)

    # Print top results formatted for Agent ingestion
    print(f"--- PULSE SEARCH RESULTS for '{query_terms}' ---")
    for score, source, text in results[:5]: # Top 5 across all sources
        print(f"\n[SOURCE: {source}] [SCORE: {score:.2f}]")
        print(text)
        print("-" * 20)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pulse_query.py \"<query>\"")
        sys.exit(1)
    
    query = " ".join(sys.argv[1:])
    pulse_search(query)
