import os
import json
import requests
import time
from typing import Dict, Any, List

# --- Council of Agents ---
MODELS = {
    "RESEARCHER": "google/gemma-3-27b-it:free",
    "CRITIC": "meta-llama/llama-3.3-70b-instruct:free",
    "SYNTHESIZER": "nousresearch/hermes-3-llama-3.1-405b:free"
}

TELEPORT_SENTINEL = "__ULTRAPLAN_TELEPORT_LOCAL__"

def _get_api_key():
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        env_path = os.path.join(os.path.dirname(__file__), "../../../.env.local")
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if "OPENROUTER_API_KEY" in line:
                        # Handle both singular and plural (API_KEYS)
                        val = line.split("=")[-1].strip()
                        # If multiple keys, take the first
                        api_key = val.split(",")[0].strip()
                        break
    return api_key

def _call_model(model_id: str, prompt: str, role_title: str) -> str:
    api_key = _get_api_key()
    if not api_key:
        return f"Error: API Key missing for {role_title}"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sunsetpulse.reza.com",
        "X-Title": f"Jamie theWay: {role_title}"
    }
    
    messages = [{"role": "user", "content": prompt}]
    
    # If the primary model fails or is rate limited, we try a faster fallback
    models_to_try = [model_id, "meta-llama/llama-3.1-8b-instruct:free"]
    
    for current_model in models_to_try:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json={"model": current_model, "messages": messages})
                if response.status_code == 429:
                    # Exponential backoff with jitter
                    wait = ((attempt + 1) * 7) + (attempt * 2)
                    print(f"Rate limited for {role_title} on {current_model}. Retrying in {wait}s...")
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                if attempt == max_retries - 1:
                    print(f"Failed {current_model} after {max_retries} attempts. Trying fallback if available.")
                    break
                time.sleep(3)
    
    return f"Error: All models in the chain failed for {role_title}."

def call_theWay_ccr(task_prompt: str) -> str:
    """Initiates the 30-minute Council-driven research session."""
    print(f"--- STARTING THEWAY RESEARCH SESSION (30-MIN SIMULATION) ---")
    
    # STAGE 0: LIVE NEWS SCOUTING
    print("Stage 0: Live News Scouting (North Texas)...")
    try:
        from news_scout import fetch_north_texas_news
        live_news = fetch_north_texas_news()
        news_context = "\n".join([f"- {n['title']}: {n['summary']}" for n in live_news])
    except Exception as e:
        print(f"News scouting failed, proceeding with baseline knowledge. Error: {e}")
        news_context = "No live news available."

    # STAGE 1: RAW RESEARCH
    print("Stage 1: Raw Discovery (Researcher Agent)...")
    research_prompt = f"""
    ROLE: Lead Researcher.
    TASK: {task_prompt}
    
    LIVE MARKET CONTEXT (Current North Texas News):
    {news_context}

    MANDATE: 
    1. Conduct a simulated 15-minute deep-dive. 
    Be verbose. Explore every logical branch.
    """
    raw_research = _call_model(MODELS["RESEARCHER"], research_prompt, "Researcher")
    print("Discovery phase complete.")

    # STAGE 2: ADVERSARIAL CRITIQUE
    print("Stage 2: Adversarial Review (Architect/Critic Agent)...")
    critique_prompt = f"""
    ROLE: Adversarial Critic / Lead Architect.
    INPUT DATA: {raw_research}
    MANDATE: Analyze the research above for logical fallacies. Challenge the assumptions.
    """
    refined_critique = _call_model(MODELS["CRITIC"], critique_prompt, "Critic")
    print("Critique phase complete.")

    # STAGE 3: FINAL SYNTHESIS & TELEPORT
    print("Stage 3: Synthesis & Teleport Packaging (Synthesizer Agent)...")
    
    json_requirements = """
    {
      "simulated_research_hours": 5,
      "spatial_updates": [{"lat": float, "lng": float, "title": string, "intel": string}],
      "lead_intelligence": [{"email": string, "new_score": int, "rationale": string}],
      "news_articles": [
        {
          "title": string,
          "content": string,
          "source_link": string,
          "geo_tag": {"lat": float, "lng": float, "label": string},
          "highlight_region": {
            "center": {"lat": float, "lng": float},
            "radius": number,
            "label": string
          },
          "visualizer_config": {
            "type": "GABLE_HOUSE" | "MODERN_OFFICE" | "INDUSTRIAL_HUB" | "DATA_PLOT",
            "seed": string,
            "color": string
          },
          "spider_net_data": {
            "nodes": [{"id": string, "group": number, "radius": number}],
            "links": [{"source": string, "target": string}]
          }
        }
      ],
      "consolidated_truth": string,
      "daily_joke": string,
      "ozriel_audit": {
        "ai_patterns_detected": [string],
        "humanized_rewrites": [{"original_fragment": string, "suggested_rewrite": string, "rationale": string}],
        "overall_tone_score": number
      }
    }
    """

    synthesis_prompt = f"""
    ROLE: Master Synthesizer.
    RESEARCH: {raw_research}
    CRITIQUE: {refined_critique}
    MANDATE: 
    1. Consolidate the verified facts into a 'Gold Truth' summary.
    2. CONSUME RAW NEWS: Convert the news headlines from RESEARCH into full-form "Pulse Articles."
    3. You MUST end with the sentinel {TELEPORT_SENTINEL} followed by a valid JSON payload.
    
    JSON REQUIREMENTS:
    {json_requirements}
    """
    final_output = _call_model(MODELS["SYNTHESIZER"], synthesis_prompt, "Synthesizer")
    print("Synthesis complete. theWay Chain Finished.")

    return final_output

if __name__ == "__main__":
    import sys
    task = sys.argv[1] if len(sys.argv) > 1 else "Analyze North Texas Industrial Sprawl"
    result = call_theWay_ccr(task)
    print(result)
