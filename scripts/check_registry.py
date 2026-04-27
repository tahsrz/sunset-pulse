import os
import httpx

# Manual env loading fallback
def load_env_manual(path):
    if not os.path.exists(path):
        return
    with open(path, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, value = line.strip().split("=", 1)
                os.environ[key] = value

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
env_path = os.path.join(PROJECT_ROOT, ".env.local")
load_env_manual(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def check_registry():
    url = f"{SUPABASE_URL}/rest/v1/scythe_registry?select=*"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    
    try:
        with httpx.Client() as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            print(f"Total entries in Scythe Registry: {len(data)}")
            for idx, entry in enumerate(data[:5]):
                print(f"{idx+1}. Original: {entry['original']} -> Replacement: {entry['replacement']}")
    except Exception as e:
        print(f"Error checking registry: {e}")

if __name__ == "__main__":
    check_registry()
