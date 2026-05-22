import { SessionForge } from '../lib/intelligence/sessionForge';
import { TAHBuilder, type TAHInput } from '../lib/core/tah_builder';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Custom forge that uses the admin client
class AdminSessionForge extends SessionForge {
  public async forgeWithAdmin(sessionName: string, inputs: TAHInput[]): Promise<Buffer | null> {
    const builder = new TAHBuilder(0.001, 14);
    const buffer = builder.forge(inputs);
    const fileName = `${sessionName}.tah`;

    const { error } = await supabaseAdmin.storage
      .from('cartridges')
      .upload(fileName, buffer, {
        upsert: true,
        contentType: 'application/octet-stream'
      });

    if (error) throw error;
    return buffer;
  }
}

async function simulateSessionForge() {
  console.log('🧪 Starting Admin Session-to-TAH Forge Simulation...');

  const forge = new AdminSessionForge();
  const sessionData: TAHInput[] = [
    {
      keywords: ['USER_INTEREST', 'DALLAS', 'CONDO'],
      data: 'User expressed high interest in 3-bedroom condos in the Dallas Arts District. Budget: $750k.',
      type: 1
    },
    {
      keywords: ['JAMIE_ANALYSIS', 'MARKET_VELOCITY'],
      data: 'Market velocity in Dallas sector remains HIGH. Realized velocity maturation projected at 7-day inflection.',
      type: 1
    },
    {
      keywords: ['LEAD_TOUCH', 'SUCCESS'],
      data: 'Re-engagement hook "The Dallas Arts scene is vibrant this week" triggered a tour request.',
      type: 1
    }
  ];

  const sessionId = `session_admin_alpha_${Date.now()}`;
  
  try {
    const buffer = await forge.forgeWithAdmin(sessionId, sessionData);
    if (buffer) {
      console.log(`🎉 Simulation Complete. Cartridge ${sessionId}.tah forged and stored.`);
    }
  } catch (err: any) {
    console.error('❌ Forge failed:', err.message);
  }
}

simulateSessionForge();
