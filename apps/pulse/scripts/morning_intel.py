import os
import sys
import json
from datetime import datetime

# Add the bridges directory to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(PROJECT_ROOT, "lib/ai/bridges"))

from core import JamieCore
from jamie_theWay_bridge import call_theWay_ccr

def run_morning_intel():
    print(f"--- [MORNING INTEL] Initiating 6:00 AM Research Protocol ---")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    jamie = JamieCore()
    
    # Task prompt for the Morning Intel session
    morning_task = (
        "Perform a comprehensive morning intelligence scout for North Texas. "
        "Focus on: 1. Overnight zoning changes in Tarrant and Denton counties. "
        "2. New commercial permits in the Frisco/Prosper growth corridor. "
        "3. Real estate sentiment shifts from local business news. "
        "Identify at least 3 critical anomalies for the spatial dashboard."
    )
    
    print("Triggering theWay Council for deep synthesis...")
    # This will fetch live news and trigger the 3-stage agent chain
    raw_output = call_theWay_ccr(morning_task)
    
    if "FAIL" in raw_output:
        print(f"Morning Intel Failed: {raw_output}")
        return

    print("Consolidating research and initiating teleport...")
    # This will process the reasoning chain and sync to Supabase
    result = jamie.initiate_ccr_teleport(raw_output)
    print(f"Final Result: {result}")

if __name__ == "__main__":
    run_morning_intel()
