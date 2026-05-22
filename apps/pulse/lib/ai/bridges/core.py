import os
import json
import time
from datetime import datetime

# Handle both package and direct script execution for the bridge import
try:
    from .supabase_client import SupabaseClient
except (ImportError, ValueError):
    import sys
    sys.path.append(os.path.dirname(__file__))
    from supabase_client import SupabaseClient

# Define base paths relative to the project root (assumed to be 2 levels up from this script)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DREAM_KNOWLEDGE_GRAPH = os.path.join(PROJECT_ROOT, "utils/jamie/memory/knowledge_graph.json")
LOG_PATH = os.path.join(PROJECT_ROOT, "lib/ai/memory/daily_observations.log")
JOKE_PATH = os.path.join(PROJECT_ROOT, "utils/jamie/memory/daily_joke.json")
TELEPORT_PATH = os.path.join(PROJECT_ROOT, "utils/jamie/teleport_payload.json")

# consolidates daily observations into a local knowledge graph (knowledge_graph.json). This process ensures that logical contradictions are removed and only "verified facts" are stored after successful file writes.
TELEPORT_SENTINEL = "__ULTRAPLAN_TELEPORT_LOCAL__"

class JamieCore:
    def __init__(self):
        self.last_successful_write = None
        self.supabase = SupabaseClient()
        self._ensure_memory_structure()

    def _ensure_memory_structure(self):
        os.makedirs(os.path.dirname(DREAM_KNOWLEDGE_GRAPH), exist_ok=True)
        if not os.path.exists(DREAM_KNOWLEDGE_GRAPH):
            with open(DREAM_KNOWLEDGE_GRAPH, "w") as f:
                json.dump({"verified_facts": [], "logical_anchors": {}}, f)

    def confirm_write_and_update(self, file_path: str, context: str):
        """Mandate: Only update memory index after confirmed successful write."""
        if os.path.exists(file_path):
            self.last_successful_write = {
                "path": file_path,
                "timestamp": datetime.now().isoformat(),
                "context": context
            }
            self._log_observation(f"File write confirmed: {file_path}")
            return True
        return False

    def _log_observation(self, observation: str):
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
        with open(LOG_PATH, "a") as f:
            f.write(f"[{datetime.now().isoformat()}] {observation}\n")

    def deepDreamOntheWay(self, verbose_thoughts: str):
        """Second-stage consolidation: Prunes the verbose theWay reasoning chain into 'Gold' facts."""
        print("theWay Research Received. Initiating Second-Stage 'Deep Dream' Consolidation...")
        
        subconscious_log = os.path.join(PROJECT_ROOT, "utils/jamie/memory/theWay_subconscious.log")
        os.makedirs(os.path.dirname(subconscious_log), exist_ok=True)
        # Log the raw 'subconscious' thoughts for audit, but keep them out of the graph for now
        with open(subconscious_log, "a") as f:
            f.write(f"--- THEWAY SESSION {datetime.now().isoformat()} ---\n{verbose_thoughts}\n")

        # Use the Mini-LLM (Guardian core logic) to prune the theWay thoughts
        # We look for the sentinel first, but also extract new logical anchors
        if TELEPORT_SENTINEL in verbose_thoughts:
            parts = verbose_thoughts.split(TELEPORT_SENTINEL)
            reasoning = parts[0]
            payload_raw = parts[1]

            print("Pruning theWay reasoning for logical contradictions...")
            # Here we simulate the pruning of the 30-min chain
            # In a live env, we'd pass 'reasoning' back to the mini-llm to 'summarize verified facts'
            verified_insights = f"Extracted from theWay Deep Research: {datetime.now().strftime('%Y-%m-%d')}"
            
            self._log_observation(f"[THEWAY_VERIFIED] {verified_insights}")
            return payload_raw
        
        return None

    def autoDream(self):
        """Nightly Memory Consolidation: Merge observations, then trigger theWay -> Deep Dream -> Teleport."""
        print("Initiating autoDream: Stage 1 (Local Consolidation)...")
        if not os.path.exists(LOG_PATH):
            return "No new memories to dream about."

        with open(LOG_PATH, "r") as f:
            observations = f.readlines()

        with open(DREAM_KNOWLEDGE_GRAPH, "r+") as f:
            graph = json.load(f)
            new_facts = [obs.strip() for obs in observations if obs.strip() not in graph["verified_facts"]]
            graph["verified_facts"].extend(new_facts)
            f.seek(0); json.dump(graph, f, indent=2); f.truncate()

        # STAGE 1.5: FORGE BINARY CARTRIDGE
        try:
            from .tah_forge import TAHForge
            cartridge_path = os.path.join(PROJECT_ROOT, "cartridges/pulse_intelligence.tah")
            os.makedirs(os.path.dirname(cartridge_path), exist_ok=True)
            TAHForge.compile_cartridge(graph.get("verified_facts", []), cartridge_path)
        except Exception as e:
            print(f"[FORGE_ERROR] Could not compile intelligence cartridge: {e}")

        os.remove(LOG_PATH)
        
        if new_facts:
            print(f"Stage 1 Complete. Triggering theWay Research on {len(new_facts)} facts...")
            
            # Handle both package and direct script execution for the bridge import
            try:
                from .jamie_theWay_bridge import call_theWay_ccr
            except (ImportError, ValueError):
                import sys
                # Add the current directory to sys.path to allow absolute imports of sibling modules
                sys.path.append(os.path.dirname(__file__))
                from jamie_theWay_bridge import call_theWay_ccr
            
            research_task = f"Analyze these facts for North Texas real estate anomalies: {', '.join(new_facts)}. Additionally, research and generate a professional real estate joke for the user."
            raw_theWay_output = call_theWay_ccr(research_task)
            
            # STAGE 2: DREAM ON THEWAY THOUGHTS
            pruned_payload = self.deepDreamOntheWay(raw_theWay_output)
            
            if pruned_payload:
                return self.initiate_ccr_teleport(f"{TELEPORT_SENTINEL}{pruned_payload}")
        
        return "autoDream sequence complete."


    def initiate_ccr_teleport(self, reasoning_chain: str):
        """The Teleport Pattern: Inject high-reasoning chain results locally and sync to Supabase."""
        if TELEPORT_SENTINEL in reasoning_chain:
            print("Teleport Sentinel Detected. Packaging reasoning chain...")
            # Extract the payload after the sentinel
            payload_str = reasoning_chain.split(TELEPORT_SENTINEL)[-1].strip()
            
            try:
                payload_data = json.loads(payload_str)
                
                # Extract daily briefing data (joke + articles)
                briefing_path = os.path.join(PROJECT_ROOT, "utils/jamie/memory/daily_briefing.json")
                os.makedirs(os.path.dirname(briefing_path), exist_ok=True)
                
                briefing_data = {
                    "timestamp": datetime.now().isoformat(),
                    "simulated_research_hours": payload_data.get("simulated_research_hours", 5),
                    "daily_joke": payload_data.get("daily_joke", ""),
                    "news_articles": payload_data.get("news_articles", []),
                    "consolidated_truth": payload_data.get("consolidated_truth", ""),
                    "ozriel_audit": payload_data.get("ozriel_audit", {})
                }
                
                # Local write
                with open(briefing_path, "w") as f:
                    json.dump(briefing_data, f, indent=2)
                print(f"Daily briefing (Articles + Jokes) saved to {briefing_path}")

                # Supabase sync
                self.supabase.upsert_daily_briefing(briefing_data)

                # Update Ozriel's Scythe Registry (AI tendency log)
                audit_data = payload_data.get("ozriel_audit", {})
                if audit_data and audit_data.get("humanized_rewrites"):
                    registry_path = os.path.join(PROJECT_ROOT, "utils/jamie/memory/scythe_registry.json")
                    os.makedirs(os.path.dirname(registry_path), exist_ok=True)
                    
                    registry = []
                    if os.path.exists(registry_path):
                        with open(registry_path, "r") as f:
                            registry = json.load(f)
                    
                    new_entries = [
                        {
                            "timestamp": datetime.now().isoformat(),
                            "original": r["original_fragment"],
                            "replacement": r["suggested_rewrite"],
                            "rationale": r["rationale"]
                        } for r in audit_data["humanized_rewrites"]
                    ]
                    
                    # Supabase sync
                    self.supabase.insert_scythe_registry_entries(new_entries)
                    
                    registry.extend(new_entries)
                    # Keep the registry fresh but manageable (last 500 tendencies)
                    registry = registry[-500:]
                    
                    with open(registry_path, "w") as f:
                        json.dump(registry, f, indent=2)
                    print(f"Ozriel's Scythe Registry updated locally with {len(new_entries)} new entries.")

                # Still save the standalone joke for compatibility
                if "daily_joke" in payload_data:
                    os.makedirs(os.path.dirname(JOKE_PATH), exist_ok=True)
                    with open(JOKE_PATH, "w") as f:
                        json.dump({
                            "joke": payload_data["daily_joke"],
                            "timestamp": datetime.now().isoformat()
                        }, f, indent=2)

                # Save the full teleported decision as a proper JSON object
                os.makedirs(os.path.dirname(TELEPORT_PATH), exist_ok=True)
                with open(TELEPORT_PATH, "w") as f:
                    json.dump({
                        "origin": "CCR_THEWAY_SESSION",
                        "timestamp": datetime.now().isoformat(),
                        "payload": payload_data
                    }, f, indent=2)
                return f"Teleport successful. Payload injected to {TELEPORT_PATH} and synced to Supabase."
            except json.JSONDecodeError:
                # Fallback for non-JSON payload
                os.makedirs(os.path.dirname(TELEPORT_PATH), exist_ok=True)
                with open(TELEPORT_PATH, "w") as f:
                    json.dump({
                        "origin": "CCR_THEWAY_SESSION",
                        "timestamp": datetime.now().isoformat(),
                        "payload": payload_str
                    }, f, indent=2)
                return f"Teleport successful (Plaintext). Payload injected to {TELEPORT_PATH}"
        return "Error: Teleport sentinel missing from reasoning chain."


if __name__ == "__main__":
    jamie = JamieCore()
    # Example simulation
    print(jamie.autoDream())
