from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import os

from tah_engine import get_tah_indices, MASK64

app = FastAPI(title="TAH Cartridge Marketplace API")

# --- Configuration ---
CARTRIDGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "cartridges"))

# --- Models ---
class IndexRequest(BaseModel):
    text: str
    m: int = 100000  # Default bitset size
    k: int = 7       # Default hash count

class IndexResponse(BaseModel):
    text: str
    indices: List[int]
    m: int
    k: int

# --- Endpoints ---

@app.get("/cartridges")
async def list_available_cartridges():
    """
    Returns a list of all active expertise cartridges in the vault.
    """
    if not os.path.exists(CARTRIDGE_DIR):
        return {"error": "Cartridge vault not found", "path": CARTRIDGE_DIR}
        
    files = [f.replace('.tah', '') for f in os.listdir(CARTRIDGE_DIR) if f.endswith('.tah')]
    return {"cartridges": files, "vault_status": "ONLINE"}

@app.post("/indices", response_model=IndexResponse)
async def generate_tah_indices(request: IndexRequest):
    """
    Deterministic Indexing Endpoint:
    Returns the exact bitset positions for a string. 
    B2B clients use this to check if a shard exists in a .tah file without downloading the whole asset.
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    indices = get_tah_indices(request.text, request.m, request.k)
    
    return {
        "text": request.text.strip(),
        "indices": indices,
        "m": request.m,
        "k": request.k
    }

@app.get("/download/{cartridge_id}")
async def download_cartridge(cartridge_id: str):
    """
    Marketplace Delivery: 
    Serves the binary .tah file (e.g., makiel_expertise or listings_gate).
    """
    file_path = os.path.join(CARTRIDGE_DIR, f"{cartridge_id}.tah")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Cartridge '{cartridge_id}' not found in vault.")
        
    return FileResponse(
        path=file_path, 
        filename=f"{cartridge_id}.tah",
        media_type='application/octet-stream'
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)