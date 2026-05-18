import struct
import math
import sys
import os
import re
from pathlib import Path

# Add current dir to path for imports
sys.path.append(os.path.dirname(__file__))
from cityhash import get_memoria_indices

# Memoria v3.1 Tags
TAG_TEXT = 0
TAG_COORD = 1

class MemoriaQuery:
    def __init__(self, base_path):
        # Allow passing either .hat, .tah or just the base name
        base_path = str(base_path)
        if base_path.endswith('.tah.hat'):
            self.base = base_path[:-8]
            self.hat_path = Path(base_path)
            self.tah_path = Path(f"{self.base}.tah.tah")
        elif base_path.endswith('.tah.tah'):
            self.base = base_path[:-8]
            self.hat_path = Path(f"{self.base}.tah.hat")
            self.tah_path = Path(base_path)
        else:
            self.base = base_path.replace('.hat', '').replace('.tah', '')
            self.hat_path = Path(f"{self.base}.hat")
            self.tah_path = Path(f"{self.base}.tah")
        
        if not self.hat_path.exists():
            raise FileNotFoundError(f"Header Atlas not found: {self.hat_path}")
        
        self.hat_file = open(self.hat_path, 'rb')
        self.tah_file = None # Lazy load tah only when reading shards
        self._load_metadata()

    def _load_metadata(self):
        # 1. Read Header from .hat (64 bytes)
        header = self.hat_file.read(64)
        magic, version, self.k, _, self.m, self.shard_count, self.avg_complexity = struct.unpack('<I H B B Q I I', header[:24])
        
        # Accept both TAH! and HAT! for robustness
        if magic not in [0x48415421, 0x54414821]:
            raise ValueError(f"Invalid Memoria Header: {hex(magic)}")

        # 2. Map Global Bloom
        bloom_size = math.ceil(self.m / 8)
        self.bloom_offset = 64
        self.index_offset = 64 + bloom_size
        
        self.hat_file.seek(self.bloom_offset)
        self.global_bloom = self.hat_file.read(bloom_size)

    def _open_tah(self):
        if not self.tah_file:
            if not self.tah_path.exists():
                raise FileNotFoundError(f"Tactical Data not found: {self.tah_path}")
            self.tah_file = open(self.tah_path, 'rb')

    def contains_keyword(self, keyword):
        indices = get_memoria_indices(keyword, self.m, self.k)
        for idx in indices:
            if not (self.global_bloom[idx // 8] & (1 << (idx % 8))):
                return False
        return True

    def get_matches(self, query_text, top_n=3):
        # Clean query text and split into terms
        clean_query = re.sub(r'[^\w\s]', '', query_text.lower())
        terms = [t.strip() for t in clean_query.split() if len(t) > 2]
        ngrams = terms[:]
        for i in range(len(terms)-1): ngrams.append(f"{terms[i]} {terms[i+1]}")
        
        scores = {}
        
        for term in ngrams:
            if not self.contains_keyword(term): continue
            
            local_indices = get_memoria_indices(term, 448, 4)
            self.hat_file.seek(self.index_offset)
            
            for i in range(self.shard_count):
                entry_data = self.hat_file.read(80)
                tag = entry_data[0]
                offset, length, meta = struct.unpack('<Q I I', entry_data[8:24])
                spec = entry_data[24:80]
                
                if tag == TAG_TEXT:
                    match = True
                    for idx in local_indices:
                        if not (spec[idx // 8] & (1 << (idx % 8))):
                            match = False
                            break
                    if match:
                        tf = 1.0
                        idf = math.log((self.shard_count + 1) / (1.0))
                        score = idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (meta / (self.avg_complexity or 1))))
                        if " " in term: score *= 2.0
                        scores[i] = scores.get(i, 0) + score
        
        sorted_indices = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[:top_n]
        results = []
        if sorted_indices:
            self._open_tah()
            for idx in sorted_indices:
                score = scores[idx]
                self.hat_file.seek(self.index_offset + (idx * 80))
                _, offset, length, _ = struct.unpack('<B 7x Q I I', self.hat_file.read(24))
                self.tah_file.seek(offset)
                data = self.tah_file.read(length).decode('utf-8', errors='ignore')
                results.append((score, data))
        return results

    def close(self):
        self.hat_file.close()
        if self.tah_file: self.tah_file.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python builder/memoria_query.py <cartridge> <query>")
        sys.exit(1)
        
    try:
        q = MemoriaQuery(sys.argv[1])
        matches = q.get_matches(" ".join(sys.argv[2:]))
        for m in matches:
            print(f"--- MATCH ---\n{m}\n")
        q.close()
    except Exception as e:
        print(f"Error: {e}")
