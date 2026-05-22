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

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
env_path = os.path.join(PROJECT_ROOT, ".env.local")
load_env_manual(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

class SupabaseClient:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local")
        
        self.url = SUPABASE_URL
        self.key = SUPABASE_SERVICE_ROLE_KEY
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

    def upsert_daily_briefing(self, data):
        """Upserts a daily briefing to the daily_briefings table."""
        if not self.url: return False
        
        endpoint = f"{self.url}/rest/v1/daily_briefings"
        try:
            with httpx.Client() as client:
                response = client.post(endpoint, json=data, headers=self.headers)
                response.raise_for_status()
                print("Daily briefing successfully synced to Supabase.")
                return True
        except Exception as e:
            print(f"Error syncing daily briefing to Supabase: {e}")
            return False

    def insert_scythe_registry_entries(self, entries):
        """Inserts multiple entries into the scythe_registry table."""
        if not self.url or not entries: return False
        
        endpoint = f"{self.url}/rest/v1/scythe_registry"
        try:
            with httpx.Client() as client:
                response = client.post(endpoint, json=entries, headers=self.headers)
                response.raise_for_status()
                print(f"Synced {len(entries)} entries to Ozriel's Scythe Registry in Supabase.")
                return True
        except Exception as e:
            print(f"Error syncing scythe registry to Supabase: {e}")
            return False
