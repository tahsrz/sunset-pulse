import os
import json
from datetime import datetime
import sys

# Add the bridges directory to path so we can import our new client
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.append(os.path.join(PROJECT_ROOT, "lib/ai/bridges"))

from core import JamieCore, TELEPORT_SENTINEL

def test_supabase_persistence():
    print("--- Initiating Jamie Intelligence Persistence Test ---")
    jamie = JamieCore()
    
    # Mock payload simulating a 5-hour research sprint result
    mock_payload = {
        "simulated_research_hours": 5,
        "daily_joke": "Why did the AI get a real estate license? Because it wanted to optimize the search for 'Home.exe'.",
        "news_articles": [
            {
                "title": "Tarrant County Zoning Shift: Industrial to Residential",
                "summary": "Jamie detected a 12% shift in permit applications near the 121 corridor."
            }
        ],
        "consolidated_truth": "The market is shifting toward high-density suburban clusters.",
        "ozriel_audit": {
            "humanized_rewrites": [
                {
                    "original_fragment": "We should leverage market synergies.",
                    "suggested_rewrite": "We should see how these neighborhoods work together.",
                    "rationale": "Avoided corporate AI buzzword 'synergies'."
                },
                {
                    "original_fragment": "delving deep into the data",
                    "suggested_rewrite": "checking the numbers",
                    "rationale": "Replaced 'delve' (overused AI verb)."
                },
                {
                    "original_fragment": "Unlock the potential",
                    "suggested_rewrite": "Open up the possibilities",
                    "rationale": "Removed formulaic AI marketing speak."
                }
            ]
        }
    }
    
    # Wrap in the sentinel pattern expected by JamieCore
    test_chain = f"Testing reasoning...{TELEPORT_SENTINEL}{json.dumps(mock_payload)}"
    
    print("Injecting test teleport payload...")
    result = jamie.initiate_ccr_teleport(test_chain)
    print(f"Result: {result}")

if __name__ == "__main__":
    test_supabase_persistence()
