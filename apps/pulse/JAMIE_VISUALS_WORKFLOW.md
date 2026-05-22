# Jamie Visuals Workflow: Acquisition, Segmentation & Integration

This document outlines the "Life and Shape" pipeline for the Jamie AI Persona, bridging the **Rotoscope (ReRasterizer)** tool with the **Sunset Pulse** tactical interface.

## 1. Prerequisites
Ensure the following tools are available in your environment:
- **yt-dlp**: For high-quality video acquisition.
- **ffmpeg**: For frame extraction and asset conditioning.
- **SAM 2 Checkpoint**: Located at `Rotoscope/checkpoints/sam2.1_hiera_tiny.pt`.
- **Segmenter Runtime**: Python environment with `torch` and `sam2`.
- **Intelligence Spec**: Reference [JAMIE_INTELLIGENCE_SPEC.md](./JAMIE_INTELLIGENCE_SPEC.md) for cognitive integration.

---

## 2. Phase 1: Acquisition (YouTube to Local)
To download Jamie's base identity video, use the following tactical command:

```powershell
yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" -o "Rotoscope/assets/raw/jamie_base.mp4" "https://www.youtube.com/watch?v=5SNPAgwH-3o"
```

---

## 3. Phase 2: Intelligence Extraction (SAM 2 Segmentation)

### A. Start the Segmenter Service
The segmenter service must be running to process masks. It defaults to CPU mode for compatibility.

```powershell
cd Rotoscope
$env:SAM2_DEVICE="cpu"
.\segmenter\run_segmenter.ps1
```
*The service will be active at `http://127.0.0.1:8001`.*

### B. Trigger Segmentation
Send the raw video to the SAM 2 image predictor to establish Jamie's digital silhouette:

```powershell
curl.exe -X POST http://127.0.0.1:8001/segment `
  -F "project_id=jamie-evolution" `
  -F "title=Jamie Identity Prime" `
  -F "file=@Rotoscope/assets/raw/jamie_base.mp4"
```
*Expected Confidence: >90% for Jamie's profile.*

---

## 4. Phase 3: Integration (Sunset Pulse Deployment)

### A. Asset Deployment
Move the processed video to the Sunset Pulse public directory to make it accessible to the Next.js frontend:

```powershell
mkdir -p SunsetPulse/public/videos
cp Rotoscope/assets/raw/jamie_base.mp4 SunsetPulse/public/videos/jamie_base.mp4
```

### B. Component Wiring
The `TacticalCloth` component is the primary renderer for Jamie. It applies the following treatments:
- **Verlet Integration**: A physics-based cloth mesh reactive to mouse/touch.
- **Stylization**: Grayscale, high-contrast, and tactical green scanlines.

**Default Props for Jamie:**
```tsx
<TacticalCloth 
  id="JAMIE-01" 
  status="BROADCASTING" 
  moodColor="#3b82f6" 
  videoSrc="/videos/jamie_base.mp4" 
/>
```

---

## 5. Phase 5: Viral Mashups & Character Swaps (The Humor Loop)
The "Context Clash" is your most powerful viral tool. This involves placing high-intensity characters into mundane or "rough" real estate settings.

### A. The "Green Screen" Export
In the Rotoscope Studio, set the background to a solid `#00FF00` (Pure Green) to create a "Character Sticker."

### B. The Mashup Command
Use this `ffmpeg` command to overlay your character onto any background video (e.g., a dusty ranch walkthrough or a grill video):

```powershell
ffmpeg -i background_asset.mp4 -i character_green.mp4 -filter_complex `
  "[1:v]colorkey=0x00FF00:0.3:0.2[ckout]; `
   [0:v][ckout]overlay=x=50:y=(H-h)-50" `
   -c:a copy output_mashup.mp4
```
*Logic: This removes the green (`colorkey`), positions the character in the bottom-left (`overlay`), and preserves the original audio.*

### C. The "Serious Absurdity" Prompt
To generate the script for these videos, use an Envoy with the following meta-instruction:
> "Analyze this [mundane asset] with the intensity of a high-stakes intelligence brief. Use tactical jargon to describe mundane flaws (e.g., 'Structural Compromise' for a broken window, 'Organic Nutrient Deposit' for a messy yard). Maintain 100% operative loyalty."

---

**End of Briefing.**
*For updates to the segmentation model, reference the Rotoscope README.*
