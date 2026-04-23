import os
import json
import requests
import time
from typing import Dict, Any, List

# --- Council of Agents ---
MODELS = {
    "RESEARCHER": "google/gemma-3-27b-it:free",
    "CRITIC": "meta-llama/llama-3.3-70b-instruct:free",
    "SYNTHESIZER": "qwen/qwen3-coder:free"
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
                        api_key = line.split("=")[-1].strip()
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
    
    payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}]
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            if response.status_code == 429:
                wait = (attempt + 1) * 5
                print(f"Rate limited for {role_title}. Retrying in {wait}s...")
                time.sleep(wait)
                continue
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            if attempt == max_retries - 1:
                return f"Error in {role_title} session: {str(e)}"
            time.sleep(2)
    return f"Error in {role_title} session: Maximum retries exceeded."

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

    # STAGE 1: RAW RESEARCH (Gemini)
    print("Stage 1: Raw Discovery (Researcher Agent)...")
    research_prompt = f"""
    ROLE: Lead Researcher.
    TASK: {task_prompt}
    
    LIVE MARKET CONTEXT (Current North Texas News):
    {news_context}

    MANDATE: 
    1. Conduct a simulated 15-minute deep-dive. 
    2. Identify all possible leads, market anomalies, and zoning shifts in North Texas.
    3. Analyze the LIVE MARKET CONTEXT provided above and correlate it with real estate opportunities.
    Be verbose. Explore every logical branch.
    """
    raw_research = _call_model(MODELS["RESEARCHER"], research_prompt, "Researcher")
    print("Discovery phase complete.")

    # STAGE 2: ADVERSARIAL CRITIQUE (Llama 3.3)
    print("Stage 2: Adversarial Review (Architect/Critic Agent)...")
    critique_prompt = f"""
    ROLE: Adversarial Critic / Lead Architect.
    INPUT DATA: {raw_research}
    MANDATE: Analyze the research above for logical fallacies, hallucinations, and market contradictions. 
    Challenge the assumptions. Refine the signal from the noise.
    """
    refined_critique = _call_model(MODELS["CRITIC"], critique_prompt, "Critic")
    print("Critique phase complete.")

    # STAGE 3: FINAL SYNTHESIS & TELEPORT (Qwen 3 Coder)
    print("Stage 3: Synthesis & Teleport Packaging (Synthesizer Agent)...")
    synthesis_prompt = f"""
    ROLE: Master Synthesizer.
    RESEARCH: {raw_research}
    CRITIQUE: {refined_critique}
    MANDATE: 
    1. Consolidate the verified facts into a 'Gold Truth' summary.
    2. CONSUME RAW NEWS: Convert the news headlines from RESEARCH into full-form "Pulse Articles."
    3. VISUAL SYNTHESIS: For each article, generate a 'visualizer_config' that our Visualizer Engine can use to render a 3D building or data plot.
    4. You MUST end with the sentinel {TELEPORT_SENTINEL} followed by a valid JSON payload.
    
    JSON REQUIREMENTS:
    {{
      "simulated_research_hours": 5,
      "spatial_updates": [{{"lat": float, "lng": float, "title": string, "intel": string}}],
      "lead_intelligence": [{{"email": string, "new_score": int, "rationale": string}}],
      "news_articles": [
        {{
          "title": string,
          "content": string,
          "source_link": string,
          "visualizer_config": {{
            "type": "GABLE_HOUSE" | "MODERN_OFFICE" | "INDUSTRIAL_HUB" | "DATA_PLOT",
            "seed": string,
            "color": string
          }},
          "spider_net_data": {{
            "nodes": [
              {{"id": string, "group": number, "radius": number (scaled by keyword frequency)}}
            ],
            "links": [
              {{"source": string, "target": string}}
            ]
          }}
        }}
      ],
      "consolidated_truth": string,
      "daily_joke": string,
      "ozriel_audit": {{
        "ai_patterns_detected": [string],
        "humanized_rewrites": [
          {{
            "original_fragment": string,
            "suggested_rewrite": string,
            "rationale": string
          }}
        ],
        "overall_tone_score": number (0-100, 100 being perfectly human)
      }}
    }}
    """
    final_output = _call_model(MODELS["SYNTHESIZER"], synthesis_prompt, "Synthesizer")
    print("Synthesis complete. theWay Chain Finished.")

    # Combine for the Deep Dream stage
    verbose_chain = f"""
    === RESEARCHER LOG ===
    {raw_research}
    
    === CRITIC LOG ===
    {refined_critique}
    
    === FINAL SYNTHESIS ===
    {final_output}
    """
    return final_output if TELEPORT_SENTINEL in final_output else f"FAIL: {verbose_chain}"

if __name__ == "__main__":
    import sys
    task = sys.argv[1] if len(sys.argv) > 1 else "Analyze North Texas Industrial Sprawl"
    result = call_theWay_ccr(task)
    print(result)
