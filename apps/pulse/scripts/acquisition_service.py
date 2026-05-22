import os
import sys
import subprocess
import json
from datetime import datetime

def acquire_video(url, output_dir):
    """
    Downloads a video from a URL using yt-dlp.
    Optimized for short-form content/clips.
    """
    print(f"[*] Acquisition Started for: {url}")
    
    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    # yt-dlp command: MP4 only, best quality, no longer than 60s (to prevent downloading movies)
    # We use a template for the filename to keep it clean
    output_template = os.path.join(output_dir, "acquired_%(title).100s_%(id)s.%(ext)s")
    
    cmd = [
        "yt-dlp",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
        "--match-filter", "duration <= 300", # Limit to 5 mins
        "-o", output_template,
        "--no-playlist",
        "--merge-output-format", "mp4",
        url
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("[+] Download Successful")
        
        # Try to find the downloaded filename from stdout
        # yt-dlp usually prints: [download] Destination: ...
        for line in result.stdout.split('\n'):
            if "[download] Destination:" in line:
                return line.split("Destination: ")[1].strip()
            if "has already been downloaded" in line:
                return line.split(" ")[1].strip()
                
        return True
    except subprocess.CalledProcessError as e:
        print(f"[-] Download Failed: {e.stderr}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python acquisition_service.py <URL>")
        sys.exit(1)

    target_url = sys.argv[1]
    # Set output to the public/videos folder
    public_video_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/videos"))
    
    success = acquire_video(target_url, public_video_dir)
    if success:
        print(f"SUCCESS|{success}")
    else:
        print("FAILURE")
