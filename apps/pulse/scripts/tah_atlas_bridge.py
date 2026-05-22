from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
from typing import List, Dict, Any
from pathlib import Path

# Add Memoria builder dir to path
MEMORIA_BUILDER_DIR = Path("C:/Users/Taz/SunsetWars/workbench/sync/sunset_wars/builder")
sys.path.append(str(MEMORIA_BUILDER_DIR))

try:
    from memoria_query import MemoriaQuery, TAG_TEXT, TAG_COORD
    from cityhash import city_hash64, normalize
except ImportError:
    print(f"Error: Could not import Memoria modules from {MEMORIA_BUILDER_DIR}")
    # Fallback/Mock
    class MemoriaQuery:
        def __init__(self, p): pass
        def close(self): pass
    def city_hash64(x): return 0
    def normalize(x): return b""

app = FastAPI(title="Memoria Atlas Bridge", version="3.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CARTRIDGE_DIR = Path("C:/Users/Taz/SunsetWars/cartridges")

@app.get("/cartridges")
def list_cartridges():
    """Lists all available Memoria vaults via their .hat files."""
    if not CARTRIDGE_DIR.exists():
        return []
    # In v3.5, the .hat file is the entry point
    return [f.name for f in CARTRIDGE_DIR.glob("*.hat")]

@app.get("/pulse")
def global_pulse(query: str):
    """
    Global Memoria Pulse: Scans .hat files only (Lightweight O(1)).
    """
    results = []
    if not CARTRIDGE_DIR.exists(): return []
    
    terms = [t.lower().strip() for t in query.split() if len(t) > 2]
    
    for hat_path in CARTRIDGE_DIR.glob("*.hat"):
        try:
            # Query engine automatically finds the .tah handshake
            q = MemoriaQuery(str(hat_path))
            hit = any(q.contains_keyword(term) for term in terms)
            if hit:
                # Top matches from .tah
                matches = q.get_matches(query, top_n=3)
                results.append({
                    "cartridge": hat_path.name,
                    "matches": matches,
                    "score": len(matches)
                })
            q.close()
        except Exception as e:
            print(f"Pulse error in {hat_path.name}: {e}")
            continue
    return sorted(results, key=lambda x: x['score'], reverse=True)

@app.get("/cartridge/{name}/search/entry")
def search_entry(name: str, query: str):
    """Deterministic lookup using .hat index."""
    path = CARTRIDGE_DIR / name
    if not path.exists(): raise HTTPException(status_code=404)
    
    target_hash = city_hash64(normalize(query)) & 0xFFFFFFFF
    
    try:
        q = MemoriaQuery(str(path))
        import struct
        for i in range(q.shard_count):
            q.hat_file.seek(q.index_offset + (i * 80) + 20)
            meta_bytes = q.hat_file.read(4)
            if not meta_bytes: break
            meta = struct.unpack('<I', meta_bytes)[0]
            if meta == target_hash:
                q.hat_file.seek(q.index_offset + (i * 80) + 8)
                offset, length = struct.unpack('<Q I', q.hat_file.read(12))
                q._open_tah()
                q.tah_file.seek(offset)
                data = q.tah_file.read(length).decode('utf-8', errors='ignore')
                q.close()
                return {"id": i, "content": data, "match": True, "hash": hex(target_hash)}
        q.close()
        return {"match": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cartridge/{name}/ask")
def ask_vault(name: str, query: str):
    path = CARTRIDGE_DIR / name
    if not path.exists(): raise HTTPException(status_code=404)
    try:
        q = MemoriaQuery(str(path))
        matches = q.get_matches(query, top_n=5)
        q.close()
        return {"query": query, "context": matches, "status": "synchronized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cartridge/{name}/map")
def get_cartridge_map(name: str):
    path = CARTRIDGE_DIR / name
    if not path.exists(): raise HTTPException(status_code=404)
    
    try:
        q = MemoriaQuery(str(path))
        nodes = []
        links = []
        
        q._open_tah() # We need data for snippets
        for i in range(q.shard_count):
            import struct
            q.hat_file.seek(q.index_offset + (i * 80))
            entry_data = q.hat_file.read(80)
            tag = entry_data[0]
            offset, length, meta = struct.unpack('<Q I I', entry_data[8:24])
            
            q.tah_file.seek(offset)
            raw_shard_data = q.tah_file.read(length)
            
            try:
                null_pos = raw_shard_data.index(b'\x00')
                text_part = raw_shard_data[:null_pos].decode('utf-8', errors='ignore')
                footer = raw_shard_data[null_pos+1:]
                link_count = footer[0]
                hard_links = struct.unpack(f'<{link_count}I', footer[1:1 + link_count*4])
            except:
                text_part = raw_shard_data.decode('utf-8', errors='ignore')
                hard_links = []

            is_wiki = "[MEMORIA:" in text_part or (meta != 0 and meta != 0x70C)
            is_toc = meta == 0x70C
            
            nodes.append({
                "id": i,
                "type": "wiki" if is_wiki else ("toc" if is_toc else ("text" if tag == 0 else "coord")),
                "label": text_part[:50] + "...",
                "full_text": text_part,
                "meta": hex(meta),
                "val": 15 if is_wiki else (20 if is_toc else 10),
                "bits": entry_data[24:80].hex(),
                "coords": struct.unpack('<ff', entry_data[24:32]) if tag == 1 else None,
                "keywords": [w for w in re.sub(r'[^\w\s]', '', text_part.lower()).split() if len(w) > 4][:5],
                "hard_links": [hex(h) for h in hard_links]
            })
            
        for i in range(q.shard_count):
            if i > 0:
                links.append({"source": i-1, "target": i, "value": 1})
                q.hat_file.seek(q.index_offset + (i * 80) + 20)
                m = struct.unpack('<I', q.hat_file.read(4))[0]
                if m != 0 and m != 0x70C:
                    links.append({"source": 0, "target": i, "value": 2})
        
        q.close()
        return {"nodes": nodes, "links": links}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
