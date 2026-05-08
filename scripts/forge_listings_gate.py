import os
import json
import sys

# Add SunsetWars to path
WARS_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../SunsetWars"))
sys.path.append(WARS_ROOT)
sys.path.append(os.path.join(WARS_ROOT, "builder"))

from builder.tah_builder import TAHBuilder

def forge_gate():
    print("🚀 [GATE_FORGE] Generating Listing Gate from properties.json...")
    
    properties_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../properties.json"))
    if not os.path.exists(properties_path):
        print(f"❌ Error: {properties_path} not found.")
        return

    with open(properties_path, 'r') as f:
        properties = json.load(f)

    # We want a very low false positive rate for the gate
    builder = TAHBuilder(target_fp=0.0001, expected_elements=len(properties) * 2)
    
    count = 0
    for p in properties:
        mls_id = p.get('mls_id') or p.get('_id') or p.get('name')
        last_updated = p.get('last_updated', '2026-01-01T00:00:00Z')
        
        if mls_id:
            # The signature is MLS_ID + LastUpdated
            signature = f"{mls_id}|{last_updated}"
            builder._add_to_global_filter(signature)
            count += 1
            
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../cartridges"))
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, "listings_gate.tah")
    builder.save(output_path)
    print(f"✅ [GATE_FORGE] Successfully indexed {count} listings into {output_path}")

if __name__ == "__main__":
    forge_gate()
