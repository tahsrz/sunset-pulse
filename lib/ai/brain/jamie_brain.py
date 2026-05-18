import sys
import os
from pathlib import Path

# Add current directory to path for imports
sys.path.append(os.path.dirname(__file__))
from pulse_query import pulse_search

def jamie_answer(question):
    print(f"\n[Jamie Thinking] Querying Production Intelligence...")
    
    # SunsetPulse cartridge structure
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    cartridges_dir = base_dir / "cartridges"
    
    # We'll also look in a 'tahs' folder if it exists (some projects use 'tahs')
    tahs_dir = base_dir / "tahs"
    
    results = []
    
    # Capture stdout from pulse_search because the original script prints directly
    import io
    from contextlib import redirect_stdout
    
    f = io.StringIO()
    with redirect_stdout(f):
        pulse_search(question)
    
    output = f.getvalue()
    
    if "No matches found" in output or not output.strip():
        return "I couldn't find a surgical match in my production cartridges. Please check the SunsetWars swarm status."
    
    return output

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python jamie_brain.py '<question>'")
    else:
        print(jamie_answer(" ".join(sys.argv[1:])))
