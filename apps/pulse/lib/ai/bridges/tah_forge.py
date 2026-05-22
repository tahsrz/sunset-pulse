import os
import json
import struct
import zlib
from datetime import datetime

# Binary TAH Constants (v3.0)
MAGIC = 0x54414821
VERSION = 0x0300
DEFAULT_K = 14
DEFAULT_M = 38400  # 4.8KB Bloom Filter

class TAHForge:
    """Nightly Binary Cartridge Compiler for Sunset Pulse."""
    
    @staticmethod
    def cityhash64_sim(data: bytes) -> int:
        """Simulate 64-bit hash for parity with TS implementation."""
        # TS uses: const h1 = cityHash64(data);
        # Simulation uses CRC32 for now
        return zlib.crc32(data) & 0xFFFFFFFF 

    @staticmethod
    def compile_cartridge(verified_facts: list, output_path: str):
        print(f"[FORGE] Compiling {len(verified_facts)} facts into {output_path}...")
        
        m = DEFAULT_M
        k = DEFAULT_K
        bloom = bytearray(m // 8)
        
        # 1. Build Bloom Filter
        for fact in verified_facts:
            text = fact.lower().strip().encode('utf-8')
            h1 = TAHForge.cityhash64_sim(text)
            h2 = TAHForge.cityhash64_sim(text + b"TAH_SALT")
            
            for i in range(k):
                idx = (h1 + i * h2) % m
                bloom[idx // 8] |= (1 << (idx % 8))

        # 2. Prepare Data Blocks
        data_blocks = []
        shard_entries = []
        
        # Absolute File Offsets:
        # 0-63: Header
        # 64-4863: Bloom
        # 4864-X: Index (each entry 80 bytes)
        # X-End: Data
        
        index_start = 64 + len(bloom)
        data_start = index_start + (len(verified_facts) * 80)
        current_data_ptr = data_start
        
        for fact in verified_facts:
            fact_data = fact.encode('utf-8') + b"\x00"
            length = len(fact_data)
            
            # Shard Entry (80 bytes)
            # struct.pack format:
            # <  : little-endian
            # B  : type (1 byte)
            # 7s : padding (7 bytes)
            # Q  : offset (8 bytes)
            # I  : length (4 bytes)
            # I  : meta (4 bytes)
            # 56s: specialized index (56 bytes)
            
            entry = struct.pack("<B 7s Q I I 56s", 
                0, b"", current_data_ptr, length, len(fact.split()), b"")
            
            shard_entries.append(entry)
            data_blocks.append(fact_data)
            current_data_ptr += length

        # 3. Write Binary File
        with open(output_path, "wb") as f:
            # Header (64 bytes)
            # <  : little-endian
            # I  : magic (4 bytes)
            # H  : version (2 bytes)
            # B  : k (1 byte)
            # B  : default type (1 byte)
            # Q  : m (8 bytes)
            # I  : count (4 bytes)
            # I  : complexity (4 bytes)
            # 40s: reserved (40 bytes)
            
            header = struct.pack("<I H B B Q I I 40s",
                MAGIC, VERSION, k, 0, m, len(verified_facts), 10, b"")
            f.write(header)
            f.write(bloom)
            for entry in shard_entries:
                f.write(entry)
            for block in data_blocks:
                f.write(block)
                
        print(f"[FORGE] SUCCESS: {output_path} deployed (Size: {current_data_ptr} bytes).")

if __name__ == "__main__":
    # Ensure current directory for output if run directly
    TAHForge.compile_cartridge(["North Texas real estate is booming", "Foundation integrity is critical"], "test.tah")
