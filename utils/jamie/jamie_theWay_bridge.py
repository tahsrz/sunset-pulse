import os
import json
import requests
import time
from typing import Dict, Any, List

# --- Council of Agents ---
MODELS = {
    "RESEARCHER": "google/gemini-2.0-flash-exp:free",
    "CRITIC": "meta-llama/llama-3.3-70b-instruct:free",
    "SYNTHESIZER": "qwen/qwen3-coder:free"
}

TELEPORT_SENTINEL = "__ULTRAPLAN_TELEPORT_LOCAL__"

def _get_api_key():
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        env_path = os.path.join(os.path.dirname(__file__), "../../.env.local")
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

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Error in {role_title} session: {str(e)}"

def call_theWay_ccr(task_prompt: str) -> str:
    """Initiates the 30-minute Council-driven research session."""
    print(f"--- STARTING THEWAY RESEARCH SESSION (30-MIN SIMULATION) ---")
    
    # STAGE 1: RAW RESEARCH (Gemini)
    print("Stage 1: Raw Discovery (Researcher Agent)...")
    research_prompt = f"""
    ROLE: Lead Researcher.
    TASK: {task_prompt}
    MANDATE: Conduct a simulated 15-minute deep-dive. Identify all possible leads, market anomalies, and zoning shifts in North Texas.
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
    2. Generate the local file tree updates.
    3. You MUST end with the sentinel {TELEPORT_SENTINEL} followed by a valid JSON payload.
    
    JSON REQUIREMENTS:
    - "spatial_updates": [{{ "lat": float, "lng": float, "title": string, "intel": string }}]
    - "lead_intelligence": [{{ "email": string, "new_score": int, "rationale": string }}]
    - "consolidated_truth": string
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
