import os
import sys
import json
import subprocess
import pyttsx3
from datetime import datetime

def generate_tts(text, voice_name, output_path):
    print(f"[*] Generating TTS for Persona: {voice_name}")
    engine = pyttsx3.init()
    
    # Try to find a voice that matches our desired vibe
    voices = engine.getProperty('voices')
    selected_voice = voices[0]
    
    # Persona Mapping
    if voice_name == 'Spike':
        # US Male, Faster
        for v in voices:
            if "male" in v.name.lower() and ("us" in v.id.lower() or "united states" in v.name.lower()):
                selected_voice = v
                break
        engine.setProperty('rate', 190)
    elif voice_name == 'Ghost':
        # Female, Slower, Ethereal
        for v in voices:
            if "female" in v.name.lower():
                selected_voice = v
                break
        engine.setProperty('rate', 130)
    elif voice_name == 'Jamie':
        # UK Male, Tactical
        for v in voices:
            if "male" in v.name.lower() and ("uk" in v.id.lower() or "united kingdom" in v.name.lower()):
                selected_voice = v
                break
        engine.setProperty('rate', 160)
    else:
        # Cloned or Custom Voice Fallback
        print(f"[!] Custom/Cloned voice detected: {voice_name}. Using high-fidelity fallback.")
        for v in voices:
            if "male" in v.name.lower():
                selected_voice = v
                break
        engine.setProperty('rate', 155)
            
    engine.setProperty('voice', selected_voice.id)
    engine.setProperty('volume', 1.0)
    
    engine.save_to_file(text, output_path)
    engine.runAndWait()
    return output_path

def render_video(recipe):
    print("[*] Starting Render Engine v1.0...")
    
    # Paths
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    public_dir = os.path.join(project_root, "public")
    temp_dir = os.path.join(project_root, "temp_render")
    os.makedirs(temp_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"production_{timestamp}.mp4"
    output_path = os.path.join(project_root, "exports", "productions", output_filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # 1. Prepare Inputs
    bg_video = os.path.join(public_dir, recipe['targetScene'].lstrip('/'))
    bg_music = os.path.join(public_dir, recipe['audioConfig']['backgroundTrack'].lstrip('/'))
    
    has_subject = recipe.get('extractedEntity') is not None
    subject_video = None
    if has_subject:
        subject_video = os.path.join(public_dir, recipe['extractedEntity']['visual']['assetPath'].lstrip('/'))
    
    # 2. Generate Voice-over
    voice_path = os.path.join(temp_dir, f"voice_{timestamp}.mp3")
    generate_tts(recipe['script'], recipe['voice'], voice_path)

    # 3. Build FFmpeg Command
    # Transform params
    tx = recipe['transform']['x'] # %
    ty = recipe['transform']['y'] # %
    scale = recipe['transform']['scale']
    radius = recipe['transform']['maskRadius'] / 100.0 # 0.0 to 1.0
    feather = recipe['transform']['maskFeather'] / 100.0
    brightness = (recipe['transform']['brightness'] - 100) / 100.0 # -1.0 to 1.0
    contrast = recipe['transform']['contrast'] / 100.0 # 0.0 to 10.0
    
    # Compositing params
    blend_mode = recipe['compositing']['blendMode']
    if blend_mode == 'normal': blend_mode = 'overlay' # FFmpeg 'overlay' filter is what we want for placement
    
    # Vibe Filters
    vibe = recipe['compositing']['vibePreset']
    vibe_filter = ""
    if vibe == 'tactical':
        vibe_filter = ",colorbalance=rs=0.2:gs=0.3:bs=0.1,hue=s=0.8"
    elif vibe == 'noir':
        vibe_filter = ",hue=s=0,eq=contrast=1.5:brightness=-0.1"
    elif vibe == 'vapor':
        vibe_filter = ",hue=h=280:s=2"
    elif vibe == 'glitch':
        vibe_filter = ",noise=alls=20:allf=t+u,hue=s=5"

    # FFmpeg Complex Filter
    if has_subject:
        filter_complex = (
            f"[1:v]scale=iw*{scale}:-1,format=rgba,"
            f"geq=lum='lum(X,Y)':a='if(lte(sqrt(pow(X-W/2,2)+pow(Y-H/2,2)),W/2*{radius}),255,if(lte(sqrt(pow(X-W/2,2)+pow(Y-H/2,2)),W/2*({radius}+{feather})),255*(1-(sqrt(pow(X-W/2,2)+pow(Y-H/2,2))-W/2*{radius})/(W/2*{feather})),0))'"
            f"{vibe_filter}[subject];"
            f"[0:v][subject]overlay=x=(W-w)/2+W*{tx/100}:y=(H-h)/2+H*{ty/100}[outv];"
            f"[2:a]volume={recipe['audioConfig']['backgroundVolume']/100.0}[bgm];"
            f"[3:a]volume={recipe['audioConfig']['subjectVolume']/100.0}[vox];"
            f"[bgm][vox]amix=inputs=2:duration=first[outa]"
        )
        inputs = ["-i", bg_video, "-i", subject_video, "-i", bg_music, "-i", voice_path]
    else:
        # Voiceover only mode
        filter_complex = (
            f"[0:v]format=yuv420p{vibe_filter}[outv];"
            f"[1:a]volume={recipe['audioConfig']['backgroundVolume']/100.0}[bgm];"
            f"[2:a]volume={recipe['audioConfig']['subjectVolume']/100.0}[vox];"
            f"[bgm][vox]amix=inputs=2:duration=first[outa]"
        )
        inputs = ["-i", bg_video, "-i", bg_music, "-i", voice_path]

    # Text Overlay (optional, added to the end of outv)
    if recipe.get('script'):
        # Drawtext is picky about paths on Windows, we'll keep it simple
        # Escaping for drawtext: backslashes and colons need special handling
        clean_text = recipe['script'].replace("'", "").replace(":", "")
        filter_complex = filter_complex.replace("[outv]", "[v_pretext];")
        filter_complex += f"[v_pretext]drawtext=text='{clean_text}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-100:shadowcolor=black:shadowx=2:shadowy=2[outv]"

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "[outa]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_path
    ]

    try:
        print(f"[*] Executing FFmpeg...")
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"[+] Render Complete: {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"[-] FFmpeg Failed: {e.stderr.decode()}")
        return None
    finally:
        # Cleanup temp files
        if os.path.exists(voice_path):
            os.remove(voice_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python render_engine.py <RECIPE_JSON_PATH>")
        sys.exit(1)
        
    recipe_path = sys.argv[1]
    with open(recipe_path, 'r') as f:
        recipe_data = json.load(f)
        
    result = render_video(recipe_data)
    if result:
        print(f"SUCCESS|{result}")
    else:
        print("FAILURE")
