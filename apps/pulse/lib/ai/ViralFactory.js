import Entity from '../models/Entity.js';
import ViralAsset from '../models/ViralAsset.js';
import Property from '../models/Property.js';
import { getJamieResponse } from '../lib/ai/jamie.ts'; // We'll adapt this for scripting

/**
 * The Viral Factory orchestrates the Council to create content.
 */
export async function generateViralConcept() {
  // 1. Makiel (The Scout) picks a 'Rough' or 'High-Interest' property
  const properties = await Property.find({}).limit(10);
  const targetProperty = properties[Math.floor(Math.random() * properties.length)];

  // 2. Select a character sticker (e.g., Ghost or Jamie)
  const sticker = await ViralAsset.findOne({ type: 'STICKER' }).sort({ usageCount: 1 });
  const background = await ViralAsset.findOne({ type: 'BACKGROUND', 'metadata.location': targetProperty.location.city });

  // 3. Summon the Envoy for the Script
  const envoy = await Entity.findOne({ uid: sticker.metadata.characterId });
  
  // 4. Generate the 'Serious Absurdity' Script
  const scriptPrompt = `
    PROPERTY_DATA: ${JSON.stringify(targetProperty)}
    CHARACTER: ${envoy.name} (${envoy.role})
    TASK: Generate a 15-second tactical script for a viral video. 
    STYLE: Serious Absurdity. Use elite jargon to describe property details.
    FORMAT: [NARRATION]
  `;

  // For automation, we'd call the AI here
  const script = "Sample: Structural compromise detected in the perimeter (a broken fence). Proceeding with organic area denial protocols (the overgrown grass).";

  return {
    property: targetProperty,
    character: envoy,
    stickerPath: sticker.path,
    backgroundPath: background?.path || '/videos/default_walkthrough.mp4',
    script
  };
}
