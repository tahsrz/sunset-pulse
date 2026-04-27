import os
import json
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime
import sys
import time

# Add local paths to import our existing bridges
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(PROJECT_ROOT, "lib/ai/bridges"))

from jamie_theWay_bridge import _call_model, MODELS

def harvest_kym_trending():
    print(f"[{datetime.now().isoformat()}] Starting KYM Harvest via RSS...")
    url = "https://knowyourmeme.com/memes.rss"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    
    try:
        response = httpx.get(url, headers=headers, follow_redirects=True)
        response.raise_for_status()
        
        root = ET.fromstring(response.text)
        memes = []
        
        # RSS structure: channel -> item -> title, link
        for item in root.findall('./channel/item')[:10]:
            title = item.find('title').text
            link = item.find('link').text
            memes.append({"title": title, "link": link})
            
        print(f"Found {len(memes)} fresh memes via RSS.")
        return memes
    except Exception as e:
        print(f"RSS Harvest failed: {e}")
        return []

def codify_meme(meme_data):
    """Uses the Synthesizer agent to turn a meme into Linguistic CSS."""
    print(f"Codifying: {meme_data['title']}...")
    
    prompt = f"""
    ROLE: Culture Architect.
    MEME: {meme_data['title']}
    URL: {meme_data['link']}
    
    TASK: Convert this meme into a 'Linguistic CSS' class for an agentic AI.
    
    OUTPUT JSON FORMAT:
    {{
        "vibe_id": "vibe-slug-name",
        "name": "Human Friendly Name",
        "structure": "The grammatical template (e.g., 'Level 1: {{A}} -> Level 2: {{B}}')",
        "logic": "The semantic rule of the joke",
        "prompt_injection": "Instructions for the LLM to adopt this style"
    }}
    """
    
    try:
        raw_json = _call_model(MODELS["SYNTHESIZER"], prompt, "Meme-Architect")
        # Extract JSON from potential markdown
        if "```json" in raw_json:
            raw_json = raw_json.split("```json")[1].split("```")[0].strip()
        return json.loads(raw_json)
    except Exception as e:
        print(f"Codification failed for {meme_data['title']}: {e}")
        return None

def update_registry(templates):
    registry_path = os.path.join(PROJECT_ROOT, "config/vibe_css.json")
    
    current_registry = {}
    if os.path.exists(registry_path):
        with open(registry_path, "r") as f:
            current_registry = json.load(f)
            
    for t in templates:
        if t:
            current_registry[t['vibe_id']] = t
            
    with open(registry_path, "w") as f:
        json.dump(current_registry, f, indent=2)
    print(f"Registry updated. {len(templates)} templates processed.")

if __name__ == "__main__":
    trending_memes = harvest_kym_trending()
    
    # Load current registry to avoid duplicates
    registry_path = os.path.join(PROJECT_ROOT, "config/vibe_css.json")
    current_registry = {}
    if os.path.exists(registry_path):
        with open(registry_path, "r") as f:
            current_registry = json.load(f)
            
    # Filter out memes we've already codified
    # We check if the title or name is already represented
    existing_names = [v.get("name", "").lower() for v in current_registry.values()]
    
    new_templates = []
    for m in trending_memes:
        if m['title'].lower() in existing_names:
            print(f"Skipping {m['title']} - already in registry.")
            continue
            
        try:
            template = codify_meme(m)
            if template and isinstance(template, dict) and "vibe_id" in template:
                new_templates.append(template)
                print(f"Successfully codified: {t['vibe_id']}")
            else:
                print(f"Skipping {m['title']} - invalid output.")
        except Exception as e:
            print(f"Hard error on {m['title']}: {e}")
            
        time.sleep(20) # 20s delay between memes to beat the 429s
        
    if new_templates:
        update_registry(new_templates)
    else:
        print("No new templates generated this cycle.")
