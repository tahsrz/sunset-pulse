from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import os

from tah_engine import get_tah_indices, MASK64

app = FastAPI(title="TAH Cartridge Marketplace API")

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

@app.post("/indices", response_model=IndexResponse)
async def generate_tah_indices(request: IndexRequest):
    """
    Deterministic Indexing Endpoint:
    Returns the exact bitset positions for a string. 
    B2B clients use this to check if a shard exists in a .tah file.
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
    Serves the binary .tah file (e.g., abidan_court.tah or sunset_pulse.tah).
    """
    file_path = f"cartridges/{cartridge_id}.tah"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Cartridge not found")
        
    return FileResponse(
        path=file_path, 
        filename=f"{cartridge_id}.tah",
        media_type='application/octet-stream'
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)