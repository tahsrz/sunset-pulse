import os
import json
from datetime import datetime

# Path for spatial dream memory (GeoJSON format for easy map integration)
SPATIAL_DREAMS_PATH = "utils/jamie/memory/spatial_dreams.json"
SCRAPED_INTEL_PATH = "utils/jamie/memory/scraped_intelligence.json"

class DreamBridge:
    @staticmethod
    def process_scraped_to_dreams():
        """Converts raw scraped intelligence into Spatial Dreams."""
        if not os.path.exists(SCRAPED_INTEL_PATH):
            return "No scraped intelligence found."

        with open(SCRAPED_INTEL_PATH, "r") as f:
            intel_entries = json.load(f)

        dreams = []
        if os.path.exists(SPATIAL_DREAMS_PATH):
            with open(SPATIAL_DREAMS_PATH, "r") as f:
                dreams = json.load(f)

        # LittleBigPlanet Loop
        new_dreams_count = 0
        for entry in intel_entries:
            payload = entry.get("payload", [])
            for item in payload:
                # Create a Dream object with spatial properties
                dream = {
                    "id": f"dream_{datetime.now().timestamp()}_{new_dreams_count}",
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": item.get("coords", [0, 0])
                    },
                    "properties": {
                        "title": f"Jamie's Insight: {item.get('name')}",
                        "description": item.get("notes"),
                        "category": item.get("category"),
                        "intelligence_score": item.get("intelligence_score"),
                        "source": "Yellowbooks_Scrape_Dream",
                        "timestamp": entry.get("timestamp")
                    }
                }
                dreams.append(dream)
                new_dreams_count += 1

        with open(SPATIAL_DREAMS_PATH, "w") as f:
            json.dump(dreams, f, indent=2)

        # Clear scraped intel after processing it's now a 'dream in theWay
        os.remove(SCRAPED_INTEL_PATH)
        return f"Bridge Complete: {new_dreams_count} insights converted to Spatial Dreams"

if __name__ == "__main__":
    print(DreamBridge.process_scraped_to_dreams())
