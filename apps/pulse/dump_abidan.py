import struct
import math
import sys
import os
from pathlib import Path

def dump_cartridge(hat_path):
    with open(hat_path, 'rb') as f:
        header = f.read(64)
        magic, version, k, _, m, shard_count, avg_complexity = struct.unpack('<I H B B Q I I', header[:24])
        print(f"File: {hat_path}")
        print(f"Magic: {hex(magic)}")
        print(f"Shards: {shard_count}")

        bloom_size = math.ceil(m / 8)
        f.seek(64 + bloom_size)
        
        base = str(hat_path).replace('.hat', '').replace('.tah', '')
        if hat_path.name.endswith('.tah.hat'):
            tah_path = Path(base + '.tah') # Incorrect logic if it's .tah.tah
            # Correct logic:
            tah_path = hat_path.parent / (hat_path.name.replace('.hat', '.tah'))
        else:
            tah_path = Path(base + '.tah')

        if not tah_path.exists():
            print(f"ERROR: Tactical data NOT FOUND at {tah_path}")
            return

        with open(tah_path, 'rb') as tf:
            for i in range(shard_count):
                entry_data = f.read(24)
                tag, offset, length, meta = struct.unpack('<B 7x Q I I', entry_data)
                f.read(56) # skip spec
                
                tf.seek(offset)
                data = tf.read(length).decode('utf-8', errors='ignore')
                print(f"\n--- SHARD {i} ---")
                print(data[:200])

if __name__ == '__main__':
    dump_cartridge(Path('SunsetPulse/cartridges/abidan_vault.tah.hat'))
