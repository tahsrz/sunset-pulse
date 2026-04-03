import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Load the .env.local file from the root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// 2. Define Schema locally to avoid Next.js import issues
const LeadSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    property: mongoose.Schema.Types.ObjectId,
    views: { type: Number, default: 0 },
    chatMinutes: { type: Number, default: 0 },
    tourRequested: { type: Boolean, default: false },
    probability: { type: Number, default: 50 },
    status: String,
  },
  { timestamps: true }
);

const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

async function applyDecay() {
  try {
    console.log("⚡ [LEAD_DECAY] Initiating Protocol V5.0...");
    await mongoose.connect(MONGODB_URI);

    const leads = await Lead.find({ status: 'new' });
    console.log(`🔍 Found ${leads.length} active leads to analyze.`);

    let updatedCount = 0;
    const now = new Date();

    for (const lead of leads) {
      // Calculate days since last activity
      const lastActivity = new Date(lead.updatedAt);
      const diffTime = Math.abs(now - lastActivity);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      // Decay Logic: 30-day window
      const recencyFactor = Math.max(0, 1 - (diffDays / 30));
      
      // V5.0 Base Intent
      const viewPoints = Math.min(lead.views || 0, 20) * 10;
      const chatPoints = Math.min(lead.chatMinutes || 0, 30) * 5;
      const baseIntent = viewPoints + chatPoints;
      
      // Multipliers
      const hotMultiplier = lead.tourRequested ? 3.0 : 1.0;
      
      // Recalculate Probability with Decay
      let newProbability = Math.round(baseIntent * hotMultiplier * recencyFactor);

      // Add Static Bonuses (Phone + Repeat)
      if (lead.phone && lead.phone.trim() !== '') {
        newProbability += 15;
      }
      
      // Repeat check (simplified for script)
      const isRepeat = await Lead.countDocuments({ email: lead.email }) > 1;
      if (isRepeat) {
        newProbability += 10;
      }

      newProbability = Math.min(newProbability, 99);

      // --- RE-ENGAGEMENT PROTOCOL V1.0 ---
      if (lead.probability > 20 && newProbability <= 10) {
        console.log(`⚠️  [PROTOCOL_RE_ENGAGEMENT] Critical Decay Alert for Lead: ${lead.name}`);
        console.log(`📡 [INTEL_OVERRIDE] Old Score: ${lead.probability} -> New Score: ${newProbability}`);
        
        // In a real scenario, this would trigger an email/SMS via Twilio or Resend
        // For now, we'll log the "Jamie Strategy" prompt
        const reEngagementPrompt = `
          SYSTEM PROMPT: JAMIE_RE-ENGAGEMENT_PROTOCOL
          MISSION: Generate a high-stakes re-engagement hook.
          LEAD DATA: 
          Name: ${lead.name}
          Last Score: ${lead.probability} -> Current Score: ${newProbability}
          Last Property ID: ${lead.property}
        `;
        // Store this for a future 're-engagement-queue' model or log it
        lead.jamieNotes = `[JAMIE_SYSTEM_ALERT] Lead is going cold. Re-engagement protocol suggested.`;
      }

      if (newProbability !== lead.probability) {
        lead.probability = newProbability;
        // Note: We don't want the decay script to update 'updatedAt' 
        // because that would reset the decay timer itself!
        // So we use findOneAndUpdate or set timestamps: false if possible
        await Lead.updateOne(
          { _id: lead._id }, 
          { $set: { probability: newProbability } },
          { timestamps: false }
        );
        updatedCount++;
      }
    }

    console.log(`✅ [LEAD_DECAY] Success. ${updatedCount} leads updated. Intelligence grid synchronized.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ [LEAD_DECAY] Failed:", err.message);
    process.exit(1);
  }
}

applyDecay();
