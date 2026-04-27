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

// Lead Decay Standards (Reference: lib/core/constants.ts)
const DECAY_START_DAYS = 2;
const DAILY_DECAY_RATE = 0.95; // 5% drop per day

// 2. Define Schema locally to avoid Next.js import issues
// Synchronized with models/Lead.js
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
    status: { type: String, default: 'new' },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

async function applyDecay() {
  try {
    console.log("⚡ [LEAD_DECAY] Initiating Protocol V6.0 (Grid Synchronized)...");
    await mongoose.connect(MONGODB_URI);

    const leads = await Lead.find({ status: 'new' });
    console.log(`🔍 Found ${leads.length} active leads to analyze.`);

    let updatedCount = 0;
    const now = new Date();

    for (const lead of leads) {
      // Use lastActivity for decay calculation (V6.0 Standard)
      const lastActivity = new Date(lead.lastActivity || lead.updatedAt);
      const diffTime = Math.abs(now - lastActivity);
      const diffInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffInDays > DECAY_START_DAYS) {
        const decayDays = diffInDays - DECAY_START_DAYS;
        const decayFactor = Math.pow(DAILY_DECAY_RATE, decayDays);
        const newProbability = Math.max(5, Math.round(lead.probability * decayFactor));

        if (newProbability !== lead.probability) {
          console.log(`📡 [DECAY_APPLIED] Lead: ${lead.name} | ${lead.probability}% -> ${newProbability}% (Inactive for ${diffInDays} days)`);
          
          // --- RE-ENGAGEMENT PROTOCOL V1.0 ---
          if (lead.probability > 20 && newProbability <= 15) {
            console.log(`⚠️  [PROTOCOL_RE_ENGAGEMENT] Critical Decay Alert for Lead: ${lead.name}`);
            // Store re-engagement note
            await Lead.updateOne(
              { _id: lead._id }, 
              { 
                $set: { 
                  probability: newProbability,
                  jamieNotes: `[JAMIE_SYSTEM_ALERT] Lead is going cold (${newProbability}%). Re-engagement protocol suggested.`
                } 
              },
              { timestamps: false }
            );
          } else {
            await Lead.updateOne(
              { _id: lead._id }, 
              { $set: { probability: newProbability } },
              { timestamps: false }
            );
          }
          updatedCount++;
        }
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
