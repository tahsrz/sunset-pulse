import { TAHBuilder, TAHInput } from '../core/tah_builder';
import { supabase } from '../supabase';
import { purifyText } from '../ai/purifier';
import fs from 'fs';
import path from 'path';

/**
 * SessionForge Service
 * Automates the conversion of live session data into TAH expertise cartridges.
 * Now protected by the Ozriel Protocol (Scythe Purifier).
 */

export class SessionForge {
  private builder: TAHBuilder;
  private readonly HUMANITY_THRESHOLD = 85;

  constructor() {
    this.builder = new TAHBuilder(0.001, 14); // Standard TAH parameters
  }

  /**
   * Forges a TAH cartridge from a collection of session logs.
   * Enforces Ozriel Protocol: Only high-entropy, human-like data is forged.
   */
  public async forgeSessionCartridge(sessionName: string, inputs: TAHInput[]): Promise<Buffer | null> {
    if (inputs.length === 0) return null;

    console.log(`⚒️ [SESSION_FORGE] Initiating Ozriel Protocol audit for: ${sessionName}...`);
    
    // 1. Ozriel Protocol Audit: Filter and Humanize
    const purifiedInputs: TAHInput[] = [];
    
    for (const input of inputs) {
      const purification = await purifyText(input.data);
      
      if (purification.humanity_score >= this.HUMANITY_THRESHOLD) {
        purifiedInputs.push(input);
      } else {
        console.warn(`🛡️ [OZRIEL_PROTOCOL_BLOCK] Low humanity score (${purification.humanity_score}) for entry. Rationale: ${purification.rationale}`);
        
        // If a suggested rewrite exists and is superior, use it
        if (purification.detections.some(d => d.suggested_rewrite)) {
          const rewrite = purification.detections.find(d => d.suggested_rewrite)?.suggested_rewrite;
          if (rewrite) {
            console.log(`✨ [OZRIEL_PROTOCOL] Using humanized rewrite for entry.`);
            purifiedInputs.push({ ...input, data: rewrite });
          }
        }
      }
    }

    if (purifiedInputs.length === 0) {
      console.log(`🚫 [SESSION_FORGE_CANCELLED] No entries passed the Ozriel humanity threshold.`);
      return null;
    }

    console.log(`⚒️ [SESSION_FORGE] Forging cartridge with ${purifiedInputs.length} purified entries...`);
    const buffer = this.builder.forge(purifiedInputs);
    
    // Upload to Supabase Storage
    const fileName = `${sessionName}.tah`;
    const { error } = await supabase.storage
      .from('cartridges')
      .upload(fileName, buffer, {
        upsert: true,
        contentType: 'application/octet-stream'
      });

    if (error) {
      console.error(`❌ [SESSION_FORGE_UPLOAD_FAILED] ${fileName}:`, error.message);
      return null;
    }

    console.log(`✅ [SESSION_FORGE_SUCCESS] Purified cartridge forged and deployed: ${fileName}`);
    return buffer;
  }

  /**
   * Scans local daily observations and forges a memory unit.
   */
  public async harvestDailyObservations(): Promise<void> {
    const logPath = path.join(process.cwd(), 'lib/ai/memory/daily_observations.log');
    if (!fs.existsSync(logPath)) return;

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    const inputs: TAHInput[] = lines.map((line, i) => {
      // Simple extraction: First word as keyword, rest as data
      const parts = line.split(' ');
      const timestamp = parts[0];
      const observation = parts.slice(1).join(' ');
      
      return {
        keywords: [timestamp.replace(/[\[\]]/g, ''), 'OBSERVATION', 'DAILY'],
        data: observation,
        type: 1
      };
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    await this.forgeSessionCartridge(`daily_memory_${dateStr}`, inputs);
  }
}

export const sessionForge = new SessionForge();
