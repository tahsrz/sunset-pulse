import os
import struct
import math
from pymongo import MongoClient
from dotenv import load_dotenv

# Import TAH logic from the project
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'tahs'))
from tah_engine import get_tah_indices

def forge_listings_gate():
    # 1. Load Environment
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
    mongodb_uri = os.getenv('MONGODB_URI')
    
    if not mongodb_uri:
        print("Error: MONGODB_URI not found in .env.local")
        return

    print("📡 Connecting to SunsetCluster (DB: test)...")
    client = MongoClient(mongodb_uri)
    db = client['test'] # Specify 'test' as found in research
    properties_col = db['properties']

    # 2. Fetch Signatures (mls_id | updatedAt)
    print("🔍 Fetching listing signatures...")
    cursor = properties_col.find({'source': 'MLS'}, {'mls_id': 1, 'last_updated': 1, 'updatedAt': 1})
    signatures = []
    for doc in cursor:
        mls_id = doc.get('mls_id')
        last_updated = doc.get('last_updated') or doc.get('updatedAt')
        if mls_id and last_updated:
            # Ensure last_updated is a string for the signature
            if not isinstance(last_updated, str):
                last_updated = last_updated.isoformat()
            signatures.append(f"{mls_id}|{last_updated}")

    print(f"✅ Found {len(signatures)} listings.")

    # 3. Configure Bloom Filter
    # Aim for 0.0001 FP rate
    n = max(len(signatures), 1000) * 2 # Buffering for new listings
    target_fp = 0.0001
    m = math.ceil(-(n * math.log(target_fp)) / (math.log(2)**2))
    k = math.ceil((m / n) * math.log(2))
    m = math.ceil(m / 64) * 64 # Align to 64-bit boundaries
    
    print(f"🛠️ Forging TAH Gate (m={m}, k={k})...")
    bloom_filter = bytearray(m // 8)

    for sig in signatures:
        indices = get_tah_indices(sig, m, k)
        for idx in indices:
            byte_idx = idx // 8
            bit_idx = idx % 8
            bloom_filter[byte_idx] |= (1 << bit_idx)

    # 4. Save TAH File (Hybrid v3.0/v3.1)
    # Header (64 bytes): Magic, Version, k, Pad, m (uint64), ShardCount (uint32)
    magic = 0x54414821 # 'TAH!'
    shard_count = 0
    header = struct.pack('<I H B B Q I', magic, 0x0300, k, 0, m, shard_count)
    header = header.ljust(64, b'\x00')

    output_path = os.path.join(os.path.dirname(__file__), '..', 'cartridges', 'listings_gate.tah')
    with open(output_path, 'wb') as f:
        f.write(header)
        f.write(bloom_filter)

    print(f"🚀 Cartridge saved: {output_path} ({len(header) + len(bloom_filter)} bytes)")
    client.close()

if __name__ == "__main__":
    forge_listings_gate()
